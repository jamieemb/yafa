import { prisma } from "@/lib/db";
import type { ImportanceLevel } from "@/lib/categories";
import type { Theme } from "@/lib/themes";

export interface AppSettings {
  savingsPercent: number; // 0..1
  investPercent: number;
  freePercent: number;
  giftLow: number;
  giftMedium: number;
  giftHigh: number;
  theme: Theme;
}

const DEFAULTS: AppSettings = {
  savingsPercent: 0.40,
  investPercent: 0.35,
  freePercent: 0.25,
  giftLow: 20,
  giftMedium: 50,
  giftHigh: 100,
  theme: "treasury",
};

// Read-only fetch; ensures the singleton row exists. Falls back to
// hard-coded defaults if the DB isn't reachable yet — important during
// `next build`'s static prerender of /_not-found, which runs the root
// layout (and therefore getSettings) before any DB exists.
export async function getSettings(): Promise<AppSettings> {
  try {
    const row = await prisma.settings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    });
    return {
      savingsPercent: row.savingsPercent,
      investPercent: row.investPercent,
      freePercent: row.freePercent,
      giftLow: row.giftLow,
      giftMedium: row.giftMedium,
      giftHigh: row.giftHigh,
      theme: (row.theme ?? "treasury") as Theme,
    };
  } catch {
    // No DB / no Settings table yet — return defaults so the layout
    // (and any prerendered page that wraps it) can still render.
    return DEFAULTS;
  }
}

export function giftAmountFor(
  settings: AppSettings,
  importance: ImportanceLevel | null | undefined,
): number {
  if (!importance) return 0;
  if (importance === "LOW") return settings.giftLow;
  if (importance === "MEDIUM") return settings.giftMedium;
  if (importance === "HIGH") return settings.giftHigh;
  return 0;
}

// Resolve an event's effective budget — explicit amount wins, else the
// importance tier from settings, else 0.
export function resolveEventAmount(
  settings: AppSettings,
  amount: number | null | undefined,
  importance: ImportanceLevel | null | undefined,
): number {
  if (amount !== null && amount !== undefined) return amount;
  return giftAmountFor(settings, importance);
}

export const DEFAULT_SETTINGS = DEFAULTS;
