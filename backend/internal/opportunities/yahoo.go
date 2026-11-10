// Package opportunities is Engine 01, the AI Opportunity Discovery Engine:
// for each active campaign it scans the campaign's watchlist with live option
// chains and ranks option-selling trades that fit the campaign's approach and
// goal.
package opportunities

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Contract is one option from a chain.
type Contract struct {
	Symbol       string  `json:"contractSymbol"`
	Strike       float64 `json:"strike"`
	Bid          float64 `json:"bid"`
	Ask          float64 `json:"ask"`
	LastPrice    float64 `json:"lastPrice"`
	Volume       int64   `json:"volume"`
	OpenInterest int64   `json:"openInterest"`
	IV           float64 `json:"impliedVolatility"`
	Expiration   int64   `json:"expiration"`
	InTheMoney   bool    `json:"inTheMoney"`
}

// Chain is the underlying quote plus calls and puts for one expiry.
type Chain struct {
	Symbol      string
	Price       float64
	Expiration  time.Time
	Expirations []time.Time
	Earnings    time.Time // zero if unknown
	ExDividend  time.Time // zero if unknown
	Calls, Puts []Contract
}

// ChainSource fetches option chains (Yahoo in production, a fake in tests).
type ChainSource interface {
	// Chain returns the chain for expiry (zero time = nearest expiry).
	Chain(ctx context.Context, symbol string, expiry time.Time) (Chain, error)
}

var ErrNoChain = errors.New("no option chain for symbol")

// Yahoo reads /v7/finance/options. Yahoo requires a session cookie and a
// "crumb" token; both are fetched lazily and refreshed on 401.
type Yahoo struct {
	HTTP *http.Client
	Base string // https://query2.finance.yahoo.com

	mu    sync.Mutex
	crumb string
	cache map[string]cachedChain
}

type cachedChain struct {
	at    time.Time
	chain Chain
}

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"

// chainTTL keeps Yahoo traffic low; the engine refreshes every few minutes.
const chainTTL = 2 * time.Minute

func NewYahoo() *Yahoo {
	jar, _ := cookiejar.New(nil)
	return &Yahoo{
		HTTP:  &http.Client{Timeout: 10 * time.Second, Jar: jar},
		Base:  "https://query2.finance.yahoo.com",
		cache: map[string]cachedChain{},
	}
}

func (y *Yahoo) get(ctx context.Context, u string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/json,text/plain,*/*")
	return y.HTTP.Do(req)
}

// session makes sure we hold a cookie + crumb.
func (y *Yahoo) session(ctx context.Context, force bool) (string, error) {
	y.mu.Lock()
	defer y.mu.Unlock()
	if y.crumb != "" && !force {
		return y.crumb, nil
	}
	if res, err := y.get(ctx, "https://fc.yahoo.com"); err == nil { // sets the A3 cookie (404 is normal)
		io.Copy(io.Discard, res.Body)
		res.Body.Close()
	}
	res, err := y.get(ctx, y.Base+"/v1/test/getcrumb")
	if err != nil {
		return "", fmt.Errorf("yahoo crumb: %w", err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(res.Body, 256))
	crumb := strings.TrimSpace(string(b))
	if res.StatusCode != http.StatusOK || crumb == "" || strings.ContainsAny(crumb, "{<") {
		return "", fmt.Errorf("yahoo crumb: status %d", res.StatusCode)
	}
	y.crumb = crumb
	return crumb, nil
}

type optionsResponse struct {
	OptionChain struct {
		Result []struct {
			UnderlyingSymbol string  `json:"underlyingSymbol"`
			ExpirationDates  []int64 `json:"expirationDates"`
			Quote            struct {
				RegularMarketPrice float64 `json:"regularMarketPrice"`
				EarningsTimestamp  int64   `json:"earningsTimestamp"`
				ExDividendDate     int64   `json:"exDividendDate"`
				DividendDate       int64   `json:"dividendDate"`
			} `json:"quote"`
			Options []struct {
				ExpirationDate int64      `json:"expirationDate"`
				Calls          []Contract `json:"calls"`
				Puts           []Contract `json:"puts"`
			} `json:"options"`
		} `json:"result"`
		Error *struct {
			Description string `json:"description"`
		} `json:"error"`
	} `json:"optionChain"`
}

func (y *Yahoo) Chain(ctx context.Context, symbol string, expiry time.Time) (Chain, error) {
	key := symbol
	if !expiry.IsZero() {
		key += fmt.Sprintf("|%d", expiry.Unix())
	}
	y.mu.Lock()
	if c, ok := y.cache[key]; ok && time.Since(c.at) < chainTTL {
		y.mu.Unlock()
		return c.chain, nil
	}
	y.mu.Unlock()

	var body optionsResponse
	for attempt := 0; attempt < 2; attempt++ {
		crumb, err := y.session(ctx, attempt > 0)
		if err != nil {
			return Chain{}, err
		}
		q := url.Values{"crumb": {crumb}}
		if !expiry.IsZero() {
			q.Set("date", fmt.Sprint(expiry.Unix()))
		}
		res, err := y.get(ctx, fmt.Sprintf("%s/v7/finance/options/%s?%s", y.Base, url.PathEscape(symbol), q.Encode()))
		if err != nil {
			return Chain{}, fmt.Errorf("yahoo options %s: %w", symbol, err)
		}
		if res.StatusCode == http.StatusUnauthorized {
			res.Body.Close()
			continue // stale crumb: refresh once
		}
		err = json.NewDecoder(io.LimitReader(res.Body, 8<<20)).Decode(&body)
		res.Body.Close()
		if err != nil {
			return Chain{}, fmt.Errorf("yahoo options %s: status %d: %w", symbol, res.StatusCode, err)
		}
		break
	}
	if len(body.OptionChain.Result) == 0 {
		return Chain{}, ErrNoChain
	}
	r := body.OptionChain.Result[0]
	ch := Chain{Symbol: r.UnderlyingSymbol, Price: r.Quote.RegularMarketPrice}
	for _, ts := range r.ExpirationDates {
		ch.Expirations = append(ch.Expirations, time.Unix(ts, 0).UTC())
	}
	if r.Quote.EarningsTimestamp > 0 {
		ch.Earnings = time.Unix(r.Quote.EarningsTimestamp, 0).UTC()
	}
	if d := r.Quote.ExDividendDate; d > 0 {
		ch.ExDividend = time.Unix(d, 0).UTC()
	} else if d := r.Quote.DividendDate; d > 0 {
		ch.ExDividend = time.Unix(d, 0).UTC()
	}
	if len(r.Options) > 0 {
		ch.Expiration = time.Unix(r.Options[0].ExpirationDate, 0).UTC()
		ch.Calls, ch.Puts = r.Options[0].Calls, r.Options[0].Puts
	}
	if ch.Price <= 0 {
		return Chain{}, ErrNoChain
	}

	y.mu.Lock()
	y.cache[key] = cachedChain{at: time.Now(), chain: ch}
	y.mu.Unlock()
	return ch, nil
}
