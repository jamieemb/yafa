// Quick sanity check for the three CSV parsers. Run with:
//   node scripts/test-parsers.mjs
//
// Bypasses Next/TS/path aliases by re-implementing the small bits of
// papaparse + sign logic needed to validate header/column choices.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = process.argv[2] ?? "/tmp/parser-test";

function parseCsv(text) {
  const r = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (r.errors.length) throw new Error(r.errors[0].message);
  return r.data;
}

function pick(row, aliases) {
  for (const a of aliases) {
    const v = row[a.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

function parseAmount(raw) {
  const cleaned = String(raw).trim().replace(/[£$€,\s]/g, "");
  const neg = /^\(.*\)$/.test(cleaned);
  const n = Number(cleaned.replace(/[()]/g, ""));
  return neg ? -n : n;
}

function parseDate(s) {
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return new Date(t);
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? Number(y) + 2000 : Number(y);
    return new Date(yy, Number(mo) - 1, Number(d));
  }
  return new Date(NaN);
}

function dump(name, rows) {
  console.log(`\n=== ${name} (${rows.length} rows) ===`);
  for (const r of rows) {
    const sign = r.amount < 0 ? "-" : "+";
    console.log(`  ${r.date.toISOString().slice(0, 10)}  ${sign}£${Math.abs(r.amount).toFixed(2).padStart(7)}  ${r.description}`);
  }
}

function parseNatwest(text) {
  const rows = parseCsv(text);
  return rows.map((row) => ({
    date: parseDate(pick(row, ["date", "transaction date"])),
    description: pick(row, ["memo", "description", "merchant", "details"]).trim(),
    amount: -parseAmount(pick(row, ["amount", "value"])),
  }));
}

function parseAmex(text) {
  const rows = parseCsv(text);
  return rows.map((row) => ({
    date: parseDate(pick(row, ["date", "transaction date"])),
    description:
      pick(row, ["appears on your statement as"]) ??
      pick(row, ["description", "merchant", "details"]).trim(),
    amount: -parseAmount(pick(row, ["amount", "value"])),
  }));
}

function parseMonzo(text) {
  const rows = parseCsv(text);
  return rows.map((row) => ({
    date: parseDate(pick(row, ["date"])),
    description:
      pick(row, ["name"]) ??
      pick(row, ["description", "merchant"]).trim(),
    amount: parseAmount(pick(row, ["amount", "value"])),
  }));
}

const tests = [
  ["NATWEST", "sample-natwest.csv", parseNatwest],
  ["AMEX", "sample-amex.csv", parseAmex],
  ["MONZO", "sample-monzo.csv", parseMonzo],
];

for (const [name, file, fn] of tests) {
  const fullPath = path.join(SAMPLE_DIR, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`(skipped ${name}: ${fullPath} not found)`);
    continue;
  }
  const text = fs.readFileSync(fullPath, "utf8");
  try {
    dump(name, fn(text));
  } catch (e) {
    console.log(`✗ ${name} failed: ${e.message}`);
    process.exitCode = 1;
  }
}
