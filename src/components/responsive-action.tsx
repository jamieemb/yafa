"use client";

import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import Fab from "@mui/material/Fab";
import Zoom from "@mui/material/Zoom";
import AddRounded from "@mui/icons-material/AddRounded";

interface Props {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  /** Render as a plain button on every size (for secondary actions). */
  fabOnMobile?: boolean;
  variant?: "contained" | "tonal" | "outlined" | "text";
  disabled?: boolean;
}

/**
 * Primary page action. On phones it renders as an M3 FAB pinned above
 * the navigation bar; on larger screens as a button in the page header.
 * Both are rendered and toggled with CSS so SSR markup is stable.
 */
export function ResponsiveAction({
  label,
  onClick,
  icon = <AddRounded />,
  fabOnMobile = true,
  variant = "contained",
  disabled,
}: Props) {
  return (
    <>
      <Button
        variant={variant}
        startIcon={icon}
        onClick={onClick}
        disabled={disabled}
        sx={{ display: fabOnMobile ? { xs: "none", md: "inline-flex" } : "inline-flex" }}
      >
        {label}
      </Button>
      {fabOnMobile ? (
        <Zoom in appear={false}>
          <Fab
            color="primary"
            variant="extended"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              position: "fixed",
              right: 16,
              // Above the navigation bar on phones; tablets have a rail instead.
              bottom: { xs: "calc(96px + env(safe-area-inset-bottom))", sm: 24 },
              zIndex: (t) => t.zIndex.speedDial,
              gap: 1,
            }}
          >
            {icon}
            {label}
          </Fab>
        </Zoom>
      ) : null}
    </>
  );
}
