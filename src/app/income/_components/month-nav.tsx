"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";

interface Props {
  /** Month being shown, e.g. "Sep 2026". */
  label: string;
  prevHref: string;
  nextHref: string;
  /** Link back to the current month; omit when already on it. */
  todayHref?: string;
}

/** Previous / next month stepper that navigates via `?month=YYYY-MM`. */
export function MonthNav({ label, prevHref, nextHref, todayHref }: Props) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          bgcolor: "m3.surfaceContainer",
          borderRadius: 5,
          px: 0.5,
          py: 0.25,
        }}
      >
        <Tooltip title="Previous month">
          <IconButton component={Link} href={prevHref} aria-label="Previous month">
            <ChevronLeft />
          </IconButton>
        </Tooltip>
        <Typography
          variant="subtitle2"
          component="span"
          className="tabular"
          sx={{ minWidth: 88, textAlign: "center", whiteSpace: "nowrap" }}
        >
          {label}
        </Typography>
        <Tooltip title="Next month">
          <IconButton component={Link} href={nextHref} aria-label="Next month">
            <ChevronRight />
          </IconButton>
        </Tooltip>
      </Box>
      {todayHref ? (
        <Button component={Link} href={todayHref} size="small">
          Today
        </Button>
      ) : null}
    </Box>
  );
}
