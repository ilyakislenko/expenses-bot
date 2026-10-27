# Expenses Bot

Telegram bot for tracking personal and family expenses. Postgres-backed,
speaks 13 languages, and ships with the observability stack and Terraform
needed to actually run it.

## What it does

Send it `250 coffee` and it records the expense. Everything else is built
around making that useful over months rather than days.

| | |
|---|---|
| **Tracking** | Free-text entry (`250 coffee`, `20 USD taxi`), remembered categories, edit/undo from the record card, CSV export with period and category filters |
| **Income & recurring** | Income with `+50000 salary`, balance per period; rent and subscriptions recorded automatically every month |
| **Budgets** | Monthly and per-category limits with alerts at 80% and when exceeded (premium) |
| **Savings** | Separate section: one total or several accounts (cash USD, deposit at 16%, crypto…) with own currency and yield; goals as own pots or measured against all savings; debts (loans, mortgage, installments, money owed to friends) with rate, monthly payment, payoff date and total interest, net worth = savings − debts; forecast with per-account yield, inflation, contribution growth and debt amortization (auto contribution = income − expenses); one goal free, up to 10 with premium; up to 10 accounts and 10 debts free |
| **Reporting** | Month overview by categories, period summary vs the previous period, daily summary at a chosen hour, weekly insight on Mondays (week vs usual, category changes, period pace), reminders |
| **Family** | Shared budgets — invite members, expenses roll up across the family |
| **Money** | Multi-currency with scheduled rate updates; per-user currency |
| **Time** | Per-user timezone and period start day, so "today" and "this month" are the user's |
| **Premium** | Trial period, Telegram Stars tariffs and monthly subscription, transaction ledger |
| **Languages** | de, en, es, fr, hi, jp, ka, kz, pt, ru, tr, uz, zh |

## Design

Layered, with the boring parts taken seriously:

- **Repositories** (`src/repositories`) — one per aggregate over a shared
  `BaseRepository`; all SQL lives here.
- **Services** (`src/services`) — business rules, no Telegram types.
- **Handlers** (`src/handlers`) — commands, callbacks and messages; thin.
- **Container** (`src/container.js`) — explicit dependency injection, so
  services are unit-testable without a bot or a database.
- **Middleware** — error handling, rate limiting, security checks, and state
  cleanup, applied in one place rather than per-handler.

Two details worth calling out, because they are the kind that only show up in
production:

- **Callback deduplication.** Telegram re-delivers callback queries on a flaky
  connection, and double-tapping an inline button is normal user behaviour.
  Both would otherwise write the expense twice.
- **Timezone arithmetic is its own module.** "Spending today" and "this month"
  are computed in the user's zone; a naive server-local `new Date()` silently
  misfiles every entry made after midnight UTC.

## Operations

- **Metrics** — Prometheus endpoint at `/metrics`, health at `/health`.
- **Logs** — structured, shipped via Promtail into Loki.
- **Alerts** — Alertmanager rules in `monitoring/config`.
- **Infra** — Terraform in `terraform/` provisions the deployment.
- **Migrations** — `npm run migrate`, plain SQL in `src/migrations`.

```bash
docker compose up -d                                    # Postgres
docker compose -f docker-compose.monitoring.yml up -d   # Prometheus/Loki/Grafana
npm install && npm run migrate && npm start
```

Config is entirely environment-driven — see `.env.example`. `SETUP.md` has the
long-form walkthrough; `BOT_PAGES.md` documents every command and button.

## Tests

```bash
npm test
```

Jest suites covering budgets and reports, income and recurring expenses,
period maths, the premium/payment flows, family rules, timezone maths, the
callback deduplicator, security middleware and the DI wiring. Tests never
touch a real database. `src/__tests__/botE2E.playwright.test.js` is a manual
Telegram Web pass and is not part of `npm test`.

## License

AGPL-3.0 — see `LICENSE`.
