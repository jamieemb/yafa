import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Small presentational pieces for the dashboard cards. No handlers or
// state, so they render straight from the Server Component page.

interface PanelHeaderProps {
  eyebrow: string;
  title: string;
  /** id for the heading so the Card can `aria-labelledby` it. */
  id: string;
  /** Right-hand side: a count Chip, a total, or a link button. */
  meta?: ReactNode;
}

/** Card header row, matching the pot headers on /recurring. */
export function PanelHeader({ eyebrow, title, id, meta }: PanelHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline" color="text.secondary" component="p">
          {eyebrow}
        </Typography>
        <Typography id={id} variant="h5" component="h2" noWrap>
          {title}
        </Typography>
      </Box>
      {meta ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>{meta}</Box>
      ) : null}
    </Box>
  );
}

interface EmptyPanelProps {
  message: string;
  /** Usually a <LinkButton> to the page where the data is entered. */
  action?: ReactNode;
}

/** Compact placeholder for an empty card body. */
export function EmptyPanel({ message, action }: EmptyPanelProps) {
  return (
    <Box
      sx={{
        py: 5,
        px: 3,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
        {message}
      </Typography>
      {action}
    </Box>
  );
}

interface SplitRowProps {
  /** Any CSS colour; categoryColor(i) variables work. */
  color: string;
  label: string;
  /** Share of the total, 0–100. */
  pct: number;
  /** Formatted amount. */
  value: string;
}

/** Legend / breakdown row: swatch, label, share, amount. */
export function SplitRow({ color, label, pct, value }: SplitRowProps) {
  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateColumns: "10px minmax(0, 1fr) auto auto",
        alignItems: "center",
        columnGap: 1.5,
        py: 0.5,
      }}
    >
      <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: color }} aria-hidden />
      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        className="tabular"
        sx={{ minWidth: 36, textAlign: "right" }}
      >
        {pct.toFixed(0)}%
      </Typography>
      <Typography variant="body2" className="tabular" sx={{ minWidth: 72, textAlign: "right" }}>
        {value}
      </Typography>
    </Box>
  );
}
