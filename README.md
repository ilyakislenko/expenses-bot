# Expenses Bot

Telegram bot for tracking personal and family expenses. Postgres-backed,
speaks 13 languages, and ships with the observability stack and Terraform
needed to actually run it.

## What it does

Send it `250 coffee` and it records the expense. Everything else is built
around making that useful over months rather than days.

| | |
|---|---|
| **Tracking** | Free-text entry, categories with per-category limits, `/undo`, CSV export |
| **Reporting** | Daily history, totals, per-category breakdowns over arbitrary periods |
| **Family** | Shared budgets — invite members, expenses roll up across the family |
| **Money** | Multi-currency with scheduled rate updates; per-user currency |
| **Time** | Per-user timezone, so "today" means the user's today, not the server's |
| **Premium** | Trial period, tariffs, payments, transaction ledger |
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

~20 suites covering the repositories, the premium/payment flows, family
sharing, timezone maths, the callback deduplicator, security middleware, and
the DI wiring — plus a Playwright end-to-end pass over the bot itself.

## License

No license yet — all rights reserved.
