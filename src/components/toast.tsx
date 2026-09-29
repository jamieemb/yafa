"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import CloseRounded from "@mui/icons-material/CloseRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorRounded from "@mui/icons-material/ErrorRounded";
import InfoRounded from "@mui/icons-material/InfoRounded";
import WarningRounded from "@mui/icons-material/WarningRounded";

type ToastKind = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  subtitle?: string;
}

// Tiny module-level emitter so any client component can fire a toast
// with `toast.success("Saved")` without threading a hook through props.
const listeners = new Set<(t: ToastItem) => void>();
let seq = 0;

function emit(kind: ToastKind, title: string, subtitle?: string) {
  const item: ToastItem = { id: ++seq, kind, title, subtitle };
  listeners.forEach((l) => l(item));
}

export const toast = {
  success: (title: string, subtitle?: string) => emit("success", title, subtitle),
  error: (title: string, subtitle?: string) => emit("error", title, subtitle),
  info: (title: string, subtitle?: string) => emit("info", title, subtitle),
  warning: (title: string, subtitle?: string) => emit("warning", title, subtitle),
};

const DURATION: Record<ToastKind, number> = {
  success: 3500,
  info: 4500,
  warning: 6000,
  error: 8000,
};

const ICON: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircleRounded fontSize="small" sx={{ color: "success.light" }} />,
  error: <ErrorRounded fontSize="small" sx={{ color: "error.light" }} />,
  info: <InfoRounded fontSize="small" sx={{ color: "m3.inversePrimary" }} />,
  warning: <WarningRounded fontSize="small" sx={{ color: "warning.light" }} />,
};

/**
 * M3 snackbar host: one message at a time, queued, bottom-centre on
 * phones (above the navigation bar) and bottom-left on desktop.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const [open, setOpen] = useState(false);
  // Pending toasts and the one on screen, kept in refs so the emitter
  // callback (which runs outside React's render cycle) can decide
  // whether to show immediately or wait for the current one to exit.
  const queueRef = useRef<ToastItem[]>([]);
  const currentRef = useRef<ToastItem | null>(null);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    currentRef.current = next;
    setCurrent(next);
    setOpen(Boolean(next));
  }, []);

  useEffect(() => {
    const listener = (t: ToastItem) => {
      queueRef.current.push(t);
      if (currentRef.current) {
        // Let the visible toast slide out; onExited shows the next one.
        setOpen(false);
      } else {
        showNext();
      }
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [showNext]);

  function handleClose(_: unknown, reason?: string) {
    if (reason === "clickaway") return;
    setOpen(false);
  }

  function handleExited() {
    showNext();
  }

  return (
    <>
      {children}
      <Snackbar
        key={current?.id}
        open={open && Boolean(current)}
        autoHideDuration={current ? DURATION[current.kind] : null}
        onClose={handleClose}
        slotProps={{ transition: { onExited: handleExited } }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        sx={{
          // Sit above the mobile navigation bar.
          bottom: { xs: "calc(88px + env(safe-area-inset-bottom))", md: 24 },
          left: { xs: 16, md: 24 },
          right: { xs: 16, md: "auto" },
        }}
        message={
          current ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {ICON[current.kind]}
              <Box sx={{ minWidth: 0 }}>
                <Box component="span" sx={{ display: "block", fontWeight: 500 }}>
                  {current.title}
                </Box>
                {current.subtitle ? (
                  <Box component="span" sx={{ display: "block", opacity: 0.8, fontSize: "0.8125rem" }}>
                    {current.subtitle}
                  </Box>
                ) : null}
              </Box>
            </Box>
          ) : null
        }
        action={
          <IconButton size="small" aria-label="Dismiss" color="inherit" onClick={() => setOpen(false)}>
            <CloseRounded fontSize="small" />
          </IconButton>
        }
      />
    </>
  );
}
