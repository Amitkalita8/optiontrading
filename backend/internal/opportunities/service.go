package opportunities

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"optiontrading/backend/internal/campaigns"
	"optiontrading/backend/internal/market"
	"optiontrading/backend/internal/watchlists"
)

// Scan is the stored, served result for one campaign.
type Scan struct {
	CampaignID   int64     `json:"campaignId"`
	CampaignName string    `json:"campaignName"`
	GeneratedAt  time.Time `json:"generatedAt"`
	NextRefresh  time.Time `json:"nextRefresh"`
	MarketPhase  string    `json:"marketPhase"`
	Stale        bool      `json:"stale"` // fresh scan failed; this is the last good one
	Watchlist    string    `json:"watchlist"`
	Goal         ScanGoal  `json:"goal"`
	Approach     struct {
		Strategies []string `json:"strategies"`
		Moneyness  string   `json:"moneyness"`
		Holding    string   `json:"holdingDuration"`
		Risk       string   `json:"risk"`
		Outlook    string   `json:"marketOutlook"`
	} `json:"approach"`
	Result
}

// ScanGoal is the campaign context the ranking used.
type ScanGoal struct {
	Capital           float64 `json:"capital"`
	NetTarget         float64 `json:"netTarget"`
	Earned            float64 `json:"earned"`
	WeeklyTarget      float64 `json:"weeklyTarget"`
	RequiredAnnualPct float64 `json:"requiredAnnualPct"`
}

var ErrNoWatchlist = errors.New("campaign has no watchlist")

// Service runs Engine 01 for campaigns: cached scans, refreshed when the
// campaign changes or the data ages, and a background loop that keeps every
// running campaign current while the market is open.
type Service struct {
	db         *sql.DB
	engine     *Engine
	campaigns  *campaigns.Repository
	watchlists *watchlists.Repository
	now        func() time.Time

	mu       sync.Mutex
	inflight map[int64]*flight
}

type flight struct {
	done chan struct{}
	scan Scan
	err  error
}

func NewService(db *sql.DB, src ChainSource, cp *campaigns.Repository, wl *watchlists.Repository) *Service {
	s := &Service{db: db, campaigns: cp, watchlists: wl, now: time.Now, inflight: map[int64]*flight{}}
	s.engine = &Engine{Source: src, Now: func() time.Time { return s.now() }}
	return s
}

// SetClock is for tests.
func (s *Service) SetClock(now func() time.Time) { s.now = now }

// maxAge: chains move every minute while the market trades, barely otherwise.
func maxAge(phase string) time.Duration {
	if phase == market.PhaseOpen {
		return 10 * time.Minute
	}
	return 3 * time.Hour
}

// Get returns the campaign's scan, rescanning when there is none, it is too
// old, the campaign or watchlist changed since, or force is set.
func (s *Service) Get(ctx context.Context, campaignID int64, userID string, force bool) (Scan, error) {
	c, err := s.campaigns.Get(ctx, campaignID, userID)
	if err != nil {
		return Scan{}, err
	}
	in, wlName, err := s.input(ctx, c, userID)
	if err != nil {
		return Scan{}, err
	}
	key := inputKey(in)
	phase := market.StatusAt(s.now()).Phase
	cached, cachedKey, ok := s.load(ctx, campaignID)
	if ok && !force && cachedKey == key && s.now().Sub(cached.GeneratedAt) < maxAge(phase) {
		return cached, nil
	}
	scan, err := s.run(ctx, c.ID, userID, in, wlName, key)
	if err != nil {
		if ok {
			cached.Stale = true
			return cached, nil
		}
		return Scan{}, err
	}
	return scan, nil
}

// Find looks up one opportunity in the user's stored scans (newest first).
func (s *Service) Find(ctx context.Context, userID, oppID string) (Opportunity, Scan, bool) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT payload FROM opportunity_scans WHERE user_id = ? ORDER BY generated_at DESC`, userID)
	if err != nil {
		return Opportunity{}, Scan{}, false
	}
	defer rows.Close()
	for rows.Next() {
		var raw string
		var sc Scan
		if rows.Scan(&raw) != nil || json.Unmarshal([]byte(raw), &sc) != nil {
			continue
		}
		for _, o := range sc.Opportunities {
			if o.ID == oppID {
				return o, sc, true
			}
		}
	}
	return Opportunity{}, Scan{}, false
}

func (s *Service) input(ctx context.Context, c campaigns.Campaign, userID string) (Input, string, error) {
	if c.WatchlistID == nil {
		return Input{}, "", ErrNoWatchlist
	}
	wl, err := s.watchlists.Get(ctx, *c.WatchlistID, userID)
	if err != nil {
		return Input{}, "", ErrNoWatchlist
	}
	return FromCampaign(c, wl.Tickers, s.now()), wl.Name, nil
}

// engineVersion invalidates stored scans when the engine's output changes.
const engineVersion = 2

// inputKey changes whenever anything the engine reads from the campaign does,
// or the engine itself changes.
func inputKey(in Input) string {
	b, _ := json.Marshal([]any{engineVersion, in.Tickers, in.Capital, in.NetTarget, in.Earned, in.WeeklyTarget,
		in.Strategies, in.Moneyness, in.Holding, in.Risk, in.Outlook, in.CampaignEndDate})
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:8])
}

// run scans once per campaign at a time; concurrent callers share the result.
func (s *Service) run(ctx context.Context, id int64, userID string, in Input, wlName, key string) (Scan, error) {
	s.mu.Lock()
	if f, ok := s.inflight[id]; ok {
		s.mu.Unlock()
		select {
		case <-f.done:
			return f.scan, f.err
		case <-ctx.Done():
			return Scan{}, ctx.Err()
		}
	}
	f := &flight{done: make(chan struct{})}
	s.inflight[id] = f
	s.mu.Unlock()
	defer func() {
		s.mu.Lock()
		delete(s.inflight, id)
		s.mu.Unlock()
		close(f.done)
	}()

	// Detached from the request so a closed tab doesn't waste a half-done scan.
	sctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 25*time.Second)
	defer cancel()
	res := s.engine.Discover(sctx, in)
	if len(in.Tickers) > 0 && len(res.Skipped) == len(in.Tickers) && allUnavailable(res.Skipped) {
		f.err = fmt.Errorf("option data unavailable for every symbol")
		return Scan{}, f.err
	}
	now := s.now()
	phase := market.StatusAt(now).Phase
	d := withDefaults(in)
	sc := Scan{CampaignID: id, CampaignName: in.CampaignName, GeneratedAt: now.UTC(),
		NextRefresh: now.Add(maxAge(phase)).UTC(), MarketPhase: phase, Watchlist: wlName, Result: res,
		Goal: ScanGoal{Capital: in.Capital, NetTarget: in.NetTarget, Earned: in.Earned,
			WeeklyTarget: in.WeeklyTarget, RequiredAnnualPct: round1(d.RequiredAnnual * 100)}}
	sc.Approach.Strategies, sc.Approach.Moneyness, sc.Approach.Holding = d.Strategies, d.Moneyness, d.Holding
	sc.Approach.Risk, sc.Approach.Outlook = d.Risk, d.Outlook
	payload, _ := json.Marshal(sc)
	_, err := s.db.ExecContext(sctx,
		`INSERT INTO opportunity_scans (campaign_id, user_id, input_key, generated_at, payload) VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT(campaign_id) DO UPDATE SET user_id = excluded.user_id, input_key = excluded.input_key,
		   generated_at = excluded.generated_at, payload = excluded.payload`,
		id, userID, key, sc.GeneratedAt.Format(time.RFC3339Nano), string(payload))
	if err != nil {
		log.Printf("opportunities: save scan %d: %v", id, err)
	}
	f.scan = sc
	return sc, nil
}

func allUnavailable(list []Skipped) bool {
	for _, s := range list {
		if !strings.Contains(s.Reason, "unavailable") {
			return false
		}
	}
	return true
}

func (s *Service) load(ctx context.Context, id int64) (Scan, string, bool) {
	var raw, key string
	err := s.db.QueryRowContext(ctx, `SELECT payload, input_key FROM opportunity_scans WHERE campaign_id = ?`, id).Scan(&raw, &key)
	if err != nil {
		return Scan{}, "", false
	}
	var sc Scan
	if json.Unmarshal([]byte(raw), &sc) != nil {
		return Scan{}, "", false
	}
	return sc, key, true
}

// Run keeps every running campaign's scan fresh until ctx ends ("always
// active after campaign creation"). It checks each minute and rescans what
// has aged past maxAge for the current market phase.
func (s *Service) Run(ctx context.Context) {
	tick := time.NewTicker(time.Minute)
	defer tick.Stop()
	for {
		s.refreshAll(ctx)
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}

func (s *Service) refreshAll(ctx context.Context) {
	list, err := s.campaigns.ListRunning(ctx)
	if err != nil {
		log.Printf("opportunities: list campaigns: %v", err)
		return
	}
	for _, c := range list {
		if ctx.Err() != nil {
			return
		}
		if c.MetricsAt(s.now()).Phase == "ended" || c.WatchlistID == nil {
			continue
		}
		if _, err := s.Get(ctx, c.ID, c.UserID, false); err != nil && !errors.Is(err, ErrNoWatchlist) {
			log.Printf("opportunities: campaign %d: %v", c.ID, err)
		}
	}
}
