// Seeds an EXAMPLE set of Life Admin data (renewals + meter readings) so
// a fresh clone has something to look at on /renewals, /meters and the
// dashboard's "Upcoming renewals" panel. Idempotent — rows are skipped
// if an equivalent one already exists.
//
// Usage:
//   node scripts/seed-admin.mjs            # add example data
//   node scripts/seed-admin.mjs --reset    # wipe renewals + readings first
//
// Dates are computed relative to today so the demo always has a mix of
// overdue / due-soon / upcoming renewals. Copy to scripts/*.local.mjs
// (gitignored) for private data.

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const RESET = process.argv.includes("--reset");

// ISO string for a UTC-midnight calendar date `n` days from today.
function daysFromNow(n) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + n),
  ).toISOString();
}

// [title, category, subject, provider, reference, dueInDays, cost, recurrence, reminderDays]
const RENEWALS = [
  ["MOT", "Vehicle", "Honda Civic", "Kwik Fit", null, -5, 54.85, "ANNUAL", 30],
  ["Car insurance", "Insurance", "Honda Civic", "Aviva", "POL-12345", 12, 540, "ANNUAL", 30],
  ["Road tax", "Vehicle", "Honda Civic", "DVLA", null, 45, 180, "ANNUAL", 30],
  ["Home insurance", "Insurance", "Home", "Direct Line", "HOM-9988", 75, 318.4, "ANNUAL", 30],
  ["Boiler service", "Property", "Home", "British Gas", null, 120, 90, "ANNUAL", 30],
  ["TV Licence", "Documents", null, "TV Licensing", null, 205, 169.5, "ANNUAL", 30],
];

// [meter, unit, [[dueInDays, value], ...]]
const METERS = [
  ["Electricity", "kWh", [[-60, 12010], [-30, 12365], [-1, 12618]]],
  ["Gas", "m³", [[-60, 4200], [-30, 4281], [-1, 4357]]],
  ["Water", "m³", [[-58, 851], [-2, 906]]],
];

const db = new Database("./dev.db");
db.pragma("foreign_keys = ON");

if (RESET) {
  const r = db.prepare("DELETE FROM Renewal").run();
  const m = db.prepare("DELETE FROM MeterReading").run();
  console.log(`Cleared ${r.changes} renewals, ${m.changes} meter readings.`);
}

const now = new Date().toISOString();

const renewalExists = db.prepare("SELECT 1 FROM Renewal WHERE title = ?");
const insertRenewal = db.prepare(`
  INSERT INTO Renewal
    (id, title, category, subject, provider, reference, dueDate, cost,
     recurrence, reminderDays, notes, active, createdAt, updatedAt)
  VALUES
    (@id, @title, @category, @subject, @provider, @reference, @dueDate, @cost,
     @recurrence, @reminderDays, @notes, @active, @now, @now)
`);

const readingExists = db.prepare(
  "SELECT 1 FROM MeterReading WHERE meter = ? AND date = ?",
);
const insertReading = db.prepare(`
  INSERT INTO MeterReading
    (id, meter, date, value, unit, notes, createdAt, updatedAt)
  VALUES
    (@id, @meter, @date, @value, @unit, @notes, @now, @now)
`);

let renewalsAdded = 0;
let readingsAdded = 0;

const tx = db.transaction(() => {
  for (const [
    title,
    category,
    subject,
    provider,
    reference,
    dueInDays,
    cost,
    recurrence,
    reminderDays,
  ] of RENEWALS) {
    if (renewalExists.get(title)) continue;
    insertRenewal.run({
      id: randomUUID(),
      title,
      category,
      subject,
      provider,
      reference,
      dueDate: daysFromNow(dueInDays),
      cost,
      recurrence,
      reminderDays,
      notes: null,
      active: 1,
      now,
    });
    renewalsAdded++;
  }

  for (const [meter, unit, points] of METERS) {
    for (const [dueInDays, value] of points) {
      const date = daysFromNow(dueInDays);
      if (readingExists.get(meter, date)) continue;
      insertReading.run({
        id: randomUUID(),
        meter,
        date,
        value,
        unit,
        notes: null,
        now,
      });
      readingsAdded++;
    }
  }
});

tx();

console.log(
  `Seed complete. Added ${renewalsAdded} renewals, ${readingsAdded} meter readings.`,
);
db.close();
