// Material Design 3 colour schemes for YAFA, generated from a single
// seed colour with Google's material-color-utilities (the same
// algorithm Android uses for dynamic colour). Pure TypeScript — safe to
// import from server components (e.g. for the <meta theme-color>).
//
// The seed is the original YAFA navy; the tonal-spot scheme derives a
// harmonious primary / secondary / tertiary and full surface hierarchy.
import {
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  hexFromArgb,
  argbFromHex,
} from "@material/material-color-utilities";

export const SEED_COLOR = "#003A6C";

/** The M3 colour roles we use, all as #rrggbb hex. */
export interface M3Scheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  scrim: string;
  shadow: string;
  surfaceTint: string;
}

function buildScheme(isDark: boolean): M3Scheme {
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(SEED_COLOR)), isDark, 0);
  const c = MaterialDynamicColors;
  const hex = (color: { getArgb: (s: SchemeTonalSpot) => number }) =>
    hexFromArgb(color.getArgb(scheme));
  return {
    primary: hex(c.primary),
    onPrimary: hex(c.onPrimary),
    primaryContainer: hex(c.primaryContainer),
    onPrimaryContainer: hex(c.onPrimaryContainer),
    secondary: hex(c.secondary),
    onSecondary: hex(c.onSecondary),
    secondaryContainer: hex(c.secondaryContainer),
    onSecondaryContainer: hex(c.onSecondaryContainer),
    tertiary: hex(c.tertiary),
    onTertiary: hex(c.onTertiary),
    tertiaryContainer: hex(c.tertiaryContainer),
    onTertiaryContainer: hex(c.onTertiaryContainer),
    error: hex(c.error),
    onError: hex(c.onError),
    errorContainer: hex(c.errorContainer),
    onErrorContainer: hex(c.onErrorContainer),
    background: hex(c.background),
    onBackground: hex(c.onBackground),
    surface: hex(c.surface),
    onSurface: hex(c.onSurface),
    surfaceVariant: hex(c.surfaceVariant),
    onSurfaceVariant: hex(c.onSurfaceVariant),
    surfaceDim: hex(c.surfaceDim),
    surfaceBright: hex(c.surfaceBright),
    surfaceContainerLowest: hex(c.surfaceContainerLowest),
    surfaceContainerLow: hex(c.surfaceContainerLow),
    surfaceContainer: hex(c.surfaceContainer),
    surfaceContainerHigh: hex(c.surfaceContainerHigh),
    surfaceContainerHighest: hex(c.surfaceContainerHighest),
    outline: hex(c.outline),
    outlineVariant: hex(c.outlineVariant),
    inverseSurface: hex(c.inverseSurface),
    inverseOnSurface: hex(c.inverseOnSurface),
    inversePrimary: hex(c.inversePrimary),
    scrim: hex(c.scrim),
    shadow: hex(c.shadow),
    surfaceTint: hex(c.surfaceTint),
  };
}

export const M3_LIGHT: M3Scheme = buildScheme(false);
export const M3_DARK: M3Scheme = buildScheme(true);

// Semantic money colours. M3 has no "success" role, so use fixed
// Material greens/ambers that sit well against both schemes.
export const MONEY_COLORS = {
  light: { positive: "#1b6b3a", negative: M3_LIGHT.error, warning: "#7a5900" },
  dark: { positive: "#7fd89a", negative: M3_DARK.error, warning: "#e6c04a" },
} as const;

// Categorical palette for charts (pots, accounts): tonal steps drawn
// from the scheme so charts feel part of the theme in both modes.
export function chartPalette(isDark: boolean): string[] {
  const s = isDark ? M3_DARK : M3_LIGHT;
  return [
    s.primary,
    s.tertiary,
    s.secondary,
    s.primaryContainer,
    s.tertiaryContainer,
    s.secondaryContainer,
    s.inversePrimary,
    s.outline,
  ];
}
