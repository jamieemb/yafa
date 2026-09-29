"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "@/lib/theme";
import type { Theme } from "@/lib/themes";
import { updateTheme } from "@/app/settings/actions";

interface Props {
  /** Stored preference from Settings; used as the initial mode. */
  preference: Theme;
  children: React.ReactNode;
}

/**
 * Emotion cache + MUI theme for the App Router. The colour-scheme mode
 * is not persisted to localStorage (storageManager={null}): the
 * Settings row in the database is the single source of truth, so every
 * device sees the same choice.
 */
export function ThemeRegistry({ preference, children }: Props) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider
        theme={theme}
        defaultMode={preference}
        storageManager={null}
        disableTransitionOnChange
      >
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}

export interface AppThemeState {
  /** light | dark | system */
  preference: Theme;
  /** The scheme actually rendered right now. */
  isDark: boolean;
  /** Switch mode instantly and persist it to Settings. */
  setPreference: (next: Theme) => void;
  pending: boolean;
}

/**
 * Colour-scheme state for toggles and the settings page.
 * `fallback` is the server-rendered preference, used until MUI has
 * hydrated its mode (avoids a mismatch on first paint).
 */
export function useAppTheme(fallback: Theme = "light"): AppThemeState {
  const { mode, systemMode, setMode } = useColorScheme();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const preference = (mode ?? fallback) as Theme;
  const resolved = preference === "system" ? (systemMode ?? "light") : preference;

  function setPreference(next: Theme) {
    setMode(next);
    startTransition(async () => {
      try {
        await updateTheme(next);
        router.refresh();
      } catch {
        // Keep the optimistic mode; the DB will catch up on the next save.
      }
    });
  }

  return { preference, isDark: resolved === "dark", setPreference, pending };
}
