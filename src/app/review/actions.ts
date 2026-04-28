"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { SPEND_CATEGORIES, type SpendCategory } from "@/lib/categories";

export interface CategoriseResult {
  cascaded: number;
  pattern: string;
}

// Best-effort guess of a sensible merchant pattern from a normalised
// description. Cuts at the first digit so transient store/transaction
// numbers are excluded. Capped at 20 chars to avoid over-fitting.
function suggestPattern(normalisedDescription: string): string {
  const beforeDigit = normalisedDescription.split(/\d/)[0].trim();
  const candidate = beforeDigit.length >= 2 ? beforeDigit : normalisedDescription;
  return candidate.slice(0, 20).trim();
}

export async function categoriseFromReview(
  id: string,
  category: SpendCategory,
): Promise<CategoriseResult> {
  if (!SPEND_CATEGORIES.includes(category)) {
    throw new Error(`Unknown category: ${category}`);
  }

  const target = await prisma.transaction.findUnique({ where: { id } });
  if (!target) throw new Error("Transaction not found");

  const pattern = suggestPattern(target.normalisedDescription);
  if (pattern.length < 2) {
    // Fall back to "no rule" — just categorise the single transaction
    await prisma.transaction.update({
      where: { id },
      data: { spendCategory: category, needsReview: false },
    });
    revalidatePath("/review");
    revalidatePath("/transactions");
    return { cascaded: 0, pattern: "" };
  }

  const cascaded = await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id },
      data: { spendCategory: category, needsReview: false },
    });

    // Reuse an existing rule if one already maps the same pattern to a
    // different category (user changing their mind), otherwise create.
    const existing = await tx.categoryRule.findFirst({
      where: { matchPattern: pattern },
    });
    if (existing) {
      if (existing.spendCategory !== category) {
        await tx.categoryRule.update({
          where: { id: existing.id },
          data: { spendCategory: category },
        });
      }
    } else {
      await tx.categoryRule.create({
        data: { matchPattern: pattern, spendCategory: category, autoCreated: true },
      });
    }

    const cascade = await tx.transaction.updateMany({
      where: {
        needsReview: true,
        id: { not: id },
        normalisedDescription: { contains: pattern },
      },
      data: { spendCategory: category, needsReview: false },
    });

    return cascade.count;
  });

  revalidatePath("/review");
  revalidatePath("/transactions");
  return { cascaded, pattern };
}

export async function dismissTransaction(id: string): Promise<void> {
  // Mark as not-needing-review without assigning a category; useful for
  // bank transfers or other rows that aren't really "spend".
  await prisma.transaction.update({
    where: { id },
    data: { needsReview: false },
  });
  revalidatePath("/review");
  revalidatePath("/transactions");
}
