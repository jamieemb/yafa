"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import TodayOutlined from "@mui/icons-material/TodayOutlined";

interface Props {
  /** Short label for the selected month, e.g. "May 2026". */
  label: string;
  prevHref: string;
  nextHref: string;
  /** Link back to the current month; omit when already viewing it. */
  currentHref?: string;
}

/**
 * Month navigator for the dashboard header. Client component so the
 * MUI buttons can render as Next.js links (`component={Link}` can't be
 * passed across the server/client boundary).
 */
export function MonthNav({ label, prevHref, nextHref, currentHref }: Props) {
  return (
    <Stack
      component="nav"
      aria-label="Budget month"
      direction="row"
      spacing={0.5}
      useFlexGap
      sx={{ alignItems: "center", flexWrap: "wrap" }}
    >
      <Tooltip title="Previous month">
        <IconButton component={Link} href={prevHref} aria-label="Previous month">
          <ChevronLeftRounded />
        </IconButton>
      </Tooltip>
      <Typography
        variant="subtitle2"
        component="span"
        className="tabular"
        aria-live="polite"
        sx={{ minWidth: 104, textAlign: "center" }}
      >
        {label}
      </Typography>
      <Tooltip title="Next month">
        <IconButton component={Link} href={nextHref} aria-label="Next month">
          <ChevronRightRounded />
        </IconButton>
      </Tooltip>
      {currentHref ? (
        <Button
          component={Link}
          href={currentHref}
          size="small"
          startIcon={<TodayOutlined />}
          sx={{ ml: 0.5 }}
        >
          This month
        </Button>
      ) : null}
    </Stack>
  );
}
