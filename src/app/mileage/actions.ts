"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { mileageContractSchema } from "@/lib/validation";

function parseContract(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = mileageContractSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  }
  return parsed.data;
}

function contractDataFor(input: ReturnType<typeof mileageContractSchema.parse>) {
  return {
    label: input.label,
    startDate: input.startDate,
    startOdometer: input.startOdometer,
    annualAllowance: input.annualAllowance,
    termYears: input.termYears,
    notes: input.notes ?? null,
    active: input.active ?? true,
  };
}

function revalidateAll() {
  revalidatePath("/mileage");
}

export async function createContract(formData: FormData): Promise<void> {
  const data = parseContract(formData);
  await prisma.mileageContract.create({ data: contractDataFor(data) });
  revalidateAll();
}

export async function updateContract(
  id: string,
  formData: FormData,
): Promise<void> {
  const data = parseContract(formData);
  await prisma.mileageContract.update({
    where: { id },
    data: contractDataFor(data),
  });
  revalidateAll();
}

export async function deleteContract(id: string): Promise<void> {
  // Cascade removes the contract's trips (see schema relation).
  await prisma.mileageContract.delete({ where: { id } });
  revalidateAll();
}
