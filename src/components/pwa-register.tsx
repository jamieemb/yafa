"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js) in production. Skipped in
 * development so cached build assets never mask a code change.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration is best-effort; the app works without it.
    });
  }, []);
  return null;
}
