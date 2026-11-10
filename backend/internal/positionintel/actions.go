package positionintel

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	op "optiontrading/backend/internal/opportunities"
	"optiontrading/backend/internal/positions"
)

// Scoring weights for every candidate action (sum 100) plus playbook rules.
const (
	wSafety = 45 // risk after the action vs the campaign's limits
	wIncome = 30 // premium per day vs the goal's pace
	wValue  = 25 // worth of what is kept, locked in or collected
)

type fit struct{ safety, income float64 }

// fits scores a resulting position against the campaign's risk level and pace.
func fits(m Metrics, st state, c Campaign, earningsAhead bool) fit {
	_, max, _ := op.DeltaBand(c.Risk)
	floor := op.POPFloor(c.Risk)
	capPct := op.CapitalCap(c.Risk) * 100
	f := fit{safety: 1}
	if m.ShortDelta > max {
		f.safety *= clamp01(1 - (m.ShortDelta-max)/0.35)
	}
	if m.POP < floor {
		f.safety *= clamp01(m.POP / floor)
	}
	if c.Capital > 0 && m.CapitalUsePct > capPct {
		f.safety *= clamp01(1 - (m.CapitalUsePct-capPct)/capPct)
	}
	if m.DTE <= 5 && len(st.shortLegs()) > 0 && math.Abs(st.S-st.shortLegs()[0].Strike)/st.S < 0.03 {
		f.safety *= 0.6 // gamma: small moves swing the result near expiry
	}
	if m.MaxRisk == nil {
		f.safety *= map[string]float64{"low": 0.5, "moderate": 0.8, "high": 0.95}[c.Risk]
	}
	if earningsAhead {
		f.safety *= 0.75
	}
	pace := c.RequiredAnnual * m.Collateral / 365
	f.income = 0.5
	if pace > 0 {
		f.income = clamp01(m.Theta / pace)
	}
	return f
}

func score(f fit, value float64, bonus int) int {
	s := float64(wSafety)*f.safety + float64(wIncome)*f.income + float64(wValue)*clamp01(value) + float64(bonus)
	return int(math.Max(0, math.Min(100, math.Round(s))))
}

func factors(f fit, value float64) map[string]float64 {
	return map[string]float64{"safety": round2(f.safety), "income": round2(f.income), "value": round2(clamp01(value))}
}

// actions builds and scores every candidate: hold, close, roll, reduce.
func (e *Engine) actions(ctx context.Context, st state, first op.Chain, cur Metrics, ov Overview, entryDTE float64, c Campaign, earnings, now time.Time) []Action {
	earnAhead := earningsBefore(earnings, st.expiry, now)
	tested := isTested(cur, c)
	captured := 0.0
	if ov.Credit > 0 {
		captured = ov.OptionPL / ov.Credit
	}
	timeLeft := clamp01(st.dte / entryDTE)
	goalPct := func(v float64) float64 {
		if c.NetTarget <= 0 {
			return 0
		}
		return round1(v / c.NetTarget * 100)
	}
	holdGoal := goalPct(ov.Credit)
	var out []Action

	// Hold.
	hf := fits(cur, st, c, earnAhead)
	holdValue := 0.4
	if ov.CostToClose <= ov.Credit && ov.Credit > 0 {
		holdValue = clamp01((ov.CostToClose / ov.Credit) / math.Max(timeLeft, 0.05))
	}
	hold := Action{ID: "hold", Kind: "hold", Title: "Hold", Positioning: cur.Moneyness, Result: &cur,
		Summary: fmt.Sprintf("Keep the position and let time decay work: %s a day.", money(cur.Theta)),
		Score:   score(hf, holdValue, 0), Factors: factors(hf, holdValue), Playbook: []string{}, Steps: []Step{},
		GoalContributionPct: holdGoal, Tradeoffs: []string{fmt.Sprintf("Keeps %s of risk open for %d more days", riskText(cur.MaxRisk), cur.DTE)}}
	if tested {
		hold.Playbook = append(hold.Playbook, fmt.Sprintf("Short strike tested (delta %.2f)", cur.ShortDelta))
	}
	out = append(out, hold)

	// Close everything.
	closeBonus, closeBook := 0, []string{}
	// A covered call is hedged by its shares: judge losses on the combined P&L.
	loss := -ov.OptionPL
	if st.key == "covered_call" {
		loss = -ov.OpenPL
	}
	switch {
	case captured >= 0.8:
		closeBonus, closeBook = 20, append(closeBook, fmt.Sprintf("80%% rule: %.0f%% of the premium is captured", captured*100))
	case captured >= 0.5:
		closeBonus, closeBook = 12, append(closeBook, fmt.Sprintf("Take-profit rule: %.0f%% of the premium is captured", captured*100))
	}
	if ov.Credit > 0 && loss >= 2*ov.Credit {
		closeBonus += 25
		closeBook = append(closeBook, fmt.Sprintf("Stop-loss: the loss is %.1f× the credit", loss/ov.Credit))
	}
	if cur.DTE <= 2 && cur.Moneyness == "ITM" {
		closeBonus += 15
		closeBook = append(closeBook, "Avoid assignment: in the money with 2 days or less")
	}
	if c.Capital > 0 && cur.CapitalUsePct > op.CapitalCap(c.Risk)*100 && captured >= 0.5 {
		closeBonus += 10
		closeBook = append(closeBook, fmt.Sprintf("Also frees the over-limit capital (%.0f%% in use)", cur.CapitalUsePct))
	}
	if earnAhead && c.Risk == "low" {
		closeBonus += 10
		closeBook = append(closeBook, "Low-risk campaign: avoid holding through earnings")
	}
	closeIncome, closeValue := 0.4, 0.2
	if captured >= 0.5 {
		closeIncome = 0.6 // capital freed to redeploy at the goal pace
	}
	if ov.OptionPL > 0 {
		closeValue = captured
	}
	cf := fit{safety: 1, income: closeIncome}
	title := "Close position"
	summary := fmt.Sprintf("Buy back for %s and lock in %s.", money(ov.CostToClose), signedMoney(ov.OptionPL))
	if ov.OptionPL > 0 {
		title = "Close & take profit"
	} else if loss > 0 {
		title = "Close & cut the loss"
	} else if st.key == "covered_call" {
		title = "Buy back the call"
		summary = fmt.Sprintf("Buy back for %s (%s on the call, %s on the shares) and keep the shares.", money(ov.CostToClose), signedMoney(ov.OptionPL), signedMoney(ov.SharePL))
	}
	out = append(out, Action{ID: "close", Kind: "close", Title: title, Summary: summary, Positioning: "—",
		Score: score(cf, closeValue, closeBonus), Factors: factors(cf, closeValue), Playbook: closeBook,
		Steps: closeSteps(st, st.qty), NetCredit: -ov.CostToClose, RealizedPL: ov.OptionPL,
		CloseContracts: st.qty, CloseValue: round2(ov.CostToClose / float64(st.qty)),
		GoalContributionPct: goalPct(ov.OptionPL), GoalImpactPct: round1(goalPct(ov.OptionPL) - holdGoal),
		Tradeoffs: []string{fmt.Sprintf("Gives up the remaining %s of premium", money(math.Max(0, ov.CostToClose)))}})

	// Reduce: close half of the contracts.
	if st.qty >= 2 {
		n := st.qty / 2
		rest := st
		rest.qty = st.qty - n
		rm := rest.metrics(c)
		rf := fits(rm, rest, c, earnAhead)
		perSet := ov.CostToClose / float64(st.qty)
		realized := round2((ov.Credit - ov.CostToClose) / float64(st.qty) * float64(n))
		bonus, book := 0, []string{}
		if c.Capital > 0 && cur.CapitalUsePct > op.CapitalCap(c.Risk)*100 {
			bonus, book = 10, append(book, fmt.Sprintf("Capital use %.0f%% is above your %.0f%% limit", cur.CapitalUsePct, op.CapitalCap(c.Risk)*100))
		}
		if tested {
			bonus += 6
			book = append(book, "Halves the exposure on a tested strike")
		}
		if earnAhead {
			bonus += 6
			book = append(book, "Cuts size ahead of earnings")
		}
		if len(book) == 0 {
			bonus -= 15
			book = append(book, "No risk reason to cut size")
		}
		value := (holdValue + closeValue) / 2
		out = append(out, Action{ID: "reduce", Kind: "reduce", Title: fmt.Sprintf("Reduce to %d contracts", rest.qty),
			Summary: fmt.Sprintf("Buy back %d of %d contracts for %s; keep %d open.", n, st.qty, money(perSet*float64(n)), rest.qty),
			Score:   score(rf, value, bonus), Factors: factors(rf, value), Playbook: book, Positioning: rm.Moneyness,
			Steps: closeSteps(st, n), NetCredit: -round2(perSet * float64(n)), RealizedPL: realized, Result: &rm,
			CloseContracts: n, CloseValue: round2(perSet),
			GoalContributionPct: goalPct(rm.CreditTotal + realized), GoalImpactPct: round1(goalPct(rm.CreditTotal+realized) - holdGoal),
			Tradeoffs: []string{fmt.Sprintf("Exposure falls from %s to %s", money(math.Abs(cur.Exposure)), money(math.Abs(rm.Exposure)))}})
	}

	// Rolls to a later expiry.
	out = append(out, e.rolls(ctx, st, first, cur, ov, captured, tested, c, earnings, now, holdGoal)...)
	return out
}

func riskText(v *float64) string {
	if v == nil {
		return "uncapped"
	}
	return money(*v)
}

func closeSteps(st state, n int) []Step {
	var steps []Step
	for _, l := range st.legs {
		side := "Buy to close"
		if l.Action == "buy" {
			side = "Sell to close"
		}
		steps = append(steps, Step{side, n, fmt.Sprintf("%s %s %s %s", st.sym, money(l.Strike), strings.Title(l.Type), st.expiry.Format("Jan 2")), round2(l.mark)})
	}
	return steps
}

// rolls proposes rolling out (same strikes) and, for single short legs,
// rolling up/down & out to a strike back inside the risk band.
func (e *Engine) rolls(ctx context.Context, st state, first op.Chain, cur Metrics, _ Overview, captured float64, tested bool, c Campaign, earnings, now time.Time, holdGoal float64) []Action {
	// Try up to three later expiries (about +2, +4 and +6 weeks, at least a
	// week from today): more time buys a better strike for the same credit.
	// Keep the best-scoring roll of each kind.
	var candidates []time.Time
	for _, weeks := range []int{2, 4, 6} {
		target := st.expiry.AddDate(0, 0, 7*weeks)
		var pick time.Time
		for _, x := range sortedExpiries(first.Expirations, st.expiry.Add(24*time.Hour)) {
			if d := daysTo(x, st.expiry); d < 5 || d > 50 || daysTo(x, now) < 7 {
				continue
			}
			if pick.IsZero() || math.Abs(x.Sub(target).Hours()) < math.Abs(pick.Sub(target).Hours()) {
				pick = x
			}
		}
		if !pick.IsZero() && (len(candidates) == 0 || !candidates[len(candidates)-1].Equal(pick)) {
			candidates = append(candidates, pick)
		}
	}
	best := map[string]Action{}
	var order []string
	for _, x := range candidates {
		for _, r := range e.rollsAt(ctx, st, first, x, cur, captured, tested, c, earnings, now, holdGoal) {
			if cur, ok := best[r.ID]; !ok || r.Score > cur.Score {
				if !ok {
					order = append(order, r.ID)
				}
				best[r.ID] = r
			}
		}
	}
	var out []Action
	for _, id := range order {
		out = append(out, best[id])
	}
	return out
}

// rollsAt builds the rolls into one later expiry.
func (e *Engine) rollsAt(ctx context.Context, st state, first op.Chain, newExp time.Time, cur Metrics, captured float64, tested bool, c Campaign, earnings, now time.Time, holdGoal float64) []Action {
	ch, err := e.Source.Chain(ctx, first.Symbol, newExp)
	if err != nil {
		return nil
	}
	nT := math.Max(daysTo(newExp, now), 1.0/24) / 365
	closeCost := 0.0 // per share
	for _, l := range st.legs {
		closeCost += -l.sign() * l.mark
	}

	build := func(id, title string, newLegs []positions.Leg) (Action, bool) {
		ns := st
		ns.legs, ns.expiry, ns.T, ns.dte = nil, newExp, nT, daysTo(newExp, now)
		openCredit := 0.0
		for _, l := range newLegs {
			ls := priceLeg(l, ch, st.S, nT, false)
			if ls.estimated {
				return Action{}, false // only roll into listed contracts
			}
			ls.Leg.Premium = round2(ls.mark)
			ns.legs = append(ns.legs, ls)
			openCredit += -ls.sign() * ls.mark
		}
		net := openCredit - closeCost // per share
		ns.credit = st.credit + net
		m := ns.metrics(c)
		earnAhead := earningsBefore(earnings, newExp, now)
		f := fits(m, ns, c, earnAhead)
		_, max, _ := op.DeltaBand(c.Risk)
		bonus, book := 0, []string{}
		switch {
		case tested && m.ShortDelta <= max && net >= 0:
			bonus, book = 15, append(book, fmt.Sprintf("Defends a tested strike for a credit (delta %.2f → %.2f)", cur.ShortDelta, m.ShortDelta))
		case tested && net >= 0:
			bonus, book = 6, append(book, "Buys time on a tested strike for a credit")
		case !tested && cur.DTE <= 7 && captured < 0.5 && net > 0:
			bonus, book = 8, append(book, "Extends duration to keep earning toward the weekly target")
		case !tested && cur.DTE > 21:
			bonus, book = -15, append(book, "Too early to roll: plenty of time left")
		}
		if net < 0 {
			bonus -= 10
			book = append(book, "Costs a net debit")
		}
		value := clamp01(0.5 + net/math.Max(st.credit, 0.01))
		q := float64(st.qty)
		netTotal := round2(net * sharesPerContract * q)
		var strikes []string
		for _, l := range newLegs {
			strikes = append(strikes, money(l.Strike))
		}
		steps := closeSteps(st, st.qty)
		for _, l := range ns.legs {
			side := "Sell to open"
			if l.Action == "buy" {
				side = "Buy to open"
			}
			steps = append(steps, Step{side, st.qty, fmt.Sprintf("%s %s %s %s", st.sym, money(l.Strike), strings.Title(l.Type), newExp.Format("Jan 2")), round2(l.mark)})
		}
		addDays := int(math.Round(daysTo(newExp, st.expiry)))
		goal := 0.0
		if c.NetTarget > 0 {
			goal = round1(m.CreditTotal / c.NetTarget * 100)
		}
		return Action{ID: id, Kind: "roll", Title: title,
			Summary: fmt.Sprintf("Roll to %s expiring %s (+%d days) for a net %s of %s.", strings.Join(strikes, " / "),
				newExp.Format("Jan 2, 2006"), addDays, creditWord(netTotal), money(math.Abs(netTotal))),
			Score: score(f, value, bonus), Factors: factors(f, value), Playbook: book, Steps: steps,
			NetCredit: netTotal, AdditionalDays: addDays, NewExpiry: newExp.Format("2006-01-02"),
			NewStrikes: strings.Join(strikes, " / "), Positioning: m.Moneyness, Result: &m,
			GoalContributionPct: goal, GoalImpactPct: round1(goal - holdGoal),
			NewLegs: legsOf(ns.legs), NewCreditPerShare: round2(ns.credit),
			Tradeoffs: []string{fmt.Sprintf("Keeps capital committed %d more days", addDays)}}, true
	}

	var out []Action
	same := make([]positions.Leg, len(st.legs))
	for i, l := range st.legs {
		same[i] = l.Leg
	}
	if a, ok := build("roll_out", "Roll Out", same); ok {
		out = append(out, a)
	}
	// Single short leg: move the strike back to the band's target delta.
	if len(st.legs) == 1 && st.legs[0].Action == "sell" {
		l := st.legs[0]
		_, _, targetDelta := op.DeltaBand(c.Risk)
		call := l.Type == "call"
		list := ch.Puts
		if call {
			list = ch.Calls
		}
		// Prefer the furthest strike that still rolls for a net credit (and
		// not past the band's target delta); only if none can, accept the
		// target-delta strike for a debit.
		var best, credit *op.Contract
		bestGap, creditDelta := math.Inf(1), math.Inf(1)
		for i := range list {
			k := list[i]
			further := (call && k.Strike > l.Strike) || (!call && k.Strike < l.Strike)
			if !further {
				continue
			}
			ls := priceLeg(positions.Leg{Action: "sell", Type: l.Type, Strike: k.Strike}, ch, st.S, nT, false)
			if ls.estimated {
				continue
			}
			d := math.Abs(ls.delta)
			if gap := math.Abs(d - targetDelta); gap < bestGap {
				best, bestGap = &list[i], gap
			}
			if ls.mark-closeCost >= 0 && d >= targetDelta*0.8 && d < creditDelta {
				credit, creditDelta = &list[i], d
			}
		}
		if credit != nil {
			best = credit
		}
		if best != nil {
			title := "Roll Down & Out"
			if call {
				title = "Roll Up & Out"
			}
			if a, ok := build("roll_shift", title, []positions.Leg{{Action: "sell", Type: l.Type, Strike: best.Strike}}); ok {
				out = append(out, a)
			}
		}
	}
	return out
}

func creditWord(v float64) string {
	if v >= 0 {
		return "credit"
	}
	return "debit"
}

func legsOf(ls []legState) []positions.Leg {
	out := make([]positions.Leg, len(ls))
	for i, l := range ls {
		out[i] = l.Leg
	}
	return out
}

// decide writes the AI decision layer for the recommended action.
func decide(a Assessment, st state, cur Metrics, c Campaign, first op.Chain, expiry, now time.Time) Decision {
	rec := a.Recommendation
	after := cur
	if rec.Result != nil {
		after = *rec.Result
	}
	_, max, _ := op.DeltaBand(c.Risk)
	floor := op.POPFloor(c.Risk)
	capPct := op.CapitalCap(c.Risk) * 100
	ov := a.Overview
	d := Decision{Reasons: []op.Reason{}, Invalidation: []op.Reason{}, RiskChecks: []op.Check{}, ConfidenceFactors: []op.Check{}}
	sym := a.Symbol
	short := mainShortState(st)

	// What changed, in one line.
	var changed []string
	for _, ch := range a.Changes {
		if ch.Tone == "bad" {
			changed = append(changed, strings.ToLower(ch.Label)+" "+ch.From+" → "+ch.To)
		}
	}
	what := "Nothing important has moved against the position"
	if len(changed) > 0 {
		what = "Since entry: " + strings.Join(changed, ", ")
	}
	d.Summary = what + ". Recommended: " + rec.Title + ". " + rec.Summary

	add := func(t, desc string) { d.Reasons = append(d.Reasons, op.Reason{Title: t, Desc: desc}) }
	inv := func(t, desc string) { d.Invalidation = append(d.Invalidation, op.Reason{Title: t, Desc: desc}) }
	switch rec.Kind {
	case "hold":
		add("Still inside your risk band", fmt.Sprintf("Short delta %.2f vs your %s limit of %.2f", cur.ShortDelta, c.Risk, max))
		add("Time decay is working", fmt.Sprintf("%s a day; %.0f%% of the premium captured so far", money(cur.Theta), ov.ProfitCapturedPct))
		add("Probability holds up", fmt.Sprintf("%.0f%% probability of profit (your floor is %.0f%%)", cur.POP, floor))
		inv(fmt.Sprintf("%s crosses %s", sym, money(short.Strike)), "The short strike moves in the money; reassess for a roll.")
		inv(fmt.Sprintf("Delta rises above %.2f", max), "The position leaves your risk band.")
		if ov.Credit > 0 {
			inv(fmt.Sprintf("Cost to close falls below %s", money(ov.Credit*0.5)), "50% of the premium captured: taking profit becomes the better action.")
		}
	case "close":
		if ov.OptionPL > 0 {
			add("Most of the premium is earned", fmt.Sprintf("%.0f%% captured with %d days left", ov.ProfitCapturedPct, cur.DTE))
			add("Little left to gain for the risk", fmt.Sprintf("%s of premium remains against %s at risk", money(ov.CostToClose), riskText(cur.MaxRisk)))
			add("Frees capital for new ideas", fmt.Sprintf("%s of collateral can go to Engine 01's next opportunity", money(cur.Collateral)))
		} else {
			add("The loss has grown past your limit", fmt.Sprintf("%s against a %s credit", signedMoney(ov.OptionPL), money(ov.Credit)))
			add("The short strike is under pressure", fmt.Sprintf("Delta %.2f (%s)", cur.ShortDelta, cur.Moneyness))
		}
		inv("The cost to close changes by more than 10%", "Re-run the assessment before placing the order.")
		inv(fmt.Sprintf("%s moves sharply away from %s", sym, money(short.Strike)), "Holding could become the better choice again.")
	case "roll":
		add("Collects more premium", fmt.Sprintf("Net %s of %s for +%d days", creditWord(rec.NetCredit), money(math.Abs(rec.NetCredit)), rec.AdditionalDays))
		if after.ShortDelta <= max {
			add("Back inside your risk band", fmt.Sprintf("Short delta %.2f → %.2f (limit %.2f)", cur.ShortDelta, after.ShortDelta, max))
		} else {
			add("Lowers the pressure on the strike", fmt.Sprintf("Short delta %.2f → %.2f (limit %.2f)", cur.ShortDelta, after.ShortDelta, max))
		}
		if after.Breakeven != cur.Breakeven {
			add("Moves the effective breakeven", fmt.Sprintf("%s → %s, counting the result locked in by the roll", money(cur.Breakeven), money(after.Breakeven)))
		}
		inv("The roll can't be done for a credit", "If the net credit drops below $0, closing may be better.")
		inv(fmt.Sprintf("%s moves past %s before you roll", sym, rec.NewStrikes), "The new strike would start out tested.")
		if earningsBefore(first.Earnings, expiry.AddDate(0, 0, rec.AdditionalDays), now) {
			inv("Earnings fall inside the new expiry", "Expect a larger move before "+rec.NewExpiry+".")
		}
	case "reduce":
		add("Halves the exposure", rec.Tradeoffs[0])
		add("Locks in part of the result", fmt.Sprintf("%s on the contracts closed", signedMoney(rec.RealizedPL)))
		inv(fmt.Sprintf("%s moves back from %s", sym, money(short.Strike)), "Holding everything could become fine again.")
	}
	if len(a.Alternatives) > 0 {
		alt := a.Alternatives[0]
		add("Beats the alternatives", fmt.Sprintf("Scores %d vs %d for “%s”", rec.Score, alt.Score, alt.Title))
	}

	// Risk after the action.
	if rec.Result != nil {
		d.RiskChecks = append(d.RiskChecks,
			op.Check{Label: "Strike distance", Detail: fmt.Sprintf("Short delta %.2f; your %s limit is %.2f", after.ShortDelta, c.Risk, max), Pass: after.ShortDelta <= max},
			op.Check{Label: "Probability of profit", Detail: fmt.Sprintf("%.0f%%; floor %.0f%%", after.POP, floor), Pass: after.POP >= floor},
		)
		if c.Capital > 0 {
			d.RiskChecks = append(d.RiskChecks, op.Check{Label: "Capital use", Detail: fmt.Sprintf("%.0f%% of campaign capital; limit %.0f%%", after.CapitalUsePct, capPct), Pass: after.CapitalUsePct <= capPct})
		}
		d.RiskChecks = append(d.RiskChecks, op.Check{Label: "Maximum loss", Detail: "Capped at " + riskText(after.MaxRisk), Pass: after.MaxRisk != nil || c.Risk == "high"})
		earn := earningsBefore(first.Earnings, expiry.AddDate(0, 0, rec.AdditionalDays), now)
		d.RiskChecks = append(d.RiskChecks, op.Check{Label: "Earnings", Detail: map[bool]string{true: "Earnings before expiry", false: "No earnings before expiry"}[earn], Pass: !earn})
	} else {
		d.RiskChecks = append(d.RiskChecks, op.Check{Label: "Risk after closing", Detail: "No open risk remains", Pass: true})
	}
	d.WithinLimits = true
	for _, x := range d.RiskChecks {
		d.WithinLimits = d.WithinLimits && x.Pass
	}

	// Confidence: how reliable the data behind this is.
	allLive, anyEst, maxSpread, derived := true, false, 0.0, false
	for _, l := range st.legs {
		allLive = allLive && l.live
		anyEst = anyEst || l.estimated
		maxSpread = math.Max(maxSpread, l.spread)
		derived = derived || l.derived
	}
	total := 0.0
	chk := func(w, v float64, label, detail string, pass bool) {
		total += w * v
		d.ConfidenceFactors = append(d.ConfidenceFactors, op.Check{Label: label, Detail: detail, Pass: pass})
	}
	chk(0.30, map[bool]float64{true: 1, false: 0.35}[allLive], "Live quotes",
		map[bool]string{true: "Every leg priced from its bid and ask", false: "Priced from last trades (market closed)"}[allLive], allLive)
	chk(0.20, map[bool]float64{true: 0.3, false: 1}[anyEst], "Contracts found",
		map[bool]string{true: "A leg isn't listed; its value is a model estimate", false: "Every leg found in the option chain"}[anyEst], !anyEst)
	chk(0.20, clamp01(1-maxSpread/0.2), "Tight market", fmt.Sprintf("Widest bid-ask spread %.0f%%", maxSpread*100), allLive && maxSpread <= 0.1)
	chk(0.15, map[bool]float64{true: 0.5, false: 1}[a.Entry.Reconstructed], "Entry assumptions",
		map[bool]string{true: "Reconstructed from the opening date's close", false: "Recorded when the position was opened"}[a.Entry.Reconstructed], !a.Entry.Reconstructed)
	chk(0.15, map[bool]float64{true: 0.6, false: 1}[derived], "Volatility from the market",
		map[bool]string{true: "Implied volatility re-derived from prices", false: "Implied volatility quoted by the feed"}[derived], !derived)
	d.ConfidencePct = int(math.Round(total * 100))
	switch {
	case d.ConfidencePct >= 75:
		d.Confidence = "High"
	case d.ConfidencePct >= 50:
		d.Confidence = "Medium"
	default:
		d.Confidence = "Low"
	}

	d.Disclosures = []string{
		"This is decision support, not financial advice. Confirming records the change in your portfolio; place the order with your broker.",
		"Probabilities and Greeks are Black-Scholes estimates from implied volatility, not guarantees.",
		"Prices are as of the assessment time; check live quotes before placing an order.",
	}
	if rec.Kind == "roll" {
		d.Disclosures = append(d.Disclosures, "A roll is two orders (close and open); fill prices can differ, so use a net-credit limit order.")
	}
	if a.StrategyKey == "covered_call" || a.StrategyKey == "csp" {
		d.Disclosures = append(d.Disclosures, "Short options can be assigned early, especially in the money or before an ex-dividend date.")
	}
	return d
}
