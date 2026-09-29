import { format } from "date-fns";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EventRepeatOutlined from "@mui/icons-material/EventRepeatOutlined";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { categoryColor } from "@/lib/pot-colors";
import {
  BUDGET_CATEGORIES,
  FREQUENCY_LABELS,
  monthlyEquivalent,
  type BudgetCategory,
  type Frequency,
} from "@/lib/categories";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { EmptyState } from "@/components/empty-state";
import { DataList, Meta } from "@/components/data-list";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { RecurringDialog } from "./_components/recurring-dialog";
import { ActiveToggle } from "./_components/active-toggle";
import { deleteRecurringItem } from "./actions";

export const dynamic = "force-dynamic";

type Item = Awaited<ReturnType<typeof prisma.recurringItem.findMany>>[number];

export default async function RecurringPage() {
  const items = await prisma.recurringItem.findMany({
    orderBy: [{ amount: "desc" }],
  });

  // Distinct bank accounts for the form's autocomplete — pulled across
  // both tables so an account named on income is also offered here.
  const [accountsRecurring, accountsIncome] = await Promise.all([
    prisma.recurringItem.findMany({
      where: { bankAccount: { not: null } },
      select: { bankAccount: true },
      distinct: ["bankAccount"],
    }),
    prisma.incomeEntry.findMany({
      where: { bankAccount: { not: null } },
      select: { bankAccount: true },
      distinct: ["bankAccount"],
    }),
  ]);
  const accountOptions = Array.from(
    new Set(
      [...accountsRecurring, ...accountsIncome]
        .map((r) => r.bankAccount)
        .filter((v): v is string => Boolean(v)),
    ),
  ).sort();

  const groups = new Map<BudgetCategory, { items: Item[]; total: number }>();
  for (const cat of BUDGET_CATEGORIES) groups.set(cat, { items: [], total: 0 });
  for (const item of items) {
    if (!item.budgetCategory) continue;
    const g = groups.get(item.budgetCategory as BudgetCategory);
    if (!g) continue;
    g.items.push(item);
    if (item.active) g.total += monthlyEquivalent(item.amount, item.frequency as Frequency);
  }
  const populated = Array.from(groups.entries())
    .filter(([, g]) => g.items.length > 0)
    .sort(([, a], [, b]) => b.total - a.total);

  const activeItems = items.filter((i) => i.active);
  const outflowMonthly = activeItems.reduce(
    (acc, i) => acc + monthlyEquivalent(i.amount, i.frequency as Frequency),
    0,
  );

  const newDialog = <RecurringDialog accountOptions={accountOptions} />;

  return (
    <>
      <PageHeader
        eyebrow="Books"
        title="Recurring"
        description="Bills, subscriptions, finance payments and pre-allocated budget pots."
        actions={newDialog}
      />

      <KpiGrid columns={3}>
        <Kpi label="Outflow per month" value={formatGBP(outflowMonthly)} sub="Active items, monthly equivalent" emphasised size="lg" />
        <Kpi label="Active items" value={String(activeItems.length)} sub={`${items.length - activeItems.length} paused`} />
        <Kpi label="Pots in use" value={String(populated.length)} sub={`of ${BUDGET_CATEGORIES.length} pots`} />
      </KpiGrid>

      {items.length === 0 ? (
        <EmptyState
          icon={<EventRepeatOutlined fontSize="inherit" />}
          title="No recurring items yet"
          description="Add your bills, subscriptions and budget pots so the dashboard can work out what to set aside each month."
          action={<RecurringDialog accountOptions={accountOptions} fabOnMobile={false} />}
        />
      ) : (
        <Stack spacing={2}>
          {populated.map(([cat, group], i) => (
            <Card key={cat} component="section" aria-labelledby={`pot-${i}`}>
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
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: categoryColor(i), flexShrink: 0 }} />
                  <Typography id={`pot-${i}`} variant="h5" component="h2" noWrap>
                    {cat}
                  </Typography>
                  <Chip size="small" variant="outlined" label={`${group.items.length} item${group.items.length === 1 ? "" : "s"}`} />
                </Box>
                <Typography variant="h5" component="p" className="tabular" sx={{ whiteSpace: "nowrap" }}>
                  {formatGBP(group.total)}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    /mo
                  </Typography>
                </Typography>
              </Box>

              <DataList<Item>
                rows={group.items}
                getKey={(r) => r.id}
                muted={(r) => !r.active}
                columns={[
                  {
                    id: "name",
                    header: "Name",
                    render: (r) => (
                      <>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {r.name}
                        </Typography>
                        {r.notes ? (
                          <Typography variant="caption" color="text.secondary">
                            {r.notes}
                          </Typography>
                        ) : null}
                      </>
                    ),
                  },
                  { id: "account", header: "Account", render: (r) => r.bankAccount ?? "—" },
                  {
                    id: "frequency",
                    header: "Frequency",
                    render: (r) => FREQUENCY_LABELS[r.frequency as Frequency] ?? r.frequency,
                  },
                  { id: "day", header: "Day", align: "center", numeric: true, render: (r) => r.dayOfMonth ?? "—" },
                  {
                    id: "ends",
                    header: "Ends",
                    nowrap: true,
                    render: (r) => (r.endDate ? format(r.endDate, "d MMM yyyy") : "Ongoing"),
                  },
                  {
                    id: "amount",
                    header: "Amount",
                    align: "right",
                    numeric: true,
                    render: (r) => (
                      <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                        {formatGBP(r.amount)}
                      </Typography>
                    ),
                  },
                ]}
                mobile={{
                  title: (r) => r.name,
                  meta: (r) => (
                    <Meta>
                      {r.bankAccount}
                      {FREQUENCY_LABELS[r.frequency as Frequency] ?? r.frequency}
                      {r.dayOfMonth != null ? `Day ${r.dayOfMonth}` : null}
                      {r.endDate ? `Ends ${format(r.endDate, "d MMM yyyy")}` : null}
                    </Meta>
                  ),
                  value: (r) => formatGBP(r.amount),
                  valueSub: (r) => (r.active ? null : "Paused"),
                }}
                actions={(r) => (
                  <>
                    <ActiveToggle id={r.id} active={r.active} name={r.name} />
                    <RecurringDialog
                      accountOptions={accountOptions}
                      initial={{
                        id: r.id,
                        name: r.name,
                        amount: r.amount,
                        budgetCategory: r.budgetCategory,
                        bankAccount: r.bankAccount,
                        frequency: r.frequency,
                        dayOfMonth: r.dayOfMonth,
                        startDate: r.startDate,
                        endDate: r.endDate,
                        notes: r.notes,
                        active: r.active,
                      }}
                    />
                    <ConfirmDeleteButton
                      label={`Delete ${r.name}`}
                      heading="Delete recurring item?"
                      description={`“${r.name}” will be permanently removed. This can't be undone.`}
                      onConfirm={deleteRecurringItem.bind(null, r.id)}
                    />
                  </>
                )}
              />
            </Card>
          ))}
        </Stack>
      )}
    </>
  );
}
