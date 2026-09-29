"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useDrag } from "@use-gesture/react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { toast } from "@/components/toast";

export interface SwipeAction {
  label: string;
  /** Material icon element, e.g. <CheckRounded />. */
  icon?: ReactNode;
  /** Palette colour of the revealed pane. */
  color?: "primary" | "secondary" | "success" | "error" | "warning";
  /** Runs when the swipe commits. Pass a bound server action from Server Components. */
  onTrigger: () => Promise<void> | void;
  successMessage?: string;
  /** Slide the row out after committing (for actions that remove it from the list). */
  dismiss?: boolean;
}

interface Props {
  children: ReactNode;
  /** Revealed by swiping right (pane on the left). */
  start?: SwipeAction;
  /** Revealed by swiping left (pane on the right). */
  end?: SwipeAction;
  disabled?: boolean;
}

const REVEAL = 96; // px of pane shown at a full pull
const THRESHOLD = 72; // px needed to commit

/**
 * Touch swipe-to-act wrapper (M3 list swipe pattern). Only active on
 * coarse pointers; on desktop it renders its children untouched. The
 * same actions must also exist as visible controls — swiping is a
 * shortcut, not the only way.
 */
export function SwipeableRow({ children, start, end, disabled }: Props) {
  // SSR-safe: false on the server and first client render, then updates.
  const coarse = useMediaQuery("(pointer: coarse)");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [gone, setGone] = useState(false);
  const [pending, startTransition] = useTransition();
  const enabled = coarse && !disabled && !gone && !pending && Boolean(start || end);

  function commit(action: SwipeAction, side: "start" | "end") {
    if (action.dismiss) {
      const width = containerRef.current?.offsetWidth ?? 400;
      setGone(true);
      setX(side === "start" ? width : -width);
    } else {
      setX(0);
    }
    startTransition(async () => {
      try {
        await action.onTrigger();
        if (action.successMessage) toast.success(action.successMessage);
      } catch (err) {
        toast.error(`${action.label} failed`, err instanceof Error ? err.message : undefined);
        setGone(false);
        setX(0);
      }
    });
  }

  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], direction: [dx] }) => {
      let next = mx;
      if (!start && next > 0) next = 0;
      if (!end && next < 0) next = 0;
      // Rubber-band past the reveal distance.
      if (Math.abs(next) > REVEAL) {
        next = Math.sign(next) * (REVEAL + (Math.abs(next) - REVEAL) * 0.3);
      }
      if (down) {
        setDragging(true);
        setX(next);
        return;
      }
      setDragging(false);
      const action = next > 0 ? start : next < 0 ? end : undefined;
      const flick = vx > 0.6 && Math.abs(next) > 28 && Math.sign(dx) === Math.sign(next);
      if (action && (Math.abs(next) >= THRESHOLD || flick)) {
        commit(action, next > 0 ? "start" : "end");
      } else {
        setX(0);
      }
    },
    { axis: "x", filterTaps: true, pointer: { touch: true }, enabled, threshold: 8 },
  );

  if (!coarse) return <>{children}</>;

  const progress = Math.min(1, Math.abs(x) / THRESHOLD);

  return (
    <Box
      ref={containerRef}
      sx={{ position: "relative", overflow: "hidden", bgcolor: "inherit", touchAction: "pan-y" }}
    >
      {start ? <Pane action={start} side="start" visible={x > 0} progress={progress} /> : null}
      {end ? <Pane action={end} side="end" visible={x < 0} progress={progress} /> : null}
      <Box
        {...(enabled ? bind() : {})}
        sx={{
          position: "relative",
          bgcolor: "inherit",
          transform: `translateX(${x}px)`,
          opacity: gone ? 0 : 1,
          transition: dragging
            ? "none"
            : "transform 260ms cubic-bezier(0.2, 0, 0, 1), opacity 260ms",
          willChange: "transform",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function Pane({
  action,
  side,
  visible,
  progress,
}: {
  action: SwipeAction;
  side: "start" | "end";
  visible: boolean;
  progress: number;
}) {
  const color = action.color ?? "primary";
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        display: visible ? "flex" : "none",
        alignItems: "center",
        justifyContent: side === "start" ? "flex-start" : "flex-end",
        px: 3,
        gap: 1,
        bgcolor: `${color}.main`,
        color: `${color}.contrastText`,
        "& svg": {
          fontSize: 24,
          transform: `scale(${0.7 + 0.3 * progress})`,
          transition: "transform 80ms",
        },
      }}
    >
      {side === "start" ? action.icon : null}
      <Typography variant="overline" component="span" sx={{ fontWeight: progress >= 1 ? 700 : 500 }}>
        {action.label}
      </Typography>
      {side === "end" ? action.icon : null}
    </Box>
  );
}
