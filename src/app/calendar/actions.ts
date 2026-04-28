"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { calendarEventSchema } from "@/lib/validation";

function parseFromFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = calendarEventSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(message);
  }
  return parsed.data;
}

function dataFor(input: ReturnType<typeof calendarEventSchema.parse>) {
  return {
    title: input.title,
    date: input.date,
    recursAnnually: input.recursAnnually ?? false,
    importance: input.importance ?? null,
    amount: input.amount ?? null,
    person: input.person ?? null,
    notes: input.notes ?? null,
  };
}

function revalidateAll() {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function createCalendarEvent(formData: FormData): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.calendarEvent.create({ data: dataFor(data) });
  revalidateAll();
}

export async function updateCalendarEvent(
  id: string,
  formData: FormData,
): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.calendarEvent.update({ where: { id }, data: dataFor(data) });
  revalidateAll();
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await prisma.calendarEvent.delete({ where: { id } });
  revalidateAll();
}
