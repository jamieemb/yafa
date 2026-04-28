import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "positive" | "negative" | "primary" | "muted";

export interface KpiProps {
  label: string;
  value: string;
  /** Sub-label shown below the value. */
  sub?: string;
  tone?: KpiTone;
  /** Icon shown to the left of the label. */
  icon?: React.ReactNode;
  /** Add a primary ring around the tile for the headline metric. */
  emphasised?: boolean;
  /**
   * Visual scale.
   *  - `md` (default) – the slim tile used in page-header KPI strips
   *  - `lg` – the prominent tile used in the dashboard's main strip
   */
  size?: "md" | "lg";
  className?: string;
}

const TONE_CLASS: Record<KpiTone, string> = {
  neutral: "",
  positive: "text-positive",
  negative: "text-negative",
  primary: "text-primary",
  muted: "text-muted-foreground",
};

export function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
  emphasised,
  size = "md",
  className,
}: KpiProps) {
  const padding = size === "lg" ? "p-4" : "px-4 py-3";
  const valueClass =
    size === "lg"
      ? "text-2xl mt-2 tracking-[-0.02em]"
      : "text-base mt-1 tracking-tight";

  return (
    <div
      className={cn(
        "rounded-md border bg-card",
        padding,
        emphasised && "ring-1 ring-primary/30",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="label-eyebrow">{label}</p>
      </div>
      <p
        className={cn(
          "font-mono tabular-nums",
          valueClass,
          TONE_CLASS[tone],
        )}
      >
        {value}
      </p>
      {sub ? (
        <p
          className={cn(
            "text-[11px] text-muted-foreground truncate",
            size === "lg" ? "mt-1" : "mt-0.5",
          )}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}
