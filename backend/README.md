# Option Trading — Backend (Go)

HTTP API for the React frontend in `../frontend`: live stock quotes, US market status and trade approaches
(stored in SQLite).

## Run

```bash
cd backend
go run ./cmd/server          # listens on :8085
```

Then start the frontend (`cd ../frontend && npm start`). Its dev server proxies `/api/*` to `http://localhost:8085`
(see `frontend/src/setupProxy.js`; override with `BACKEND_URL`).

Build a binary: `go build -o bin/server ./cmd/server`. Tests: `go test ./...`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/market/status` | `{ isOpen, phase, nextOpen, nextClose, earlyClose, holiday }` from the NYSE calendar |
| GET | `/api/market/quote/{symbol}?series=1` | One quote; `series=1` adds today's 5-minute closes |
| GET | `/api/market/quotes?symbols=AAPL,MSFT` | Up to 50 quotes; per-symbol failures listed in `errors` |
| GET | `/api/market/history/{symbol}?range=1D` | Chart series `{ baseline, points: [{t, p}] }` for `1D 1W 1M 3M 6M 1Y 3Y 5Y ALL` (1-min bars for 1D … monthly for ALL); `baseline` is the previous close for 1D, else the first point |
| GET | `/api/approaches` | List trade approaches |
| GET | `/api/approaches/options` | Allowed values: 16 strategies, moneyness, holding periods, risks, assignment handling, presets |
| GET | `/api/approaches/{id}` | One approach |
| POST | `/api/approaches` | Create → 201. Invalid input → 422 `{ error, fields: { field: message } }`; duplicate name → 409 |
| PUT | `/api/approaches/{id}` | Update (same validation) |
| DELETE | `/api/approaches/{id}` | Delete → 204; 409 if campaigns still use it |
| GET | `/api/market/stream?symbols=AAPL,MSFT&series=1` | Server-Sent Events: `status` (on connect and on change) and `quotes` (every 5 s while open, 60 s while closed) |
| POST | `/api/screener/ask` | AI screener. Body `{ "symbol": "AAPL", "question": "optional" }` → rating `good`/`medium`/`poor`, outlook, reasons, risks, option idea and the live metrics used. 503 without `GROQ_API_KEY`; answers cached 10 min |
| GET | `/api/profile` | Signed-in user's profile (`X-User-Id`): `{ profile }`, or `{ profile: null }` if never saved |
| PUT | `/api/profile` | Save name, phone, country (ISO code), language (`en hi es de fr ru`), time zone (IANA), date format and photo (data URL ≤ 300 KB). 422 `{ error, fields }` on invalid input; also renames the account |
| GET | `/api/auth/me` · POST `/api/auth/change-password` | Current account; change password (`currentPassword`, `newPassword`) |
| GET | `/api/opportunities?campaignId=` | **Engine 01** ranked option-selling ideas for that (else the active) campaign: score, POP, Greeks, yield, sizing, reasons, warnings. 404 `no_campaign`, 422 `no_watchlist`, 502 if option data is down |
| GET | `/api/campaigns/{id}/opportunities` · POST `…/opportunities/refresh` | Same for one campaign; `refresh` rescans now |
| GET | `/api/positions/intelligence` | **Engine 02**: every open position with health (`action_needed` `expired` `watch` `healthy` `needs_details`), recommended action, P&L, Greeks, IV, goal contribution; most urgent first |
| GET | `/api/positions/{id}/intelligence` | Full assessment: overview, entry vs now (“what changed”), recommended action + scored alternatives with the resulting position, decision layer. `?refresh=1` reassesses now |
| POST | `/api/positions/{id}/actions` | `{actionId, reviewedNetCredit}` apply a confirmed action (hold / close / roll / reduce / record expiry): reprices first, 409 `stale` if it moved; records trade log + campaign earnings |
| GET | `/api/opportunities/{oppId}` | One opportunity from the user's latest scans, with the campaign goal it was scored against |

`phase` is one of `pre-market` (4:00–9:30 ET), `open`, `after-hours` (close–20:00 ET) or `closed`.

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8085` | Listen port |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated origins allowed by CORS (only needed when the frontend isn't served through the proxy) |
| `QUOTE_CACHE_TTL` | `4s` | How long a fetched quote is reused (all viewers share one upstream call) |
| `STREAM_INTERVAL_OPEN` | `5s` | Stream push interval while the market is open |
| `STREAM_INTERVAL_CLOSED` | `60s` | Stream push interval while closed |
| `DB_PATH` | `data/optiontrading.db` | SQLite database file (created on first run) |
| `SEED_DEMO_DATA` | `true` | Insert the four example approaches into an empty database |
| `GROQ_API_KEY` | — | Groq key for the AI screener. Put it in `backend/.env` (git-ignored; see `.env.example`) |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq chat model the screener uses |
| `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | — | Email for password-reset codes. Without `SMTP_HOST` the code is printed in the backend log (development only) |

Variables can also be set in `backend/.env` (read at startup; real environment variables win).

## Layout

```
cmd/server/          main: config, wiring, graceful shutdown
internal/config/     environment settings
internal/store/      SQLite connection + numbered schema migrations (PRAGMA user_version)
internal/approaches/ trade approach model, validation, options catalogue, repository, demo seed
internal/market/     NYSE trading calendar (hours, holidays, early closes)
internal/quotes/     Yahoo Finance client (quotes + history ranges) + TTL cache with request de-duplication
internal/profiles/   user profile + regional preferences (validation, storage)
internal/insights/   AI screener: live metrics (trend, returns, volatility) + Groq client
internal/opportunities/ Engine 01: Yahoo option chains (cookie + crumb), Black-Scholes Greeks, candidate
                     trades per strategy, scoring against the campaign, cached scans + background refresh
internal/api/        HTTP handlers, SSE stream, middleware (logging, recovery, CORS)
```

## Database

SQLite via [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite) — pure Go, so no C compiler is needed. The file
is created at `DB_PATH` on first start and migrated automatically. To add a table or column, **append** a statement to
`migrations` in `internal/store/store.go` (never edit one that has already run). Delete the file to start fresh.

## Engine 01 — AI Opportunity Discovery

Always on after a campaign is created. For every running campaign with a watchlist it:

1. **Reads the inputs**: campaign capital, goal, dates and earnings (required annualized return, weekly target);
   the watchlist's tickers; the approach (strategies, moneyness, holding duration, market outlook, risk).
2. **Pulls live option chains** from Yahoo for up to two expiries inside the holding window
   (intraday 0–2 days, 1–7 days, 7–31 days, 28–63 days). Yahoo has no Greeks, so delta, theta and
   probabilities come from Black-Scholes on implied volatility. Outside market hours bid/ask are 0 and IV is
   bogus, so the last trade is used and IV is re-derived from it (marked `priceSource: last-trade`).
3. **Builds candidates**: covered calls and cash-secured puts by delta band (low 0.06–0.18, moderate 0.14–0.30,
   high 0.24–0.42; ATM = nearest strike, ITM = 0.55–0.75), short strangles/straddles (Reg-T margin estimate)
   and iron condors (wings ≈ 5% away). The outlook nudges the strikes (bullish sells puts closer, calls further).
4. **Filters** contracts with no price or a bid-ask spread over 50%, trades bigger than the campaign's capital,
   and, for low-risk campaigns, trades that span earnings.
5. **Scores 0–100**: goal fit 30 (yield vs the return the goal needs), probability of profit 25, liquidity 15
   (spread, open interest), risk fit 15 (capital share vs the risk level's 15/25/40% cap, undefined risk,
   earnings) and outlook fit 15. It keeps the best contract per symbol and strategy and returns the top 25,
   with key reasons and warnings (earnings, ex-dividend, undefined risk, stale prices, past campaign end).

Scans are stored in `opportunity_scans` and served from there until they are 10 minutes old while the market
is open (3 hours otherwise), or until anything the engine reads changes (settings, watchlist, earnings).
A background loop checks every minute. Live test: `go test -tags live -run Live -v ./internal/opportunities/`.

## Engine 02 — Existing Position Intelligence

Monitors open positions (it never discovers new trades). For each one it:

1. **Monitors**: reprices every leg from the live chain (mark, IV, delta, theta, spread); unlisted expiries or
   strikes are estimated with Black-Scholes and flagged. Earnings before expiry are tracked.
2. **Reassesses** against the entry assumptions (underlying, IV, delta, POP stored when the position was opened,
   or reconstructed from the opening day's close for older positions), the campaign's risk band (delta, POP floor,
   capital cap) and the goal's pace.
3. **Finds the best action** by scoring hold, close (take profit / cut loss), roll out, roll up/down & out (tries
   expiries about 2, 4 and 6 weeks out and prefers strikes that still roll for a credit) and reduce (half the
   contracts). Score = safety 45 + income 30 + value 25, plus playbook rules (50%/80% take-profit, 2× stop-loss,
   avoid assignment, defend a tested strike for a credit, …). Hold wins ties within 2 points to avoid churn.
4. **Recommends** with what changed, the resulting position (breakeven, POP, max risk, Greeks, exposure, goal
   contribution), reasons, invalidation conditions, data-reliability confidence and disclosures.
5. **Applies** what the user confirms after re-pricing: close/expiry closes the position, reduce lowers the
   quantity, roll closes and opens the new position (linked by `rolled_from`); realized P&L goes to the trade log and the
   campaign's earnings.

A background loop reassesses every open position each minute when stale (5 min while the market is open,
2 h otherwise) and raises a notification when a position newly needs an action. Covered calls are judged on the
combined option + share P&L. Positions without legs or with an invalid expiry are reported as `needs_details`,
and the details page offers a form to supply them.

## Caveats

- **Data source.** Quotes come from Yahoo Finance's free, unofficial chart API: near real-time for US equities, no
  API key, but no SLA and it may rate-limit or change. For production use a licensed feed (Polygon, IEX Cloud,
  Alpaca, …) by implementing the `quotes.Fetcher` interface.
- **Holiday calendar.** `internal/market/calendar.go` lists NYSE holidays and early closes for 2026–2027. Add each
  new year's dates from the NYSE website; unlisted dates are treated as normal weekdays.
- **Campaign usage.** `usedInCampaigns` is seeded directly until campaigns are stored in the backend and can
  reference approaches; deleting an approach with a non-zero count is refused.
