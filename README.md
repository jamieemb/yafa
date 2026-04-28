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
- **People + calendar** for tracking gift budgets by importance tier.
- **6 themes** — Treasury (warm cream + navy), Dracula, Monokai,
  Solarized Dark, Nord, Gruvbox Dark.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 ·
shadcn/ui (on Base UI) · Prisma 7 + SQLite · Zod 4 · Recharts ·
Server Actions throughout (no REST except a tiny /api/health probe).

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
    recurring/       outflow CRUD grouped by pot
    income/          per-month income entries
    transactions/    imported rows + cycle settle sheet
    cycles/          settled payments + per-pot breakdown
    review/          transactions awaiting categorisation
    imports/         CSV upload + history
    calendar/        upcoming birthdays + events
    people/          gift-importance tiers
    settings/        themes + percentages + gift tiers
  components/
    ui/              shadcn primitives
    kpi.tsx          shared KPI tile
    logo.tsx         YAFA wordmark + mark
  lib/
    importers/       NatWest, Amex, Monzo CSV parsers
    subset-sum.ts    pay-cycle matcher
    settings.ts      typed accessor for the singleton settings row
prisma/schema.prisma
```

## Licence

MIT.
