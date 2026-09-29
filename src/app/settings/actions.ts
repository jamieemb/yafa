"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isTheme } from "@/lib/themes";
import { settingsSchema } from "@/lib/validation";

export async function updateSettings(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => i.message)
      .join("; ");
    throw new Error(message);
  }

  // The form receives percentages 0..100; we store 0..1.
  const data = {
    savingsPercent: parsed.data.savingsPercent / 100,
    investPercent: parsed.data.investPercent / 100,
    freePercent: parsed.data.freePercent / 100,
    giftLow: parsed.data.giftLow,
    giftMedium: parsed.data.giftMedium,
    giftHigh: parsed.data.giftHigh,
    theme: parsed.data.theme,
  };

  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  // Theme lives in layout.tsx so it touches every page; revalidate
  // root to ensure the new attribute is applied immediately.
  revalidatePath("/", "layout");
}

/** Persist just the light / dark / system preference (header toggle). */
export async function updateTheme(theme: string): Promise<void> {
  if (!isTheme(theme)) throw new Error(`Unknown theme: ${theme}`);
  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", theme },
    update: { theme },
  });
  revalidatePath("/", "layout");
}
