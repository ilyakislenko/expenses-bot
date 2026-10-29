# Expenses Bot

Telegram bot for tracking personal and family expenses. Postgres-backed,
speaks 13 languages, and ships with the observability stack and Terraform
needed to actually run it.

## What it does

Send it `250 coffee` and it records the expense. Everything else is built
around making that useful over months rather than days.

| | |
|---|---|
| **Onboarding** | «🧭 Let's set the bot up for you» right after the language choice (and `/setup` or ⚙️ Settings for anyone): up to 9 one-tap questions in one edited message — goals (multi), currency (pre-selected by language), time zone, payday → period start, monthly budget (only with the budget goal, premium/trial), how to record (tips only), reminders, what to send (daily/weekly/month/bills), roast mode reusing the gender and 18+ screens; Skip / Skip all / Back, progress «2/8», resumable after restarts and from old buttons; every answer applies the existing setting at once; final screen lists only what was set, the first step `250 coffee` and up to 4 buttons matching the goals; answers kept in `users.onboarding_answers`, funnel `onboarding_started/completed/skipped` |
| **Tracking** | Free-text entry (`250 coffee`, `20 USD taxi`), remembered categories, edit/undo from the record card, CSV export with period and category filters, bank statement import (T-Bank CSV, Sber and Kaspi Gold PDF, any CSV) with preview, dedup and one-tap undo, receipt photos or full-resolution JPEG files (auto-cropped and straightened, retried rotated when unreadable) recognized by free vision LLMs (fallback chain: Ollama on a LAN GPU PC → optional cloud key → Ollama on the server) into one expense per line item with categories, monthly cap |
| **Batch & voice** | Several records in one message (`coffee 250, taxi 400`, one per line, `250 coffee and 400 taxi`, incomes with `+`) recorded at once with one summary card, per-item cards and «Undo all»; voice messages recognized fully locally by whisper.cpp (`ggml-small` on CPU, ~3 s for a short phrase), number words in ru/en (`two hundred fifty` → 250), transcript shown, 20 voice messages a day free / 300 with premium, nothing stored |
| **Bank notifications** | Forward or paste a bank SMS / push / e-mail (`Покупка 1 250 ₽, PYATEROCHKA, карта *1234…`, `You spent $12.40 at STARBUCKS`, Kaspi, Uzcard/Humo, TBC/BoG, Turkish, Indian, EU formats) and it becomes a record with amount, currency, merchant and the time from the text; templates for ~30 banks plus generic rules in 12 languages, unknown formats parsed by the local LLM into validated JSON (10 a day free / 100 with premium; templates unlimited); refunds, own-account transfers, cash and declined operations are explained, not recorded; duplicates (same forward, same text, same amount within 2 minutes) skipped; several forwards → one summary; card numbers and balances are never stored or logged |
| **Income & recurring** | Income with `+50000 salary`, balance per period; rent and subscriptions recorded automatically every month |
| **Budgets** | Monthly and per-category limits with alerts at 80% and when exceeded (premium) |
| **Savings** | Separate section: one total or several accounts (cash USD, deposit at 16%, crypto…) with own currency and yield; goals measured against all savings (default) or as own pots; debts (loans, mortgage, installments, money owed to friends) with rate, monthly payment, payoff date and total interest; net worth (capital) = savings − debts; «Update balances» wizard walks every account/debt in one pass; guided creation with currency buttons; compact forecast per horizon with per-account yield, inflation, contribution growth and debt amortization (auto contribution = income − expenses); one goal free, up to 10 with premium; up to 10 accounts and 10 debts free |
| **Planning** | «☰ More → 🧭 Planning»: safe-to-spend today (expected income incl. predicted paydays − spent − bills and debt payments until period end − planned savings, per remaining day; falls back to the total budget) shown on «Today» and the overview; 30-day payments calendar (recurring, debts with a due day, detected subscriptions, expected salary) with an opt-in 9:00 reminder; subscription detection from expense history (same merchant, ±10% amount, weekly/monthly/yearly) with one-tap conversion into a recurring expense and the next charge date from the cadence (typical day of month, month ends, leap years); charge alerts 1/2/3/7 days before (daytime in the user's zone, once per charge, restart- and overlap-safe) with «Keep it / I'll cancel / Don't remind», a universal «How to cancel» (App Store, Google Play and a small list of official cancel pages in one data file) and one gentle note if a cancelled one still charges; free trials with reminders the day before and on the day; «charges this week» line in the weekly digest; personal inflation from receipt line items (unit price changes, basket index). Free: allowance, calendar, top-3 subscriptions with alerts, one trial at a time; premium: full list with alerts, unlimited trials and inflation |
| **Reporting** | Month overview by categories, period summary vs the previous period, daily summary at a chosen hour, weekly insight on Mondays (week vs usual, category changes, period pace), reminders; PNG charts rendered on the server — category donut (top 7 + «other», legend with amounts and %), bars for the last 6 periods with an average line (total and per category); current month free, past periods and trends premium |
| **Achievements** | `/achievements`: day streak of records with auto streak freezes (1 a week, 2 with premium) and an at-risk line in reminders, 30 badges in four tiers unlocked from real actions (first receipt, 100 records, 30-day streak, goal reached…) — past history granted on first contact without spam, XP and 10 levels, opt-in challenges (no-spend week, a week without a category, month on budget; 1 at a time free, unlimited with premium), «Month in review» on the first day of each period, also as a forwardable image card without expense descriptions |
| **Roast mode** | Opt-in «😈» setting (off / spicy sarcasm / uncensored 18+ with a one-time confirmation), gender-aware phrasing (`{купил\|купила}`-style forms, neutral variants for «rather not say»): after a record the bot appends one roast line with the user's real numbers for the strongest reason — budget crossed (once per budget per period), broken challenge, «safe to spend» exceeded, 80% of a budget, impulse buy (≥ 3× own median), junk food/delivery/booze/smokes/taxi habit; max 3 a day and one per 2 hours, private chats and own records only, variants never repeat back to back; `/roast` «Month roast» with a share button; a line in the weekly summary. 13 languages, templates only, no LLM |
| **Ask the bot** | Questions in plain words (`? how much did I spend on taxi in September`, `/ask`, example buttons): the local LLM (Ollama, shared queue with receipts) only turns the question into a validated JSON intent, a regex fast path covers frequent phrasings without any model; totals, categories, top/largest, comparisons, daily average, income/balance, savings, budgets are computed by the bot. 5 questions a day free, 100 with premium |
| **Family** | Shared budgets — invite members, expenses roll up across the family |
| **Money** | Multi-currency with scheduled rate updates; per-user currency |
| **Time** | Per-user timezone and period start day, so "today" and "this month" are the user's |
| **Premium** | Trial period, Telegram Stars tariffs and monthly subscription, transaction ledger; subscription screen with grouped benefits, a personal hook from the last 30 days and the yearly per-month price |
| **Growth** | Invite a friend (`/invite`, ☰ More): personal `?start=ref_<code>` link, share button and forwardable text, stats; when the friend records 3 expenses both get +7 days of premium (inviter capped at 10 rewards / 90 days); gentle «or invite a friend» hint on limit screens at most once a week |
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
- **Voice** — whisper.cpp + ffmpeg on the host, `VOICE_STT_*` in `.env`; exact install commands in `BOT_PAGES.md` («Голосовые»).
- **Charts** — no browser or chart service: SVG built in code, text shaped by HarfBuzz (`harfbuzzjs`, WASM), rasterized by `@resvg/resvg-js` off the event loop; Noto fonts for Latin/Cyrillic, Georgian and Devanagari ship in `assets/fonts` (OFL), CJK comes from the system (`fonts-noto-cjk` or Droid Sans Fallback, or `CHART_CJK_FONT`). Details in `BOT_PAGES.md` («Графики картинками»).

```bash
docker compose up -d                                    # Postgres
docker compose -f docker-compose.monitoring.yml up -d   # Prometheus/Loki/Grafana
npm install && npm run migrate && npm start
```

Neither compose file has default passwords: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PGADMIN_EMAIL`,
`PGADMIN_PASSWORD` and `GF_SECURITY_ADMIN_PASSWORD` must be set in `.env`, otherwise compose refuses
to start. Postgres (5432) and pgAdmin (5050) are published on all interfaces on purpose — reachable from
the home LAN, so use long random passwords and never forward these ports from the internet. The
monitoring stack (no auth) publishes on `127.0.0.1` only; reach it through a TLS reverse proxy or `ssh -L`.

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
