package insights

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"optiontrading/backend/internal/market"
	"optiontrading/backend/internal/quotes"
)

// MaxQuestionLen caps the free-text question sent to the model.
const MaxQuestionLen = 300

// cacheTTL reuses an answer for the same symbol + question, which keeps the
// screener fast and well inside Groq's rate limits.
const cacheTTL = 10 * time.Minute

const Disclaimer = "AI-generated research to support your own decision, not investment advice. " +
	"Options involve substantial risk; verify the data and consider your own situation before trading."

var (
	// ErrNotConfigured is returned when no Groq API key is set.
	ErrNotConfigured = errors.New("AI screener is not configured (set GROQ_API_KEY in backend/.env)")
	// ErrBadAnswer is returned when the model's reply can't be used.
	ErrBadAnswer = errors.New("the AI returned an unusable answer")
)

// Ratings, from best to worst for an option seller right now.
const (
	RatingGood   = "good"
	RatingMedium = "medium"
	RatingPoor   = "poor"
)

// OptionIdea is a suggested way to sell premium on the stock.
type OptionIdea struct {
	Strategy  string `json:"strategy"`
	Rationale string `json:"rationale"`
}

// Analysis is the screener's answer for one stock.
type Analysis struct {
	Symbol      string     `json:"symbol"`
	Name        string     `json:"name"`
	Exchange    string     `json:"exchange"`
	Currency    string     `json:"currency"`
	Question    string     `json:"question,omitempty"`
	Rating      string     `json:"rating"`  // good | medium | poor
	Outlook     string     `json:"outlook"` // bullish | neutral | bearish
	Confidence  string     `json:"confidence"`
	Headline    string     `json:"headline"`
	Summary     string     `json:"summary"`
	Answer      string     `json:"answer,omitempty"` // reply to the user's own question
	Reasons     []string   `json:"reasons"`
	Risks       []string   `json:"risks"`
	OptionIdea  OptionIdea `json:"optionIdea"`
	Metrics     Metrics    `json:"metrics"`
	MarketPhase string     `json:"marketPhase"`
	Model       string     `json:"model"`
	GeneratedAt time.Time  `json:"generatedAt"`
	Disclaimer  string     `json:"disclaimer"`
}

// Service builds analyses from live quotes and a Completer.
type Service struct {
	quotes *quotes.Service
	llm    Completer // nil when no API key is configured
	model  string
	now    func() time.Time

	mu    sync.Mutex
	cache map[string]cached
}

type cached struct {
	at time.Time
	a  Analysis
}

func NewService(q *quotes.Service, llm Completer, model string) *Service {
	return &Service{quotes: q, llm: llm, model: model, now: time.Now, cache: map[string]cached{}}
}

// Analyze rates symbol for an option seller, optionally answering question.
func (s *Service) Analyze(ctx context.Context, symbol, question string) (Analysis, error) {
	if s.llm == nil {
		return Analysis{}, ErrNotConfigured
	}
	question = strings.TrimSpace(question)
	key := symbol + "|" + strings.ToLower(question)
	now := s.now()

	s.mu.Lock()
	if c, ok := s.cache[key]; ok && now.Sub(c.at) < cacheTTL {
		s.mu.Unlock()
		return c.a, nil
	}
	s.mu.Unlock()

	q, err := s.quotes.Get(ctx, symbol)
	if err != nil {
		return Analysis{}, err
	}
	yearRange, _ := quotes.ParseRange("1Y")
	var daily []quotes.Point
	if h, err := s.quotes.History(ctx, symbol, yearRange); err == nil {
		daily = h.Points
	} // without history the model still gets the quote; metrics stay nil
	metrics := computeMetrics(q, daily)
	status := market.StatusAt(now)

	reply, err := s.llm.Complete(ctx, systemPrompt, userPrompt(q, metrics, status, question))
	if err != nil {
		return Analysis{}, err
	}
	a, err := parseAnswer(reply)
	if err != nil {
		return Analysis{}, err
	}
	a.Symbol, a.Name, a.Exchange, a.Currency = q.Symbol, q.Name, q.Exchange, q.Currency
	a.Question = question
	a.Metrics = metrics
	a.MarketPhase = status.Phase
	a.Model = s.model
	a.GeneratedAt = now.UTC()
	a.Disclaimer = Disclaimer

	s.mu.Lock()
	s.cache[key] = cached{at: now, a: a}
	s.mu.Unlock()
	return a, nil
}

const systemPrompt = `You are a careful equity and options research assistant for OPTION SELLERS
(covered calls, cash-secured puts, credit spreads, iron condors). You support decisions; you never
promise returns or tell the user to trade.

Rate the stock for selling options over the next 2-6 weeks using ONLY the data given:
- "good": orderly trend or stable range, volatility high enough to pay meaningful premium but not
  extreme, price not at a dangerous extreme, clear strikes with room to be wrong.
- "medium": usable with caution (mixed trend, very low or elevated volatility, near a 52-week extreme).
- "poor": unfavourable now (sharp downtrend, erratic or extreme volatility, missing data).

Reply with ONE JSON object, no markdown, exactly these keys:
{
  "rating": "good" | "medium" | "poor",
  "outlook": "bullish" | "neutral" | "bearish",
  "confidence": "low" | "medium" | "high",
  "headline": "max 12 words",
  "summary": "2-3 plain-English sentences",
  "answer": "direct reply to the user's question, or empty string if none",
  "reasons": ["3-4 short points citing the numbers"],
  "risks": ["2-3 short points"],
  "optionIdea": {"strategy": "e.g. Cash-Secured Put ~5% OTM, 30-45 DTE", "rationale": "one sentence"}
}
Use plain ASCII hyphens. Never invent news, earnings dates or implied volatility you weren't given;
say when data is missing.`

func userPrompt(q quotes.Quote, m Metrics, st market.Status, question string) string {
	data, _ := json.MarshalIndent(m, "", "  ")
	var b strings.Builder
	fmt.Fprintf(&b, "Stock: %s (%s, %s), currency %s\n", q.Symbol, q.Name, q.Exchange, q.Currency)
	fmt.Fprintf(&b, "US market right now: %s\n", st.Phase)
	fmt.Fprintf(&b, "Computed metrics (returns and volatility in %%; nulls are unavailable):\n%s\n", data)
	if question != "" {
		fmt.Fprintf(&b, "\nThe user asks: %q\nAnswer it directly in \"answer\" (required, 1-3 sentences).\n", question)
	}
	return b.String()
}

// Models like typographic hyphens (U+2010, U+2011) that many web fonts lack.
var hyphens = strings.NewReplacer("‐", "-", "‑", "-")

func parseAnswer(reply string) (Analysis, error) {
	reply = hyphens.Replace(reply)
	// Some models wrap JSON in prose or code fences; take the outermost object.
	start, end := strings.Index(reply, "{"), strings.LastIndex(reply, "}")
	if start < 0 || end <= start {
		return Analysis{}, ErrBadAnswer
	}
	var a Analysis
	if err := json.Unmarshal([]byte(reply[start:end+1]), &a); err != nil {
		return Analysis{}, fmt.Errorf("%w: %v", ErrBadAnswer, err)
	}
	a.Rating = strings.ToLower(strings.TrimSpace(a.Rating))
	switch a.Rating {
	case RatingGood, RatingMedium, RatingPoor:
	default:
		return Analysis{}, fmt.Errorf("%w: rating %q", ErrBadAnswer, a.Rating)
	}
	a.Outlook = oneOf(a.Outlook, "neutral", "bullish", "neutral", "bearish")
	a.Confidence = oneOf(a.Confidence, "medium", "low", "medium", "high")
	if a.Reasons == nil {
		a.Reasons = []string{}
	}
	if a.Risks == nil {
		a.Risks = []string{}
	}
	return a, nil
}

func oneOf(v, fallback string, allowed ...string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	for _, a := range allowed {
		if v == a {
			return v
		}
	}
	return fallback
}
