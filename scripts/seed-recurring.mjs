// Seeds an EXAMPLE set of recurring items so a fresh clone has
// something to look at on /dashboard and /recurring. Idempotent —
// items are skipped if a row with the same (name, budgetCategory)
// already exists.
//
// Usage:
//   node scripts/seed-recurring.mjs            # add example items
//   node scripts/seed-recurring.mjs --reset    # wipe first
//
// Replace the entries below with your own, or copy this file to
// scripts/seed-recurring.local.mjs (gitignored) for private data.

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const RESET = process.argv.includes("--reset");

const ITEMS = [
  // [name, budgetCategory, amount, bankAccount, notes?]
  ["Groceries", "Food & Essentials", 400.0, "Joint Account"],
  ["Toiletries", "Food & Essentials", 25.0, "Joint Account"],

  ["Mortgage", "Home", 800.0, "Joint Account"],
  ["Council Tax", "Home", 200.0, "Joint Account"],
  ["Energy", "Home", 120.0, "Joint Account"],
  ["Internet", "Home", 50.0, "Joint Account"],
  ["TV License", "Home", 15.0, "Joint Account"],

  ["Petrol", "Petrol", 150.0, "Joint Account"],

  ["Car Loan", "Car", 200.0, "Personal Account"],
  ["Car Insurance", "Car", 60.0, "Joint Account"],

  ["Phone Contract", "Finance & Contracts", 35.0, "Personal Account"],

  ["Spotify", "Subscriptions", 11.99, "Joint Account"],
  ["Cloud Storage", "Subscriptions", 2.99, "Joint Account"],

  ["Gym", "Memberships", 30.0, "Personal Account"],
];

const db = new Database("./dev.db");
db.pragma("foreign_keys = ON");

if (RESET) {
  const cleared = db.prepare("DELETE FROM RecurringItem").run();
  console.log(`Cleared ${cleared.changes} existing recurring items.`);
}

const existsStmt = db.prepare(
  "SELECT 1 FROM RecurringItem WHERE name = ? AND budgetCategory = ?",
);
const insertStmt = db.prepare(`
  INSERT INTO RecurringItem
    (id, name, amount, budgetCategory, bankAccount, frequency, dayOfMonth,
     startDate, endDate, notes, active, createdAt, updatedAt)
  VALUES
    (@id, @name, @amount, @budgetCategory, @bankAccount, @frequency, @dayOfMonth,
     @startDate, @endDate, @notes, @active, @now, @now)
`);

let inserted = 0;
let skipped = 0;
const now = new Date().toISOString();

const tx = db.transaction(() => {
  for (const [name, budgetCategory, amount, bankAccount, notes] of ITEMS) {
    if (existsStmt.get(name, budgetCategory)) {
      skipped++;
      continue;
    }
    insertStmt.run({
      id: randomUUID(),
      name,
      amount,
      budgetCategory,
      bankAccount,
      frequency: "MONTHLY",
      dayOfMonth: null,
      startDate: now,
      endDate: null,
      notes: notes ?? null,
      active: 1,
      now,
    });
    inserted++;
  }
});

tx();

console.log(`Seed complete. Inserted ${inserted}, skipped ${skipped} (already present).`);
db.close();
