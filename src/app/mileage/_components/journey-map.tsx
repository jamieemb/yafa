"use client";

import { useEffect, useRef } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";

export interface TripLeg {
  id: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
}

export function JourneyMap({
  legs,
  variant = "overview",
  heightClass = "h-80",
}: {
  legs: TripLeg[];
  variant?: "overview" | "detail";
  heightClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletNS.Map | undefined;
    let cancelled = false;

    (async () => {
      // Loaded here (not at module scope) so Leaflet's window access never
      // runs during server rendering.
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      map = L.map(ref.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const css = getComputedStyle(document.documentElement);
      const primary = css.getPropertyValue("--primary").trim() || "#003A6C";
      const accent = css.getPropertyValue("--accent").trim() || "#FD8973";

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
        L.circleMarker(a, {
          radius,
          color: primary,
          fillColor: primary,
          fillOpacity: 1,
          weight,
        }).addTo(map);
        L.circleMarker(b, {
          radius,
          color: accent,
          fillColor: accent,
          fillOpacity: 1,
          weight,
        }).addTo(map);
        pts.push(a, b);
      }

      if (pts.length > 0) {
        map.fitBounds(pts, { padding: [28, 28], maxZoom: 15 });
      } else {
        map.setView([55.86, -4.25], 11);
      }

      // The container may still be settling (e.g. inside a sliding sheet);
      // recompute size once it has.
      setTimeout(() => {
        if (!cancelled && map) map.invalidateSize();
      }, 250);
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [legs, variant]);

  return (
    <div
      ref={ref}
      className={`isolate relative z-0 ${heightClass} w-full rounded-md overflow-hidden border`}
    />
  );
}
