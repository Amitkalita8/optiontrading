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

`phase` is one of `pre-market` (4:00–9:30 ET), `open`, `after-hours` (close–20:00 ET) or `closed`.

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8085` | Listen port |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated origins allowed by CORS (only needed when the frontend isn't served through the proxy) |
| `QUOTE_CACHE_TTL` | `4s` | How long a fetched quote is reused (all viewers share one upstream call) |
| `STREAM_INTERVAL_OPEN` | `5s` | Stream push interval while the market is open |
| `STREAM_INTERVAL_CLOSED` | `60s` | Stream push interval while closed |
| `DATABASE_URL` | — | PostgreSQL connection, e.g. `postgres://postgres:PASSWORD@localhost:5432/optiontrading?sslmode=disable`. When set the app uses Postgres; otherwise SQLite |
| `DB_PATH` | `data/optiontrading.db` | SQLite database file (created on first run), used when `DATABASE_URL` is empty |
| `SEED_DEMO_DATA` | `true` | Insert the four example approaches into an empty database |
| `GROQ_API_KEY` | — | Groq key for the AI screener. Put it in `backend/.env` (git-ignored; see `.env.example`) |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq chat model the screener uses |
| `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | — | Email for password-reset codes. Without `SMTP_HOST` the code is printed in the backend log (development only) |
| `SESSION_SECRET` | random | Signs sign-in sessions. Set a long random value in production; without it everyone is signed out when the server restarts |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID (same as the frontend's `REACT_APP_GOOGLE_CLIENT_ID`). Needed for Google sign-in: the backend checks Google tokens were issued to it |
| `DB_ADMIN_PASSWORD` | — | Password for the `/phpmyadmin` viewer (user `root`). Without it the viewer uses the local default password, and in production it is turned off |
| `SEED_DEMO_USERS` | `true` | Add the demo accounts (known passwords) to an empty users table. Always off in production |
| `RENDER` / `APP_ENV=production` | — | Production mode (Render sets `RENDER` itself) |

### Sign-in

Login, sign-up and `POST /api/auth/google` return `{user, token}`. The frontend sends the token as
`Authorization: Bearer <token>` and the backend reads the user from it (an HMAC-signed email + expiry, 30 days).
Requests without a token use the shared `default` demo user; an expired or invalid token gets `401 session_expired`.
Passwords are stored with bcrypt; older SHA-256 hashes still work and are upgraded at the next login.

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
internal/api/        HTTP handlers, SSE stream, middleware (logging, recovery, CORS)
```

## Database

**PostgreSQL** (when `DATABASE_URL` is set) or **SQLite** (default). Both get the same tables, created and migrated
automatically at startup; the server logs which one it uses.

Switching an existing install to Postgres:

1. Create a database for the app: `CREATE DATABASE optiontrading;` (pgAdmin or psql). Don't reuse a database that
   belongs to another app.
2. Add `DATABASE_URL=postgres://postgres:PASSWORD@localhost:5432/optiontrading?sslmode=disable` to `backend/.env`.
3. Copy the existing data once: `go run ./cmd/sqlite2pg` (reads `DB_PATH`, writes `DATABASE_URL`, refuses if Postgres
   already has rows unless `-force`, copies in one transaction and checks row counts). The SQLite file is left as is.
4. Restart the backend.

The repositories write SQLite-style SQL with `?` placeholders; the Postgres driver wrapper in `internal/store`
rewrites them to `$1, $2, …`. New rows use `INSERT … RETURNING id` (works on both). Case-insensitive columns are
`COLLATE NOCASE` in SQLite and `CITEXT` in Postgres. **Schema changes go in both lists**: `migrations` (SQLite, in
`store.go`) and `pgMigrations` (`postgres.go`).

Tests use SQLite temp files by default. To run the whole suite against Postgres (each test in its own throwaway
schema): `TEST_DATABASE_URL=postgres://…/optiontrading?sslmode=disable go test ./...`

### SQLite

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
