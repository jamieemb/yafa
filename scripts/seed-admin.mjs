// Seeds an EXAMPLE set of Life Admin data (renewals, meter readings and a
// mileage contract) so a fresh clone has something to look at on /renewals,
// /meters, /mileage and the dashboard's "Upcoming renewals" panel.
// Idempotent — rows are skipped if an equivalent one already exists.
//
// Usage:
//   node scripts/seed-admin.mjs            # add example data
//   node scripts/seed-admin.mjs --reset    # wipe the Life Admin tables first
//
// Dates are computed relative to today. Copy to scripts/*.local.mjs
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

// Mileage contract: 8,000 mi/yr over 4 years, started 16 weeks ago with a
// near-new odometer. Weekly miles vary; the running pace lands a little over
// the steady allowance to demonstrate the projection + sustainable rate.
const MILEAGE_LABEL = "Honda Civic PCP";
const MILEAGE_START_DAYS = -112; // 16 weeks ago
const MILEAGE_START_ODO = 12;
const WEEKLY_MILES = [
  120, 185, 95, 240, 160, 175, 210, 130, 90, 280, 165, 150, 200, 145, 175, 190,
];

const db = new Database("./dev.db");
db.pragma("foreign_keys = ON");

if (RESET) {
  const r = db.prepare("DELETE FROM Renewal").run();
  const m = db.prepare("DELETE FROM MeterReading").run();
  const mr = db.prepare("DELETE FROM MileageReading").run();
  const mc = db.prepare("DELETE FROM MileageContract").run();
  console.log(
    `Cleared ${r.changes} renewals, ${m.changes} meter readings, ${mc.changes} mileage contracts (${mr.changes} readings).`,
  );
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

const contractExists = db.prepare("SELECT id FROM MileageContract WHERE label = ?");
const insertContract = db.prepare(`
  INSERT INTO MileageContract
    (id, label, startDate, startOdometer, annualAllowance, termYears, active,
     notes, createdAt, updatedAt)
  VALUES
    (@id, @label, @startDate, @startOdometer, @annualAllowance, @termYears,
     @active, @notes, @now, @now)
`);
const insertMileageReading = db.prepare(`
  INSERT INTO MileageReading
    (id, contractId, date, odometer, notes, createdAt, updatedAt)
  VALUES
    (@id, @contractId, @date, @odometer, @notes, @now, @now)
`);

let renewalsAdded = 0;
let readingsAdded = 0;
let mileageReadingsAdded = 0;
let contractsAdded = 0;

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

  if (!contractExists.get(MILEAGE_LABEL)) {
    const contractId = randomUUID();
    insertContract.run({
      id: contractId,
      label: MILEAGE_LABEL,
      startDate: daysFromNow(MILEAGE_START_DAYS),
      startOdometer: MILEAGE_START_ODO,
      annualAllowance: 8000,
      termYears: 4,
      active: 1,
      notes: null,
      now,
    });
    contractsAdded++;

    let odometer = MILEAGE_START_ODO;
    WEEKLY_MILES.forEach((miles, i) => {
      odometer += miles;
      insertMileageReading.run({
        id: randomUUID(),
        contractId,
        date: daysFromNow(MILEAGE_START_DAYS + 7 * (i + 1)),
        odometer,
        notes: null,
        now,
      });
      mileageReadingsAdded++;
    });
  }
});

tx();

console.log(
  `Seed complete. Added ${renewalsAdded} renewals, ${readingsAdded} meter readings, ${contractsAdded} mileage contract(s) with ${mileageReadingsAdded} readings.`,
);
db.close();
