import { parseCsv, pick } from "./csv";

// A single parsed trip from a vehicle's exported trip-history CSV.
// Timestamps are built as UTC wall-clock (the export's local time taken
// at face value) so they always display exactly as recorded, regardless
// of the server timezone.
export interface ParsedTrip {
  startAt: Date;
  endAt: Date;
  timeZone: string | null;
  durationMin: number;
  startOdo: number;
  endOdo: number;
  distance: number | null;
  efficiency: number | null;
  batteryPct: number | null;
  startLat: number | null;
  startLon: number | null;
  endLat: number | null;
  endLon: number | null;
  startUrl: string | null;
  endUrl: string | null;
  purpose: string | null;
  driver: string | null;
}

function parseUtcDateTime(dateStr: string, timeStr: string | undefined): Date {
  const d = dateStr.trim();
  let y: number;
  let mo: number;
  let day: number;
  const iso = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    y = Number(iso[1]);
    mo = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const dmy = d.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (!dmy) throw new Error(`Unrecognised date: "${dateStr}"`);
    day = Number(dmy[1]);
    mo = Number(dmy[2]);
    const yy = Number(dmy[3]);
    y = yy < 100 ? 2000 + yy : yy;
  }
  const tm = (timeStr ?? "").trim().match(/^(\d{1,2}):(\d{2})/);
  const hh = tm ? Number(tm[1]) : 0;
  const mi = tm ? Number(tm[2]) : 0;
  return new Date(Date.UTC(y, mo - 1, day, hh, mi));
}

// "hh:mm" (or plain minutes) -> minutes.
function parseDurationMin(raw: string | undefined): number {
  const t = (raw ?? "").trim();
  const m = t.match(/^(\d+):(\d{2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

// Tolerant number parse — blank cells (the export's 0-mile blips) -> null.
function num(raw: string | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Pull "lat,lon" from the dedicated column, falling back to the `?q=lat,lon`
// in the Google Maps URL.
function parseLatLon(
  direct: string | undefined,
  url: string | undefined,
): { lat: number; lon: number } | null {
  const tryParse = (s: string | undefined) => {
    if (!s) return null;
    const m = s.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (!m) return null;
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  };
  return tryParse(direct) ?? tryParse(url);
}

export function parseCarTrips(csvText: string): ParsedTrip[] {
  const { rows } = parseCsv(csvText);
  const out: ParsedTrip[] = [];

  for (const row of rows) {
    const startDate = pick(row, ["start date"]);
    const startTime = pick(row, ["start time"]);
    const startOdo = num(
      pick(row, ["start odo(miles)", "start odo", "start odometer"]),
    );
    const endOdo = num(
      pick(row, ["end odo(miles)", "end odo", "end odometer"]),
    );

    // Skip rows missing the essentials (a trip needs a start and odometers).
    if (!startDate || !startTime || startOdo == null || endOdo == null) {
      continue;
    }

    const endDate = pick(row, ["end date"]) ?? startDate;
    const endTime = pick(row, ["end time"]) ?? startTime;
    const startLL = parseLatLon(
      pick(row, ["start lat/lon", "start latlon"]),
      pick(row, ["start url"]),
    );
    const endLL = parseLatLon(
      pick(row, ["end lat/lon", "end latlon"]),
      pick(row, ["end url"]),
    );

    out.push({
      startAt: parseUtcDateTime(startDate, startTime),
      endAt: parseUtcDateTime(endDate, endTime),
      timeZone: pick(row, ["time zone"]) ?? null,
      durationMin: parseDurationMin(pick(row, ["duration of trip", "duration"])),
      startOdo,
      endOdo,
      distance: num(pick(row, ["distance(miles)", "distance"])),
      efficiency: num(
        pick(row, ["electric consumption(miles/kwh)", "efficiency"]),
      ),
      batteryPct: num(pick(row, ["electricity usage(%)", "battery"])),
      startLat: startLL?.lat ?? null,
      startLon: startLL?.lon ?? null,
      endLat: endLL?.lat ?? null,
      endLon: endLL?.lon ?? null,
      startUrl: pick(row, ["start url"]) ?? null,
      endUrl: pick(row, ["end url"]) ?? null,
      purpose: pick(row, ["purpose"]) ?? null,
      driver: pick(row, ["driver"]) ?? null,
    });
  }

  if (out.length === 0) {
    throw new Error("No trips found in file");
  }
  return out;
}
