package opportunities

import "math"

// Black-Scholes helpers. Yahoo gives implied volatility but no Greeks, so
// delta and the probability of finishing out of the money are derived here.

const riskFreeRate = 0.045 // annual, close to short-term US Treasury yields

func normCDF(x float64) float64 { return 0.5 * math.Erfc(-x/math.Sqrt2) }

// d1d2 for spot S, strike K, years T, volatility v.
func d1d2(S, K, T, v float64) (float64, float64, bool) {
	if S <= 0 || K <= 0 || T <= 0 || v <= 0 {
		return 0, 0, false
	}
	d1 := (math.Log(S/K) + (riskFreeRate+v*v/2)*T) / (v * math.Sqrt(T))
	return d1, d1 - v*math.Sqrt(T), true
}

// Delta of a call (0..1) or put (-1..0).
func Delta(call bool, S, K, T, v float64) float64 {
	d1, _, ok := d1d2(S, K, T, v)
	if !ok {
		if call {
			return boolF(S > K)
		}
		return -boolF(S < K)
	}
	if call {
		return normCDF(d1)
	}
	return normCDF(d1) - 1
}

// ProbOTM is the risk-neutral probability the option expires worthless —
// what a seller wants.
func ProbOTM(call bool, S, K, T, v float64) float64 {
	_, d2, ok := d1d2(S, K, T, v)
	if !ok {
		if call {
			return boolF(S <= K)
		}
		return boolF(S >= K)
	}
	if call {
		return 1 - normCDF(d2)
	}
	return normCDF(d2)
}

// ProbBetween is the probability S ends between lo and hi (short strangles,
// condors, straddle break-evens).
func ProbBetween(S, lo, hi, T, v float64) float64 {
	pAboveLo := 1 - ProbOTM(false, S, lo, T, v) // put at lo expires ITM ⇒ below lo
	pAboveHi := 1 - ProbOTM(true, S, hi, T, v)  // call at hi expires ITM ⇒ above hi
	p := 1 - pAboveLo - pAboveHi
	return math.Max(0, math.Min(1, p))
}

func boolF(b bool) float64 {
	if b {
		return 1
	}
	return 0
}

func normPDF(x float64) float64 { return math.Exp(-x*x/2) / math.Sqrt(2*math.Pi) }

// Price is the Black-Scholes value of one option (per share).
func Price(call bool, S, K, T, v float64) float64 {
	d1, d2, ok := d1d2(S, K, T, v)
	if !ok {
		if call {
			return math.Max(0, S-K)
		}
		return math.Max(0, K-S)
	}
	disc := K * math.Exp(-riskFreeRate*T)
	if call {
		return S*normCDF(d1) - disc*normCDF(d2)
	}
	return disc*normCDF(-d2) - S*normCDF(-d1)
}

// Theta is the option's value change per calendar day (negative for a long
// option, so a seller earns -Theta each day).
func Theta(call bool, S, K, T, v float64) float64 {
	d1, d2, ok := d1d2(S, K, T, v)
	if !ok {
		return 0
	}
	decay := -S * normPDF(d1) * v / (2 * math.Sqrt(T))
	disc := riskFreeRate * K * math.Exp(-riskFreeRate*T)
	if call {
		return (decay - disc*normCDF(d2)) / 365
	}
	return (decay + disc*normCDF(-d2)) / 365
}

// ImpliedVol solves Price(v) = premium by bisection. ok is false when the
// premium is below intrinsic value or no volatility in 1%..500% fits.
func ImpliedVol(call bool, S, K, T, premium float64) (float64, bool) {
	if premium <= 0 || T <= 0 {
		return 0, false
	}
	lo, hi := 0.01, 5.0
	if premium < Price(call, S, K, T, lo) || premium > Price(call, S, K, T, hi) {
		return 0, false
	}
	for i := 0; i < 80; i++ {
		mid := (lo + hi) / 2
		if Price(call, S, K, T, mid) < premium {
			lo = mid
		} else {
			hi = mid
		}
	}
	return (lo + hi) / 2, true
}
