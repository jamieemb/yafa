import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Cake,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { getSettings, giftAmountFor, resolveEventAmount } from "@/lib/settings";
import {
  BUDGET_CATEGORIES,
  monthlyEquivalent,
  type BudgetCategory,
  type Frequency,
  type ImportanceLevel,
} from "@/lib/categories";
import { Kpi } from "@/components/kpi";
import { AllocationChart } from "./_components/allocation-chart";

export const dynamic = "force-dynamic";

const POT_COLOURS = [
  "#003A6C",
  "#FD8973",
  "#4F7E5C",
  "#B8956A",
  "#6B7E8C",
  "#2E5783",
  "#E0A993",
  "#84A48F",
];


interface PotSummary {
  category: BudgetCategory;
  total: number;
  itemCount: number;
}

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
  return dateToIso(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  );
}

interface MonthEvent {
  kind: "BIRTHDAY" | "EVENT";
  title: string;
  date: Date;
  amount: number;
  importance: ImportanceLevel | null;
}

// Compute the next occurrence of a recurring event within a given
// budget month. For non-recurring events, return the original date if
// it falls in the month (else null). For recurring, the next-this-year
// (or next year) occurrence — included if it's within the month.
function occurrenceInMonth(
  base: Date,
  recursAnnually: boolean,
  monthStart: Date,
  monthEndExclusive: Date,
): Date | null {
  if (!recursAnnually) {
    if (base >= monthStart && base < monthEndExclusive) return base;
    return null;
  }
  const year = monthStart.getUTCFullYear();
  const candidate = new Date(
    Date.UTC(year, base.getUTCMonth(), base.getUTCDate()),
  );
  if (candidate >= monthStart && candidate < monthEndExclusive) {
    return candidate;
  }
  return null;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const monthIso = sp.month ?? currentMonthIso();
  const budgetMonth = isoToFirstOfMonth(monthIso);

  // Fetch active recurring outflows that are live for this budget month
  // (started before/at the month, and either ongoing or ending after it).
  const [outItems, incomeEntries, settings, calendarEvents, people] =
    await Promise.all([
      prisma.recurringItem.findMany({
        where: {
          active: true,
          OR: [{ endDate: null }, { endDate: { gte: budgetMonth } }],
        },
      }),
      prisma.incomeEntry.findMany({ where: { month: budgetMonth } }),
      getSettings(),
      prisma.calendarEvent.findMany(),
      prisma.person.findMany({ where: { birthday: { not: null } } }),
    ]);

  // Calendar entries falling in the selected budget month — drives the
  // "Birthdays & Events" pot total + the dedicated section below.
  const monthEndExclusive = shiftMonths(budgetMonth, 1);
  const monthEvents: MonthEvent[] = [];

  for (const e of calendarEvents) {
    const occ = occurrenceInMonth(
      e.date,
      e.recursAnnually,
      budgetMonth,
      monthEndExclusive,
    );
    if (!occ) continue;
    const importance = (e.importance ?? null) as ImportanceLevel | null;
    monthEvents.push({
      kind: "EVENT",
      title: e.title,
      date: occ,
      amount: resolveEventAmount(settings, e.amount, importance),
      importance,
    });
  }

  for (const p of people) {
    if (!p.birthday) continue;
    const occ = occurrenceInMonth(
      p.birthday,
      true,
      budgetMonth,
      monthEndExclusive,
    );
    if (!occ) continue;
    const importance = p.importance as ImportanceLevel;
    monthEvents.push({
      kind: "BIRTHDAY",
      title: `${p.name}'s birthday`,
      date: occ,
      amount: giftAmountFor(settings, importance),
      importance,
    });
  }

  monthEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  const eventsTotal = monthEvents.reduce((acc, e) => acc + e.amount, 0);

  const incomeMonthly = incomeEntries.reduce((acc, e) => acc + e.amount, 0);
  const recurringOutflow = outItems.reduce(
    (acc, i) => acc + monthlyEquivalent(i.amount, i.frequency as Frequency),
    0,
  );
  const outflowMonthly = recurringOutflow + eventsTotal;
  const discretionary = incomeMonthly - outflowMonthly;
  const hasIncome = incomeMonthly > 0;

  const suggestedSavings = Math.max(0, discretionary) * settings.savingsPercent;
  const suggestedInvest = Math.max(0, discretionary) * settings.investPercent;
  const suggestedFree = Math.max(0, discretionary) * settings.freePercent;

  // Pot summary
  const byCategory = new Map<BudgetCategory, PotSummary>();
  for (const cat of BUDGET_CATEGORIES) {
    byCategory.set(cat, { category: cat, total: 0, itemCount: 0 });
  }
  const byAccount = new Map<string, number>();

  for (const item of outItems) {
    const cat = item.budgetCategory as BudgetCategory | null;
    if (cat) {
      const summary = byCategory.get(cat);
      if (summary) {
        summary.total += monthlyEquivalent(
          item.amount,
          item.frequency as Frequency,
        );
        summary.itemCount += 1;
      }
    }
    const acct = item.bankAccount ?? "Unassigned";
    byAccount.set(
      acct,
      (byAccount.get(acct) ?? 0) +
        monthlyEquivalent(item.amount, item.frequency as Frequency),
    );
  }

  // Roll the calendar contribution into the Birthdays & Events pot so
  // the allocation chart and ledger reflect everything that needs
  // setting aside this month, not just recurring items.
  if (eventsTotal > 0) {
    const eventsPot = byCategory.get("Birthdays & Events");
    if (eventsPot) {
      eventsPot.total += eventsTotal;
      eventsPot.itemCount += monthEvents.length;
    }
  }

  const pots = Array.from(byCategory.values())
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
  const accounts = Array.from(byAccount.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const potSlices = pots.map((p, i) => ({
    category: p.category,
    total: p.total,
    color: POT_COLOURS[i % POT_COLOURS.length],
  }));

  const today = new Date();
  const isCurrentMonth = monthIso === currentMonthIso();
  const prevIso = dateToIso(shiftMonths(budgetMonth, -1));
  const nextIso = dateToIso(shiftMonths(budgetMonth, 1));

  return (
    <div className="space-y-5">
      {/* Header with month nav */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow">YAFA</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            {format(budgetMonth, "MMMM yyyy")} budget
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="label-eyebrow hidden sm:block">
            As of {format(today, "d MMM, HH:mm")}
          </p>
          <MonthNav
            prevIso={prevIso}
            nextIso={nextIso}
            isCurrent={isCurrentMonth}
          />
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3">
        <Kpi
          size="lg"
          label={`Income · ${format(budgetMonth, "MMM")}`}
          icon={<ArrowDownLeft className="size-3 text-positive" />}
          value={hasIncome ? formatGBP(incomeMonthly) : "—"}
          sub={
            hasIncome
              ? `${incomeEntries.length} entr${incomeEntries.length === 1 ? "y" : "ies"}`
              : "Record this month's income"
          }
          tone={hasIncome ? "positive" : "muted"}
        />
        <Kpi
          size="lg"
          label="Committed"
          icon={<ArrowUpRight className="size-3 text-negative" />}
          value={formatGBP(outflowMonthly)}
          sub={`${outItems.length} item${outItems.length === 1 ? "" : "s"} · ${pots.length} pots`}
          tone="negative"
        />
        <Kpi
          size="lg"
          label="Left over"
          value={hasIncome ? formatGBP(discretionary) : "—"}
          sub={
            hasIncome
              ? discretionary >= 0
                ? "After committed outflow"
                : "Outflow exceeds income"
              : "—"
          }
          tone={
            !hasIncome ? "muted" : discretionary < 0 ? "negative" : "neutral"
          }
          emphasised
        />
        <Kpi
          size="lg"
          label="To save"
          icon={<PiggyBank className="size-3 text-primary" />}
          value={
            hasIncome && discretionary > 0
              ? formatGBP(suggestedSavings + suggestedInvest)
              : "—"
          }
          sub={`Suggested · ${Math.round((settings.savingsPercent + settings.investPercent) * 100)}% of left over`}
          tone={hasIncome && discretionary > 0 ? "primary" : "muted"}
        />
      </div>

      {/* Main row: allocation + discretionary plan */}
      <div className="grid grid-cols-12 gap-5">
        {/* Pot Allocation panel */}
        <div className="col-span-7 rounded-md border bg-card p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="label-eyebrow">Pot allocation</p>
              <h2 className="text-base font-semibold mt-1">
                Where your outflow goes
              </h2>
            </div>
            <Link
              href="/recurring"
              className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              View ledger →
            </Link>
          </div>
          {pots.length === 0 ? (
            <EmptyPanel
              message="Add some recurring outgoings to see your allocation."
              cta={{ href: "/recurring", label: "Add an item" }}
            />
          ) : (
            <div className="flex items-center gap-6">
              <AllocationChart data={potSlices} size={200} />
              <ul className="flex-1 grid grid-cols-1 gap-1.5 min-w-0">
                {potSlices.map((slice) => {
                  const pct = (slice.total / outflowMonthly) * 100;
                  return (
                    <li
                      key={slice.category}
                      className="grid grid-cols-[10px_1fr_auto_auto] items-center gap-2.5 text-[12px]"
                    >
                      <span
                        className="size-2 rounded-[1px]"
                        style={{ background: slice.color }}
                      />
                      <span className="truncate font-medium">
                        {slice.category}
                      </span>
                      <span className="text-muted-foreground tabular-nums w-10 text-right text-[11px]">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="font-mono tabular-nums w-16 text-right">
                        {formatGBP(slice.total)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Discretionary panel */}
        <div className="col-span-5 rounded-md border bg-card p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="label-eyebrow">Smart allocation</p>
              <h2 className="text-base font-semibold mt-1">
                After bills are paid
              </h2>
            </div>
            <Sparkles className="size-3.5 text-primary" />
          </div>

          {!hasIncome ? (
            <EmptyPanel
              message={`Record income for ${format(budgetMonth, "MMMM")} to unlock the savings, investments and free-spend split.`}
              cta={{ href: `/income?month=${monthIso}`, label: "Add income" }}
            />
          ) : discretionary <= 0 ? (
            <div className="rounded-md bg-negative/10 border border-negative/20 p-4 text-[13px]">
              <p className="font-medium text-negative">
                You&apos;re over budget by {formatGBP(Math.abs(discretionary))}
                /mo.
              </p>
              <p className="text-muted-foreground mt-1.5 text-[12px]">
                Trim a recurring outflow or increase income before allocating
                savings.
              </p>
            </div>
          ) : (
            <DiscretionaryBreakdown
              total={discretionary}
              savings={suggestedSavings}
              invest={suggestedInvest}
              free={suggestedFree}
            />
          )}
        </div>
      </div>

      {/* Bottom row: events + accounts */}
      <div className="grid grid-cols-12 gap-5">
        {/* This month's events */}
        <div className="col-span-7 rounded-md border bg-card p-5">
          <div className="flex items-baseline justify-between mb-3.5">
            <div>
              <p className="label-eyebrow">Birthdays &amp; events</p>
              <h2 className="text-base font-semibold mt-1">
                {format(budgetMonth, "MMMM")} ahead
              </h2>
            </div>
            <span className="label-eyebrow tabular-nums">
              {monthEvents.length === 0
                ? "—"
                : `${monthEvents.length} item${monthEvents.length === 1 ? "" : "s"} · ${formatGBP(eventsTotal)}`}
            </span>
          </div>
          {monthEvents.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[13px] text-muted-foreground mb-2">
                Nothing scheduled this month.
              </p>
              <Link
                href="/calendar"
                className="text-[12px] font-medium text-primary hover:underline underline-offset-4"
              >
                Add an event →
              </Link>
            </div>
          ) : (
            <ul className="divide-y -mx-5 px-5">
              {monthEvents.map((e, i) => (
                <li
                  key={`${e.kind}-${i}`}
                  className="grid grid-cols-[28px_60px_1fr_auto_auto] items-center gap-3 py-2"
                >
                  <span
                    className={`flex items-center justify-center size-6 rounded-md ${
                      e.kind === "BIRTHDAY"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {e.kind === "BIRTHDAY" ? (
                      <Cake className="size-3" />
                    ) : (
                      <CalendarDays className="size-3" />
                    )}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                    {format(e.date, "EEE d")}
                  </span>
                  <span className="text-[13px] truncate">{e.title}</span>
                  {e.importance ? (
                    <span
                      className={`rounded-sm text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 ${
                        e.importance === "HIGH"
                          ? "bg-primary/15 text-primary"
                          : e.importance === "MEDIUM"
                            ? "bg-accent/20 text-accent-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {e.importance.toLowerCase()}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="font-mono tabular-nums text-[13px] w-16 text-right">
                    {formatGBP(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* By account */}
        <div className="col-span-5 rounded-md border bg-card p-5">
          <div className="flex items-baseline justify-between mb-3.5">
            <div>
              <p className="label-eyebrow">Funded by</p>
              <h2 className="text-base font-semibold mt-1">
                By account
              </h2>
            </div>
            <span className="label-eyebrow tabular-nums">
              {accounts.length}{" "}
              account{accounts.length === 1 ? "" : "s"}
            </span>
          </div>
          {accounts.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-6 text-center">
              No funding accounts assigned yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((a) => {
                const pct = (a.total / outflowMonthly) * 100;
                return (
                  <li key={a.name} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-[12px]">
                      <span className="font-medium truncate">{a.name}</span>
                      <span className="font-mono tabular-nums">
                        {formatGBP(a.total)}
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
    </div>
  );
}

function MonthNav({
  prevIso,
  nextIso,
  isCurrent,
}: {
  prevIso: string;
  nextIso: string;
  isCurrent: boolean;
}) {
  const todayIso = currentMonthIso();
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/dashboard?month=${prevIso}`}
        className="size-8 rounded-md border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50"
        aria-label="Previous month"
      >
        <ChevronLeft className="size-3.5" />
      </Link>
      <Link
        href={`/dashboard?month=${nextIso}`}
        className="size-8 rounded-md border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50"
        aria-label="Next month"
      >
        <ChevronRight className="size-3.5" />
      </Link>
      {!isCurrent && (
        <Link
          href={`/dashboard?month=${todayIso}`}
          className="ml-2 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Today
        </Link>
      )}
    </div>
  );
}


function DiscretionaryBreakdown({
  total,
  savings,
  invest,
  free,
}: {
  total: number;
  savings: number;
  invest: number;
  free: number;
}) {
  const segments: { label: string; value: number; color: string }[] = [
    { label: "Savings", value: savings, color: "var(--chart-1)" },
    { label: "Investments", value: invest, color: "var(--chart-3)" },
    { label: "Free spend", value: free, color: "var(--chart-2)" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-3xl tabular-nums tracking-[-0.02em]">
          {formatGBP(total)}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Discretionary monthly
        </p>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full"
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
            }}
            title={`${s.label} — ${formatGBP(s.value)}`}
          />
        ))}
      </div>

      {/* Lines */}
      <ul className="space-y-1.5">
        {segments.map((s) => {
          const pct = (s.value / total) * 100;
          return (
            <li
              key={s.label}
              className="grid grid-cols-[10px_1fr_auto_auto] items-center gap-2.5 text-[12px]"
            >
              <span
                className="size-2 rounded-[1px]"
                style={{ background: s.color }}
              />
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground tabular-nums w-10 text-right text-[11px]">
                {pct.toFixed(0)}%
              </span>
              <span className="font-mono tabular-nums w-16 text-right">
                {formatGBP(s.value)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-muted-foreground border-t pt-3">
        Suggested split. Adjust in{" "}
        <Link href="/settings" className="text-primary hover:underline underline-offset-4">
          settings
        </Link>
        .
      </p>
    </div>
  );
}

function EmptyPanel({
  message,
  cta,
}: {
  message: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center min-h-[180px]">
      <p className="text-[13px] text-muted-foreground mb-3 max-w-xs">
        {message}
      </p>
      {cta ? (
        <Link
          href={cta.href}
          className="text-[12px] font-medium text-primary hover:underline underline-offset-4"
        >
          {cta.label} →
        </Link>
      ) : null}
    </div>
  );
}
