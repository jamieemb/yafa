"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { renewalSchema } from "@/lib/validation";
import { advanceDueDate, type RenewalRecurrence } from "@/lib/admin";

function parseFromFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = renewalSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(message);
  }
  return parsed.data;
}

function renewalDataFor(input: ReturnType<typeof renewalSchema.parse>) {
  return {
    title: input.title,
    category: input.category,
    subject: input.subject ?? null,
    provider: input.provider ?? null,
    reference: input.reference ?? null,
    dueDate: input.dueDate,
    cost: input.cost ?? null,
    recurrence: input.recurrence,
    reminderDays: input.reminderDays,
    notes: input.notes ?? null,
    active: input.active ?? true,
  };
}

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/renewals");
}

export async function createRenewal(formData: FormData): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.renewal.create({ data: renewalDataFor(data) });
  revalidateAll();
}

export async function updateRenewal(id: string, formData: FormData): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.renewal.update({ where: { id }, data: renewalDataFor(data) });
  revalidateAll();
}

export async function deleteRenewal(id: string): Promise<void> {
  await prisma.renewal.delete({ where: { id } });
  revalidateAll();
}

export async function setRenewalActive(id: string, active: boolean): Promise<void> {
  await prisma.renewal.update({ where: { id }, data: { active } });
  revalidateAll();
}

// Mark a renewal as done: roll its due date forward by one recurrence
// period. One-off renewals (recurrence NONE) have no next occurrence, so
// they're archived (active = false) instead.
export async function markRenewed(id: string): Promise<void> {
  const renewal = await prisma.renewal.findUnique({ where: { id } });
  if (!renewal) throw new Error("Renewal not found");

  const next = advanceDueDate(
    renewal.dueDate,
    renewal.recurrence as RenewalRecurrence,
  );

  await prisma.renewal.update({
    where: { id },
    data: next ? { dueDate: next, active: true } : { active: false },
  });
  revalidateAll();
}
