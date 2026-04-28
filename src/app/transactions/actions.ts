"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { SPEND_CATEGORIES, type SpendCategory } from "@/lib/categories";

export async function setTransactionCategory(
  id: string,
  category: SpendCategory | null,
): Promise<void> {
  if (category && !SPEND_CATEGORIES.includes(category)) {
    throw new Error(`Unknown category: ${category}`);
  }
  await prisma.transaction.update({
    where: { id },
    data: {
      spendCategory: category,
      needsReview: category === null,
    },
  });
  revalidatePath("/transactions");
  revalidatePath("/review");
}

export async function deleteTransaction(id: string): Promise<void> {
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/transactions");
  revalidatePath("/review");
}
