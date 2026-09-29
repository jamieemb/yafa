import { format } from "date-fns";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { EmptyState } from "@/components/empty-state";
import { DataList, Meta } from "@/components/data-list";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { IncomeDialog } from "./_components/income-dialog";
import { CopyFromButton } from "./_components/copy-from-button";
import { MonthNav } from "./_components/month-nav";
import { deleteIncomeEntry } from "./actions";

export const dynamic = "force-dynamic";

type Entry = Awaited<ReturnType<typeof prisma.incomeEntry.findMany>>[number];

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function isoToFirstOfMonth(yyyymm: string): Date {
  const [yStr, mStr] = yyyymm.split("-");
  return new Date(Date.UTC(Number(yStr), Number(mStr) - 1, 1));
}

function dateToIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function shiftMonths(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
}

function currentMonthIso(): string {
  const now = new Date();
  return dateToIso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}

export default async function IncomePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const monthIso = sp.month ?? currentMonthIso();
  const month = isoToFirstOfMonth(monthIso);
  const prevMonth = shiftMonths(month, -1);
  const nextMonth = shiftMonths(month, 1);

  const entries = await prisma.incomeEntry.findMany({
    where: { month },
    orderBy: [{ person: "asc" }, { label: "asc" }],
  });

  // Distinct lists for the form's autocomplete dropdowns. Pulled across
  // every month so values entered once stay available going forward.
  const [allPersons, allAccountsIncome, allAccountsRecurring] = await Promise.all([
    prisma.incomeEntry.findMany({
      where: { person: { not: null } },
      select: { person: true },
      distinct: ["person"],
    }),
    prisma.incomeEntry.findMany({
      where: { bankAccount: { not: null } },
      select: { bankAccount: true },
      distinct: ["bankAccount"],
    }),
    prisma.recurringItem.findMany({
      where: { bankAccount: { not: null } },
      select: { bankAccount: true },
      distinct: ["bankAccount"],
    }),
  ]);
  const personOptions = allPersons
    .map((r) => r.person)
    .filter((v): v is string => Boolean(v))
    .sort();
  const accountOptions = Array.from(
    new Set(
      [...allAccountsIncome, ...allAccountsRecurring]
        .map((r) => r.bankAccount)
        .filter((v): v is string => Boolean(v)),
    ),
  ).sort();

  const total = entries.reduce((acc, e) => acc + e.amount, 0);

  // Group by person for the breakdown KPI strip
  const byPerson = new Map<string, number>();
  for (const e of entries) {
    const key = e.person ?? "Unassigned";
    byPerson.set(key, (byPerson.get(key) ?? 0) + e.amount);
  }
  const perPerson = Array.from(byPerson.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Has previous month got entries we could copy?
  const prevCount = await prisma.incomeEntry.count({
    where: { month: prevMonth },
  });

  const isCurrentMonth = monthIso === currentMonthIso();
  const monthLabel = format(month, "MMMM yyyy");
  const entryCount = `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`;
  const kpiColumns = Math.min(6, Math.max(2, 1 + perPerson.length)) as 2 | 3 | 4 | 5 | 6;

  const copyButton =
    prevCount > 0 ? (
      <CopyFromButton
        targetMonthIso={monthIso}
        sourceMonthIso={dateToIso(prevMonth)}
        sourceLabel={format(prevMonth, "MMM")}
      />
    ) : null;

  return (
    <>
      <PageHeader
        eyebrow="Books"
        title="Income"
        description="Per-month wages, on-call, side income — feeds the dashboard."
        actions={
          <>
            <MonthNav
              label={format(month, "MMM yyyy")}
              prevHref={`/income?month=${dateToIso(prevMonth)}`}
              nextHref={`/income?month=${dateToIso(nextMonth)}`}
              todayHref={isCurrentMonth ? undefined : `/income?month=${currentMonthIso()}`}
            />
            <IncomeDialog
              defaultMonthIso={monthIso}
              personOptions={personOptions}
              accountOptions={accountOptions}
            />
          </>
        }
      />

      <KpiGrid columns={kpiColumns}>
        <Kpi
          label={`Total · ${format(month, "MMM yyyy")}`}
          value={entries.length === 0 ? "—" : formatGBP(total)}
          sub={entryCount}
          emphasised
          size="lg"
        />
        {perPerson.length === 0 ? (
          <Kpi label="By person" value="—" sub="No entries yet" tone="muted" />
        ) : (
          perPerson.map((p) => (
            <Kpi
              key={p.name}
              label={p.name}
              value={formatGBP(p.amount)}
              sub={`${Math.round((p.amount / total) * 100)}% of total`}
              tone="positive"
            />
          ))
        )}
      </KpiGrid>

      {entries.length === 0 ? (
        <EmptyState
          icon={<PaymentsOutlined fontSize="inherit" />}
          title={`No income for ${monthLabel}`}
          description={
            prevCount > 0
              ? `${format(prevMonth, "MMMM")} had ${prevCount} entr${prevCount === 1 ? "y" : "ies"} — copy them across and fill in the paid dates once the money lands, or add a new entry.`
              : "Add wages, on-call and side income for this month so the dashboard can work out what's left to allocate."
          }
          action={
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ alignItems: "center", justifyContent: "center" }}
            >
              {copyButton}
              <IncomeDialog
                defaultMonthIso={monthIso}
                personOptions={personOptions}
                accountOptions={accountOptions}
                fabOnMobile={false}
              />
            </Stack>
          }
        />
      ) : (
        <Card component="section" aria-labelledby="income-entries-heading">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              px: 2,
              py: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
              <Typography id="income-entries-heading" variant="h5" component="h2" noWrap>
                {monthLabel}
              </Typography>
              <Chip size="small" variant="outlined" label={entryCount} />
            </Box>
            <Typography
              variant="h5"
              component="p"
              className="tabular"
              sx={{ whiteSpace: "nowrap", color: "success.main" }}
            >
              {formatGBP(total)}
            </Typography>
          </Box>

          <DataList<Entry>
            rows={entries}
            getKey={(r) => r.id}
            columns={[
              {
                id: "person",
                header: "Person",
                render: (r) =>
                  r.person ? (
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {r.person}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  ),
              },
              {
                id: "label",
                header: "Label",
                render: (r) => (
                  <>
                    <Typography variant="body2">{r.label}</Typography>
                    {r.notes ? (
                      <Typography variant="caption" color="text.secondary">
                        {r.notes}
                      </Typography>
                    ) : null}
                  </>
                ),
              },
              {
                id: "paid",
                header: "Paid on",
                nowrap: true,
                numeric: true,
                render: (r) => (r.paidDate ? format(r.paidDate, "d MMM yyyy") : "—"),
              },
              { id: "account", header: "Lands in", render: (r) => r.bankAccount ?? "—" },
              {
                id: "amount",
                header: "Amount",
                align: "right",
                numeric: true,
                render: (r) => (
                  <Typography variant="body2" component="span" sx={{ fontWeight: 500, color: "success.main" }}>
                    {formatGBP(r.amount)}
                  </Typography>
                ),
              },
            ]}
            mobile={{
              title: (r) => r.label,
              meta: (r) => (
                <Meta>
                  {r.person}
                  {r.bankAccount}
                  {r.paidDate ? `Paid ${format(r.paidDate, "d MMM")}` : "Not yet paid"}
                  {r.notes}
                </Meta>
              ),
              value: (r) => (
                <Box component="span" sx={{ color: "success.main" }}>
                  {formatGBP(r.amount)}
                </Box>
              ),
            }}
            actions={(r) => (
              <>
                <IncomeDialog
                  defaultMonthIso={monthIso}
                  personOptions={personOptions}
                  accountOptions={accountOptions}
                  initial={{
                    id: r.id,
                    month: r.month,
                    paidDate: r.paidDate,
                    person: r.person,
                    label: r.label,
                    amount: r.amount,
                    bankAccount: r.bankAccount,
                    notes: r.notes,
                  }}
                />
                <ConfirmDeleteButton
                  label={`Delete ${r.label}`}
                  heading="Delete income entry?"
                  description={`“${r.label}” will be permanently removed. This can't be undone.`}
                  onConfirm={deleteIncomeEntry.bind(null, r.id)}
                />
              </>
            )}
          />
        </Card>
      )}
    </>
  );
}
