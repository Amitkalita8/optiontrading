package approaches

import "context"

// demoApproaches mirror the design mock-ups. Campaign counts are set directly
// until campaigns are stored in the backend and can reference approaches.
var demoApproaches = []struct {
	Input
	usedIn int
}{
	{Input{Name: "Conservative Income", Strategies: []string{"Covered Call", "Cash-Secured Put"},
		Moneyness: "OTM", HoldingPeriod: "30-45d", MinYield: 8, Risk: "lower",
		TakeProfit: 75, StopLoss: 15, MaxPosition: 10, DTECloseThreshold: 21, AssignmentHandling: "roll"}, 2},
	{Input{Name: "Technology Income", Strategies: []string{"Covered Call", "Cash-Secured Put", "Collar"},
		Moneyness: "OTM", HoldingPeriod: "60d+", MinYield: 12, Risk: "moderate",
		TakeProfit: 75, StopLoss: 15, MaxPosition: 10, DTECloseThreshold: 21, AssignmentHandling: "roll", AutoRoll: true}, 1},
	{Input{Name: "Growth Options", Strategies: []string{"Bull Put Spread", "Bear Call Spread"},
		Moneyness: "ATM", HoldingPeriod: "15-30d", MinYield: 12, Risk: "aggressive",
		TakeProfit: 100, StopLoss: 20, MaxPosition: 5, DTECloseThreshold: 7, AssignmentHandling: "close"}, 1},
	{Input{Name: "New approach - testing", Strategies: []string{"Iron Condor", "Credit Spread"},
		Moneyness: "OTM", HoldingPeriod: "7-14d", MinYield: 8, Risk: "moderate",
		TakeProfit: 50, StopLoss: 7, MaxPosition: 5, AssignmentHandling: "close"}, 1},
}

// SeedDemo inserts the demo approaches if the table is empty.
func (r *Repository) SeedDemo(ctx context.Context) error {
	var n int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM approaches`).Scan(&n); err != nil || n > 0 {
		return err
	}
	for _, d := range demoApproaches {
		if _, err := r.create(ctx, d.Input, d.usedIn); err != nil {
			return err
		}
	}
	return nil
}
