"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  Route,
  Gauge,
  Clock,
  Zap,
  Battery,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMiles, formatRate, formatDuration } from "@/lib/mileage";
import { JourneyMap, type TripLeg } from "./journey-map";

export interface TripData {
  id: string;
  startAt: string; // ISO (UTC wall-clock)
  endAt: string;
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

// Trips store UTC wall-clock times — format in UTC to show as recorded.
const utcDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const utcTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const fmtDate = (iso: string) => utcDate.format(new Date(iso));
const fmtTime = (iso: string) => utcTime.format(new Date(iso));

export function TripsTable({ trips }: { trips: TripData[] }) {
  const [selected, setSelected] = useState<TripData | null>(null);
  const shown = trips.slice(0, 20);

  if (trips.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground py-8 text-center">
        No trips imported yet. Use &ldquo;Import trips&rdquo; to upload your
        weekly CSV.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <TableHead className="h-9">Date</TableHead>
            <TableHead className="h-9">Time</TableHead>
            <TableHead className="h-9 text-right">Distance</TableHead>
            <TableHead className="h-9 text-right">Duration</TableHead>
            <TableHead className="h-9 text-right">End ODO</TableHead>
            <TableHead className="h-9 text-right">mi/kWh</TableHead>
            <TableHead className="h-9" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((t) => (
            <TableRow
              key={t.id}
              onClick={() => setSelected(t)}
              className="cursor-pointer hover:bg-muted/40"
            >
              <TableCell className="text-[12px] tabular-nums text-muted-foreground whitespace-nowrap">
                {fmtDate(t.startAt)}
              </TableCell>
              <TableCell className="text-[12px] tabular-nums text-muted-foreground whitespace-nowrap">
                {fmtTime(t.startAt)}–{fmtTime(t.endAt)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-[13px]">
                {t.distance != null
                  ? formatRate(t.distance, 1)
                  : formatMiles(Math.max(0, t.endOdo - t.startOdo))}
              </TableCell>
              <TableCell className="text-right tabular-nums text-[12px] text-muted-foreground">
                {formatDuration(t.durationMin)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-[13px]">
                {formatMiles(t.endOdo)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-[12px] text-muted-foreground">
                {t.efficiency != null ? formatRate(t.efficiency, 1) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <ChevronRight className="size-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {trips.length > 20 ? (
        <p className="px-5 py-2 text-[11px] text-muted-foreground border-t">
          Showing the 20 most recent of {trips.length} trips.
        </p>
      ) : null}

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="sm:max-w-md flex flex-col gap-0 p-0 overflow-y-auto">
          {selected ? <TripDetail trip={selected} /> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function TripDetail({ trip }: { trip: TripData }) {
  const miles = Math.max(0, trip.endOdo - trip.startOdo);
  const hasCoords =
    trip.startLat != null &&
    trip.startLon != null &&
    trip.endLat != null &&
    trip.endLon != null;
  const leg: TripLeg | null = hasCoords
    ? {
        id: trip.id,
        startLat: trip.startLat as number,
        startLon: trip.startLon as number,
        endLat: trip.endLat as number,
        endLon: trip.endLon as number,
      }
    : null;
  const avgMph =
    trip.distance != null && trip.durationMin > 0
      ? trip.distance / (trip.durationMin / 60)
      : null;
  const showMeta =
    (trip.purpose && trip.purpose !== "Undefined") ||
    (trip.driver && trip.driver !== "Unknown");

  return (
    <>
      <SheetHeader className="px-5 py-4 border-b">
        <SheetTitle>{fmtDate(trip.startAt)}</SheetTitle>
        <SheetDescription>
          {fmtTime(trip.startAt)} – {fmtTime(trip.endAt)} ·{" "}
          {formatDuration(trip.durationMin)}
        </SheetDescription>
      </SheetHeader>

      <div className="p-5 space-y-5">
        {leg ? (
          <JourneyMap legs={[leg]} variant="detail" heightClass="h-52" />
        ) : (
          <div className="h-52 rounded-md border border-dashed flex items-center justify-center text-[12px] text-muted-foreground">
            No location recorded for this trip.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <DetailTile
            icon={<Route className="size-3" />}
            label="Distance"
            value={trip.distance != null ? `${formatRate(trip.distance, 1)} mi` : "—"}
          />
          <DetailTile
            icon={<Gauge className="size-3" />}
            label="Odometer"
            value={`${formatMiles(miles)} mi`}
            sub={`${formatMiles(trip.startOdo)} → ${formatMiles(trip.endOdo)}`}
          />
          <DetailTile
            icon={<Clock className="size-3" />}
            label="Duration"
            value={formatDuration(trip.durationMin)}
            sub={avgMph != null ? `${formatRate(avgMph, 0)} mph avg` : undefined}
          />
          <DetailTile
            icon={<Zap className="size-3" />}
            label="Efficiency"
            value={
              trip.efficiency != null
                ? `${formatRate(trip.efficiency, 1)} mi/kWh`
                : "—"
            }
          />
        </div>

        {trip.batteryPct != null ? (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Battery className="size-3.5" /> Battery used
              </span>
              <span className="font-mono tabular-nums">
                {formatRate(trip.batteryPct, 0)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${Math.min(100, Math.max(0, trip.batteryPct))}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2.5 border-t pt-4">
          <LocationRow
            color="var(--primary)"
            label="Start"
            lat={trip.startLat}
            lon={trip.startLon}
            url={trip.startUrl}
          />
          <LocationRow
            color="var(--accent)"
            label="End"
            lat={trip.endLat}
            lon={trip.endLon}
            url={trip.endUrl}
          />
        </div>

        {showMeta ? (
          <div className="border-t pt-4 grid grid-cols-2 gap-3 text-[12px]">
            {trip.purpose && trip.purpose !== "Undefined" ? (
              <div>
                <p className="text-muted-foreground">Purpose</p>
                <p>{trip.purpose}</p>
              </div>
            ) : null}
            {trip.driver && trip.driver !== "Unknown" ? (
              <div>
                <p className="text-muted-foreground">Driver</p>
                <p>{trip.driver}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function DetailTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="label-eyebrow">{label}</span>
      </div>
      <p className="font-mono tabular-nums text-[15px] mt-1.5">{value}</p>
      {sub ? (
        <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function LocationRow({
  color,
  label,
  lat,
  lon,
  url,
}: {
  color: string;
  label: string;
  lat: number | null;
  lon: number | null;
  url: string | null;
}) {
  if (lat == null || lon == null) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[12px] min-w-0">
        <span
          className="size-2 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums truncate">
          {lat.toFixed(4)}, {lon.toFixed(4)}
        </span>
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-primary inline-flex shrink-0"
          aria-label={`Open ${label} in Google Maps`}
        >
          <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}
