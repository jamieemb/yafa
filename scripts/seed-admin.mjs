// Seeds an EXAMPLE set of Life Admin data (renewals, meter readings, and a
// mileage contract with imported car trips) so a fresh clone has something
// to look at on /renewals, /meters, /mileage (incl. the journey map) and the
// dashboard. Idempotent — rows are skipped if an equivalent one exists.
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

// UTC timestamp for `daysAgo` at a given hour:min (for trip times).
function tripTs(daysAgo, hour, min) {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysAgo,
      hour,
      min,
    ),
  );
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
// near-new odometer. Trips are generated below.
const MILEAGE_LABEL = "Honda Civic PCP";
const MILEAGE_START_DAYS = -112;
const MILEAGE_START_ODO = 8;

// Glasgow-area points (from a real export) cycled to build journeys.
const COORDS = [
  [55.83408, -4.28294],
  [55.81746, -4.2388],
  [55.82935, -4.26239],
  [55.81005, -4.24943],
  [55.82226, -4.33866],
  [55.87846, -4.2869],
  [55.85776, -4.24818],
  [55.82922, -4.24618],
  [55.8013, -4.2697],
  [55.8642, -4.2518],
];

function generateTrips() {
  const trips = [];
  let odo = MILEAGE_START_ODO;
  let ci = 0;
  for (let d = -MILEAGE_START_DAYS; d >= 1; d--) {
    // Drive ~5 of every 7 days (deterministic).
    if (d % 7 === 0 || d % 7 === 3) continue;
    for (let k = 0; k < 2; k++) {
      const miles = 10 + ((d * 2 + k * 5) % 15); // 10–24 mi
      const durMin = Math.round(miles * 2.2) + 5;
      const startOdo = odo;
      odo += miles;
      const startAt = tripTs(d, k === 0 ? 8 : 17, 5);
      const endAt = new Date(startAt.getTime() + durMin * 60000);
      const a = COORDS[ci % COORDS.length];
      const b = COORDS[(ci + 1) % COORDS.length];
      ci += 1;
      trips.push({
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        durationMin: durMin,
        startOdo,
        endOdo: odo,
        distance: Math.round(miles * 0.95 * 10) / 10,
        efficiency: Math.round((3.0 + ((d * 3 + k) % 19) * 0.1) * 10) / 10,
        batteryPct: Math.max(1, Math.round(miles / 3)),
        startLat: a[0],
        startLon: a[1],
        endLat: b[0],
        endLon: b[1],
        startUrl: `https://maps.google.com/?q=${a[0]},${a[1]}`,
        endUrl: `https://maps.google.com/?q=${b[0]},${b[1]}`,
      });
    }
  }
  return trips;
}

const db = new Database("./dev.db");
db.pragma("foreign_keys = ON");

if (RESET) {
  const r = db.prepare("DELETE FROM Renewal").run();
  const m = db.prepare("DELETE FROM MeterReading").run();
  const ct = db.prepare("DELETE FROM CarTrip").run();
  const ti = db.prepare("DELETE FROM TripImport").run();
  const mc = db.prepare("DELETE FROM MileageContract").run();
  console.log(
    `Cleared ${r.changes} renewals, ${m.changes} meter readings, ${mc.changes} mileage contracts (${ct.changes} trips, ${ti.changes} imports).`,
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
const insertTripImport = db.prepare(`
  INSERT INTO TripImport (id, filename, importedAt, tripCount)
  VALUES (@id, @filename, @importedAt, @tripCount)
`);
const insertTrip = db.prepare(`
  INSERT INTO CarTrip
    (id, contractId, importId, startAt, endAt, timeZone, durationMin,
     startOdo, endOdo, distance, efficiency, batteryPct,
     startLat, startLon, endLat, endLon, startUrl, endUrl, purpose, driver,
     createdAt)
  VALUES
    (@id, @contractId, @importId, @startAt, @endAt, @timeZone, @durationMin,
     @startOdo, @endOdo, @distance, @efficiency, @batteryPct,
     @startLat, @startLon, @endLat, @endLon, @startUrl, @endUrl, @purpose,
     @driver, @now)
`);

let renewalsAdded = 0;
let readingsAdded = 0;
let tripsAdded = 0;

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

    const importId = randomUUID();
    const trips = generateTrips();
    insertTripImport.run({
      id: importId,
      filename: "trip_history_example.csv",
      importedAt: now,
      tripCount: trips.length,
    });
    for (const t of trips) {
      insertTrip.run({
        id: randomUUID(),
        contractId,
        importId,
        timeZone: "BST (UTC+01:00)",
        purpose: "Undefined",
        driver: "Unknown",
        now,
        ...t,
      });
      tripsAdded++;
    }
  }
});

tx();

console.log(
  `Seed complete. Added ${renewalsAdded} renewals, ${readingsAdded} meter readings, ${tripsAdded} car trips.`,
);
db.close();
