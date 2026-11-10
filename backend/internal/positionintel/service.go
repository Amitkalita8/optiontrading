package positionintel

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"strings"
	"sync"
	"time"

	"optiontrading/backend/internal/campaigns"
	"optiontrading/backend/internal/market"
	"optiontrading/backend/internal/notifications"
	op "optiontrading/backend/internal/opportunities"
	"optiontrading/backend/internal/positions"
	"optiontrading/backend/internal/tradelog"
)

// Service runs Engine 02 continuously: cached assessments, refreshed when the
// position changes or the data ages, a background loop over every open
// position, notifications when an action is needed, and applying the action
// the user confirms.
type Service struct {
	db        *sql.DB
	engine    *Engine
	positions *positions.Repository
	campaigns *campaigns.Repository
	notifs    *notifications.Repository
	trades    *tradelog.Repository
	now       func() time.Time

	mu       sync.Mutex
	inflight map[int64]chan struct{}
}

func NewService(db *sql.DB, src op.ChainSource, hist HistorySource, pos *positions.Repository, cp *campaigns.Repository,
	nr *notifications.Repository, tl *tradelog.Repository) *Service {
	s := &Service{db: db, positions: pos, campaigns: cp, notifs: nr, trades: tl, now: time.Now, inflight: map[int64]chan struct{}{}}
	s.engine = &Engine{Source: src, History: hist, Now: func() time.Time { return s.now() }}
	return s
}

// SetClock is for tests.
func (s *Service) SetClock(now func() time.Time) { s.now = now }

const assessmentVersion = 1

func maxAge(phase string) time.Duration {
	if phase == market.PhaseOpen {
		return 5 * time.Minute
	}
	return 2 * time.Hour
}

// campaignFor is the position's campaign, else the user's active one.
func (s *Service) campaignFor(ctx context.Context, p positions.Position, userID string) *Campaign {
	id := int64(0)
	if p.CampaignID != nil {
		id = *p.CampaignID
	} else {
		id, _ = s.campaigns.ActiveID(ctx, userID)
	}
	if id == 0 {
		if list, err := s.campaigns.List(ctx, userID); err == nil && len(list) > 0 {
			id = list[0].ID
		}
	}
	if id == 0 {
		return nil
	}
	c, err := s.campaigns.Get(ctx, id, userID)
	if err != nil {
		return nil
	}
	m := c.MetricsAt(s.now())
	out := &Campaign{ID: c.ID, Name: c.Name, Capital: c.Capital, NetTarget: m.NetTarget, Earned: c.Earned,
		WeeklyTarget: m.WeeklyTarget, Risk: c.Risk}
	if c.Capital > 0 && m.TotalDays > 0 {
		out.RequiredAnnual = m.NetTarget / c.Capital / (float64(m.TotalDays) / 365)
	}
	return out
}

type stored struct {
	Version int        `json:"v"`
	Updated time.Time  `json:"positionUpdated"`
	A       Assessment `json:"a"`
}

func (s *Service) load(ctx context.Context, id int64) (stored, bool) {
	var raw string
	if err := s.db.QueryRowContext(ctx, `SELECT payload FROM position_assessments WHERE position_id = ?`, id).Scan(&raw); err != nil {
		return stored{}, false
	}
	var st stored
	if json.Unmarshal([]byte(raw), &st) != nil || st.Version != assessmentVersion {
		return stored{}, false
	}
	return st, true
}

// Get returns the position's assessment, reassessing when needed.
func (s *Service) Get(ctx context.Context, id int64, userID string, force bool) (Assessment, error) {
	p, err := s.positions.Get(ctx, id, userID)
	if err != nil {
		return Assessment{}, err
	}
	if p.Status != "open" {
		return Assessment{}, ErrNotOpen
	}
	phase := market.StatusAt(s.now()).Phase
	prev, ok := s.load(ctx, id)
	if ok && !force && prev.Updated.Equal(p.UpdatedAt) && s.now().Sub(prev.A.GeneratedAt) < maxAge(phase) {
		return prev.A, nil
	}
	return s.assess(ctx, p, userID, phase, prev, ok)
}

var ErrNotOpen = errors.New("position is not open")

func (s *Service) assess(ctx context.Context, p positions.Position, userID, phase string, prev stored, hadPrev bool) (Assessment, error) {
	// One assessment per position at a time.
	s.mu.Lock()
	if ch, busy := s.inflight[p.ID]; busy {
		s.mu.Unlock()
		select {
		case <-ch:
		case <-ctx.Done():
			return Assessment{}, ctx.Err()
		}
		if st, ok := s.load(ctx, p.ID); ok {
			return st.A, nil
		}
		return Assessment{}, fmt.Errorf("assessment unavailable")
	}
	done := make(chan struct{})
	s.inflight[p.ID] = done
	s.mu.Unlock()
	defer func() {
		s.mu.Lock()
		delete(s.inflight, p.ID)
		s.mu.Unlock()
		close(done)
	}()

	actx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 20*time.Second)
	defer cancel()
	a, err := s.engine.Assess(actx, p, s.campaignFor(actx, p, userID))
	if err != nil {
		if hadPrev {
			return prev.A, nil // last good assessment beats nothing
		}
		return Assessment{}, err
	}
	a.MarketPhase = phase

	// Keep the stored position in step: latest mark, reconstructed entry.
	if a.backfill != nil {
		_ = s.positions.SetEntry(actx, p.ID, userID, a.legs, a.backfill.Price, a.backfill.IV/100, a.backfill.Delta, a.backfill.POP)
	}
	if a.Current != nil && p.Quantity > 0 {
		_ = s.positions.SetMark(actx, p.ID, userID, round2(a.Overview.CostToClose/float64(p.Quantity)))
	}
	fresh, _ := s.positions.Get(actx, p.ID, userID) // UpdatedAt after SetMark/SetEntry
	payload, _ := json.Marshal(stored{Version: assessmentVersion, Updated: fresh.UpdatedAt, A: a})
	_, err = s.db.ExecContext(actx,
		`INSERT INTO position_assessments (position_id, user_id, generated_at, action, health, payload) VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(position_id) DO UPDATE SET user_id = excluded.user_id, generated_at = excluded.generated_at,
		   action = excluded.action, health = excluded.health, payload = excluded.payload`,
		p.ID, userID, a.GeneratedAt.Format(time.RFC3339Nano), a.Recommendation.ID, a.Health, string(payload))
	if err != nil {
		log.Printf("positionintel: save %d: %v", p.ID, err)
	}

	// Something now deserves attention: tell the user once per new action.
	prevAction := ""
	if hadPrev {
		prevAction = prev.A.Recommendation.ID
	}
	if s.notifs != nil && a.Recommendation.Kind != "hold" && a.Recommendation.ID != prevAction {
		_, _ = s.notifs.Create(actx, notifications.Input{
			Kind: notifications.KindCampaign, Source: "Position Intelligence",
			Title:          fmt.Sprintf("%s: %s", p.Symbol, a.Recommendation.Title),
			Body:           a.HealthReason,
			ActionRequired: true, ActionLabel: "Review", ActionPath: fmt.Sprintf("/positions/%d", p.ID),
		}, userID)
	}
	return a, nil
}

// Summary is a row of the Existing Positions screen.
type Summary struct {
	PositionID   int64     `json:"positionId"`
	Symbol       string    `json:"symbol"`
	Strategy     string    `json:"strategy"`
	Description  string    `json:"description"`
	Health       string    `json:"health"`
	HealthReason string    `json:"healthReason"`
	Action       string    `json:"action"`
	ActionKind   string    `json:"actionKind"`
	ActionScore  int       `json:"actionScore"`
	Overview     Overview  `json:"overview"`
	Current      *Metrics  `json:"current"`
	Entry        Snapshot  `json:"entry"`
	GeneratedAt  time.Time `json:"generatedAt"`
	PriceSource  string    `json:"priceSource"`
	Error        string    `json:"error,omitempty"`
}

var healthRank = map[string]int{"action_needed": 0, "expired": 1, "watch": 2, "needs_details": 3, "healthy": 4, "unavailable": 5}

// List assesses every open position of the user (cached when fresh),
// most urgent first.
func (s *Service) List(ctx context.Context, userID string) ([]Summary, error) {
	list, err := s.positions.ListOpen(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]Summary, len(list))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 3)
	for i, p := range list {
		wg.Add(1)
		go func(i int, p positions.Position) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			a, err := s.Get(ctx, p.ID, userID, false)
			if err != nil {
				out[i] = Summary{PositionID: p.ID, Symbol: p.Symbol, Strategy: p.Strategy, Health: "unavailable",
					HealthReason: "Market data unavailable right now.", Error: err.Error(), Action: "Retry later"}
				return
			}
			out[i] = Summary{PositionID: a.PositionID, Symbol: a.Symbol, Strategy: a.Strategy, Description: a.Description,
				Health: a.Health, HealthReason: a.HealthReason, Action: a.Recommendation.Title, ActionKind: a.Recommendation.Kind,
				ActionScore: a.Recommendation.Score, Overview: a.Overview, Current: a.Current, Entry: a.Entry,
				GeneratedAt: a.GeneratedAt, PriceSource: a.PriceSource}
		}(i, p)
	}
	wg.Wait()
	for i := 1; i < len(out); i++ { // stable insertion sort by urgency
		for j := i; j > 0 && healthRank[out[j].Health] < healthRank[out[j-1].Health]; j-- {
			out[j], out[j-1] = out[j-1], out[j]
		}
	}
	return out, nil
}

// Run keeps every open position assessed (and notifies) until ctx ends.
func (s *Service) Run(ctx context.Context) {
	tick := time.NewTicker(time.Minute)
	defer tick.Stop()
	for {
		if list, err := s.positions.ListOpenAll(ctx); err == nil {
			for _, p := range list {
				if ctx.Err() != nil {
					return
				}
				if _, err := s.Get(ctx, p.ID, p.UserID, false); err != nil && !errors.Is(err, ErrNotOpen) {
					log.Printf("positionintel: position %d: %v", p.ID, err)
				}
			}
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}

// Result of applying an action.
type Result struct {
	Action     string              `json:"action"`
	Message    string              `json:"message"`
	Position   positions.Position  `json:"position"`         // the original, updated
	Opened     *positions.Position `json:"opened,omitempty"` // the new position after a roll
	RealizedPL float64             `json:"realizedPL"`
	Assessment *Assessment         `json:"assessment,omitempty"` // of what remains open
	TradeLog   []tradelog.Entry    `json:"tradeLog"`
	Campaign   *campaigns.Campaign `json:"campaign,omitempty"`
}

var ErrStale = errors.New("the market moved: this action is no longer available, review the new recommendation")

// Apply records the action the user confirmed. It reassesses with fresh
// prices first and refuses if the action is gone or its net credit moved
// more than 15% (or $25) from what the user reviewed.
func (s *Service) Apply(ctx context.Context, id int64, userID, actionID string, reviewedNet *float64) (Result, error) {
	a, err := s.Get(ctx, id, userID, true)
	if err != nil {
		return Result{}, err
	}
	var act *Action
	for _, x := range append([]Action{a.Recommendation}, a.Alternatives...) {
		if x.ID == actionID {
			x := x
			act = &x
		}
	}
	if act == nil {
		return Result{}, ErrStale
	}
	if reviewedNet != nil && act.Kind != "hold" {
		diff := math.Abs(act.NetCredit - *reviewedNet)
		if diff > math.Max(25, math.Abs(*reviewedNet)*0.15) {
			return Result{}, fmt.Errorf("%w (net was %s, now %s)", ErrStale, money(*reviewedNet), money(act.NetCredit))
		}
	}
	p, err := s.positions.Get(ctx, id, userID)
	if err != nil {
		return Result{}, err
	}
	today := s.now().UTC().Format("2006-01-02")
	res := Result{Action: act.ID, RealizedPL: act.RealizedPL, TradeLog: []tradelog.Entry{}}
	logTrade := func(pid int64, action string, qty int, price float64, notes string) {
		if e, err := s.trades.Append(ctx, tradelog.Input{PositionID: &pid, Symbol: p.Symbol, Action: action, Quantity: qty,
			Price: round2(price), Notes: notes, OccurredAt: today}, userID); err == nil {
			res.TradeLog = append(res.TradeLog, e)
		}
	}
	closeAll := func(value float64) error {
		closed := today
		up, err := s.positions.Update(ctx, id, positions.Input{Status: "closed", CurrentValue: value, ClosedAt: &closed}, userID)
		res.Position = up
		return err
	}

	switch act.Kind {
	case "hold":
		res.Message = "Marked as reviewed: the engine keeps monitoring this position."
		res.Position = p
	case "close", "record_expiry":
		if err := closeAll(act.CloseValue); err != nil {
			return Result{}, err
		}
		verb := "BUY_TO_CLOSE"
		if act.Kind == "record_expiry" {
			verb = "EXPIRED"
		}
		logTrade(id, verb, p.Quantity, act.CloseValue/sharesPerContract, fmt.Sprintf("Engine 02: %s (%s)", act.Title, signedMoney(act.RealizedPL)))
		res.Message = fmt.Sprintf("%s recorded: %s on %d contracts.", act.Title, signedMoney(act.RealizedPL), p.Quantity)
	case "reduce":
		keep := p.Quantity - act.CloseContracts
		up, err := s.positions.Update(ctx, id, positions.Input{Quantity: keep, CurrentValue: act.CloseValue}, userID)
		if err != nil {
			return Result{}, err
		}
		res.Position = up
		logTrade(id, "BUY_TO_CLOSE", act.CloseContracts, act.CloseValue/sharesPerContract,
			fmt.Sprintf("Engine 02: reduced from %d to %d contracts (%s)", p.Quantity, keep, signedMoney(act.RealizedPL)))
		res.Message = fmt.Sprintf("Reduced to %d contracts; %s locked on the %d closed.", keep, signedMoney(act.RealizedPL), act.CloseContracts)
	case "roll":
		closeValue := round2(a.Overview.CostToClose / float64(p.Quantity))
		realized := round2(a.Overview.OptionPL)
		res.RealizedPL = realized
		if err := closeAll(closeValue); err != nil {
			return Result{}, err
		}
		logTrade(id, "BUY_TO_CLOSE", p.Quantity, closeValue/sharesPerContract, "Engine 02: "+act.Title+" (closing leg)")
		m := act.Result
		from := id
		entryDelta := 0.0
		if m != nil {
			entryDelta = m.ShortDelta
		}
		openPremium := 0.0
		for _, l := range act.NewLegs {
			if l.Action == "sell" {
				openPremium += l.Premium
			} else {
				openPremium -= l.Premium
			}
		}
		in := positions.Input{CampaignID: p.CampaignID, Symbol: p.Symbol, Strategy: p.Strategy, Quantity: p.Quantity,
			Expiry: act.NewExpiry, PremiumCredit: round2(openPremium * sharesPerContract), CurrentValue: round2(openPremium * sharesPerContract),
			Status: "open", OpenedAt: today, Legs: act.NewLegs, EntryPrice: a.Overview.Underlying, EntryDelta: entryDelta,
			RolledFrom: &from}
		if m != nil {
			in.EntryIV, in.EntryPOP = m.IV/100, m.POP
		}
		opened, err := s.positions.Create(ctx, in, userID)
		if err != nil {
			return Result{}, err
		}
		res.Opened = &opened
		logTrade(opened.ID, "SELL_TO_OPEN", p.Quantity, openPremium, fmt.Sprintf("Engine 02: %s to %s %s", act.Title, act.NewStrikes, act.NewExpiry))
		res.Message = fmt.Sprintf("Rolled to %s expiring %s for a net %s of %s.", act.NewStrikes, act.NewExpiry,
			creditWord(act.NetCredit), money(math.Abs(act.NetCredit)))
	default:
		return Result{}, fmt.Errorf("unknown action %q", act.Kind)
	}

	// Realized premium counts toward the campaign goal.
	if res.RealizedPL != 0 && act.Kind != "hold" {
		if c := s.campaignFor(ctx, p, userID); c != nil {
			if err := s.campaigns.AddEarned(ctx, c.ID, userID, res.RealizedPL); err == nil {
				if cc, err := s.campaigns.Get(ctx, c.ID, userID); err == nil {
					res.Campaign = &cc
				}
			}
		}
	}
	_, _ = s.db.ExecContext(ctx, `DELETE FROM position_assessments WHERE position_id = ?`, id)
	next := id
	if res.Opened != nil {
		next = res.Opened.ID
	}
	if pos, err := s.positions.Get(ctx, next, userID); err == nil && pos.Status == "open" {
		if na, err := s.Get(ctx, next, userID, true); err == nil {
			res.Assessment = &na
		}
	}
	return res, nil
}

// IsStale reports whether err means the reviewed action is out of date.
func IsStale(err error) bool {
	return errors.Is(err, ErrStale) || strings.Contains(fmt.Sprint(err), ErrStale.Error())
}
