package quotes

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"sync"
	"time"
)

// MaxSymbols caps one request so a client can't fan out hundreds of upstream calls.
const MaxSymbols = 50

const fetchConcurrency = 8

var symbolPattern = regexp.MustCompile(`^[A-Z0-9][A-Z0-9.\-^=]{0,14}$`)

// ErrInvalidSymbol is returned for malformed tickers.
var ErrInvalidSymbol = errors.New("invalid symbol")

// NormalizeSymbol upper-cases and validates a ticker.
func NormalizeSymbol(s string) (string, error) {
	s = strings.ToUpper(strings.TrimSpace(s))
	if !symbolPattern.MatchString(s) {
		return "", ErrInvalidSymbol
	}
	return s, nil
}

// Fetcher is the upstream source (Client in production, a fake in tests).
type Fetcher interface {
	Fetch(ctx context.Context, symbol string) (Quote, error)
	History(ctx context.Context, symbol string, r Range) (History, error)
}

// Service serves cached quotes and price history.
type Service struct {
	upstream Fetcher
	ttl      time.Duration
	now      func() time.Time
	quotes   *cache[Quote]
	history  *cache[History]
}

func NewService(upstream Fetcher, ttl time.Duration) *Service {
	return &Service{
		upstream: upstream,
		ttl:      ttl,
		now:      time.Now,
		quotes:   newCache[Quote](),
		history:  newCache[History](),
	}
}

// Get returns a quote no older than the TTL (or a recent one if Yahoo fails).
func (s *Service) Get(ctx context.Context, symbol string) (Quote, error) {
	q, isStale, err := s.quotes.get(symbol, s.ttl, s.now(), func() (Quote, error) {
		return s.upstream.Fetch(ctx, symbol)
	})
	if err == nil && isStale {
		q.Stale = true
	}
	return q, err
}

// History returns price points for the range, cached per range (see Range.TTL).
func (s *Service) History(ctx context.Context, symbol string, r Range) (History, error) {
	h, _, err := s.history.get(symbol+"|"+r.Key, r.TTL, s.now(), func() (History, error) {
		return s.upstream.History(ctx, symbol, r)
	})
	return h, err
}

// Result is one symbol's outcome in GetMany.
type Result struct {
	Quote Quote
	Err   error
}

// GetMany fetches several symbols concurrently (bounded), keyed by symbol.
func (s *Service) GetMany(ctx context.Context, symbols []string) map[string]Result {
	out := make(map[string]Result, len(symbols))
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, fetchConcurrency)
	for _, sym := range symbols {
		wg.Add(1)
		go func(sym string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			q, err := s.Get(ctx, sym)
			mu.Lock()
			out[sym] = Result{Quote: q, Err: err}
			mu.Unlock()
		}(sym)
	}
	wg.Wait()
	return out
}
