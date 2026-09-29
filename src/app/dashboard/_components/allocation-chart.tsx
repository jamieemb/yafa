"use client";

import { useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import { PieChart } from "@mui/x-charts/PieChart";
import { useDrawingArea } from "@mui/x-charts/hooks";
import { formatGBP } from "@/lib/money";

export interface AllocationSlice {
  category: string;
  total: number;
  /** Any CSS colour; categoryColor(i) variables work as SVG fills. */
  color: string;
}

interface Props {
  data: AllocationSlice[];
  /** Chart height in px. Width follows the container. */
  height?: number;
}

/**
 * Donut of this month's committed outflow by pot. The legend is drawn
 * by the page so it can sit beside the chart on desktop and below it on
 * phones; the total is written into the hole.
 */
export function AllocationChart({ data, height = 260 }: Props) {
  const total = data.reduce((acc, d) => acc + d.total, 0);
  // x-charts measures its container for width; on the server there is
  // nothing to measure and it warns, so render the chart client-side
  // only and hold its space in the meantime.
  const mounted = useMounted();

  if (!mounted) {
    return <Box sx={{ width: "100%", height }} aria-hidden />;
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <PieChart
        height={height}
        margin={8}
        hideLegend
        series={[
          {
            data: data.map((d) => ({
              id: d.category,
              value: d.total,
              label: d.category,
              color: d.color,
            })),
            innerRadius: "64%",
            outerRadius: "100%",
            paddingAngle: 2,
            cornerRadius: 4,
            highlightScope: { fade: "global", highlight: "item" },
            valueFormatter: (item) => formatGBP(item.value),
          },
        ]}
      >
        <CenterLabel caption="Outflow" value={formatGBP(total)} />
      </PieChart>
    </Box>
  );
}

const subscribeNoop = () => () => {};
/** True after hydration; false during SSR and the first client render. */
function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/** Two-line label in the middle of the donut, positioned from the drawing area. */
function CenterLabel({ caption, value }: { caption: string; value: string }) {
  const { left, top, width, height } = useDrawingArea();
  const cx = left + width / 2;
  const cy = top + height / 2;
  return (
    <g aria-hidden style={{ pointerEvents: "none" }}>
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fill: "var(--mui-palette-text-secondary)",
          fontSize: "0.75rem",
          fontWeight: 500,
          letterSpacing: "0.042em",
        }}
      >
        {caption}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        dominantBaseline="central"
        className="tabular"
        style={{
          fill: "var(--mui-palette-text-primary)",
          fontSize: "1rem",
          fontWeight: 500,
        }}
      >
        {value}
      </text>
    </g>
  );
}
