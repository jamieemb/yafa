# YAFA UI conventions — Material Design 3 on MUI

This is the standard front-end stack for Jamie's apps. Read it before
adding or changing any page.

## Stack

- **Next.js 16 App Router** — Server Components fetch data with Prisma;
  mutations are Server Actions in each route's `actions.ts`. Keep
  `export const dynamic = "force-dynamic"` on pages that read the DB.
- **MUI v9** (`@mui/material`) themed as **Material Design 3** in
  [`src/lib/theme.ts`](../src/lib/theme.ts). Light/dark schemes are
  generated from one seed colour in `src/lib/m3-colors.ts`.
- **Icons:** `@mui/icons-material`, default-imported by path, e.g.
  `import EditOutlined from "@mui/icons-material/EditOutlined"`. Use the
  `Outlined` set at rest and `Rounded`/filled for active states.
- **Charts:** `@mui/x-charts` in client components.
- **Dates:** `date-fns`. Native `<input type="date">` via `TextField`.
- **Not used any more:** Tailwind, shadcn (`@/components/ui/*`),
  lucide-react, sonner, recharts, Carbon. Do not import them.

Import MUI components by path (`@mui/material/Button`) for tree-shaking.

## Server vs client

MUI components carry `"use client"` internally, so a Server Component
page can render `<Card>`, `<Typography>`, `<Chip>`… directly as long as
every prop is serialisable (`sx` objects are fine; functions are not).
Anything with event handlers, state or render props lives in a
`"use client"` file under the route's `_components/`.

Pass server actions into client components as props, binding ids:
`onConfirm={deleteThing.bind(null, id)}`.

## Page anatomy

```tsx
export default async function Page() {
  const rows = await prisma.thing.findMany();
  return (
    <>
      <PageHeader eyebrow="Books" title="Things" description="…" actions={<ThingDialog />} />
      <KpiGrid columns={3}>…</KpiGrid>          {/* optional stat strip */}
      {rows.length === 0 ? <EmptyState … /> : <Card>…<DataList … /></Card>}
    </>
  );
}
```

The shell (`src/components/app-shell.tsx`) wraps pages in a `Container`
laid out as a flex column with a gap, so pages return a fragment of
top-level blocks. Group content in `Card`s (default: surface-container-low,
12px radius). A card header row looks like the pot headers on
`src/app/recurring/page.tsx`.

## Shared components (`src/components/`) — use, don't fork

| Component | Purpose |
| --- | --- |
| `PageHeader`, `SectionHeader` | Page title block / section heading row |
| `Kpi`, `KpiGrid` | Stat tiles (`emphasised` for the headline number) |
| `EmptyState` | Placeholder with icon, copy and action |
| `DataList`, `Meta` | **Responsive records**: table ≥ md, stacked cards on phones. Works from Server Components |
| `FormDialog` | Create/edit dialog: full-screen with top bar on phones, 28px dialog on desktop. Children go in a `<Stack spacing={2.5}>` |
| `ResponsiveAction` | Primary "New …" trigger: extended FAB on phones, button in the header on desktop. **One per page** |
| `ConfirmDeleteButton` | Trash icon (or text button) + M3 confirmation dialog around a bound server action (`confirmText` for non-delete wording) |
| `LinkButton`, `TextLink` | MUI Button / Link routed through `next/link`, usable from Server Components (from `@/components/next-link`) |
| `toast.success/error/info/warning(title, subtitle?)` | Snackbar feedback (from `@/components/toast`) |
| `useAppTheme()` | Light/dark/system preference (from `@/components/theme-registry`) |

`FormDialog` takes `pendingLabel` (e.g. "Importing…") when "Saving…" is wrong.

Reference implementations: `src/app/recurring/*` and `src/app/settings/*`.

## Mobile first

- Everything must work at **375px** wide with no horizontal scrolling.
- Lists are `DataList` with a `mobile` spec (title / meta / value).
- Filters and secondary controls stack or wrap; use `Box` with
  `display: "grid"` and responsive `gridTemplateColumns`, or `Stack`
  with `direction={{ xs: "column", sm: "row" }}`.
- Touch targets ≥ 40px. Icon buttons get an `aria-label` and a `Tooltip`.
- Bottom-anchored panels on phones: `SwipeableDrawer anchor="bottom"`
  (the theme rounds the top corners); on desktop use a `Drawer
  anchor="right"` or a `Dialog`.

## Colour & type

- Use theme tokens through `sx`, never hex: `color: "text.secondary"`,
  `bgcolor: "m3.surfaceContainer"`, `color: "success.main"` (money in),
  `color: "error.main"` (money out / overdue), `color: "warning.main"`.
- Full M3 role list: `theme.palette.m3.*` (also CSS vars
  `var(--mui-palette-m3-<role>)`).
- Categorical colours (pots, accounts, series): `categoryColor(i)` from
  `src/lib/pot-colors.ts` — CSS variables that follow the scheme, valid
  in `sx`, inline styles and SVG `fill`.
- Money: `formatGBP()` and add `className="tabular"` for aligned digits.
- Typography: `h1` only via `PageHeader`; `h5` for card/section titles;
  `body2` for table text; `caption` for secondary; `overline` for
  eyebrows (not uppercase in M3).

## Forms

- `TextField` is outlined and `fullWidth` by default (theme).
- Selects: `<TextField select>` + `MenuItem`. Suggestions: `Autocomplete freeSolo`.
- Dates: `type="date"` + `slotProps={{ inputLabel: { shrink: true } }}`.
- Money: `type="number" inputMode="decimal"` + `InputAdornment` "£".
- Booleans: `FormControlLabel` + `Switch`.
- Build a `FormData` by hand and call the existing server action; keep
  the field names the Zod schemas in `src/lib/validation.ts` expect.
- Disable submit until required fields are valid; show `pending` text.

## Checks before you finish

```bash
npx tsc --noEmit
npx eslint src/app/<route>
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/<route>
```

The dev server (`npm run dev`, port 3000) hot-reloads; never start a
second one.
