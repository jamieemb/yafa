import type { ReactNode } from "react";
import { format } from "date-fns";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import SpeedOutlined from "@mui/icons-material/SpeedOutlined";
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
  type MileageStats,
} from "@/lib/mileage";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { EmptyState } from "@/components/empty-state";
import { DataList, Meta } from "@/components/data-list";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ContractDialog } from "./_components/contract-dialog";
import { ImportTripsDialog } from "./_components/import-trips-dialog";
import { MileageChart } from "./_components/mileage-chart";
import { JourneyMap, type TripLeg } from "./_components/journey-map";
import { TripsTable, type TripData } from "./_components/trips-table";
import { deleteContract } from "./actions";
import { deleteTripImport } from "./trip-actions";

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
      <>
        <PageHeader
          eyebrow="Life admin"
          title="Mileage"
          description="Track a PCP / lease mileage allowance."
          actions={<ContractDialog />}
        />
        <EmptyState
          icon={<DirectionsCarOutlined fontSize="inherit" />}
          title="No mileage contract yet"
          description="Set your start date, starting odometer and yearly limit, then import your trip history each week to see whether you'll stay within the allowance."
          action={<ContractDialog fabOnMobile={false} />}
        />
      </>
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
      (t) => t.startLat != null && t.startLon != null && t.endLat != null && t.endLon != null,
    )
    .map((t) => ({
      id: t.id,
      startLat: t.startLat as number,
      startLon: t.startLon as number,
      endLat: t.endLat as number,
      endLon: t.endLon as number,
    }));

  // Serialisable trip data for the (client) trips table + detail panel.
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

  const monthsRemaining = Math.max(0, Math.round(stats.daysRemaining / (365.25 / 12)));
  const pctUsed = Math.round(stats.pctUsed * 100);
  const pctElapsed = Math.round(stats.pctTermElapsed * 100);
  const tripCount = contract.trips.length;
  const projectedOver = stats.projectedOverUnder > 0;

  const initialContract = {
    id: contract.id,
    label: contract.label,
    startDate: contract.startDate,
    startOdometer: contract.startOdometer,
    annualAllowance: contract.annualAllowance,
    termYears: contract.termYears,
    notes: contract.notes,
    active: contract.active,
  };

  // One primary action per page: importing trips while a contract is
  // active; otherwise setting up a new contract (import stays as a button).
  const headerActions = contract.active ? (
    <ImportTripsDialog contractId={contract.id} primary />
  ) : (
    <>
      <ImportTripsDialog contractId={contract.id} />
      <ContractDialog />
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow="Life admin"
        title={contract.label}
        description={`${formatMiles(contract.annualAllowance)} mi/yr × ${contract.termYears} yr · ${format(contract.startDate, "d MMM yyyy")} → ${format(stats.endDate, "d MMM yyyy")}`}
        actions={headerActions}
      />

      {/* Allowance: status, progress vs. term, and the plain-English verdict */}
      <Card component="section" aria-labelledby="allowance-heading">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
            <Typography id="allowance-heading" variant="h5" component="h2">
              Allowance
            </Typography>
            <StatusChip stats={stats} />
            {!contract.active ? <Chip size="small" variant="outlined" label="Inactive" /> : null}
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <ContractDialog initial={initialContract} />
            <ConfirmDeleteButton
              label={`Delete ${contract.label}`}
              heading="Delete this contract?"
              description={`“${contract.label}” and its ${tripCount} trip${tripCount === 1 ? "" : "s"} will be permanently removed. This can't be undone.`}
              onConfirm={deleteContract.bind(null, contract.id)}
              successMessage="Contract deleted"
            />
          </Stack>
        </Box>
        <CardContent>
          <Stack spacing={2}>
            <ProgressRow
              label="Miles used"
              pct={stats.pctUsed}
              detail={`${formatMiles(stats.milesDriven)} of ${formatMiles(stats.totalAllowance)} mi`}
              color={stats.remaining < 0 ? "error" : "primary"}
            />
            <ProgressRow
              label="Term elapsed"
              pct={stats.pctTermElapsed}
              detail={`${Math.round(stats.daysElapsed).toLocaleString("en-GB")} of ${Math.round(stats.totalDays).toLocaleString("en-GB")} days`}
              color="inherit"
            />
            <Typography variant="body2" color="text.secondary">
              {statusNarrative(stats)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <KpiGrid columns={3}>
        <Kpi
          label="Miles driven"
          icon={<SpeedOutlined />}
          value={formatMiles(stats.milesDriven)}
          sub={`of ${formatMiles(stats.totalAllowance)} · ${pctUsed}% used`}
        />
        <Kpi
          label="Allowance to date"
          value={formatMiles(stats.allowedToDate)}
          sub={`${pctElapsed}% of the term elapsed`}
        />
        <Kpi
          label="Pace"
          value={stats.hasReadings ? formatMilesSigned(stats.paceVariance) : "—"}
          sub={
            !stats.hasReadings
              ? "Import trips to compare"
              : stats.paceVariance > 0
                ? "ahead of allowance burn"
                : "banked vs. allowance burn"
          }
          tone={!stats.hasReadings ? "muted" : stats.paceVariance > 0 ? "negative" : "positive"}
        />
        <Kpi
          label="Projected total"
          value={stats.hasProjection ? formatMiles(stats.projectedTotal) : "—"}
          sub={
            !stats.hasProjection
              ? "Needs about a week of trips"
              : projectedOver
                ? `${formatMiles(stats.projectedOverUnder)} over allowance`
                : `${formatMiles(Math.abs(stats.projectedOverUnder))} under allowance`
          }
          tone={!stats.hasProjection ? "muted" : projectedOver ? "negative" : "positive"}
        />
        <Kpi
          label="You can drive"
          value={`${formatMiles(stats.sustainableWeekly)}/wk`}
          sub={`~${formatMiles(stats.sustainableMonthly)}/mo to stay within`}
          emphasised
        />
        <Kpi
          label="Days remaining"
          value={Math.round(stats.daysRemaining).toLocaleString("en-GB")}
          sub={
            stats.remaining >= 0
              ? `${formatMiles(stats.remaining)} mi left · ~${monthsRemaining} mo`
              : `${formatMiles(-stats.remaining)} mi over · ~${monthsRemaining} mo`
          }
          tone={stats.remaining < 0 ? "negative" : "neutral"}
        />
      </KpiGrid>

      {/* Chart + observed average */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2fr) minmax(0, 1fr)" } }}>
        <Card component="section" aria-labelledby="chart-heading">
          <CardHeaderRow id="chart-heading" eyebrow="Cumulative miles" title="Actual vs. allowance" />
          <Box sx={{ px: 1, pb: 1 }}>
            <MileageChart
              data={series}
              startTs={contract.startDate.getTime()}
              endTs={stats.endDate.getTime()}
            />
          </Box>
        </Card>

        <Card component="section" aria-labelledby="average-heading">
          <CardHeaderRow id="average-heading" eyebrow="Your average" title="Observed rate" />
          <CardContent sx={{ pt: 0 }}>
            {stats.hasAverage ? (
              <Stack spacing={1.25}>
                <StatRow label="Per week" value={`${formatMiles(stats.avgWeekly)} mi`} />
                <StatRow label="Per month" value={`${formatMiles(stats.avgMonthly)} mi`} />
                <StatRow label="Per day" value={`${formatRate(stats.avgDaily, 1)} mi`} />
                {insights.tripCount > 0 ? (
                  <StatRow label="Last 4 weeks" value={`${formatMiles(insights.recentWeekly)} mi/wk`} />
                ) : null}
                <Divider />
                {stats.hasProjection ? (
                  <>
                    <StatRow
                      label="Projected at term end"
                      value={`${formatMiles(stats.projectedTotal)} mi`}
                      tone={projectedOver ? "negative" : "positive"}
                    />
                    <Typography variant="caption" color="text.secondary" component="p">
                      {projectedOver
                        ? `${formatMiles(stats.projectedOverUnder)} over your ${formatMiles(stats.totalAllowance)} allowance`
                        : `${formatMiles(Math.abs(stats.projectedOverUnder))} spare under your ${formatMiles(stats.totalAllowance)} allowance`}
                    </Typography>
                    {stats.willExceedWithinTerm && stats.limitDate ? (
                      <Typography variant="caption" component="p" sx={{ color: "error.main" }}>
                        At this rate you&apos;ll hit the limit by{" "}
                        <Box component="span" sx={{ fontWeight: 500 }}>
                          {format(stats.limitDate, "MMM yyyy")}
                        </Box>
                        .
                      </Typography>
                    ) : null}
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary" component="p">
                    About a week of data unlocks the term projection.
                  </Typography>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Import trips to see your average and projection.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Journey map + driving insights */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2fr) minmax(0, 1fr)" } }}>
        <Card component="section" aria-labelledby="map-heading">
          <CardHeaderRow
            id="map-heading"
            eyebrow="Journeys"
            title="Where you've driven"
            meta={<Chip size="small" variant="outlined" label={`${legs.length} mapped`} />}
          />
          <Box sx={{ px: 2, pb: 2 }}>
            {legs.length > 0 ? (
              <JourneyMap legs={legs} />
            ) : (
              <Box
                sx={{
                  height: { xs: 240, md: 320 },
                  borderRadius: 3,
                  border: "1px dashed",
                  borderColor: "m3.outline",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1.5,
                  textAlign: "center",
                  px: 2,
                }}
              >
                <RouteOutlined sx={{ fontSize: 40, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
                  Import your trip-history CSV to plot your journeys here.
                </Typography>
                <ImportTripsDialog contractId={contract.id} />
              </Box>
            )}
          </Box>
        </Card>

        <Card component="section" aria-labelledby="insights-heading">
          <CardHeaderRow id="insights-heading" eyebrow="Driving insights" title="All trips" />
          <CardContent sx={{ pt: 0 }}>
            {insights.tripCount > 0 ? (
              <Stack spacing={1.25}>
                <StatRow label="Trips" value={insights.tripCount.toLocaleString("en-GB")} />
                <StatRow label="Total distance" value={`${formatMiles(insights.totalDistance)} mi`} />
                <StatRow label="Time driving" value={formatDuration(insights.totalDriveMin)} />
                <StatRow label="Avg trip" value={`${formatRate(insights.avgTripMiles, 1)} mi`} />
                {insights.avgEfficiency != null ? (
                  <StatRow label="Avg efficiency" value={`${formatRate(insights.avgEfficiency, 1)} mi/kWh`} />
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Import trips to see distance, drive time and efficiency.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Monthly breakdown */}
      <Card component="section" aria-labelledby="monthly-heading">
        <CardHeaderRow id="monthly-heading" eyebrow="Per month" title="Monthly miles vs. allowance" divider />
        {months.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, px: 2, textAlign: "center" }}>
            No full month of data yet.
          </Typography>
        ) : (
          <DataList
            rows={months}
            getKey={(m) => m.monthStart.toISOString()}
            columns={[
              { id: "month", header: "Month", nowrap: true, render: (m) => format(m.monthStart, "MMM yyyy") },
              { id: "miles", header: "Miles", align: "right", numeric: true, render: (m) => formatMiles(m.miles) },
              {
                id: "allowance",
                header: "Allowance",
                align: "right",
                numeric: true,
                render: (m) => (
                  <Typography variant="body2" component="span" color="text.secondary">
                    {formatMiles(m.allowance)}
                  </Typography>
                ),
              },
              {
                id: "variance",
                header: "+/−",
                align: "right",
                numeric: true,
                render: (m) => <Signed value={m.variance} />,
              },
              {
                id: "running",
                header: "Running",
                align: "right",
                numeric: true,
                render: (m) => <Signed value={m.cumulativeVariance} />,
              },
            ]}
            mobile={{
              title: (m) => format(m.monthStart, "MMM yyyy"),
              meta: (m) => (
                <Meta>
                  {`${formatMiles(m.miles)} mi driven`}
                  {`${formatMiles(m.allowance)} allowed`}
                </Meta>
              ),
              value: (m) => <Signed value={m.variance} />,
              valueSub: (m) => `running ${formatMilesSigned(m.cumulativeVariance)}`,
            }}
          />
        )}
      </Card>

      {/* Recent trips */}
      <Card component="section" aria-labelledby="trips-heading">
        <CardHeaderRow
          id="trips-heading"
          eyebrow="Trips"
          title="Recent journeys"
          meta={<Chip size="small" variant="outlined" label={`${tripCount} trip${tripCount === 1 ? "" : "s"}`} />}
          divider
        />
        <TripsTable trips={tripData} />
      </Card>

      {/* Trip imports */}
      {tripImports.length > 0 ? (
        <Card component="section" aria-labelledby="imports-heading">
          <CardHeaderRow id="imports-heading" eyebrow="Data" title="Trip imports" divider />
          <DataList
            rows={tripImports}
            getKey={(imp) => imp.id}
            columns={[
              {
                id: "file",
                header: "File",
                render: (imp) => (
                  <Typography variant="body2" sx={{ fontWeight: 500, overflowWrap: "anywhere" }}>
                    {imp.filename}
                  </Typography>
                ),
              },
              { id: "date", header: "Imported", nowrap: true, render: (imp) => utcDate.format(imp.importedAt) },
              { id: "count", header: "Trips", align: "right", numeric: true, render: (imp) => imp.tripCount },
            ]}
            mobile={{
              title: (imp) => imp.filename,
              meta: (imp) => (
                <Meta>
                  {utcDate.format(imp.importedAt)}
                  {`${imp.tripCount} trip${imp.tripCount === 1 ? "" : "s"}`}
                </Meta>
              ),
            }}
            actions={(imp) => (
              <ConfirmDeleteButton
                label={`Remove import ${imp.filename}`}
                heading="Remove this import?"
                description={`The ${imp.tripCount} trip${imp.tripCount === 1 ? "" : "s"} from “${imp.filename}” will be deleted and the mileage metrics recalculated.`}
                onConfirm={deleteTripImport.bind(null, imp.id)}
                successMessage="Import removed"
              />
            )}
          />
        </Card>
      ) : null}
    </>
  );
}

// ── Local presentational helpers (server-safe) ─────────────────────────

function CardHeaderRow({
  id,
  eyebrow,
  title,
  meta,
  divider = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  divider?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 2,
        px: 2,
        pt: 2,
        pb: divider ? 1.5 : 1,
        ...(divider && { borderBottom: "1px solid", borderColor: "divider" }),
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline" color="text.secondary" component="p">
          {eyebrow}
        </Typography>
        <Typography id={id} variant="h5" component="h2">
          {title}
        </Typography>
      </Box>
      {meta}
    </Box>
  );
}

function StatusChip({ stats }: { stats: MileageStats }) {
  if (stats.status === "no-data") return <Chip size="small" label="Not enough data yet" />;
  if (stats.status === "over") {
    return (
      <Chip size="small" label="Over allowance" sx={{ bgcolor: "m3.errorContainer", color: "m3.onErrorContainer" }} />
    );
  }
  return (
    <Chip size="small" label="Within allowance" sx={{ bgcolor: "success.main", color: "success.contrastText" }} />
  );
}

function ProgressRow({
  label,
  pct,
  detail,
  color,
}: {
  label: string;
  pct: number;
  detail: string;
  color: "primary" | "error" | "inherit";
}) {
  const value = Math.min(100, Math.max(0, pct * 100));
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mb: 0.75 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" className="tabular" sx={{ whiteSpace: "nowrap" }}>
          <Box component="span" sx={{ fontWeight: 500 }}>
            {Math.round(pct * 100)}%
          </Box>
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {detail}
          </Typography>
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        color={color}
        aria-label={label}
        sx={{ height: 8, borderRadius: 4, ...(color === "inherit" && { color: "m3.outline" }) }}
      />
    </Box>
  );
}

function StatRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        className="tabular"
        sx={{
          fontWeight: 500,
          whiteSpace: "nowrap",
          color: tone === "positive" ? "success.main" : tone === "negative" ? "error.main" : "text.primary",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/** Signed miles, red when over the allowance and green when under. */
function Signed({ value }: { value: number }) {
  return (
    <Typography
      variant="body2"
      component="span"
      className="tabular"
      sx={{ fontWeight: 500, color: value > 0 ? "error.main" : "success.main" }}
    >
      {formatMilesSigned(value)}
    </Typography>
  );
}

function statusNarrative(stats: MileageStats): string {
  if (stats.status === "no-data") {
    return "Keep importing — once there's about a week of trips, YAFA projects whether you'll stay within your allowance.";
  }
  if (stats.status === "over") {
    return `Over budget. At your current ${formatMiles(stats.avgWeekly)} mi/week you'll reach about ${formatMiles(stats.projectedTotal)} mi by term end — ${formatMiles(stats.projectedOverUnder)} over your ${formatMiles(stats.totalAllowance)} allowance. Keep under ~${formatMiles(stats.sustainableWeekly)} mi/week to stay within.`;
  }
  return `On track. At your current ${formatMiles(stats.avgWeekly)} mi/week you'll finish around ${formatMiles(stats.projectedTotal)} mi — about ${formatMiles(Math.abs(stats.projectedOverUnder))} under your ${formatMiles(stats.totalAllowance)} allowance. You can average up to ~${formatMiles(stats.sustainableWeekly)} mi/week for the rest of the term.`;
}
