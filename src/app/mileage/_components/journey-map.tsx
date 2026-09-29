"use client";

import { useEffect, useRef } from "react";
import type * as LeafletNS from "leaflet";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { useAppTheme } from "@/components/theme-registry";
import "leaflet/dist/leaflet.css";

export interface TripLeg {
  id: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
}

interface Props {
  legs: TripLeg[];
  /** `detail` draws one trip larger; `overview` fits many legs. */
  variant?: "overview" | "detail";
  /** Fixed height or a responsive map, e.g. `{ xs: 320, md: 420 }`. */
  height?: number | Partial<Record<"xs" | "sm" | "md" | "lg" | "xl", number>>;
}

const LIGHT_TILES = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "&copy; OpenStreetMap contributors",
};
const DARK_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
};

/**
 * Leaflet map of trip legs (start -> end). Leaflet touches `window`, so
 * it is imported inside the effect and never during server rendering.
 */
export function JourneyMap({ legs, variant = "overview", height = { xs: 320, md: 420 } }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  // Re-run the effect when the scheme flips so the tiles follow it.
  const { isDark } = useAppTheme();

  useEffect(() => {
    let map: LeafletNS.Map | undefined;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      map = L.map(ref.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });

      // Read the rendered scheme from the DOM rather than the hook so the
      // first paint is right even before MUI has hydrated its mode.
      const root = document.documentElement;
      const dark = root.getAttribute("data-mui-color-scheme") === "dark" || isDark;
      const tiles = dark ? DARK_TILES : LIGHT_TILES;
      L.tileLayer(tiles.url, { maxZoom: 19, attribution: tiles.attribution }).addTo(map);

      // Marker colours from the live M3 CSS variables (fall back to the palette).
      const css = getComputedStyle(root);
      const role = (name: "primary" | "tertiary") =>
        css.getPropertyValue(`--mui-palette-m3-${name}`).trim() || theme.palette.m3[name];
      const primary = role("primary");
      const accent = role("tertiary");

      const detail = variant === "detail";
      const radius = detail ? 6 : 3;
      const weight = detail ? 2 : 1;

      const pts: [number, number][] = [];
      for (const leg of legs) {
        const a: [number, number] = [leg.startLat, leg.startLon];
        const b: [number, number] = [leg.endLat, leg.endLon];
        L.polyline([a, b], {
          color: primary,
          weight: detail ? 3 : 2,
          opacity: detail ? 0.8 : 0.55,
        }).addTo(map);
        L.circleMarker(a, { radius, color: primary, fillColor: primary, fillOpacity: 1, weight }).addTo(map);
        L.circleMarker(b, { radius, color: accent, fillColor: accent, fillOpacity: 1, weight }).addTo(map);
        pts.push(a, b);
      }

      if (pts.length > 0) {
        map.fitBounds(pts, { padding: [28, 28], maxZoom: 15 });
      } else {
        map.setView([55.86, -4.25], 11);
      }

      // The container may still be settling (e.g. inside a sliding drawer);
      // recompute size once it has.
      setTimeout(() => {
        if (!cancelled && map) map.invalidateSize();
      }, 250);
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [legs, variant, isDark, theme]);

  return (
    <Box
      ref={ref}
      sx={{
        position: "relative",
        isolation: "isolate",
        zIndex: 0,
        width: "100%",
        height,
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "m3.surfaceContainerHigh",
      }}
    />
  );
}
