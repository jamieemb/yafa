// Budget-month helpers. A budget month is identified by "YYYY-MM" in
// URLs and stored as the first of the month at 00:00 UTC (see
// IncomeEntry.month / MonthPlan.month in the Prisma schema).

export function isValidMonthIso(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isoToFirstOfMonth(yyyymm: string): Date {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export function dateToIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonths(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
}

export function currentMonthIso(): string {
  const now = new Date();
  return dateToIso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}

/** First moment of the following month (exclusive upper bound for queries). */
export function monthEndExclusive(budgetMonth: Date): Date {
  return shiftMonths(budgetMonth, 1);
}

/**
 * The occurrence of a (possibly annual) date inside a budget month, or
 * null if it doesn't fall in that month.
 */
export function occurrenceInMonth(
  base: Date,
  recursAnnually: boolean,
  monthStart: Date,
): Date | null {
  const end = monthEndExclusive(monthStart);
  if (!recursAnnually) {
    return base >= monthStart && base < end ? base : null;
  }
  const candidate = new Date(
    Date.UTC(monthStart.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  );
  return candidate >= monthStart && candidate < end ? candidate : null;
}
