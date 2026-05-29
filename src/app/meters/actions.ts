"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { meterReadingSchema } from "@/lib/validation";

function parseFromFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = meterReadingSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(message);
  }
  return parsed.data;
}

export async function createReading(formData: FormData): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.meterReading.create({
    data: {
      meter: data.meter,
      date: data.date,
      value: data.value,
      unit: data.unit ?? null,
      notes: data.notes ?? null,
    },
  });
  revalidatePath("/meters");
}

export async function deleteReading(id: string): Promise<void> {
  await prisma.meterReading.delete({ where: { id } });
  revalidatePath("/meters");
}
