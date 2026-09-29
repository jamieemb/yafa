"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useDrag } from "@use-gesture/react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import { openModal } from "@/components/gesture-utils";
import { APP_BAR_HEIGHT } from "@/lib/theme";

const THRESHOLD = 72;

/**
 * Pull-to-refresh for touch devices. Standalone iOS web apps have no
 * native refresh gesture, so dragging down from the top of a page
 * re-fetches the server-rendered data via router.refresh().
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  // SSR-safe: false on the server and first client render, then updates.
  const coarse = useMediaQuery("(pointer: coarse)");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);

  const bind = useDrag(
    ({ first, down, canceled, movement: [, my], cancel }) => {
      if (first) {
        // Only from the very top, and never while a sheet or dialog is open.
        if (window.scrollY > 0 || openModal()) {
          cancel();
          return;
        }
      }
      if (canceled || my <= 0) {
        setPull(0);
        return;
      }
      // Dampen the pull so it feels elastic.
      const distance = Math.min(THRESHOLD * 1.5, my * 0.55);
      if (down) {
        setPull(distance);
        return;
      }
      setPull(0);
      if (distance >= THRESHOLD) {
        startTransition(() => router.refresh());
      }
    },
    { axis: "y", filterTaps: true, pointer: { touch: true }, enabled: coarse && !pending, threshold: 12 },
  );

  const showIndicator = pull > 0 || pending;
  const offset = pending ? THRESHOLD * 0.75 : pull;

  return (
    <Box {...(coarse ? bind() : {})} sx={{ minHeight: "100%", touchAction: "pan-y" }}>
      {coarse ? (
        <Box
          aria-live="polite"
          aria-label={pending ? "Refreshing" : undefined}
          sx={{
            position: "fixed",
            top: `calc(${APP_BAR_HEIGHT}px + env(safe-area-inset-top) + 8px)`,
            left: "50%",
            zIndex: (t) => t.zIndex.appBar - 1,
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "m3.surfaceContainerHigh",
            boxShadow: 2,
            transform: `translate(-50%, ${showIndicator ? offset - 48 : -64}px)`,
            opacity: showIndicator ? 1 : 0,
            transition: pull > 0 && !pending ? "none" : "transform 200ms, opacity 200ms",
            pointerEvents: "none",
          }}
        >
          <CircularProgress
            size={22}
            thickness={5}
            variant={pending ? "indeterminate" : "determinate"}
            value={Math.min(100, (pull / THRESHOLD) * 100)}
          />
        </Box>
      ) : null}
      {children}
    </Box>
  );
}
