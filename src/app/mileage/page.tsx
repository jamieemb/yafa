import type { ReactNode } from "react";
import { format } from "date-fns";
import { Car, CircleCheck, CircleAlert, Gauge } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  computeMileageStats,
  monthlyBreakdown,
  buildMileageSeries,
  formatMiles,
  formatMilesSigned,
  formatRate,
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
import { AddReadingDialog } from "./_components/add-reading-dialog";
import { DeleteReadingButton } from "./_components/delete-reading-button";
import { DeleteContractButton } from "./_components/delete-contract-button";
import { MileageChart } from "./_components/mileage-chart";

export const dynamic = "force-dynamic";

export default async function MileagePage() {
  const contract = await prisma.mileageContract.findFirst({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: { readings: { orderBy: { date: "asc" } } },
  });

  if (!contract) {
    return (
      <div className="space-y-8">
        <PageHeader subtitle="Track a PCP / lease mileage allowance." />
        <div className="rounded-md border border-dashed p-12 flex flex-col items-center gap-3 text-center">
          <Car className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-sm">
            Track a PCP or lease mileage allowance. Set your start date,
            starting odometer and yearly limit, then add a reading each week.
          </p>
          <ContractDialog />
        </div>
      </div>
    );
  }

  const stats = computeMileageStats(contract, contract.readings);
  const months = monthlyBreakdown(contract, contract.readings);
  const series = buildMileageSeries(contract, contract.readings, stats);

  // Per-reading miles, measured against the previous reading (or the
  // starting odometer for the first one). Newest first for display.
  const readingRows = contract.readings
    .map((r, i) => {
      const prev =
        i === 0 ? contract.startOdometer : contract.readings[i - 1].odometer;
      return { r, delta: r.odometer - prev };
    })
    .reverse();

  const monthsRemaining = stats.daysRemaining / (365.25 / 12);

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={`${contract.label} · ${formatMiles(contract.annualAllowance)} mi/yr × ${contract.termYears}yr · ${format(contract.startDate, "d MMM yyyy")} start`}
        actions={
          <>
            <AddReadingDialog
              contractId={contract.id}
              lastOdometer={stats.currentOdometer}
            />
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
              readingCount={contract.readings.length}
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
          {stats.hasProjection ? (
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
              <div className="border-t pt-3.5">
                <Stat
                  label="Projected at term end"
                  value={`${formatMiles(stats.projectedTotal)} mi`}
                  tone={stats.projectedOverUnder > 0 ? "negative" : "positive"}
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
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground mt-3">
              Add at least a week of readings and your average pace and
              projection will appear here.
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

      {/* Readings log */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div>
            <p className="label-eyebrow">Log</p>
            <h2 className="text-base font-semibold mt-1">Odometer readings</h2>
          </div>
          <AddReadingDialog
            contractId={contract.id}
            lastOdometer={stats.currentOdometer}
            triggerVariant="outline"
          />
        </div>
        {readingRows.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-8 text-center">
            No readings yet. Add your first to start tracking.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <TableHead className="h-9">Date</TableHead>
                <TableHead className="h-9 text-right">Odometer</TableHead>
                <TableHead className="h-9 text-right">Miles driven</TableHead>
                <TableHead className="h-9">Notes</TableHead>
                <TableHead className="h-9" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {readingRows.map(({ r, delta }) => (
                <TableRow key={r.id}>
                  <TableCell className="text-[12px] tabular-nums text-muted-foreground whitespace-nowrap">
                    {format(r.date, "d MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-[13px]">
                    {formatMiles(r.odometer)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums text-[12px] ${
                      delta < 0 ? "text-negative" : "text-muted-foreground"
                    }`}
                  >
                    {formatMilesSigned(delta)}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground max-w-xs truncate">
                    {r.notes ?? ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteReadingButton
                      id={r.id}
                      label={format(r.date, "d MMM yyyy")}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
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
          Add a couple of weekly readings and YAFA will work out your pace and
          project whether you&apos;ll stay within the allowance.
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
