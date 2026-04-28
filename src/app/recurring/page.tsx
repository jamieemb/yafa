import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import {
  BUDGET_CATEGORIES,
  FREQUENCY_LABELS,
  monthlyEquivalent,
  type BudgetCategory,
  type Frequency,
} from "@/lib/categories";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RecurringDialog } from "./_components/recurring-dialog";
import { DeleteRecurringButton } from "./_components/delete-recurring-button";
import { ActiveToggle } from "./_components/active-toggle";

export const dynamic = "force-dynamic";

const PALETTE = [
  "#003A6C",
  "#FD8973",
  "#4F7E5C",
  "#B8956A",
  "#6B7E8C",
  "#2E5783",
  "#E0A993",
  "#84A48F",
];

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

  const groups = new Map<
    BudgetCategory,
    { items: typeof items; total: number }
  >();
  for (const cat of BUDGET_CATEGORIES) {
    groups.set(cat, { items: [], total: 0 });
  }
  for (const item of items) {
    if (!item.budgetCategory) continue;
    const g = groups.get(item.budgetCategory as BudgetCategory);
    if (!g) continue;
    g.items.push(item);
    if (item.active) {
      g.total += monthlyEquivalent(item.amount, item.frequency as Frequency);
    }
  }
  const populated = Array.from(groups.entries())
    .filter(([, g]) => g.items.length > 0)
    .sort(([, a], [, b]) => b.total - a.total);

  const outflowMonthly = items
    .filter((i) => i.active)
    .reduce(
      (acc, i) =>
        acc + monthlyEquivalent(i.amount, i.frequency as Frequency),
      0,
    );

  return (
    <div className="space-y-8">
      {/* Header strip */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label-eyebrow">Books</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Recurring
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Bills, subscriptions, finance payments and pre-allocated budgets.
          </p>
        </div>
        <div className="flex items-end gap-6">
          <div className="text-right">
            <p className="label-eyebrow">Outflow / mo</p>
            <p className="font-mono text-2xl tabular-nums tracking-[-0.02em] mt-1">
              {formatGBP(outflowMonthly)}
            </p>
          </div>
          <RecurringDialog accountOptions={accountOptions} />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No recurring items yet. Click &ldquo;New item&rdquo; to add your
            first.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {populated.map(([cat, group], i) => (
            <section key={cat} className="rounded-md border bg-card overflow-hidden">
              <div className="flex items-baseline justify-between gap-3 px-5 py-3.5 border-b">
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 rounded-[2px]"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  <h2 className="text-[13px] font-semibold">{cat}</h2>
                  <span className="label-eyebrow">
                    {group.items.length} item
                    {group.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="font-mono tabular-nums text-base">
                  {formatGBP(group.total)}
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-2">
                    /mo
                  </span>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <TableHead className="h-9">Name</TableHead>
                    <TableHead className="h-9">Account</TableHead>
                    <TableHead className="h-9">Frequency</TableHead>
                    <TableHead className="h-9 text-center">Day</TableHead>
                    <TableHead className="h-9">Ends</TableHead>
                    <TableHead className="h-9 text-right">Amount</TableHead>
                    <TableHead className="h-9 text-center">Active</TableHead>
                    <TableHead className="h-9" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((item) => (
                    <TableRow
                      key={item.id}
                      className={item.active ? undefined : "opacity-50"}
                    >
                      <TableCell className="text-[13px] font-medium">
                        {item.name}
                        {item.notes ? (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {item.notes}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {item.bankAccount ?? "—"}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {FREQUENCY_LABELS[item.frequency as Frequency] ??
                          item.frequency}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground tabular-nums text-[12px]">
                        {item.dayOfMonth ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[12px]">
                        {item.endDate ? (
                          format(item.endDate, "d MMM yyyy")
                        ) : (
                          <span className="text-[11px]">Ongoing</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-[13px]">
                        {formatGBP(item.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <ActiveToggle id={item.id} active={item.active} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <RecurringDialog
                            accountOptions={accountOptions}
                            triggerVariant="ghost"
                            initial={{
                              id: item.id,
                              name: item.name,
                              amount: item.amount,
                              budgetCategory: item.budgetCategory,
                              bankAccount: item.bankAccount,
                              frequency: item.frequency,
                              dayOfMonth: item.dayOfMonth,
                              startDate: item.startDate,
                              endDate: item.endDate,
                              notes: item.notes,
                              active: item.active,
                            }}
                          />
                          <DeleteRecurringButton
                            id={item.id}
                            name={item.name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
