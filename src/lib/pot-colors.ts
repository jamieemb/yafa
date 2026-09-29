// Categorical colours for pots, accounts and chart series, expressed as
// MUI theme CSS variables so they follow the active colour scheme.
// Usable in sx, inline styles and SVG fills (charts).
export const CATEGORY_COLORS = [
  "var(--mui-palette-m3-primary)",
  "var(--mui-palette-m3-tertiary)",
  "var(--mui-palette-m3-secondary)",
  "var(--mui-palette-m3-inversePrimary)",
  "var(--mui-palette-m3-onTertiaryContainer)",
  "var(--mui-palette-m3-onSecondaryContainer)",
  "var(--mui-palette-m3-outline)",
  "var(--mui-palette-m3-onPrimaryContainer)",
] as const;

export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
