"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatGBP } from "@/lib/money";

interface Slice {
  category: string;
  total: number;
  color: string;
}

export function AllocationChart({
  data,
  size = 220,
}: {
  data: Slice[];
  size?: number;
}) {
  const total = data.reduce((acc, d) => acc + d.total, 0);
  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.category, { label: d.category, color: d.color }]),
  );

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <ChartContainer config={config} className="w-full h-full">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                nameKey="category"
                formatter={(value, _name, item) => (
                  <div className="flex items-center justify-between gap-3 w-full">
                    <span className="text-muted-foreground">
                      {item?.payload?.category}
                    </span>
                    <span className="tabular-nums font-mono">
                      {formatGBP(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            innerRadius={size * 0.32}
            outerRadius={size * 0.46}
            strokeWidth={2}
            stroke="var(--card)"
            paddingAngle={1.5}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="label-eyebrow">Outflow</span>
        <span className="font-mono text-sm tabular-nums tracking-tight mt-0.5">
          {formatGBP(total)}
        </span>
      </div>
    </div>
  );
}
