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

Variables can also be set in `backend/.env` (read at startup; real environment variables win).

## Layout

```
cmd/server/          main: config, wiring, graceful shutdown
internal/config/     environment settings
internal/store/      SQLite connection + numbered schema migrations (PRAGMA user_version)
internal/approaches/ trade approach model, validation, options catalogue, repository, demo seed
internal/market/     NYSE trading calendar (hours, holidays, early closes)
internal/quotes/     Yahoo Finance client (quotes + history ranges) + TTL cache with request de-duplication
internal/insights/   AI screener: live metrics (trend, returns, volatility) + Groq client
internal/api/        HTTP handlers, SSE stream, middleware (logging, recovery, CORS)
```

## Database

SQLite via [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite) — pure Go, so no C compiler is needed. The file
is created at `DB_PATH` on first start and migrated automatically. To add a table or column, **append** a statement to
`migrations` in `internal/store/store.go` (never edit one that has already run). Delete the file to start fresh.

## Caveats

- **Data source.** Quotes come from Yahoo Finance's free, unofficial chart API: near real-time for US equities, no
  API key, but no SLA and it may rate-limit or change. For production use a licensed feed (Polygon, IEX Cloud,
  Alpaca, …) by implementing the `quotes.Fetcher` interface.
- **Holiday calendar.** `internal/market/calendar.go` lists NYSE holidays and early closes for 2026–2027. Add each
  new year's dates from the NYSE website; unlisted dates are treated as normal weekdays.
- **Campaign usage.** `usedInCampaigns` is seeded directly until campaigns are stored in the backend and can
  reference approaches; deleting an approach with a non-zero count is refused.
