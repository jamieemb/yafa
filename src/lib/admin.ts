// Domain constants + helpers for the Life Admin section (renewals and
// meter readings). Kept separate from categories.ts, which is
// finance-specific.

export const RENEWAL_CATEGORIES = [
  "Insurance",
  "Vehicle",
  "Property",
  "Utilities",
  "Finance",
  "Health",
  "Documents",
  "Subscriptions",
  "Other",
] as const;

export type RenewalCategory = (typeof RENEWAL_CATEGORIES)[number];

export const RENEWAL_RECURRENCES = [
  "NONE",
  "MONTHLY",
  "QUARTERLY",
  "ANNUAL",
  "BIENNIAL",
] as const;

export type RenewalRecurrence = (typeof RENEWAL_RECURRENCES)[number];

export const RENEWAL_RECURRENCE_LABELS: Record<RenewalRecurrence, string> = {
  NONE: "One-off",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
  BIENNIAL: "Every 2 years",
};

// Suggested meters with their default unit. The stored `meter` field is
// free text, so users can track anything (oil, mileage, …); these just
// pre-fill the add-reading form.
export const METER_PRESETS = [
  { meter: "Electricity", unit: "kWh" },
  { meter: "Gas", unit: "m³" },
  { meter: "Water", unit: "m³" },
] as const;

export type DueStatus = "overdue" | "due-soon" | "upcoming";

// Whole-day difference between two dates, comparing calendar days in UTC
// (dueDate is stored at UTC midnight; this avoids time-of-day drift).
export function daysUntil(dueDate: Date, now: Date): number {
  const due = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
  );
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.round((due - today) / 86_400_000);
}

// Classify a due date relative to now and the item's reminder lead time.
export function dueStatusFor(
  dueDate: Date,
  reminderDays: number,
  now: Date,
): { status: DueStatus; days: number } {
  const days = daysUntil(dueDate, now);
  if (days < 0) return { status: "overdue", days };
  if (days <= reminderDays) return { status: "due-soon", days };
  return { status: "upcoming", days };
}

// Human label for a day delta: "today", "in 12 days", "3 days ago".
export function dueLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

// Roll a due date forward by one recurrence period. Returns null for
// one-off ("NONE") renewals, which have no next occurrence. Uses UTC so
// it stays aligned with how due dates are stored.
export function advanceDueDate(
  date: Date,
  recurrence: RenewalRecurrence,
): Date | null {
  const d = new Date(date);
  switch (recurrence) {
    case "MONTHLY":
      d.setUTCMonth(d.getUTCMonth() + 1);
      return d;
    case "QUARTERLY":
      d.setUTCMonth(d.getUTCMonth() + 3);
      return d;
    case "ANNUAL":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      return d;
    case "BIENNIAL":
      d.setUTCFullYear(d.getUTCFullYear() + 2);
      return d;
    case "NONE":
      return null;
  }
}

// Format a meter reading value with optional unit, grouped thousands.
export function formatReading(value: number, unit?: string | null): string {
  const num = value.toLocaleString("en-GB", { maximumFractionDigits: 3 });
  return unit ? `${num} ${unit}` : num;
}
