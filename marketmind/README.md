# MarketMind — AI Trading Intelligence Platform

A multi-user SaaS web application that autonomously monitors the stock market, researches equities, analyzes charts and news, surfaces trade candidates with AI-generated entry/exit zones in real time — and coaches users into better traders through a built-in education system.

> **Compliance note:** MarketMind is an analysis and education tool, **not financial advice**. Signals describe technical setup conditions probabilistically and never guarantee outcomes. The AI is system-prompted to educate — never to instruct anyone to buy or sell — and every AI output is audit-logged.

## Architecture

```
┌─────────────────┐   HTTP    ┌──────────────────────────┐
│  Next.js 14 app │◄─────────►│  PostgreSQL (Prisma ORM) │
│  (UI + API)     │           └──────────────────────────┘
└───────┬─────────┘                        ▲
        │ Socket.IO (ws://:3001)           │
┌───────▼─────────────────────────────────┴───┐
│  Worker service (src/server/worker.ts)      │
│  • price ticks every 2s → live quotes       │
│  • scanner every 60s → signals + AI theses  │
│  • signal lifecycle + per-user alert fanout │
└──────────────┬───────────────────────────────┘
               │ MarketDataProvider interface
     ┌─────────┼──────────┐
   mock    Polygon.io   Finnhub
```

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TradingView Lightweight Charts
- **Backend:** Next.js API routes + standalone Node worker (the autonomous scanning engine)
- **Database:** PostgreSQL via Prisma (users, watchlists, signals + audit events, journal, lessons, paper accounts, AI audit log)
- **Auth:** NextAuth.js — email/password (bcrypt) + optional Google OAuth, JWT sessions, roles `FREE` / `PREMIUM` / `ADMIN`
- **Real-time:** Socket.IO — live prices, new signals, status changes, and per-user alerts
- **AI:** Anthropic API (Claude) with a deterministic built-in fallback engine so the app runs fully without a key

## Quick start (fully local, no paid keys)

```bash
cd marketmind
npm install

# 1. Database — any PostgreSQL 14+ works:
#    createuser marketmind -P && createdb marketmind -O marketmind
#    then set DATABASE_URL in .env (see .env.example)
cp .env.example .env

# 2. Schema + demo data (3 users, 10 lessons, sample signals, journal history)
npm run db:push
npm run db:seed

# 3. Run web + scanner engine together
npm run dev:all
# — or separately: `npm run dev` (web :3000) and `npm run worker` (engine + ws :3001)
```

Open http://localhost:3000 and sign in with a demo account (password `demo1234`):

| Account | Tier | What you'll see |
|---|---|---|
| `premium@marketmind.demo` | PREMIUM | Real-time signals, AI analyst chat, coaching reports, seeded journal/paper history |
| `free@marketmind.demo` | FREE | 15-min delayed signals, 3-ticker watchlist cap, gated premium features |
| `admin@marketmind.demo` | ADMIN | Everything + admin dashboard (user metrics, hit rate by setup, system health) |

The default `MARKET_DATA_PROVIDER="mock"` simulates a full deterministic market (42 large-caps, gaps, momentum bursts, volume spikes) so the scanner finds real setups within a minute or two of starting the worker.

## Environment variables

All are read from `marketmind/.env` (see `.env.example` for the full annotated list):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Auth base URL and JWT secret (generate a real secret in prod) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional — enables the Google sign-in button's backend |
| `MARKET_DATA_PROVIDER` | `mock` (default) \| `polygon` \| `finnhub` |
| `POLYGON_API_KEY` | Required when provider is `polygon` — get one at polygon.io |
| `FINNHUB_API_KEY` | Required when provider is `finnhub` — get one at finnhub.io |
| `ANTHROPIC_API_KEY` | Optional — unlocks Claude-written theses, briefings, chat, coaching. Blank = built-in deterministic engine |
| `ANTHROPIC_MODEL` | Claude model id (default `claude-sonnet-5`) |
| `SCAN_INTERVAL_SECONDS` | Scanner cadence (default 60; min 15) |
| `PRICE_TICK_SECONDS` | Quote streaming cadence (default 2) |
| `WS_PORT` / `NEXT_PUBLIC_WS_URL` | Worker's Socket.IO port and the URL browsers connect to |
| `STRIPE_SECRET_KEY` etc. | Stubbed — see `src/app/api/stripe/checkout/route.ts` for the wiring guide. Without a key, "upgrade" is simulated instantly for demos |
| `EXPOSE_RESET_TOKENS` | Demo convenience: returns password-reset tokens in the API response (no email sender wired). Set `0` in production |
| `BROKERAGE_ENCRYPTION_KEY` | AES-256-GCM key (64 hex chars, `openssl rand -hex 32`) for brokerage tokens at rest. Dev falls back to a key derived from `NEXTAUTH_SECRET` |
| `SNAPTRADE_CLIENT_ID` / `SNAPTRADE_CONSUMER_KEY` | SnapTrade credentials — Robinhood portfolio data **and** trading |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV` | Plaid Investments credentials — read-only holdings fallback (`PLAID_ENV=sandbox` by default) |
| `ENABLE_LIVE_TRADING` | **`false` by default.** Master switch for live order placement; portfolio sync works regardless |
| `BROKERAGE_SYNC_SECONDS` | Worker's background portfolio-sync cadence (default 300) |

## Switching from mock to live data

1. Get an API key from [Polygon.io](https://polygon.io) or [Finnhub](https://finnhub.io).
2. In `.env`, set:
   ```bash
   MARKET_DATA_PROVIDER="polygon"   # or "finnhub"
   POLYGON_API_KEY="pk_..."         # or FINNHUB_API_KEY="..."
   ```
3. Restart both processes. Everything — scanner, charts, quotes, paper fills — flows through the `MarketDataProvider` interface (`src/lib/marketdata/types.ts`), so no other change is needed.

Notes: free API tiers are heavily rate-limited; raise `SCAN_INTERVAL_SECONDS` (e.g. 300) and consider trimming the universe in `src/lib/marketdata/mock.ts` (`MOCK_UNIVERSE` is also the default universe for live providers). Finnhub's free tier lacks candle history for some symbols — the scanner simply skips symbols with insufficient bars. To add another vendor, implement the four-method interface and register it in `src/lib/marketdata/index.ts`.

## Brokerage connections (Robinhood portfolio sync + optional trading)

Robinhood has no public third-party OAuth API, so MarketMind deliberately avoids unofficial/reverse-engineered Robinhood libraries (they violate Robinhood's ToS and risk account bans). Instead everything goes through official aggregators behind a swappable `BrokerageProvider` interface (`src/lib/brokerage/types.ts`), mirroring the market-data layer:

| Provider | What it gives | Keys |
|---|---|---|
| **mock** ("Robinwood Demo") | Fake portfolio + instant fills; exercises the entire flow locally with zero keys | none |
| **SnapTrade** (primary) | Robinhood portfolio data **and** order placement via SnapTrade's hosted connection portal — MarketMind never sees Robinhood credentials | `SNAPTRADE_CLIENT_ID`, `SNAPTRADE_CONSUMER_KEY` |
| **Plaid Investments** (fallback) | Read-only holdings & transactions for portfolio tracking only | `PLAID_CLIENT_ID`, `PLAID_SECRET` |

**Try it with the mock provider (no keys):** sign in → Settings → Brokerage Connections → Connect on "Robinwood (Demo)" → authorize on the fake portal → you land back connected, with a seeded portfolio on the **Portfolio** page (positions, day/total P&L, allocation donut, equity curve, distance to AI-detected support/resistance, AI Portfolio Health review). Signals on tickers you hold get a "You own this" badge and the AI thesis folds in your cost basis.

**Getting sandbox keys:**
- *SnapTrade:* create an account at [snaptrade.com](https://snaptrade.com) → dashboard → API keys (`clientId` + `consumerKey`). Sandbox keys work with test brokerage connections; set both env vars and the "Robinhood (via SnapTrade)" card on the Connections page becomes active. The link flow opens SnapTrade's hosted portal and returns to `/api/brokerage/callback/snaptrade`.
- *Plaid:* create an app at [dashboard.plaid.com](https://dashboard.plaid.com) → use the **sandbox** `client_id` + secret with `PLAID_ENV=sandbox`. The adapter uses Plaid **Hosted Link** (no client-side SDK); in sandbox, link the `user_good` / `pass_good` test institution with an investment account.

**Enabling live trading:** portfolio sync ships enabled; order placement is feature-flagged **off**. Set `ENABLE_LIVE_TRADING="true"` to activate the "Trade this setup" button on signal pages (Premium users with an active trading-capable connection only). Hard rules enforced server-side: every order requires the review-and-confirm step (requests without `confirmed: true` are rejected), idempotency keys prevent duplicates, order endpoints are rate-limited, a user-configurable **max daily loss** (Settings → Trading Guardrails) locks orders for the day when hit, and neither the scanner nor the AI has any code path to order submission. Filled orders are auto-logged into the Trade Journal (`source: brokerage`) so the weekly AI coaching runs on real trades (win rate, average R, revenge-trade and overtrading detection, sizing consistency).

**Security:** provider tokens are AES-256-GCM encrypted at rest (`BrokerageConnection.encryptedAuth`), never returned by any API or written to logs; account numbers are stored masked (last 4 only); all brokerage API calls are server-side; Disconnect revokes the provider-side authorization and deletes every synced row. MarketMind is not a broker-dealer or investment adviser — orders are executed by the user's brokerage.

## Feature map

- **Autonomous scanner** (`src/lib/scanner.ts`, worker): RSI, MACD, EMA 9/21/50/200, VWAP, Bollinger, ATR, relative volume, gap %, pivot support/resistance → six setup detectors (momentum breakout, VWAP reclaim, oversold bounce, gap-and-go, unusual volume, EMA crossover). Each signal gets a 0–100 setup-conditions score, an entry zone, an ATR-based stop, and 2R/3R targets, with a full `SignalEvent` audit trail as it moves Waiting → Entry Zone Active → Target 1 / Target 2 / Stopped Out.
- **AI layer** (`src/lib/ai.ts`): trade thesis + risks + "what would a pro do" per signal, daily pre/post-market briefings, analyst chat with live technicals injected, weekly journal coaching reports. Guardrail system prompt (educate, never instruct, reinforce risk management); every output logged to `AiAuditLog`.
- **Entry/exit intelligence:** charts render the shaded entry band, stop and target price lines, EMA/VWAP overlays; risk calculator converts account size + risk % into share count; alert preferences drive in-app + browser-notification alerts on zone entry / stop threat / target hit for watchlisted tickers.
- **Education:** 10-lesson curriculum (Beginner → Advanced) with per-user completion; info-icon explainers (`GLOSSARY` in `src/components/ui.tsx`) on every indicator and term across the app.
- **Journal & paper trading:** manual or one-click-from-signal logging, R-multiple math, honest mistake tags, AI coaching; $100k simulated account with positions, realized P&L, win rate, profit factor, equity curve.
- **SaaS:** signup/login/reset, profile settings, role gating (free = delayed signals, 3 tickers, no AI chat/coaching), pricing page with stubbed Stripe checkout, admin dashboard.

## Production build

```bash
npm run build && npm run start   # web
npm run worker                   # engine (run under a process manager)
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev:all` | Web + worker together (recommended for dev) |
| `npm run dev` / `npm run worker` | Each process separately |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run db:push` / `npm run db:seed` | Sync schema / seed demo data (idempotent) |
| `npm run typecheck` | TypeScript check |
