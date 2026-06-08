"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { STATEMENT_SOURCES, type StatementSource } from "@/lib/categories";
import {
  PARSERS,
  classifyTransaction,
  normaliseDescription,
} from "@/lib/importers";

export interface ImportResult {
  source: StatementSource;
  filename: string;
  imported: number;
  skipped: number;
  autoCategorised: number;
  needsReview: number;
  payments: number;
  refunds: number;
}

// Expected import failures (bad CSV, unrecognised date, missing column,
// duplicate-only file, …) are returned as data rather than thrown.
// A production Next.js build strips the message off any Error thrown
// from a Server Action and replaces it with an opaque generic string,
// so throwing would hide the one thing the user needs to see — the real
// reason their statement didn't import.
export type ImportOutcome =
  | { ok: true; result: ImportResult }
  | { ok: false; error: string };

export async function importStatement(
  formData: FormData,
): Promise<ImportOutcome> {
  try {
    const result = await runImport(formData);
    return { ok: true, result };
  } catch (err) {
    // Log the full error server-side (container logs) for unexpected
    // failures, but hand a useful message back to the UI.
    console.error("[import] failed:", err);
    const error = err instanceof Error ? err.message : "Import failed";
    return { ok: false, error };
  }
}

async function runImport(formData: FormData): Promise<ImportResult> {
  const sourceStr = String(formData.get("source") ?? "");
  if (!STATEMENT_SOURCES.includes(sourceStr as StatementSource)) {
    throw new Error(`Unknown source: "${sourceStr}"`);
  }
  const source = sourceStr as StatementSource;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Please choose a CSV file");
  }
  if (file.size === 0) {
    throw new Error(`File "${file.name}" is empty`);
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new Error(`File must be a .csv (got "${file.name}")`);
  }

  const csvText = await file.text();
  const parsed = PARSERS[source](csvText);
  if (parsed.length === 0) {
    throw new Error("No transactions found in file");
  }

  const rules = await prisma.categoryRule.findMany();
  // Normalise rule patterns up-front so per-row matching is fast.
  const normRules = rules.map((r) => ({
    pattern: r.matchPattern.toUpperCase(),
    spendCategory: r.spendCategory,
  }));

  const importRow = await prisma.statementImport.create({
    data: { source, filename: file.name, transactionCount: 0 },
  });

  let imported = 0;
  let skipped = 0;
  let autoCategorised = 0;
  let payments = 0;
  let refunds = 0;

  for (const tx of parsed) {
    const normalised = normaliseDescription(tx.description);
    const kind = classifyTransaction(tx.description, tx.amount);

    const existing = await prisma.transaction.findFirst({
      where: {
        source,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
      },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // Payments are not spend — no category, no review.
    // Refunds ARE meaningful spend signal (negative spend on the
    // matching merchant's category), so they go through the same
    // categorisation + review path as charges.
    let spendCategory: string | null = null;
    let needsReview = false;
    if (kind === "SPEND" || kind === "REFUND") {
      const matches = normRules
        .filter((r) => normalised.includes(r.pattern))
        .sort((a, b) => b.pattern.length - a.pattern.length);
      spendCategory = matches[0]?.spendCategory ?? null;
      if (spendCategory) autoCategorised++;
      needsReview = !spendCategory;
      if (kind === "REFUND") refunds++;
    } else {
      payments++;
    }

    await prisma.transaction.create({
      data: {
        date: tx.date,
        description: tx.description,
        normalisedDescription: normalised,
        amount: tx.amount,
        source,
        kind,
        spendCategory,
        needsReview,
        importId: importRow.id,
      },
    });
    imported++;
  }

  await prisma.statementImport.update({
    where: { id: importRow.id },
    data: { transactionCount: imported },
  });

  revalidatePath("/imports");
  revalidatePath("/transactions");
  revalidatePath("/review");

  return {
    source,
    filename: file.name,
    imported,
    skipped,
    autoCategorised,
    needsReview: imported - autoCategorised - payments,
    payments,
    refunds,
  };
}

export async function deleteImport(id: string): Promise<void> {
  // Cascade: remove all transactions tied to this import as well.
  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({ where: { importId: id } });
    await tx.statementImport.delete({ where: { id } });
  });
  revalidatePath("/imports");
  revalidatePath("/transactions");
  revalidatePath("/review");
}
