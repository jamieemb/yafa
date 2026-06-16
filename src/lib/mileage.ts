// Pure calculation logic for PCP / lease mileage tracking.
//
// The model: a contract has a start date, a starting odometer, an annual
// mileage allowance and a term in years. The total budget is
// `annualAllowance * termYears` over `termYears`. Odometer readings let us
// compute miles driven, whether you're ahead/behind the steady allowance
// "burn rate", how much you can sustainably drive for the rest of the term,
// and — once there's enough data — a projection of the final total.

const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 365.25 / 12; // ≈ 30.44

export interface MileageContractLike {
  startDate: Date;
  startOdometer: number;
  annualAllowance: number;
  termYears: number;
}

export interface OdometerPoint {
  date: Date;
  odometer: number;
}

export type MileageStatus = "no-data" | "within" | "over";

export interface MileageStats {
  endDate: Date;
  totalAllowance: number;
  totalDays: number;
  dailyAllowance: number;

  // Measured as of the latest reading (or the start, if none yet).
  asOf: Date;
  hasReadings: boolean;
  currentOdometer: number;
  milesDriven: number;
  daysElapsed: number;
  allowedToDate: number;
  paceVariance: number; // milesDriven - allowedToDate (+ = ahead of burn)
  pctUsed: number; // milesDriven / totalAllowance
  pctTermElapsed: number; // daysElapsed / totalDays

  // Forward-looking, from the latest reading to term end.
  remaining: number;
  daysRemaining: number;
  sustainableDaily: number;
  sustainableWeekly: number;
  sustainableMonthly: number;

  // Observed average + projection (only meaningful with enough data).
  hasAverage: boolean; // ≥2 points spanning real time
  hasProjection: boolean; // hasAverage + ~a week of data
  avgDaily: number;
  avgWeekly: number;
  avgMonthly: number;
  projectedTotal: number;
  projectedOverUnder: number; // projectedTotal - totalAllowance (+ = will exceed)
  limitDate: Date | null; // when the allowance runs out at the current average
  willExceedWithinTerm: boolean;

  status: MileageStatus;
}

function daysDiff(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

// Contract end = start date + term years (UTC, so it pairs with the
// UTC-midnight dates the date inputs produce).
export function contractEndDate(startDate: Date, termYears: number): Date {
  return new Date(
    Date.UTC(
      startDate.getUTCFullYear() + termYears,
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    ),
  );
}

export function computeMileageStats(
  contract: MileageContractLike,
  readings: OdometerPoint[],
): MileageStats {
  const { startDate, startOdometer, annualAllowance, termYears } = contract;

  const endDate = contractEndDate(startDate, termYears);
  const totalAllowance = annualAllowance * termYears;
  const totalDays = Math.max(1, daysDiff(startDate, endDate));
  const dailyAllowance = totalAllowance / totalDays;

  const sorted = [...readings].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const latest = sorted.length ? sorted[sorted.length - 1] : null;
  const hasReadings = latest !== null;

  const asOf = latest ? latest.date : startDate;
  const currentOdometer = latest ? latest.odometer : startOdometer;
  const milesDriven = Math.max(0, currentOdometer - startOdometer);
  const daysElapsed = Math.max(0, daysDiff(startDate, asOf));
  const allowedToDate = daysElapsed * dailyAllowance;
  const paceVariance = milesDriven - allowedToDate;
  const pctUsed = totalAllowance > 0 ? milesDriven / totalAllowance : 0;
  const pctTermElapsed = totalDays > 0 ? daysElapsed / totalDays : 0;

  const remaining = totalAllowance - milesDriven;
  const daysRemaining = Math.max(0, daysDiff(asOf, endDate));
  const sustainableDaily = daysRemaining > 0 ? remaining / daysRemaining : 0;
  const sustainableWeekly = sustainableDaily * DAYS_PER_WEEK;
  const sustainableMonthly = sustainableDaily * DAYS_PER_MONTH;

  // Observed driving span: from the first recorded reading/trip to the
  // latest. Rates are measured over THIS — not since the contract start —
  // so a start date set well before you began logging doesn't dilute the
  // average toward zero (e.g. 50 miles over 2 logged days shouldn't read as
  // ~3/wk just because the contract opened months earlier).
  const firstPoint = sorted.length > 0 ? sorted[0] : null;
  const observedDays = firstPoint
    ? Math.max(0, daysDiff(firstPoint.date, asOf))
    : 0;
  const observedMiles = firstPoint
    ? Math.max(0, currentOdometer - firstPoint.odometer)
    : 0;

  // Need at least two points spanning real time for a rate.
  const hasAverage = sorted.length >= 2 && observedDays > 0 && observedMiles > 0;
  const avgDaily = hasAverage ? observedMiles / observedDays : 0;
  const avgWeekly = avgDaily * DAYS_PER_WEEK;
  const avgMonthly = avgDaily * DAYS_PER_MONTH;

  // Project the rest of the term at the observed rate, on top of the miles
  // already driven. Needs ~a week of real data before it's meaningful.
  const hasProjection = hasAverage && observedDays >= 7;
  const projectedTotal = hasProjection
    ? milesDriven + avgDaily * daysRemaining
    : 0;
  const projectedOverUnder = projectedTotal - totalAllowance;
  const daysToLimit = avgDaily > 0 ? remaining / avgDaily : Infinity;
  const limitDate =
    hasProjection && Number.isFinite(daysToLimit)
      ? new Date(asOf.getTime() + daysToLimit * MS_PER_DAY)
      : null;
  const willExceedWithinTerm = limitDate ? limitDate < endDate : false;

  const status: MileageStatus = !hasProjection
    ? "no-data"
    : projectedOverUnder > 0
      ? "over"
      : "within";

  return {
    endDate,
    totalAllowance,
    totalDays,
    dailyAllowance,
    asOf,
    hasReadings,
    currentOdometer,
    milesDriven,
    daysElapsed,
    allowedToDate,
    paceVariance,
    pctUsed,
    pctTermElapsed,
    remaining,
    daysRemaining,
    sustainableDaily,
    sustainableWeekly,
    sustainableMonthly,
    hasAverage,
    hasProjection,
    avgDaily,
    avgWeekly,
    avgMonthly,
    projectedTotal,
    projectedOverUnder,
    limitDate,
    willExceedWithinTerm,
    status,
  };
}

export interface MonthlyRow {
  monthStart: Date;
  miles: number;
  allowance: number; // day-weighted share of the allowance for this month
  variance: number; // miles - allowance
  cumulativeVariance: number;
}

interface Pt {
  t: number;
  odo: number;
}

// Linear interpolation of the odometer at an arbitrary time, clamped to the
// data range (never extrapolates beyond the first/last reading).
function odoAt(t: number, pts: Pt[]): number {
  if (t <= pts[0].t) return pts[0].odo;
  const last = pts[pts.length - 1];
  if (t >= last.t) return last.odo;
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i].t) {
      const a = pts[i - 1];
      const b = pts[i];
      const span = b.t - a.t;
      const f = span === 0 ? 0 : (t - a.t) / span;
      return a.odo + f * (b.odo - a.odo);
    }
  }
  return last.odo;
}

function firstOfMonthUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

function addMonthUTC(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

// Miles per calendar month, attributing readings to months by interpolating
// the odometer at month boundaries. The first/last months are partial
// (clamped to the start date / latest reading), and the allowance shown is
// the day-weighted share so short months (and partial ones) compare fairly.
export function monthlyBreakdown(
  contract: MileageContractLike,
  readings: OdometerPoint[],
): MonthlyRow[] {
  const { startDate, startOdometer } = contract;
  const sorted = [...readings].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  if (sorted.length === 0) return [];

  const pts: Pt[] = [
    { t: startDate.getTime(), odo: startOdometer },
    ...sorted.map((r) => ({ t: r.date.getTime(), odo: r.odometer })),
  ];

  const endDate = contractEndDate(startDate, contract.termYears);
  const dailyAllowance =
    (contract.annualAllowance * contract.termYears) /
    Math.max(1, daysDiff(startDate, endDate));

  const startTs = startDate.getTime();
  const asOfTs = pts[pts.length - 1].t;

  const rows: MonthlyRow[] = [];
  let cumulative = 0;
  let monthTs = firstOfMonthUTC(startDate);

  while (monthTs < asOfTs) {
    const nextTs = addMonthUTC(monthTs);
    const segStart = Math.max(startTs, monthTs);
    const segEnd = Math.min(asOfTs, nextTs);
    if (segEnd > segStart) {
      const miles = Math.max(0, odoAt(segEnd, pts) - odoAt(segStart, pts));
      const days = (segEnd - segStart) / MS_PER_DAY;
      const allowance = days * dailyAllowance;
      const variance = miles - allowance;
      cumulative += variance;
      rows.push({
        monthStart: new Date(monthTs),
        miles,
        allowance,
        variance,
        cumulativeVariance: cumulative,
      });
    }
    monthTs = nextTs;
  }

  return rows;
}

export interface MileageSeriesPoint {
  ts: number;
  actual?: number;
  allowance?: number;
  projection?: number;
}

// Data for the cumulative-miles chart: the steady allowance line across the
// whole term, the actual cumulative miles to date, and a projection from the
// latest reading to term end at the observed average.
export function buildMileageSeries(
  contract: MileageContractLike,
  readings: OdometerPoint[],
  stats: MileageStats,
): MileageSeriesPoint[] {
  const { startDate, startOdometer } = contract;
  const startTs = startDate.getTime();
  const endTs = stats.endDate.getTime();

  const allowanceAt = (ts: number) =>
    Math.min(
      stats.totalAllowance,
      Math.max(0, ((ts - startTs) / MS_PER_DAY) * stats.dailyAllowance),
    );

  const sorted = [...readings].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const points: MileageSeriesPoint[] = [];
  points.push({ ts: startTs, actual: 0, allowance: 0 });
  for (const r of sorted) {
    points.push({
      ts: r.date.getTime(),
      actual: Math.max(0, r.odometer - startOdometer),
      allowance: allowanceAt(r.date.getTime()),
    });
  }

  // Projection segment: from the last actual point to term end.
  if (stats.hasProjection && sorted.length > 0) {
    const lastActual = points[points.length - 1].actual ?? stats.milesDriven;
    points[points.length - 1].projection = lastActual;
    points.push({
      ts: endTs,
      allowance: stats.totalAllowance,
      projection: stats.projectedTotal,
    });
  } else {
    points.push({ ts: endTs, allowance: stats.totalAllowance });
  }

  return points;
}

export interface TripLike {
  startAt: Date;
  endAt: Date;
  durationMin: number;
  startOdo: number;
  endOdo: number;
  distance: number | null;
  efficiency: number | null;
}

// Each trip's end odometer becomes a (date, odometer) point that feeds
// computeMileageStats / monthlyBreakdown / buildMileageSeries.
export function tripsToPoints(trips: TripLike[]): OdometerPoint[] {
  return trips
    .map((t) => ({ date: t.endAt, odometer: t.endOdo }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface TripInsights {
  tripCount: number;
  totalDistance: number; // GPS miles (falls back to odometer delta)
  totalDriveMin: number;
  avgTripMiles: number;
  avgEfficiency: number | null; // mi/kWh
  recentMiles: number; // odometer miles in the trailing window
  recentWeekly: number;
  recentMonthly: number;
  recentWindowDays: number;
  firstTripAt: Date | null;
  lastTripAt: Date | null;
}

const RECENT_WINDOW_DAYS = 28;

export function computeTripInsights(trips: TripLike[]): TripInsights {
  if (trips.length === 0) {
    return {
      tripCount: 0,
      totalDistance: 0,
      totalDriveMin: 0,
      avgTripMiles: 0,
      avgEfficiency: null,
      recentMiles: 0,
      recentWeekly: 0,
      recentMonthly: 0,
      recentWindowDays: 0,
      firstTripAt: null,
      lastTripAt: null,
    };
  }

  const sorted = [...trips].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
  );
  const firstTripAt = sorted[0].startAt;
  const lastTripAt = sorted[sorted.length - 1].endAt;

  let totalDistance = 0;
  let totalDriveMin = 0;
  let effSum = 0;
  let effCount = 0;
  for (const t of sorted) {
    const odoDelta = Math.max(0, t.endOdo - t.startOdo);
    totalDistance += t.distance != null ? t.distance : odoDelta;
    totalDriveMin += t.durationMin;
    if (t.efficiency != null) {
      effSum += t.efficiency;
      effCount += 1;
    }
  }

  // Recent rate: odometer miles within the trailing window, anchored on the
  // last trip so it reflects the recent driving pattern (not upload recency).
  const windowAnchor = Math.max(
    firstTripAt.getTime(),
    lastTripAt.getTime() - RECENT_WINDOW_DAYS * 86_400_000,
  );
  let recentMiles = 0;
  for (const t of sorted) {
    if (t.endAt.getTime() >= windowAnchor) {
      recentMiles += Math.max(0, t.endOdo - t.startOdo);
    }
  }
  const recentWindowDays = Math.max(
    1,
    (lastTripAt.getTime() - windowAnchor) / 86_400_000,
  );
  const recentDaily = recentMiles / recentWindowDays;

  return {
    tripCount: sorted.length,
    totalDistance,
    totalDriveMin,
    avgTripMiles: totalDistance / sorted.length,
    avgEfficiency: effCount > 0 ? effSum / effCount : null,
    recentMiles,
    recentWeekly: recentDaily * 7,
    recentMonthly: recentDaily * (365.25 / 12),
    recentWindowDays,
    firstTripAt,
    lastTripAt,
  };
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatMiles(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

export function formatMilesSigned(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : ""}${r.toLocaleString("en-GB")}`;
}

export function formatRate(n: number, decimals = 0): string {
  return n.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
