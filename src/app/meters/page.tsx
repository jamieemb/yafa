import { format } from "date-fns";
import { Gauge, Zap, Flame, Droplet } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatReading } from "@/lib/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Kpi } from "@/components/kpi";
import { ReadingDialog } from "./_components/reading-dialog";
import { DeleteReadingButton } from "./_components/delete-reading-button";

export const dynamic = "force-dynamic";

type Reading = Awaited<
  ReturnType<typeof prisma.meterReading.findMany>
>[number];

interface MeterGroup {
  meter: string;
  unit: string | null;
  // Chronological ascending, each annotated with usage since the prior
  // reading (null for the first).
  readings: { row: Reading; delta: number | null }[];
}

function MeterGlyph({
  meter,
  className,
}: {
  meter: string;
  className?: string;
}) {
  const m = meter.toLowerCase();
  if (/elec|power/.test(m)) return <Zap className={className} />;
  if (/gas/.test(m)) return <Flame className={className} />;
  if (/water/.test(m)) return <Droplet className={className} />;
  return <Gauge className={className} />;
}

function daysBetween(a: Date, b: Date): number {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((da - db) / 86_400_000);
}

export default async function MetersPage() {
  const all = await prisma.meterReading.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  // Group by meter, annotating each reading with usage since the prior one.
  const byMeter = new Map<string, MeterGroup>();
  for (const row of all) {
    let group = byMeter.get(row.meter);
    if (!group) {
      group = { meter: row.meter, unit: row.unit, readings: [] };
      byMeter.set(row.meter, group);
    }
    const prev = group.readings[group.readings.length - 1];
    const delta = prev ? row.value - prev.row.value : null;
    group.readings.push({ row, delta });
    // Keep the most recent non-empty unit for the meter header.
    if (row.unit) group.unit = row.unit;
  }

  const groups = Array.from(byMeter.values()).sort((a, b) =>
    a.meter.localeCompare(b.meter),
  );
  const meterOptions = groups.map((g) => g.meter);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label-eyebrow">Life admin</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Meter readings
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Log gas, electric, water — or anything cumulative. Usage is the
            difference between readings.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <Kpi label="Meters" value={String(groups.length)} />
            <Kpi label="Readings" value={String(all.length)} />
          </div>
          <ReadingDialog meterOptions={meterOptions} />
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 flex flex-col items-center gap-3 text-center">
          <Gauge className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No readings yet. Add your first electricity, gas or water reading to
            start tracking usage.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <MeterCard key={group.meter} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function MeterCard({ group }: { group: MeterGroup }) {
  const ascending = group.readings;
  const latest = ascending[ascending.length - 1];
  const previous = ascending[ascending.length - 2];

  const sinceDays =
    previous != null
      ? daysBetween(latest.row.date, previous.row.date)
      : 0;
  const perDay =
    latest.delta != null && sinceDays > 0 ? latest.delta / sinceDays : null;

  // Most-recent-first for display.
  const rows = [...ascending].reverse();

  return (
    <section className="rounded-md border bg-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center size-9 rounded-md bg-primary/10 text-primary">
            <MeterGlyph meter={group.meter} className="size-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold leading-tight">
              {group.meter}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Latest{" "}
              <span className="font-mono tabular-nums text-foreground">
                {formatReading(latest.row.value, group.unit)}
              </span>{" "}
              · {format(latest.row.date, "d MMM yyyy")}
            </p>
          </div>
        </div>
        <ReadingDialog
          defaultMeter={group.meter}
          defaultUnit={group.unit ?? undefined}
          triggerVariant="outline"
        />
      </div>

      {latest.delta != null ? (
        <div className="px-5 py-3 border-b bg-muted/30 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="text-[13px]">
            <span className="text-muted-foreground">Last usage </span>
            <span className="font-mono tabular-nums font-medium">
              {latest.delta >= 0 ? "+" : ""}
              {formatReading(latest.delta, group.unit)}
            </span>
          </span>
          <span className="text-[12px] text-muted-foreground">
            over {sinceDays} day{sinceDays === 1 ? "" : "s"}
          </span>
          {perDay != null ? (
            <span className="text-[12px] text-muted-foreground">
              ≈{" "}
              <span className="font-mono tabular-nums">
                {formatReading(
                  Math.round(perDay * 100) / 100,
                  group.unit,
                )}
              </span>{" "}
              / day
            </span>
          ) : null}
        </div>
      ) : (
        <div className="px-5 py-3 border-b bg-muted/30">
          <span className="text-[12px] text-muted-foreground">
            First reading — add another to see usage.
          </span>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <TableHead className="h-9">Date</TableHead>
            <TableHead className="h-9 text-right">Reading</TableHead>
            <TableHead className="h-9 text-right">Usage</TableHead>
            <TableHead className="h-9">Notes</TableHead>
            <TableHead className="h-9" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ row, delta }) => (
            <TableRow key={row.id}>
              <TableCell className="text-[12px] tabular-nums text-muted-foreground whitespace-nowrap">
                {format(row.date, "d MMM yyyy")}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-[13px]">
                {formatReading(row.value, group.unit)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-[12px] text-muted-foreground">
                {delta == null
                  ? "—"
                  : `${delta >= 0 ? "+" : ""}${delta.toLocaleString("en-GB", {
                      maximumFractionDigits: 3,
                    })}`}
              </TableCell>
              <TableCell className="text-[12px] text-muted-foreground max-w-xs truncate">
                {row.notes ?? ""}
              </TableCell>
              <TableCell className="text-right">
                <DeleteReadingButton
                  id={row.id}
                  label={`${group.meter} · ${format(row.date, "d MMM yyyy")}`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
