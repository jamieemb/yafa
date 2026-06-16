import type { ReactNode } from "react";
import { format } from "date-fns";
import { Car, CircleCheck, CircleAlert, Gauge, Route } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  computeMileageStats,
  monthlyBreakdown,
  buildMileageSeries,
  computeTripInsights,
  tripsToPoints,
  formatMiles,
  formatMilesSigned,
  formatRate,
  formatDuration,
} from "@/lib/mileage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Kpi } from "@/components/kpi";
import { ContractDialog } from "./_components/contract-dialog";
import { DeleteContractButton } from "./_components/delete-contract-button";
import { ImportTripsDialog } from "./_components/import-trips-dialog";
import { DeleteTripImportButton } from "./_components/delete-trip-import-button";
import { MileageChart } from "./_components/mileage-chart";
import { JourneyMap, type TripLeg } from "./_components/journey-map";
import { TripsTable, type TripData } from "./_components/trips-table";

// Trip import timestamps store UTC wall-clock times — format in UTC to show
// exactly as recorded.
const utcDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const dynamic = "force-dynamic";

export default async function MileagePage() {
  const contract = await prisma.mileageContract.findFirst({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: {
      trips: { orderBy: { startAt: "asc" } },
    },
  });

  if (!contract) {
    return (
      <div className="space-y-8">
        <PageHeader subtitle="Track a PCP / lease mileage allowance." />
        <div className="rounded-md border border-dashed p-12 flex flex-col items-center gap-3 text-center">
          <Car className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-sm">
            Track a PCP or lease mileage allowance. Set your start date,
            starting odometer and yearly limit, then import your trip history
            each week.
          </p>
          <ContractDialog />
        </div>
      </div>
    );
  }

  const tripImports = await prisma.tripImport.findMany({
    orderBy: { importedAt: "desc" },
  });

  // Each trip's end odometer forms the trajectory the projection runs on.
  const points = tripsToPoints(contract.trips);
  const stats = computeMileageStats(contract, points);
  const months = monthlyBreakdown(contract, points);
  const series = buildMileageSeries(contract, points, stats);
  const insights = computeTripInsights(contract.trips);

  const tripsDesc = [...contract.trips].reverse();
  const legs: TripLeg[] = contract.trips
    .filter(
      (t) =>
        t.startLat != null &&
        t.startLon != null &&
        t.endLat != null &&
        t.endLon != null,
    )
    .map((t) => ({
      id: t.id,
      startLat: t.startLat as number,
      startLon: t.startLon as number,
      endLat: t.endLat as number,
      endLon: t.endLon as number,
    }));

  // Serialisable trip data for the (client) trips table + detail sheet.
  const tripData: TripData[] = tripsDesc.map((t) => ({
    id: t.id,
    startAt: t.startAt.toISOString(),
    endAt: t.endAt.toISOString(),
    durationMin: t.durationMin,
    startOdo: t.startOdo,
    endOdo: t.endOdo,
    distance: t.distance,
    efficiency: t.efficiency,
    batteryPct: t.batteryPct,
    startLat: t.startLat,
    startLon: t.startLon,
    endLat: t.endLat,
    endLon: t.endLon,
    startUrl: t.startUrl,
    endUrl: t.endUrl,
    purpose: t.purpose,
    driver: t.driver,
  }));

  const monthsRemaining = stats.daysRemaining / (365.25 / 12);

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={`${contract.label} · ${formatMiles(contract.annualAllowance)} mi/yr × ${contract.termYears}yr · ${format(contract.startDate, "d MMM yyyy")} start`}
        actions={
          <>
            <ImportTripsDialog contractId={contract.id} />
            <ContractDialog
              triggerVariant="outline"
              initial={{
                id: contract.id,
                label: contract.label,
                startDate: contract.startDate,
                startOdometer: contract.startOdometer,
                annualAllowance: contract.annualAllowance,
                termYears: contract.termYears,
                notes: contract.notes,
              }}
            />
            <DeleteContractButton
              id={contract.id}
              label={contract.label}
              tripCount={contract.trips.length}
            />
          </>
        }
      />

      {/* Status banner */}
      <StatusBanner stats={stats} />

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <Kpi
          size="lg"
          label="Driven"
          icon={<Gauge className="size-3 text-primary" />}
          value={formatMiles(stats.milesDriven)}
          sub={`of ${formatMiles(stats.totalAllowance)} · ${Math.round(stats.pctUsed * 100)}% used`}
        />
        <Kpi
          size="lg"
          label="Pace"
          value={
            stats.hasReadings ? formatMilesSigned(stats.paceVariance) : "—"
          }
          sub={
            !stats.hasReadings
              ? "Add a reading"
              : stats.paceVariance > 0
                ? "ahead of allowance burn"
                : "miles banked vs. burn"
          }
          tone={
            !stats.hasReadings
              ? "muted"
              : stats.paceVariance > 0
                ? "negative"
                : "positive"
          }
        />
        <Kpi
          size="lg"
          label="Allowance left"
          value={formatMiles(stats.remaining)}
          sub={`~${Math.max(0, Math.round(monthsRemaining))} months to term end`}
          tone={stats.remaining < 0 ? "negative" : "neutral"}
        />
        <Kpi
          size="lg"
          label="You can drive"
          value={`${formatMiles(stats.sustainableWeekly)}/wk`}
          sub={`~${formatMiles(stats.sustainableMonthly)}/mo to stay within`}
          tone="primary"
          emphasised
        />
      </div>

      {/* Chart + averages */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 rounded-md border bg-card p-5">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <p className="label-eyebrow">Cumulative miles</p>
              <h2 className="text-base font-semibold mt-1">Actual vs. allowance</h2>
            </div>
            <Legend />
          </div>
          <MileageChart
            data={series}
            startTs={contract.startDate.getTime()}
            endTs={stats.endDate.getTime()}
          />
        </div>

        <div className="col-span-4 rounded-md border bg-card p-5">
          <p className="label-eyebrow">Your average</p>
          {stats.hasAverage ? (
            <div className="mt-3 space-y-3.5">
              <Stat
                label="Per week"
                value={`${formatMiles(stats.avgWeekly)} mi`}
              />
              <Stat
                label="Per month"
                value={`${formatMiles(stats.avgMonthly)} mi`}
              />
              <Stat
                label="Per day"
                value={`${formatRate(stats.avgDaily, 1)} mi`}
              />
              {insights.tripCount > 0 ? (
                <Stat
                  label="Last 4 weeks"
                  value={`${formatMiles(insights.recentWeekly)} mi/wk`}
                />
              ) : null}
              {stats.hasProjection ? (
                <>
                  <div className="border-t pt-3.5">
                    <Stat
                      label="Projected at term end"
                      value={`${formatMiles(stats.projectedTotal)} mi`}
                      tone={
                        stats.projectedOverUnder > 0 ? "negative" : "positive"
                      }
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {stats.projectedOverUnder > 0
                        ? `${formatMiles(stats.projectedOverUnder)} over your ${formatMiles(stats.totalAllowance)} allowance`
                        : `${formatMiles(Math.abs(stats.projectedOverUnder))} spare under your ${formatMiles(stats.totalAllowance)} allowance`}
                    </p>
                  </div>
                  {stats.willExceedWithinTerm && stats.limitDate ? (
                    <p className="text-[11px] text-negative border-t pt-3">
                      At this rate you&apos;ll hit the limit by{" "}
                      <span className="font-medium">
                        {format(stats.limitDate, "MMM yyyy")}
                      </span>
                      .
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground border-t pt-3.5">
                  About a week of data unlocks the term projection.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground mt-3">
              Import trips to see your average and projection.
            </p>
          )}
        </div>
      </div>

      {/* Journey map + driving insights */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 rounded-md border bg-card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="label-eyebrow">Journeys</p>
              <h2 className="text-base font-semibold mt-1">
                Where you&apos;ve driven
              </h2>
            </div>
            <span className="label-eyebrow tabular-nums">
              {legs.length} mapped
            </span>
          </div>
          {legs.length > 0 ? (
            <JourneyMap legs={legs} />
          ) : (
            <div className="h-80 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center">
              <Route className="size-7 text-muted-foreground" />
              <p className="text-[13px] text-muted-foreground max-w-xs">
                Import your trip-history CSV to plot your journeys here.
              </p>
              <ImportTripsDialog
                contractId={contract.id}
                triggerVariant="outline"
              />
            </div>
          )}
        </div>
        <div className="col-span-4 rounded-md border bg-card p-5">
          <p className="label-eyebrow">Driving insights</p>
          {insights.tripCount > 0 ? (
            <div className="mt-3 space-y-3.5">
              <Stat
                label="Trips"
                value={insights.tripCount.toLocaleString("en-GB")}
              />
              <Stat
                label="Total distance"
                value={`${formatMiles(insights.totalDistance)} mi`}
              />
              <Stat
                label="Time driving"
                value={formatDuration(insights.totalDriveMin)}
              />
              <Stat
                label="Avg trip"
                value={`${formatRate(insights.avgTripMiles, 1)} mi`}
              />
              {insights.avgEfficiency != null ? (
                <Stat
                  label="Avg efficiency"
                  value={`${formatRate(insights.avgEfficiency, 1)} mi/kWh`}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground mt-3">
              Import trips to see distance, drive time and efficiency.
            </p>
          )}
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <p className="label-eyebrow">Per month</p>
          <h2 className="text-base font-semibold mt-1">
            Monthly miles vs. allowance
          </h2>
        </div>
        {months.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-8 text-center">
            No full month of data yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <TableHead className="h-9">Month</TableHead>
                <TableHead className="h-9 text-right">Miles</TableHead>
                <TableHead className="h-9 text-right">Allowance</TableHead>
                <TableHead className="h-9 text-right">+/-</TableHead>
                <TableHead className="h-9 text-right">Running</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m) => (
                <TableRow key={m.monthStart.toISOString()}>
                  <TableCell className="text-[13px]">
                    {format(m.monthStart, "MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-[13px]">
                    {formatMiles(m.miles)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-[12px] text-muted-foreground">
                    {formatMiles(m.allowance)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums text-[13px] ${
                      m.variance > 0 ? "text-negative" : "text-positive"
                    }`}
                  >
                    {formatMilesSigned(m.variance)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums text-[12px] ${
                      m.cumulativeVariance > 0
                        ? "text-negative"
                        : "text-positive"
                    }`}
                  >
                    {formatMilesSigned(m.cumulativeVariance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Recent trips */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div>
            <p className="label-eyebrow">Trips</p>
            <h2 className="text-base font-semibold mt-1">Recent journeys</h2>
          </div>
          <ImportTripsDialog contractId={contract.id} triggerVariant="outline" />
        </div>
        <TripsTable trips={tripData} />
      </div>

      {/* Trip imports */}
      {tripImports.length > 0 ? (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b">
            <p className="label-eyebrow">Data</p>
            <h2 className="text-base font-semibold mt-1">Trip imports</h2>
          </div>
          <ul className="divide-y">
            {tripImports.map((imp) => (
              <li
                key={imp.id}
                className="flex items-center justify-between gap-3 px-5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] truncate">{imp.filename}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {utcDate.format(imp.importedAt)} · {imp.tripCount} trip
                    {imp.tripCount === 1 ? "" : "s"}
                  </p>
                </div>
                <DeleteTripImportButton
                  id={imp.id}
                  filename={imp.filename}
                  tripCount={imp.tripCount}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

    </div>
  );
}

function PageHeader({
  subtitle,
  actions,
}: {
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
      <div>
        <p className="label-eyebrow">Life admin</p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
          Mileage
        </h1>
        <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

function StatusBanner({
  stats,
}: {
  stats: ReturnType<typeof computeMileageStats>;
}) {
  if (stats.status === "no-data") {
    return (
      <div className="rounded-md border bg-muted/40 p-4 flex items-start gap-3">
        <Gauge className="size-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[13px] text-muted-foreground">
          Keep importing — once there&apos;s about a week of trips, YAFA
          projects whether you&apos;ll stay within your allowance.
        </p>
      </div>
    );
  }

  const over = stats.status === "over";
  return (
    <div
      className={`rounded-md border p-4 flex items-start gap-3 ${
        over
          ? "bg-negative/10 border-negative/20"
          : "bg-positive/10 border-positive/20"
      }`}
    >
      {over ? (
        <CircleAlert className="size-4 text-negative mt-0.5 shrink-0" />
      ) : (
        <CircleCheck className="size-4 text-positive mt-0.5 shrink-0" />
      )}
      <div className="text-[13px]">
        {over ? (
          <p>
            <span className="font-medium text-negative">Over budget.</span> At
            your current {formatMiles(stats.avgWeekly)} mi/week you&apos;ll
            reach about{" "}
            <span className="font-medium">
              {formatMiles(stats.projectedTotal)} mi
            </span>{" "}
            by term end — {formatMiles(stats.projectedOverUnder)} over your{" "}
            {formatMiles(stats.totalAllowance)} allowance. Keep under{" "}
            <span className="font-medium">
              ~{formatMiles(stats.sustainableWeekly)} mi/week
            </span>{" "}
            to stay within.
          </p>
        ) : (
          <p>
            <span className="font-medium text-positive">On track.</span> At your
            current {formatMiles(stats.avgWeekly)} mi/week you&apos;ll finish
            around{" "}
            <span className="font-medium">
              {formatMiles(stats.projectedTotal)} mi
            </span>{" "}
            — about {formatMiles(Math.abs(stats.projectedOverUnder))} under your{" "}
            {formatMiles(stats.totalAllowance)} allowance. You can average up to{" "}
            <span className="font-medium">
              ~{formatMiles(stats.sustainableWeekly)} mi/week
            </span>{" "}
            for the rest of the term.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span
        className={`font-mono tabular-nums text-[14px] ${
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Actual", color: "var(--chart-1)" },
    { label: "Allowance", color: "var(--chart-5)" },
    { label: "Projection", color: "var(--chart-2)" },
  ];
  return (
    <div className="flex items-center gap-3">
      {items.map((i) => (
        <span
          key={i.label}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          <span
            className="inline-block w-3 h-0.5 rounded-full"
            style={{ background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}
