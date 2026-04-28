"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recurringItemSchema } from "@/lib/validation";

function parseFromFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = recurringItemSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(message);
  }
  return parsed.data;
}

function recurringDataFor(input: ReturnType<typeof recurringItemSchema.parse>) {
  return {
    name: input.name,
    amount: input.amount,
    budgetCategory: input.budgetCategory ?? null,
    bankAccount: input.bankAccount ?? null,
    frequency: input.frequency,
    dayOfMonth: input.dayOfMonth ?? null,
    startDate: input.startDate ?? new Date(),
    endDate: input.endDate ?? null,
    notes: input.notes ?? null,
    active: input.active ?? true,
  };
}

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/recurring");
}

export async function createRecurringItem(formData: FormData): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.recurringItem.create({ data: recurringDataFor(data) });
  revalidateAll();
}

export async function updateRecurringItem(id: string, formData: FormData): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.recurringItem.update({
    where: { id },
    data: recurringDataFor(data),
  });
  revalidateAll();
}

export async function deleteRecurringItem(id: string): Promise<void> {
  await prisma.recurringItem.delete({ where: { id } });
  revalidateAll();
}

export async function setRecurringItemActive(id: string, active: boolean): Promise<void> {
  await prisma.recurringItem.update({
    where: { id },
    data: { active },
  });
  revalidateAll();
}
