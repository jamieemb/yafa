"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { incomeEntrySchema } from "@/lib/validation";

function parseFromFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = incomeEntrySchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(message);
  }
  return parsed.data;
}

function dataFor(input: ReturnType<typeof incomeEntrySchema.parse>) {
  return {
    month: input.month,
    paidDate: input.paidDate ?? null,
    person: input.person ?? null,
    label: input.label,
    amount: input.amount,
    bankAccount: input.bankAccount ?? null,
    notes: input.notes ?? null,
  };
}

function revalidateAll() {
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

export async function createIncomeEntry(formData: FormData): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.incomeEntry.create({ data: dataFor(data) });
  revalidateAll();
}

export async function updateIncomeEntry(
  id: string,
  formData: FormData,
): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.incomeEntry.update({ where: { id }, data: dataFor(data) });
  revalidateAll();
}

export async function deleteIncomeEntry(id: string): Promise<void> {
  await prisma.incomeEntry.delete({ where: { id } });
  revalidateAll();
}

// Convenience: clones every entry from `sourceIso` (YYYY-MM) into
// `targetIso`, skipping any entries that would duplicate an existing
// (person, label) pair. Returns the number of rows cloned.
export async function copyEntriesFromMonth(
  targetIso: string,
  sourceIso: string,
): Promise<number> {
  const target = isoToFirstOfMonth(targetIso);
  const source = isoToFirstOfMonth(sourceIso);

  const sourceEntries = await prisma.incomeEntry.findMany({
    where: { month: source },
  });
  if (sourceEntries.length === 0) {
    throw new Error("No entries to copy from that month");
  }

  const existing = await prisma.incomeEntry.findMany({
    where: { month: target },
    select: { person: true, label: true },
  });
  const existingKey = new Set(
    existing.map((e) => `${e.person ?? ""}|${e.label}`),
  );

  let cloned = 0;
  for (const e of sourceEntries) {
    const key = `${e.person ?? ""}|${e.label}`;
    if (existingKey.has(key)) continue;
    await prisma.incomeEntry.create({
      data: {
        month: target,
        // Don't carry forward paidDate — that's specific to the original
        // pay event. User will fill it in when this month's pay lands.
        paidDate: null,
        person: e.person,
        label: e.label,
        amount: e.amount,
        bankAccount: e.bankAccount,
        notes: e.notes,
      },
    });
    cloned++;
  }

  revalidateAll();
  return cloned;
}

function isoToFirstOfMonth(yyyymm: string): Date {
  const [yStr, mStr] = yyyymm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error(`Bad month: ${yyyymm}`);
  }
  return new Date(Date.UTC(y, m - 1, 1));
}
