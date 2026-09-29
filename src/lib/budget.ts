// One place that answers "how does this budget month look?" — used by
// the dashboard and the monthly setup wizard so the numbers always agree.
// Server-only (talks to Prisma).
import { prisma } from "@/lib/db";
import { monthlyEquivalent, type Frequency, type ImportanceLevel } from "@/lib/categories";
import { getSettings, giftAmountFor, resolveEventAmount, type AppSettings } from "@/lib/settings";
import { occurrenceInMonth } from "@/lib/month";
import {
  parseSteps,
  suggestedAllocation,
  type AllocationAmounts,
  type StepId,
} from "@/lib/plan";

export interface MonthEvent {
  kind: "BIRTHDAY" | "EVENT";
  /** CalendarEvent id, or null for birthdays (which live on Person). */
  id: string | null;
  title: string;
  date: Date;
  amount: number;
  importance: ImportanceLevel | null;
  person: string | null;
}

export type RecurringRow = Awaited<ReturnType<typeof prisma.recurringItem.findMany>>[number];
export type IncomeRow = Awaited<ReturnType<typeof prisma.incomeEntry.findMany>>[number];
export type MonthPlanRow = NonNullable<Awaited<ReturnType<typeof prisma.monthPlan.findUnique>>>;

export interface MonthBudget {
  budgetMonth: Date;
  settings: AppSettings;
  incomeEntries: IncomeRow[];
  incomeTotal: number;
  hasIncome: boolean;
  /** Active recurring items live for this month. */
  recurringItems: RecurringRow[];
  recurringTotal: number;
  monthEvents: MonthEvent[];
  eventsTotal: number;
  /** Recurring + events: what must be set aside. */
  committed: number;
  /** Income − committed (can be negative). */
  discretionary: number;
  /** Settings percentages as a fraction map. */
  percents: AllocationAmounts;
  /** The Settings-percentage split of max(0, discretionary). */
  suggested: AllocationAmounts;
  plan: MonthPlanRow | null;
  completedSteps: Set<StepId>;
  /** What the dashboard should show: the saved plan if any, else the suggestion. */
  allocation: AllocationAmounts & { source: "plan" | "suggested" };
}

export async function computeMonthBudget(budgetMonth: Date): Promise<MonthBudget> {
  const [recurringItems, incomeEntries, settings, calendarEvents, people, plan] =
    await Promise.all([
      prisma.recurringItem.findMany({
        where: { active: true, OR: [{ endDate: null }, { endDate: { gte: budgetMonth } }] },
        orderBy: [{ amount: "desc" }],
      }),
      prisma.incomeEntry.findMany({
        where: { month: budgetMonth },
        orderBy: [{ person: "asc" }, { label: "asc" }],
      }),
      getSettings(),
      prisma.calendarEvent.findMany(),
      prisma.person.findMany({ where: { birthday: { not: null } } }),
      prisma.monthPlan.findUnique({ where: { month: budgetMonth } }),
    ]);

  const monthEvents: MonthEvent[] = [];
  for (const e of calendarEvents) {
    const occ = occurrenceInMonth(e.date, e.recursAnnually, budgetMonth);
    if (!occ) continue;
    const importance = (e.importance ?? null) as ImportanceLevel | null;
    monthEvents.push({
      kind: "EVENT",
      id: e.id,
      title: e.title,
      date: occ,
      amount: resolveEventAmount(settings, e.amount, importance),
      importance,
      person: e.person,
    });
  }
  for (const p of people) {
    if (!p.birthday) continue;
    const occ = occurrenceInMonth(p.birthday, true, budgetMonth);
    if (!occ) continue;
    const importance = p.importance as ImportanceLevel;
    monthEvents.push({
      kind: "BIRTHDAY",
      id: null,
      title: `${p.name}'s birthday`,
      date: occ,
      amount: giftAmountFor(settings, importance),
      importance,
      person: p.name,
    });
  }
  monthEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  const eventsTotal = monthEvents.reduce((acc, e) => acc + e.amount, 0);
  const incomeTotal = incomeEntries.reduce((acc, e) => acc + e.amount, 0);
  const recurringTotal = recurringItems.reduce(
    (acc, i) => acc + monthlyEquivalent(i.amount, i.frequency as Frequency),
    0,
  );
  const committed = recurringTotal + eventsTotal;
  const discretionary = incomeTotal - committed;

  const percents: AllocationAmounts = {
    savings: settings.savingsPercent,
    invest: settings.investPercent,
    free: settings.freePercent,
  };
  const suggested = suggestedAllocation(discretionary, percents);

  const hasPlanAmounts =
    plan != null &&
    plan.savingsAmount != null &&
    plan.investAmount != null &&
    plan.freeAmount != null;

  const allocation = hasPlanAmounts
    ? {
        savings: plan.savingsAmount!,
        invest: plan.investAmount!,
        free: plan.freeAmount!,
        source: "plan" as const,
      }
    : { ...suggested, source: "suggested" as const };

  return {
    budgetMonth,
    settings,
    incomeEntries,
    incomeTotal,
    hasIncome: incomeTotal > 0,
    recurringItems,
    recurringTotal,
    monthEvents,
    eventsTotal,
    committed,
    discretionary,
    percents,
    suggested,
    plan,
    completedSteps: parseSteps(plan?.completedSteps),
    allocation,
  };
}
