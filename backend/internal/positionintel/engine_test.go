package positionintel

import (
	"context"
	"math"
	"strconv"
	"strings"
	"testing"
	"time"

	op "optiontrading/backend/internal/opportunities"
	"optiontrading/backend/internal/positions"
)

var now = time.Date(2026, 11, 6, 15, 0, 0, 0, time.UTC)
var today = time.Date(2026, 11, 6, 0, 0, 0, 0, time.UTC)

func exp(days int) time.Time { return today.AddDate(0, 0, days) }

// fakeChains prices every strike with Black-Scholes at a fixed volatility.
type fakeChains struct {
	price float64
	vol   float64
}

func (f fakeChains) Chain(_ context.Context, sym string, expiry time.Time) (op.Chain, error) {
	exps := []time.Time{exp(3), exp(10), exp(17), exp(24), exp(31), exp(38), exp(52)}
	if expiry.IsZero() {
		expiry = exps[0]
	}
	ch := op.Chain{Symbol: sym, Price: f.price, Expiration: expiry, Expirations: exps}
	T := math.Max(daysTo(expiry, now), 1.0/24) / 365
	for k := math.Round(f.price*0.6/5) * 5; k <= f.price*1.4; k += 5 {
		for _, call := range []bool{true, false} {
			p := op.Price(call, f.price, k, T, f.vol)
			if p < 0.03 {
				continue
			}
			c := op.Contract{Strike: k, Bid: p * 0.98, Ask: p * 1.02, LastPrice: p, IV: f.vol, OpenInterest: 1500, Volume: 200}
			if call {
				ch.Calls = append(ch.Calls, c)
			} else {
				ch.Puts = append(ch.Puts, c)
			}
		}
	}
	return ch, nil
}

type fakeHistory map[string]float64 // "SYM|2006-01-02" → close

func (h fakeHistory) CloseOn(_ context.Context, sym string, day time.Time) (float64, error) {
	if v, ok := h[sym+"|"+day.Format("2006-01-02")]; ok {
		return v, nil
	}
	return 0, context.DeadlineExceeded
}

var campaign = &Campaign{ID: 1, Name: "Test", Capital: 200000, NetTarget: 20000, WeeklyTarget: 400, RequiredAnnual: 0.10, Risk: "moderate"}

func engine(price float64, hist fakeHistory) *Engine {
	return &Engine{Source: fakeChains{price: price, vol: 0.30}, History: hist, Now: func() time.Time { return now }}
}

// position builds a single short leg whose entry premium makes the current
// mark equal capturedFrac of... i.e. credit = mark / (1 - captured).
func shortPosition(t *testing.T, strategy, typ string, price, strike float64, expDays, openedDaysAgo int, captured float64, qty int) positions.Position {
	t.Helper()
	T := math.Max(daysTo(exp(expDays), now), 1.0/24) / 365
	mark := op.Price(typ == "call", price, strike, T, 0.30)
	credit := mark / (1 - captured)
	return positions.Position{ID: 7, Symbol: "XYZ", Strategy: strategy, Quantity: qty, Strike: strike,
		Expiry: exp(expDays).Format("2006-01-02"), PremiumCredit: round2(credit * 100), Status: "open",
		OpenedAt:   today.AddDate(0, 0, -openedDaysAgo).Format("2006-01-02"),
		Legs:       []positions.Leg{{Action: "sell", Type: typ, Strike: strike, Premium: round2(credit)}},
		EntryPrice: price, EntryIV: 0.30, EntryDelta: 0.20, EntryPOP: 80}
}

func TestHealthyPositionHolds(t *testing.T) {
	p := shortPosition(t, "Cash-Secured Put", "put", 200, 185, 31, 3, 0.15, 1)
	a, err := engine(200, nil).Assess(context.Background(), p, campaign)
	if err != nil {
		t.Fatal(err)
	}
	if a.Recommendation.Kind != "hold" || a.Health != "healthy" {
		t.Fatalf("got %s / %s: %s; alternatives %+v", a.Recommendation.Kind, a.Health, a.HealthReason, scores(a))
	}
	if a.Current == nil || a.Current.Theta <= 0 || a.Current.POP < 70 || len(a.Changes) < 5 || len(a.Decision.Reasons) < 3 {
		t.Errorf("assessment: %+v", a.Current)
	}
	if a.Overview.ProfitCapturedPct < 10 || a.Overview.ProfitCapturedPct > 20 {
		t.Errorf("captured %.1f%%", a.Overview.ProfitCapturedPct)
	}
}

func TestProfitTakingCloses(t *testing.T) {
	p := shortPosition(t, "Cash-Secured Put", "put", 200, 180, 24, 10, 0.75, 1)
	a, _ := engine(200, nil).Assess(context.Background(), p, campaign)
	if a.Recommendation.Kind != "close" || !strings.Contains(a.Recommendation.Title, "profit") || a.Recommendation.RealizedPL <= 0 {
		t.Fatalf("got %s (%s); %+v", a.Recommendation.Title, a.Recommendation.Summary, scores(a))
	}
	if a.Health != "action_needed" || len(a.Recommendation.Playbook) == 0 {
		t.Errorf("health %s playbook %v", a.Health, a.Recommendation.Playbook)
	}
}

func TestTestedCoveredCallRollsUpAndOut(t *testing.T) {
	// Entered at $200 with a $210 call; the stock is now $214 with 3 days left.
	p := shortPosition(t, "Covered Call", "call", 214, 210, 3, 25, -0.4, 2)
	p.EntryPrice = 200
	a, err := engine(214, nil).Assess(context.Background(), p, campaign)
	if err != nil {
		t.Fatal(err)
	}
	rec := a.Recommendation
	t.Logf("%s: %s | delta %.2f -> %.2f | scores %v | why: %+v", rec.Title, rec.Summary, a.Current.ShortDelta, rec.Result.ShortDelta, scores(a), a.Decision.Reasons)
	if rec.Kind != "roll" || rec.Title != "Roll Up & Out" {
		t.Fatalf("got %s: %s; %+v", rec.Title, rec.Summary, scores(a))
	}
	if rec.Result == nil || rec.Result.ShortDelta >= a.Current.ShortDelta || rec.NetCredit < 0 || rec.AdditionalDays < 5 || rec.NewLegs[0].Strike <= 210 {
		t.Errorf("roll result: %+v net %v days %d legs %+v", rec.Result, rec.NetCredit, rec.AdditionalDays, rec.NewLegs)
	}
	if len(rec.Steps) != 2 || rec.Steps[0].Side != "Buy to close" || rec.Steps[1].Side != "Sell to open" {
		t.Errorf("steps: %+v", rec.Steps)
	}
	if a.Overview.SharePL != 2800 { // (214-200) × 100 × 2
		t.Errorf("share P&L %v", a.Overview.SharePL)
	}
	bad := false
	for _, c := range a.Changes {
		bad = bad || (c.Label == "Short-strike delta" && c.Tone == "bad")
	}
	if !bad || !strings.Contains(a.Decision.Summary, "Since entry") {
		t.Errorf("what changed: %+v / %s", a.Changes, a.Decision.Summary)
	}
}

func TestDeepLossNeedsAction(t *testing.T) {
	// Short put deep in the money: loss far beyond twice the credit.
	p := shortPosition(t, "Cash-Secured Put", "put", 150, 200, 10, 20, -4, 1)
	a, _ := engine(150, nil).Assess(context.Background(), p, campaign)
	if a.Recommendation.Kind == "hold" || a.Health != "action_needed" {
		t.Fatalf("deep loss kept: %s; %+v", a.Recommendation.Title, scores(a))
	}
}

func TestReduceAvailableForMultipleContracts(t *testing.T) {
	p := shortPosition(t, "Cash-Secured Put", "put", 200, 185, 31, 3, 0.1, 4)
	a, _ := engine(200, nil).Assess(context.Background(), p, campaign)
	found := false
	for _, x := range append([]Action{a.Recommendation}, a.Alternatives...) {
		if x.Kind == "reduce" {
			found = x.CloseContracts == 2 && x.Result != nil && x.Result.Contracts == 2
		}
	}
	if !found {
		t.Errorf("no reduce-by-half alternative: %+v", scores(a))
	}
}

func TestExpiredAndLegacy(t *testing.T) {
	// Expired call: worthless when the expiry close was below the strike.
	p := positions.Position{ID: 1, Symbol: "XYZ", Strategy: "Covered Call", Quantity: 1, Strike: 230, Expiry: "2026-10-30",
		PremiumCredit: 300, Status: "open", OpenedAt: "2026-10-01"}
	a, err := engine(250, fakeHistory{"XYZ|2026-10-30": 220}).Assess(context.Background(), p, campaign)
	if err != nil || a.Health != "expired" || a.Recommendation.Kind != "record_expiry" || a.Recommendation.RealizedPL != 300 {
		t.Fatalf("expired worthless: %v %+v", err, a.Recommendation)
	}
	a, _ = engine(250, fakeHistory{"XYZ|2026-10-30": 240}).Assess(context.Background(), p, campaign)
	if !strings.Contains(a.Recommendation.Title, "assignment") || a.Recommendation.RealizedPL != -700 {
		t.Errorf("assigned: %+v", a.Recommendation)
	}

	// Iron condor stored with one strike can't be priced.
	ic := positions.Position{ID: 2, Symbol: "XYZ", Strategy: "Iron Condor", Quantity: 1, Strike: 125, Expiry: exp(10).Format("2006-01-02"), Status: "open"}
	a, _ = engine(200, nil).Assess(context.Background(), ic, campaign)
	if a.Health != "needs_details" {
		t.Errorf("legacy condor: %s", a.Health)
	}

	// Legacy covered call: legs rebuilt, entry reconstructed from history.
	lc := positions.Position{ID: 3, Symbol: "XYZ", Strategy: "Covered Call", Quantity: 1, Strike: 220, Expiry: exp(17).Format("2006-01-02"),
		PremiumCredit: 350, Status: "open", OpenedAt: "2026-10-20"}
	a, err = engine(205, fakeHistory{"XYZ|2026-10-20": 198}).Assess(context.Background(), lc, campaign)
	if err != nil || !a.Entry.Reconstructed || a.Entry.Price != 198 || a.Entry.IV <= 0 || a.backfill == nil || len(a.legs) != 1 {
		t.Errorf("legacy entry: %v %+v", err, a.Entry)
	}
}

func scores(a Assessment) []string {
	var out []string
	for _, x := range append([]Action{a.Recommendation}, a.Alternatives...) {
		out = append(out, x.ID+"="+strconv.Itoa(x.Score))
	}
	return out
}

func TestCoveredCallJudgedWithShares(t *testing.T) {
	// $210 call sold at $200; stock now $240: the call lost, the shares gained more.
	p := shortPosition(t, "Covered Call", "call", 240, 210, 10, 20, -6, 1)
	p.EntryPrice = 200
	a, _ := engine(240, nil).Assess(context.Background(), p, campaign)
	if a.Overview.OpenPL <= 0 {
		t.Fatalf("combined P&L should be positive: option %v shares %v", a.Overview.OptionPL, a.Overview.SharePL)
	}
	for _, x := range append([]Action{a.Recommendation}, a.Alternatives...) {
		if x.Title == "Close & cut the loss" {
			t.Errorf("hedged covered call treated as a loss: %s", x.Summary)
		}
		for _, p := range x.Playbook {
			if strings.HasPrefix(p, "Stop-loss") {
				t.Errorf("stop-loss fired on a profitable covered call")
			}
		}
	}
}

func TestInvalidExpiryNeedsDetails(t *testing.T) {
	p := positions.Position{ID: 5, Symbol: "XYZ", Strategy: "Secure Put", Quantity: 1, Strike: 180, Expiry: "Oct", PremiumCredit: 200, Status: "open"}
	a, err := engine(200, nil).Assess(context.Background(), p, campaign)
	if err != nil || a.Health != "needs_details" || !strings.Contains(a.HealthReason, "Oct") {
		t.Errorf("got %v %s %s", err, a.Health, a.HealthReason)
	}
}
