"use client";

import { format } from "date-fns";
import { useTheme } from "@mui/material/styles";
import { LineChart, type LineSeries } from "@mui/x-charts/LineChart";
import type { M3Scheme } from "@/lib/m3-colors";
import { formatMiles, type MileageSeriesPoint } from "@/lib/mileage";

interface Props {
  data: MileageSeriesPoint[];
  /** Contract start / end, used as the fixed x-domain so the whole term is visible. */
  startTs: number;
  endTs: number;
  height?: number;
}

type SeriesKey = "actual" | "allowance" | "projection";

/**
 * Cumulative miles over the contract term: the steady allowance line,
 * the actual odometer trajectory, and (once there's enough data) the
 * projection to term end at the observed average.
 */
export function MileageChart({ data, startTs, endTs, height = 280 }: Props) {
  const theme = useTheme();
  // With CSS variables enabled the var() references follow the active
  // scheme; the raw palette is the fallback when they are not.
  const m3 = (role: keyof M3Scheme) =>
    theme.vars ? `var(--mui-palette-m3-${role})` : theme.palette.m3[role];

  const x = data.map((p) => p.ts);
  const pick = (key: SeriesKey) => data.map((p) => p[key] ?? null);
  const hasProjection = data.some((p) => p.projection != null);

  const miles = (v: number | null) => (v == null ? null : `${formatMiles(v)} mi`);

  const series: LineSeries[] = [
    {
      id: "allowance",
      label: "Allowance",
      data: pick("allowance"),
      color: m3("outline"),
      curve: "linear",
      showMark: false,
      connectNulls: true,
      valueFormatter: miles,
    },
    ...(hasProjection
      ? [
          {
            id: "projection",
            label: "Projection",
            data: pick("projection"),
            color: m3("tertiary"),
            curve: "linear",
            showMark: false,
            connectNulls: true,
            valueFormatter: miles,
          } satisfies LineSeries,
        ]
      : []),
    {
      id: "actual",
      label: "Actual",
      data: pick("actual"),
      color: m3("primary"),
      curve: "linear",
      showMark: false,
      connectNulls: true,
      valueFormatter: miles,
    },
  ];

  return (
    <LineChart
      height={height}
      series={series}
      xAxis={[
        {
          id: "time",
          data: x,
          scaleType: "time",
          min: startTs,
          max: endTs,
          valueFormatter: (v: number | Date, ctx) =>
            format(new Date(v), ctx.location === "tooltip" ? "d MMM yyyy" : "MMM yy"),
          disableLine: true,
          disableTicks: true,
          tickNumber: 5,
          tickLabelMinGap: 24,
          height: 28,
        },
      ]}
      yAxis={[
        {
          min: 0,
          valueFormatter: (v: number) => formatMiles(v),
          disableLine: true,
          disableTicks: true,
          width: 52,
        },
      ]}
      grid={{ horizontal: true }}
      margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
      slotProps={{
        legend: {
          direction: "horizontal",
          position: { vertical: "top", horizontal: "end" },
        },
      }}
      sx={{
        "& .MuiLineElement-series-allowance": { strokeDasharray: "5 4", strokeWidth: 1.5 },
        "& .MuiLineElement-series-projection": { strokeDasharray: "2 3", strokeWidth: 1.5 },
        "& .MuiLineElement-series-actual": { strokeWidth: 2 },
      }}
    />
  );
}
