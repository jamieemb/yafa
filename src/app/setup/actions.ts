"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isValidMonthIso, isoToFirstOfMonth } from "@/lib/month";
import {
  isStepId,
  parseSteps,
  round2,
  serialiseSteps,
  type AllocationAmounts,
  type StepId,
} from "@/lib/plan";

function monthOrThrow(monthIso: string): Date {
  if (!isValidMonthIso(monthIso)) throw new Error(`Invalid month: ${monthIso}`);
  return isoToFirstOfMonth(monthIso);
}

function revalidate(monthIso: string) {
  revalidatePath("/setup");
  revalidatePath("/dashboard");
  void monthIso;
}

/** Tick or untick a wizard step for the month. */
export async function setStepDone(monthIso: string, step: string, done: boolean): Promise<void> {
  const month = monthOrThrow(monthIso);
  if (!isStepId(step)) throw new Error(`Unknown step: ${step}`);
  const existing = await prisma.monthPlan.findUnique({ where: { month } });
  const steps = parseSteps(existing?.completedSteps);
  if (done) steps.add(step as StepId);
  else steps.delete(step as StepId);
  const completedSteps = serialiseSteps(steps);
  await prisma.monthPlan.upsert({
    where: { month },
    create: { month, completedSteps },
    update: { completedSteps, ...(done ? {} : { completedAt: null }) },
  });
  revalidate(monthIso);
}

const allocationSchema = z.object({
  savings: z.coerce.number().min(0),
  invest: z.coerce.number().min(0),
  free: z.coerce.number().min(0),
});

/** Save the month's savings / investments / free-spend split and tick the allocation step. */
export async function saveAllocation(monthIso: string, amounts: AllocationAmounts): Promise<void> {
  const month = monthOrThrow(monthIso);
  const parsed = allocationSchema.safeParse(amounts);
  if (!parsed.success) throw new Error("Amounts must be zero or more");
  const existing = await prisma.monthPlan.findUnique({ where: { month } });
  const steps = parseSteps(existing?.completedSteps);
  steps.add("allocation");
  const data = {
    savingsAmount: round2(parsed.data.savings),
    investAmount: round2(parsed.data.invest),
    freeAmount: round2(parsed.data.free),
    completedSteps: serialiseSteps(steps),
  };
  await prisma.monthPlan.upsert({
    where: { month },
    create: { month, ...data },
    update: data,
  });
  revalidate(monthIso);
}

/** Drop the override so the dashboard shows the Settings-percentage suggestion again. */
export async function clearAllocation(monthIso: string): Promise<void> {
  const month = monthOrThrow(monthIso);
  // Destructive for the month's plan; logged so an unexpected call is traceable.
  console.info(`[setup] clearAllocation ${monthIso}`);
  await prisma.monthPlan.upsert({
    where: { month },
    create: { month },
    update: { savingsAmount: null, investAmount: null, freeAmount: null },
  });
  revalidate(monthIso);
}

/** Mark the whole month as set up. */
export async function finishPlan(monthIso: string): Promise<void> {
  const month = monthOrThrow(monthIso);
  await prisma.monthPlan.upsert({
    where: { month },
    create: { month, completedAt: new Date() },
    update: { completedAt: new Date() },
  });
  revalidate(monthIso);
}

/** Start the month over: clears ticks and completion, keeps any saved allocation. */
export async function reopenPlan(monthIso: string): Promise<void> {
  const month = monthOrThrow(monthIso);
  await prisma.monthPlan.upsert({
    where: { month },
    create: { month },
    update: { completedSteps: "", completedAt: null },
  });
  revalidate(monthIso);
}

const suggestionSchema = z.object({
  label: z.string().trim().min(1).max(120),
  person: z.string().trim().max(60).nullable(),
  amount: z.coerce.number().positive(),
  bankAccount: z.string().trim().max(60).nullable(),
});

/**
 * Add an income entry for the month from a previous month's entry
 * ("Jamie · Salary · £3,200 — add again"). Paid date is left blank.
 */
export async function addIncomeFromSuggestion(
  monthIso: string,
  suggestion: { label: string; person: string | null; amount: number; bankAccount: string | null },
): Promise<void> {
  const month = monthOrThrow(monthIso);
  const parsed = suggestionSchema.safeParse(suggestion);
  if (!parsed.success) throw new Error("Invalid income suggestion");
  await prisma.incomeEntry.create({
    data: {
      month,
      paidDate: null,
      person: parsed.data.person || null,
      label: parsed.data.label,
      amount: parsed.data.amount,
      bankAccount: parsed.data.bankAccount || null,
    },
  });
  revalidatePath("/income");
  revalidate(monthIso);
}
