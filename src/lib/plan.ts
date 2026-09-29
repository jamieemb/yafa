// The monthly setup wizard: step definitions and MonthPlan helpers.
// Pure — safe to import from client and server code.

export const WIZARD_STEPS = [
  {
    id: "income",
    title: "Income",
    heading: "Who's getting paid this month?",
    description: "Record each person's salary and any extra income landing for this budget month.",
  },
  {
    id: "events",
    title: "Events",
    heading: "Birthdays and events",
    description: "Check what's coming up and add anything that needs a gift or a budget.",
  },
  {
    id: "recurring",
    title: "Recurring",
    heading: "Review recurring costs",
    description: "Prices change and contracts end. Make sure the bills and pots are right for this month.",
  },
  {
    id: "trips",
    title: "Car trips",
    heading: "Import car trips",
    description: "Bring in the latest trip export so the mileage allowance stays on track.",
  },
  {
    id: "allocation",
    title: "Allocation",
    heading: "Allocate what's left",
    description: "Everything committed is accounted for. Decide how the rest splits between savings, investments and free spend.",
  },
] as const;

export type StepId = (typeof WIZARD_STEPS)[number]["id"];

export const STEP_IDS: StepId[] = WIZARD_STEPS.map((s) => s.id);

export function isStepId(value: string | undefined): value is StepId {
  return typeof value === "string" && (STEP_IDS as string[]).includes(value);
}

export function parseSteps(serialised: string | null | undefined): Set<StepId> {
  const out = new Set<StepId>();
  for (const part of (serialised ?? "").split(",")) {
    const id = part.trim();
    if (isStepId(id)) out.add(id);
  }
  return out;
}

export function serialiseSteps(steps: Iterable<StepId>): string {
  return STEP_IDS.filter((id) => new Set(steps).has(id)).join(",");
}

export function stepIndex(id: StepId): number {
  return STEP_IDS.indexOf(id);
}

export function nextStep(id: StepId): StepId | null {
  const i = stepIndex(id);
  return i >= 0 && i < STEP_IDS.length - 1 ? STEP_IDS[i + 1] : null;
}

export function prevStep(id: StepId): StepId | null {
  const i = stepIndex(id);
  return i > 0 ? STEP_IDS[i - 1] : null;
}

/** First step not yet completed, or the last one when all are done. */
export function firstOpenStep(completed: Set<StepId>): StepId {
  return STEP_IDS.find((id) => !completed.has(id)) ?? STEP_IDS[STEP_IDS.length - 1];
}

export function setupHref(monthIso: string, step?: StepId): string {
  return step ? `/setup?month=${monthIso}&step=${step}` : `/setup?month=${monthIso}`;
}

export interface AllocationAmounts {
  savings: number;
  invest: number;
  free: number;
}

/** Split a positive total by the Settings percentages (pennies balanced onto free spend). */
export function suggestedAllocation(
  discretionary: number,
  percents: AllocationAmounts,
): AllocationAmounts {
  const base = Math.max(0, discretionary);
  const savings = round2(base * percents.savings);
  const invest = round2(base * percents.invest);
  const free = round2(base - savings - invest);
  return { savings, invest, free: Math.max(0, free) };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
