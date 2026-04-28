// One-off backfill: classify existing Transaction rows as
// SPEND / PAYMENT / REFUND using the same heuristic as the import
// path. Safe to re-run.
//
//   node scripts/backfill-transaction-kind.mjs

import Database from "better-sqlite3";

const PAYMENT_PATTERNS = [
  /\bPAYMENT RECEIVED\b/i,
  /\bPAYMENT THANK YOU\b/i,
  /\bDIRECT DEBIT PAYMENT\b/i,
  /\bAUTOPAY\b/i,
  /\bAUTOMATIC PAYMENT\b/i,
  /\bCARD PAYMENT\b/i,
  /^PAYMENT\b/i,
  /\bREPAID\b/i,
];

function classify(description, amount) {
  if (amount <= 0) return "SPEND";
  for (const re of PAYMENT_PATTERNS) {
    if (re.test(description)) return "PAYMENT";
  }
  return "REFUND";
}

const db = new Database("./dev.db");
const rows = db
  .prepare('SELECT id, description, amount, kind FROM "Transaction"')
  .all();

const update = db.prepare(
  'UPDATE "Transaction" SET kind = ?, needsReview = ?, spendCategory = ? WHERE id = ?',
);

let toPayment = 0;
let toRefund = 0;
let toSpend = 0;
let unchanged = 0;

const tx = db.transaction(() => {
  for (const row of rows) {
    const next = classify(row.description, row.amount);
    if (next === row.kind) {
      unchanged++;
      continue;
    }
    if (next === "PAYMENT") {
      // Payments stay out of review and never carry a category.
      update.run("PAYMENT", 0, null, row.id);
      toPayment++;
    } else if (next === "REFUND") {
      // Keep needsReview / spendCategory as-is — refunds count as
      // negative spend on a merchant's category.
      update.run("REFUND", row.needsReview ?? 1, row.spendCategory ?? null, row.id);
      toRefund++;
    } else {
      update.run("SPEND", row.needsReview ?? 1, row.spendCategory ?? null, row.id);
      toSpend++;
    }
  }
});

tx();

console.log(
  `Backfill complete. ${rows.length} rows scanned · ${toPayment} → PAYMENT · ${toRefund} → REFUND · ${toSpend} → SPEND · ${unchanged} unchanged.`,
);
db.close();
