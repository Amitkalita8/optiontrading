# Option Seller

Options-selling platform: plan campaigns, define trade approaches, manage watchlists, screen AI opportunities and
follow live US market data.

| Folder | Stack |
|---|---|
| [`frontend/`](frontend) | React (Create React App), React Router |
| [`backend/`](backend) | Go 1.25 HTTP API, SQLite (pure-Go driver), live quotes from Yahoo Finance |

## Run locally

Two terminals:

```bash
# 1. Backend — http://localhost:8085 (creates backend/data/optiontrading.db on first run)
cd backend
go run ./cmd/server

# 2. Frontend — http://localhost:3000 (proxies /api to the backend)
cd frontend
npm install
npm start
```

Restart `go run` after backend changes, and `npm start` after changing `frontend/src/setupProxy.js` or `.env`.

## Tests

```bash
cd backend && go test ./...
cd frontend && npm test
```

See [`backend/README.md`](backend/README.md) for the API, configuration and database details.
