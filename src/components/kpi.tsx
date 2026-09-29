import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";

export type KpiTone = "neutral" | "positive" | "negative" | "warning" | "primary" | "muted";

export interface KpiProps {
  label: string;
  value: string;
  /** Sub-label shown below the value. */
  sub?: string;
  tone?: KpiTone;
  /** Small icon shown before the label. */
  icon?: ReactNode;
  /** Highlight the tile for the headline metric (primary container). */
  emphasised?: boolean;
  /** `lg` is the prominent tile used on the dashboard's main strip. */
  size?: "md" | "lg";
}

const TONE_COLOR: Record<KpiTone, string | undefined> = {
  neutral: undefined,
  positive: "success.main",
  negative: "error.main",
  warning: "warning.main",
  primary: "primary.main",
  muted: "text.secondary",
};

/** A single stat tile (M3 filled card). */
export function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
  emphasised,
  size = "md",
}: KpiProps) {
  return (
    <Card
      variant="filled"
      sx={{
        minHeight: size === "lg" ? 128 : 96,
        p: 2,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minWidth: 0,
        ...(emphasised && {
          bgcolor: "m3.primaryContainer",
          color: "m3.onPrimaryContainer",
        }),
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          color: emphasised ? "inherit" : "text.secondary",
          "& svg": { fontSize: 18 },
        }}
      >
        {icon}
        <Typography variant="overline" component="span" sx={{ lineHeight: 1.4 }}>
          {label}
        </Typography>
      </Box>
      <Box>
        <Typography
          variant={size === "lg" ? "h3" : "h5"}
          component="p"
          className="tabular"
          sx={{
            mt: 1,
            overflowWrap: "anywhere",
            color: emphasised ? "inherit" : TONE_COLOR[tone],
          }}
        >
          {value}
        </Typography>
        {sub ? (
          <Typography
            variant="caption"
            component="p"
            noWrap
            sx={{ mt: 0.5, color: emphasised ? "inherit" : "text.secondary", opacity: emphasised ? 0.85 : 1 }}
          >
            {sub}
          </Typography>
        ) : null}
      </Box>
    </Card>
  );
}

interface KpiGridProps {
  children: ReactNode;
  /** Columns at the md breakpoint and up (2 on phones). */
  columns?: 2 | 3 | 4 | 5 | 6;
}

/** Responsive grid for a strip of KPI tiles. */
export function KpiGrid({ children, columns = 4 }: KpiGridProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: `repeat(${Math.min(columns, 3)}, minmax(0, 1fr))`,
          md: `repeat(${columns}, minmax(0, 1fr))`,
        },
      }}
    >
      {children}
    </Box>
  );
}
