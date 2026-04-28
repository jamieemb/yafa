"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { personSchema } from "@/lib/validation";

function parseFromFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = personSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(message);
  }
  return parsed.data;
}

function dataFor(input: ReturnType<typeof personSchema.parse>) {
  return {
    name: input.name,
    importance: input.importance,
    birthday: input.birthday ?? null,
    notes: input.notes ?? null,
  };
}

function revalidateAll() {
  revalidatePath("/people");
  revalidatePath("/calendar");
}

export async function createPerson(formData: FormData): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.person.create({ data: dataFor(data) });
  revalidateAll();
}

export async function updatePerson(
  id: string,
  formData: FormData,
): Promise<void> {
  const data = parseFromFormData(formData);
  await prisma.person.update({ where: { id }, data: dataFor(data) });
  revalidateAll();
}

export async function deletePerson(id: string): Promise<void> {
  await prisma.person.delete({ where: { id } });
  revalidateAll();
}
