import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, ArrowDownLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IncomeDialog } from "./_components/income-dialog";
import { DeleteIncomeButton } from "./_components/delete-income-button";
import { CopyFromButton } from "./_components/copy-from-button";

export const dynamic = "force-dynamic";

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
  const [allPersons, allAccountsIncome, allAccountsRecurring] =
    await Promise.all([
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label-eyebrow">Inflow</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Income
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Per-month wages, on-call, side income — feeds the dashboard.
          </p>
        </div>
        <MonthNav
          monthIso={monthIso}
          prevIso={dateToIso(prevMonth)}
          nextIso={dateToIso(nextMonth)}
          isCurrent={isCurrentMonth}
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-[2fr_3fr] gap-3">
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center gap-1.5">
            <ArrowDownLeft className="size-3 text-positive" />
            <p className="label-eyebrow">Total · {format(month, "MMM yyyy")}</p>
          </div>
          <p className="font-mono text-3xl tabular-nums tracking-[-0.02em] mt-2 text-positive">
            {entries.length === 0 ? "—" : formatGBP(total)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <div className="rounded-md border bg-card p-5">
          <p className="label-eyebrow">By person</p>
          {perPerson.length === 0 ? (
            <p className="text-[12px] text-muted-foreground mt-3">
              No entries yet.
            </p>
          ) : (
            <ul className="space-y-2 mt-3">
              {perPerson.map((p) => {
                const pct = (p.amount / total) * 100;
                return (
                  <li key={p.name} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-[12px]">
                      <span className="font-medium">{p.name}</span>
                      <span className="font-mono tabular-nums">
                        {formatGBP(p.amount)}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Entries section */}
      <section>
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <p className="label-eyebrow">Entries</p>
            <h2 className="text-sm font-semibold mt-0.5">
              {format(month, "MMMM yyyy")}
            </h2>
          </div>
          <div className="flex gap-2">
            {entries.length === 0 && prevCount > 0 ? (
              <CopyFromButton
                targetMonthIso={monthIso}
                sourceMonthIso={dateToIso(prevMonth)}
                sourceLabel={format(prevMonth, "MMM")}
              />
            ) : null}
            <IncomeDialog
              defaultMonthIso={monthIso}
              personOptions={personOptions}
              accountOptions={accountOptions}
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="mt-5 rounded-md border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No income recorded for {format(month, "MMMM yyyy")}.
            </p>
            {prevCount > 0 ? (
              <p className="text-[12px] text-muted-foreground">
                {format(prevMonth, "MMM")} had {prevCount} entr
                {prevCount === 1 ? "y" : "ies"} — use &ldquo;Copy
                from&rdquo; above to clone them.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <TableHead className="h-9">Person</TableHead>
                  <TableHead className="h-9">Label</TableHead>
                  <TableHead className="h-9">Paid on</TableHead>
                  <TableHead className="h-9">Lands in</TableHead>
                  <TableHead className="h-9 text-right">Amount</TableHead>
                  <TableHead className="h-9" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-[13px] font-medium">
                      {e.person ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-[13px]">
                      {e.label}
                      {e.notes ? (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {e.notes}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                      {e.paidDate ? format(e.paidDate, "d MMM yyyy") : <span className="text-[11px]">—</span>}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {e.bankAccount ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-[13px] text-positive">
                      {formatGBP(e.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <IncomeDialog
                          defaultMonthIso={monthIso}
                          personOptions={personOptions}
                          accountOptions={accountOptions}
                          triggerVariant="ghost"
                          initial={{
                            id: e.id,
                            month: e.month,
                            paidDate: e.paidDate,
                            person: e.person,
                            label: e.label,
                            amount: e.amount,
                            bankAccount: e.bankAccount,
                            notes: e.notes,
                          }}
                        />
                        <DeleteIncomeButton id={e.id} label={e.label} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function MonthNav({
  monthIso,
  prevIso,
  nextIso,
  isCurrent,
}: {
  monthIso: string;
  prevIso: string;
  nextIso: string;
  isCurrent: boolean;
}) {
  const month = isoToFirstOfMonth(monthIso);
  const todayIso = currentMonthIso();
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/income?month=${prevIso}`}
        className="size-8 rounded-md border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50"
        aria-label="Previous month"
      >
        <ChevronLeft className="size-3.5" />
      </Link>
      <div className="px-3 min-w-[120px] text-center">
        <p className="label-eyebrow">Showing</p>
        <p className="text-[14px] font-semibold tabular-nums">
          {format(month, "MMM yyyy")}
        </p>
      </div>
      <Link
        href={`/income?month=${nextIso}`}
        className="size-8 rounded-md border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50"
        aria-label="Next month"
      >
        <ChevronRight className="size-3.5" />
      </Link>
      {!isCurrent && (
        <Link
          href={`/income?month=${todayIso}`}
          className="ml-2 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Today
        </Link>
      )}
    </div>
  );
}
