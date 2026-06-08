"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface Point {
  ts: number;
  actual?: number;
  allowance?: number;
  projection?: number;
}

const config = {
  actual: { label: "Actual", color: "var(--chart-1)" },
  allowance: { label: "Allowance", color: "var(--chart-5)" },
  projection: { label: "Projection", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function MileageChart({
  data,
  startTs,
  endTs,
}: {
  data: Point[];
  startTs: number;
  endTs: number;
}) {
  return (
    <ChartContainer config={config} className="h-72 w-full aspect-auto">
      <LineChart data={data} margin={{ left: 4, right: 14, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={[startTs, endTs]}
          tickFormatter={(v) => format(new Date(v), "MMM yy")}
          tickLine={false}
          axisLine={false}
          minTickGap={44}
          tickMargin={8}
        />
        <YAxis
          tickFormatter={(v) => Number(v).toLocaleString("en-GB")}
          tickLine={false}
          axisLine={false}
          width={52}
          tickMargin={4}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_value, payload) => {
                const ts = payload?.[0]?.payload?.ts;
                return ts ? format(new Date(ts), "d MMM yyyy") : "";
              }}
              formatter={(value, name) => (
                <div className="flex items-center justify-between gap-3 w-full">
                  <span className="text-muted-foreground capitalize">
                    {String(name)}
                  </span>
                  <span className="font-mono tabular-nums">
                    {Number(value).toLocaleString("en-GB")} mi
                  </span>
                </div>
              )}
            />
          }
        />
        <Line
          dataKey="allowance"
          type="linear"
          stroke="var(--color-allowance)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
          connectNulls
        />
        <Line
          dataKey="projection"
          type="linear"
          stroke="var(--color-projection)"
          strokeWidth={1.5}
          strokeDasharray="2 3"
          dot={false}
          connectNulls
        />
        <Line
          dataKey="actual"
          type="linear"
          stroke="var(--color-actual)"
          strokeWidth={2}
          dot={{ r: 2 }}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}
