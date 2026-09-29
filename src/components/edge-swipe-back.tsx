"use client";

import { useRouter } from "next/navigation";
import { useDrag } from "@use-gesture/react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { openModal } from "@/components/gesture-utils";

const EDGE = 24; // px from the left edge where the gesture may start

/**
 * iOS-style swipe-from-left-edge to go back. Standalone home-screen web
 * apps don't get Safari's native gesture, so this restores it: with a
 * dialog or sheet open it closes that first; otherwise it navigates
 * back. Listens on the window, so nothing is overlaid on the page.
 */
export function EdgeSwipeBack() {
  const coarse = useMediaQuery("(pointer: coarse)");
  const router = useRouter();

  useDrag(
    ({ last, initial: [ix], movement: [mx], velocity: [vx] }) => {
      if (!last || ix > EDGE) return;
      if (mx > 80 || (vx > 0.5 && mx > 32)) goBack(router.back);
    },
    {
      target: typeof window !== "undefined" ? window : undefined,
      axis: "x",
      pointer: { touch: true },
      enabled: coarse,
      eventOptions: { passive: true },
    },
  );

  return null;
}

function goBack(back: () => void) {
  const modal = openModal();
  if (modal) {
    // MUI modals close on Escape from the focused element inside them.
    const target = document.activeElement ?? modal;
    target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return;
  }
  if (window.history.length > 1) back();
}
