"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import BatteryChargingFullOutlined from "@mui/icons-material/BatteryChargingFullOutlined";
import BoltOutlined from "@mui/icons-material/BoltOutlined";
import CloseRounded from "@mui/icons-material/CloseRounded";
import LaunchOutlined from "@mui/icons-material/LaunchOutlined";
import MapOutlined from "@mui/icons-material/MapOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import SpeedOutlined from "@mui/icons-material/SpeedOutlined";
import { DataList, Meta } from "@/components/data-list";
import { formatDuration, formatMiles, formatRate } from "@/lib/mileage";
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

const odoMiles = (t: TripData) => Math.max(0, t.endOdo - t.startOdo);
// GPS distance when the export has it, otherwise the odometer delta.
const distanceLabel = (t: TripData) =>
  t.distance != null ? formatRate(t.distance, 1) : formatMiles(odoMiles(t));

const PAGE_SIZE = 20;

export function TripsTable({ trips }: { trips: TripData[] }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<TripData | null>(null);

  if (trips.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, px: 2, textAlign: "center" }}>
        No trips imported yet. Use “Import trips” to upload your weekly CSV.
      </Typography>
    );
  }

  const shown = trips.slice(0, limit);
  const remaining = trips.length - shown.length;

  return (
    <>
      <DataList<TripData>
        rows={shown}
        getKey={(t) => t.id}
        columns={[
          {
            id: "start",
            header: "Start",
            nowrap: true,
            render: (t) => (
              <>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {fmtDate(t.startAt)}
                </Typography>
                <Typography variant="caption" color="text.secondary" className="tabular" component="p">
                  {fmtTime(t.startAt)}–{fmtTime(t.endAt)}
                </Typography>
              </>
            ),
          },
          {
            id: "duration",
            header: "Duration",
            numeric: true,
            nowrap: true,
            render: (t) => formatDuration(t.durationMin),
          },
          { id: "route", header: "Route", nowrap: true, render: (t) => <RouteCell trip={t} /> },
          {
            id: "odometer",
            header: "Odometer",
            align: "right",
            numeric: true,
            nowrap: true,
            render: (t) => `${formatMiles(t.startOdo)} → ${formatMiles(t.endOdo)}`,
          },
          {
            id: "distance",
            header: "Distance",
            align: "right",
            numeric: true,
            render: (t) => (
              <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                {distanceLabel(t)}
              </Typography>
            ),
          },
          {
            id: "efficiency",
            header: "mi/kWh",
            align: "right",
            numeric: true,
            render: (t) => (t.efficiency != null ? formatRate(t.efficiency, 1) : "—"),
          },
          {
            id: "battery",
            header: "Battery",
            align: "right",
            numeric: true,
            render: (t) => (t.batteryPct != null ? `${formatRate(t.batteryPct, 0)}%` : "—"),
          },
          { id: "meta", header: "Purpose / driver", render: (t) => <PurposeDriver trip={t} /> },
        ]}
        mobile={{
          title: (t) => (
            <>
              {fmtDate(t.startAt)}{" "}
              <Typography component="span" variant="body2" color="text.secondary" className="tabular">
                {fmtTime(t.startAt)}–{fmtTime(t.endAt)}
              </Typography>
            </>
          ),
          meta: (t) => (
            <Meta>
              {formatDuration(t.durationMin)}
              {t.distance != null ? `${formatRate(t.distance, 1)} mi GPS` : null}
              {t.efficiency != null ? `${formatRate(t.efficiency, 1)} mi/kWh` : null}
            </Meta>
          ),
          value: (t) => `${formatMiles(odoMiles(t))} mi`,
          valueSub: (t) => `odo ${formatMiles(t.endOdo)}`,
        }}
        actions={(t) => (
          <Tooltip title="Trip details">
            <IconButton
              size="small"
              aria-label={`Details for the trip on ${fmtDate(t.startAt)}`}
              onClick={() => setSelected(t)}
            >
              <MapOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      {remaining > 0 ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            p: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button variant="text" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, remaining)} more of {remaining}
          </Button>
        </Box>
      ) : null}

      <TripDetailPanel trip={selected} onClose={() => setSelected(null)} />
    </>
  );
}

// ── Table cells ────────────────────────────────────────────────────────

function PlaceLink({
  label,
  url,
  lat,
  lon,
}: {
  label: string;
  url: string | null;
  lat: number | null;
  lon: number | null;
}) {
  if (url) {
    return (
      <Link
        href={url}
        target="_blank"
        rel="noreferrer"
        underline="hover"
        variant="body2"
        aria-label={`Open trip ${label.toLowerCase()} location in Google Maps`}
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
      >
        {label}
        <LaunchOutlined sx={{ fontSize: 14 }} aria-hidden />
      </Link>
    );
  }
  if (lat != null && lon != null) {
    return (
      <Typography variant="body2" component="span" color="text.secondary" className="tabular">
        {lat.toFixed(3)}, {lon.toFixed(3)}
      </Typography>
    );
  }
  return (
    <Typography variant="body2" component="span" color="text.secondary">
      —
    </Typography>
  );
}

function RouteCell({ trip }: { trip: TripData }) {
  const has = trip.startUrl || trip.endUrl || trip.startLat != null || trip.endLat != null;
  if (!has) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <PlaceLink label="Start" url={trip.startUrl} lat={trip.startLat} lon={trip.startLon} />
      <ArrowForwardRounded sx={{ fontSize: 14, color: "text.secondary" }} aria-hidden />
      <PlaceLink label="End" url={trip.endUrl} lat={trip.endLat} lon={trip.endLon} />
    </Stack>
  );
}

const purposeOf = (t: TripData) => (t.purpose && t.purpose !== "Undefined" ? t.purpose : null);
const driverOf = (t: TripData) => (t.driver && t.driver !== "Unknown" ? t.driver : null);

function PurposeDriver({ trip }: { trip: TripData }) {
  const purpose = purposeOf(trip);
  const driver = driverOf(trip);
  if (!purpose && !driver) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <>
      {purpose ? <Typography variant="body2">{purpose}</Typography> : null}
      {driver ? (
        <Typography variant="caption" color="text.secondary" component="p">
          {driver}
        </Typography>
      ) : null}
    </>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────

function TripDetailPanel({ trip, onClose }: { trip: TripData | null; onClose: () => void }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("md"));
  const open = trip !== null;
  const content = trip ? <TripDetail trip={trip} onClose={onClose} /> : null;

  if (phone) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        onOpen={() => {}}
        disableSwipeToOpen
        slotProps={{ paper: { sx: { maxHeight: "92dvh" } } }}
      >
        {content}
      </SwipeableDrawer>
    );
  }
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 440, maxWidth: "100vw" } } }}
    >
      {content}
    </Drawer>
  );
}

function TripDetail({ trip, onClose }: { trip: TripData; onClose: () => void }) {
  const miles = odoMiles(trip);
  const hasCoords =
    trip.startLat != null && trip.startLon != null && trip.endLat != null && trip.endLon != null;
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
    trip.distance != null && trip.durationMin > 0 ? trip.distance / (trip.durationMin / 60) : null;
  const purpose = purposeOf(trip);
  const driver = driverOf(trip);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, pt: 2, pb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h2">
            {fmtDate(trip.startAt)}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="tabular">
            {fmtTime(trip.startAt)} – {fmtTime(trip.endAt)} · {formatDuration(trip.durationMin)}
          </Typography>
        </Box>
        <Tooltip title="Close">
          <IconButton aria-label="Close" onClick={onClose}>
            <CloseRounded />
          </IconButton>
        </Tooltip>
      </Box>

      <Stack
        spacing={2.5}
        sx={{ px: 2, pt: 1, pb: "calc(16px + env(safe-area-inset-bottom))", overflowY: "auto" }}
      >
        {leg ? (
          <JourneyMap legs={[leg]} variant="detail" height={220} />
        ) : (
          <Box
            sx={{
              height: 220,
              borderRadius: 3,
              border: "1px dashed",
              borderColor: "m3.outline",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No location recorded for this trip.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <DetailTile
            icon={<RouteOutlined />}
            label="Distance"
            value={trip.distance != null ? `${formatRate(trip.distance, 1)} mi` : "—"}
          />
          <DetailTile
            icon={<SpeedOutlined />}
            label="Odometer"
            value={`${formatMiles(miles)} mi`}
            sub={`${formatMiles(trip.startOdo)} → ${formatMiles(trip.endOdo)}`}
          />
          <DetailTile
            icon={<ScheduleOutlined />}
            label="Duration"
            value={formatDuration(trip.durationMin)}
            sub={avgMph != null ? `${formatRate(avgMph, 0)} mph avg` : undefined}
          />
          <DetailTile
            icon={<BoltOutlined />}
            label="Efficiency"
            value={trip.efficiency != null ? `${formatRate(trip.efficiency, 1)} mi/kWh` : "—"}
          />
        </Box>

        {trip.batteryPct != null ? (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.75 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
              >
                <BatteryChargingFullOutlined sx={{ fontSize: 18 }} /> Battery used
              </Typography>
              <Typography variant="body2" className="tabular">
                {formatRate(trip.batteryPct, 0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, trip.batteryPct))}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        ) : null}

        <Divider />

        <Stack spacing={1}>
          <LocationRow color="m3.primary" label="Start" lat={trip.startLat} lon={trip.startLon} url={trip.startUrl} />
          <LocationRow color="m3.tertiary" label="End" lat={trip.endLat} lon={trip.endLon} url={trip.endUrl} />
        </Stack>

        {purpose || driver ? (
          <>
            <Divider />
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              {purpose ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" component="p">
                    Purpose
                  </Typography>
                  <Typography variant="body2">{purpose}</Typography>
                </Box>
              ) : null}
              {driver ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" component="p">
                    Driver
                  </Typography>
                  <Typography variant="body2">{driver}</Typography>
                </Box>
              ) : null}
            </Box>
          </>
        ) : null}
      </Stack>
    </Box>
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
    <Card variant="filled" sx={{ p: 1.5, minWidth: 0 }}>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary", "& svg": { fontSize: 18 } }}
      >
        {icon}
        <Typography variant="overline" component="span" sx={{ lineHeight: 1.4 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="body1" className="tabular" sx={{ mt: 0.75, fontWeight: 500 }}>
        {value}
      </Typography>
      {sub ? (
        <Typography variant="caption" color="text.secondary" className="tabular" component="p" sx={{ mt: 0.25 }}>
          {sub}
        </Typography>
      ) : null}
    </Card>
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
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" className="tabular" noWrap>
          {lat.toFixed(4)}, {lon.toFixed(4)}
        </Typography>
      </Box>
      {url ? (
        <Tooltip title={`Open ${label.toLowerCase()} in Google Maps`}>
          <IconButton
            size="small"
            component="a"
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${label} in Google Maps`}
          >
            <LaunchOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
}
