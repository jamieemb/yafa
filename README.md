# YAFA — Yet Another Finance App

A self-hosted personal finance manager. Tracks recurring outflows, monthly
income, credit-card transactions imported from CSV, and reconciles each
card payment against the charges it covers.

Built for one user — assumes deployment behind your LAN/VPN. No auth in v1.

## Features

- **Recurring items** grouped by budget pot (Food & Essentials, Home,
  Car, Petrol, Finance & Contracts, Health & Beauty, Subscriptions,
  Memberships, Birthdays & Events).
- **Per-month income entries** with paid-on date / budget-month split,
  per-person breakdown, copy-from-last-month carry-forward.
- **CSV import** for NatWest, American Express, and Monzo. Auto-detects
  payments and refunds; learns merchant → category rules.
- **Pay-cycle reconciliation** — enter the amount you paid, the app
  finds the subset of transactions that sums to it (subset-sum), shows
  a per-pot breakdown so you know which pot to pull from.
- **Dashboard** with month nav, smart 40/35/25 discretionary split
  (configurable in settings), allocation donut, by-account breakdown,
  upcoming birthdays/events.
- **Month setup wizard** — a guided five-step run through each month:
  income per person (with "add again" suggestions from previous months),
  birthdays and events, a review of recurring costs, car trip import,
  then an allocation step where the savings / investments / free-spend
  split can be overridden with linked sliders. The dashboard shows the
  chosen plan and nags until the month is set up.
- **People + calendar** for tracking gift budgets by importance tier.
- **Life admin** — renewals (MOT, insurance, licences) with due-soon
  reminders, meter readings, and PCP/lease mileage tracking with car
  trip CSV import and a journey map.
- **Mobile first, Material Design 3** — bottom navigation bar and
  full-screen forms on phones, a navigation rail on tablets, a drawer
  on desktop; light, dark or follow-the-system colour schemes generated
  from one seed colour.
- **Installable app** — a PWA with icons, iOS splash screens, offline
  fallback, swipe-to-act rows, pull to refresh and edge-swipe back. See
  [`DEPLOY.md`](./DEPLOY.md#install-on-iphone--ipad).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · MUI v9 themed as
Material Design 3 · MUI X Charts · Prisma 7 + SQLite · Zod 4 ·
Server Actions throughout (no REST except tiny /api/health and
/api/review-count probes).

UI conventions live in [`docs/DESIGN.md`](./docs/DESIGN.md).

## Run it

The fastest path is the published Docker image:

```bash
docker run -d \
  --name yafa \
  --restart unless-stopped \
  -p 3000:3000 \
  -v yafa-data:/data \
  ghcr.io/jamieemb/yafa:latest
```

Then http://localhost:3000.

See [`DEPLOY.md`](./DEPLOY.md) for compose, backups, custom paths, and
reverse-proxy notes.

## Develop

```bash
git clone https://github.com/jamieemb/yafa.git
cd yafa
npm install
npx prisma generate
npx prisma db push        # creates dev.db
node scripts/seed-recurring.mjs  # optional: seed example items
npm run dev
```

Open http://localhost:3000.

To run the production image locally with your working tree:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Project layout

```
src/
  app/
    api/             health endpoint
    dashboard/       monthly outflow + allocation + smart split
    setup/           month setup wizard (5 steps, allocation override)
    recurring/       outflow CRUD grouped by pot
    income/          per-month income entries
    transactions/    imported rows + cycle settle sheet
    cycles/          settled payments + per-pot breakdown
    review/          transactions awaiting categorisation
    imports/         CSV upload + history
    calendar/        upcoming birthdays + events
    people/          gift-importance tiers
    renewals/        life-admin due dates (MOT, insurance, …)
    meters/          meter reading log
    mileage/         PCP / lease mileage allowance + trip import + map
    settings/        theme + percentages + gift tiers
  components/
    app-shell.tsx    responsive M3 shell: app bar + nav bar / drawer
    theme-registry.tsx  MUI provider, light/dark/system mode
    data-list.tsx    table on desktop, cards on phones
    form-dialog.tsx  full-screen dialog on phones, dialog on desktop
    kpi.tsx, page-header.tsx, empty-state.tsx, confirm-delete-button.tsx,
    responsive-action.tsx, toast.tsx, logo.tsx, nav.ts
  lib/
    theme.ts         MUI theme expressing Material 3
    m3-colors.ts     M3 colour schemes from a seed colour
    budget.ts        one computation of a month's income / committed / left over
    month.ts         budget-month helpers (YYYY-MM ↔ UTC first-of-month)
    plan.ts          wizard steps + MonthPlan helpers
    importers/       NatWest, Amex, Monzo, car-trip CSV parsers
    subset-sum.ts    pay-cycle matcher
    mileage.ts       allowance / pace / projection maths
    settings.ts      typed accessor for the singleton settings row
docs/DESIGN.md       UI conventions
prisma/schema.prisma
```

## Licence

MIT.
