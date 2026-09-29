// Colour-scheme preference. YAFA uses Material Design 3 (via MUI) with
// light and dark schemes generated from one seed colour (see
// m3-colors.ts). The user picks light, dark, or "follow the OS".
//
// Legacy values ("treasury", "dracula", …) stored by earlier versions
// are coerced to "light" by `normaliseTheme`.
export const THEMES = ["light", "dark", "system"] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "Match system",
};

export const THEME_DESCRIPTIONS: Record<Theme, string> = {
  light: "Bright surfaces, best in daylight.",
  dark: "Dark surfaces, easy on the eyes at night.",
  system: "Follows your device's light / dark preference automatically.",
};

export function isTheme(value: string | null | undefined): value is Theme {
  return THEMES.includes(value as Theme);
}

// Coerce any stored value (including legacy custom-palette ids) to a
// valid Theme, defaulting to light.
export function normaliseTheme(value: string | null | undefined): Theme {
  if (value === "dark") return "dark";
  if (value === "system") return "system";
  return "light";
}
