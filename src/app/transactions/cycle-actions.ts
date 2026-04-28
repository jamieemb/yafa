"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { STATEMENT_SOURCES, type StatementSource } from "@/lib/categories";
import {
  findSubsetSumIndices,
  poundsToPence,
  balanceImpactPence,
} from "@/lib/subset-sum";

export interface CycleCandidate {
  id: string;
  date: Date;
  description: string;
  amount: number; // signed, as stored
  spendCategory: string | null;
}

export interface FindCycleResult {
  candidates: CycleCandidate[];
  autoSelectedIds: string[];
  exactMatch: boolean;
  totalUncycled: number; // sum of balance impacts in £
}

export async function findCycleMatch(
  source: string,
  paidAmount: number,
): Promise<FindCycleResult> {
  if (!STATEMENT_SOURCES.includes(source as StatementSource)) {
    throw new Error(`Unknown source: ${source}`);
  }
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new Error("Paid amount must be a positive number");
  }

  // All uncycled spend-side rows — both SPEND charges and REFUND
  // credits. We display the full list to the user so they can still
  // manually toggle refunds into a cycle when the real-world payment
  // included one.
  //
  // Ordered MOST RECENT FIRST so the manual list reads chronologically
  // and the auto-suggestion (run on charges only) prefers recent ones.
  const candidates = await prisma.transaction.findMany({
    where: {
      source,
      kind: { in: ["SPEND", "REFUND"] },
      payCycleId: null,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  // Auto-suggestion only considers charges. Refunds would otherwise be
  // picked first under date-desc, dragging in a bunch of unrelated
  // small charges to compensate.
  const charges = candidates.filter((t) => t.kind === "SPEND");
  const chargeImpacts = charges.map((t) => balanceImpactPence(t.amount));
  const targetPence = poundsToPence(paidAmount);

  const matchedIndices = findSubsetSumIndices(chargeImpacts, targetPence);
  const autoSelectedIds = matchedIndices?.map((i) => charges[i].id) ?? [];

  // Total impact across all uncycled rows — used to display "balance
  // remaining" on the source for the user.
  const totalImpact = candidates.reduce(
    (acc, t) => acc + balanceImpactPence(t.amount),
    0,
  );

  return {
    candidates: candidates.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      spendCategory: t.spendCategory,
    })),
    autoSelectedIds,
    exactMatch: matchedIndices !== null,
    totalUncycled: totalImpact / 100,
  };
}

export interface SourceCycleStats {
  source: StatementSource;
  uncycledCount: number;
  uncycledTotal: number; // total balance impact in £
}

export async function getCycleSourceStats(): Promise<SourceCycleStats[]> {
  // Only charges count toward "things to settle". Refunds ride along
  // in the cycle algorithm but they aren't independently settleable —
  // showing them here just produces confusing negative balances when a
  // source has only refunds left.
  const rows = await prisma.transaction.findMany({
    where: { kind: "SPEND", amount: { lt: 0 }, payCycleId: null },
    select: { source: true, amount: true },
  });
  const byKey = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    const cur = byKey.get(r.source) ?? { count: 0, total: 0 };
    cur.count++;
    cur.total += -r.amount; // positive balance owed in £
    byKey.set(r.source, cur);
  }
  return STATEMENT_SOURCES.map((source) => {
    const v = byKey.get(source) ?? { count: 0, total: 0 };
    return {
      source,
      uncycledCount: v.count,
      uncycledTotal: Math.round(v.total * 100) / 100,
    };
  });
}

export async function createPayCycle(input: {
  source: string;
  paidAmount: number;
  paidDate: string; // ISO date string
  transactionIds: string[];
  notes?: string;
}): Promise<{ id: string }> {
  if (!STATEMENT_SOURCES.includes(input.source as StatementSource)) {
    throw new Error(`Unknown source: ${input.source}`);
  }
  if (input.transactionIds.length === 0) {
    throw new Error("Pick at least one transaction");
  }

  const txs = await prisma.transaction.findMany({
    where: { id: { in: input.transactionIds } },
  });
  if (txs.length !== input.transactionIds.length) {
    throw new Error("Some transactions could not be found");
  }
  if (txs.some((t) => t.payCycleId !== null)) {
    throw new Error("One or more transactions are already in a cycle");
  }
  if (txs.some((t) => t.source !== input.source)) {
    throw new Error("All transactions must be from the chosen source");
  }

  const sumPence = txs.reduce((acc, t) => acc + balanceImpactPence(t.amount), 0);
  const targetPence = poundsToPence(input.paidAmount);
  if (sumPence !== targetPence) {
    throw new Error(
      `Sum of selected (£${(sumPence / 100).toFixed(2)}) doesn't match paid (£${input.paidAmount.toFixed(2)})`,
    );
  }

  const paidDate = new Date(input.paidDate);
  if (Number.isNaN(paidDate.getTime())) {
    throw new Error("Invalid paid date");
  }

  const cycle = await prisma.payCycle.create({
    data: {
      source: input.source,
      paidAmount: input.paidAmount,
      paidDate,
      notes: input.notes ?? null,
      transactions: {
        connect: input.transactionIds.map((id) => ({ id })),
      },
    },
  });

  revalidatePath("/transactions");
  return { id: cycle.id };
}

export async function deletePayCycle(id: string): Promise<void> {
  await prisma.payCycle.delete({ where: { id } });
  revalidatePath("/transactions");
  revalidatePath("/cycles");
}
