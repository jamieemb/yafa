export const BUDGET_CATEGORIES = [
  "Food & Essentials",
  "Home",
  "Petrol",
  "Car",
  "Finance & Contracts",
  "Health & Beauty",
  "Subscriptions",
  "Memberships",
  "Birthdays & Events",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export const SPEND_CATEGORIES = [
  "Personal Spending",
  "Food Shop",
  "Petrol",
  "Bills",
  "One-Off Purchase",
  "Home Refurb",
] as const;

export type SpendCategory = (typeof SPEND_CATEGORIES)[number];

export const FREQUENCIES = ["MONTHLY", "WEEKLY", "QUARTERLY", "ANNUAL"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  MONTHLY: "Monthly",
  WEEKLY: "Weekly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
};

export const IMPORTANCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];
export const IMPORTANCE_LABELS: Record<ImportanceLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const STATEMENT_SOURCES = ["NATWEST", "AMEX", "MONZO"] as const;
export type StatementSource = (typeof STATEMENT_SOURCES)[number];

export const STATEMENT_SOURCE_LABELS: Record<StatementSource, string> = {
  NATWEST: "NatWest",
  AMEX: "American Express",
  MONZO: "Monzo",
};

// Annualise then divide by 12, so the dashboard always shows a comparable
// per-month figure regardless of how the recurring item is set up.
export function monthlyEquivalent(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case "MONTHLY":
      return amount;
    case "WEEKLY":
      return (amount * 52) / 12;
    case "QUARTERLY":
      return amount / 3;
    case "ANNUAL":
      return amount / 12;
  }
}
