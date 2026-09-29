// MUI theme expressing Material Design 3 for YAFA.
//
// Colour: light/dark schemes generated from one seed (m3-colors.ts) and
// exposed both through MUI's standard palette slots and as the raw M3
// roles under `palette.m3` (available as CSS variables, e.g.
// var(--mui-palette-m3-surfaceContainer)).
//
// Shape / type / component styling follows the M3 spec: pill buttons,
// 12px cards, 28px dialogs, Roboto type scale, tonal surfaces instead
// of shadows, state layers via color-mix.
import { createTheme, alpha } from "@mui/material/styles";
import { M3_DARK, M3_LIGHT, MONEY_COLORS, type M3Scheme } from "./m3-colors";

declare module "@mui/material/styles" {
  interface Palette {
    m3: M3Scheme;
  }
  interface PaletteOptions {
    m3?: M3Scheme;
  }
}

declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    /** M3 filled card: surface-container-highest, no shadow. */
    filled: true;
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    /** M3 filled tonal button: secondary-container. */
    tonal: true;
  }
}

// CSS variable reference for an M3 role, e.g. v("surfaceContainer").
const v = (role: keyof M3Scheme) => `var(--mui-palette-m3-${role})`;

// M3 state layers: blend `pct`% of the content colour over the container.
const layer = (fg: string, bg: string, pct: number) =>
  `color-mix(in srgb, ${fg} ${pct}%, ${bg})`;

// M3 elevation levels (umbra + penumbra).
const ELEVATION = [
  "none",
  "0px 1px 2px rgba(0,0,0,0.30), 0px 1px 3px 1px rgba(0,0,0,0.15)",
  "0px 1px 2px rgba(0,0,0,0.30), 0px 2px 6px 2px rgba(0,0,0,0.15)",
  "0px 1px 3px rgba(0,0,0,0.30), 0px 4px 8px 3px rgba(0,0,0,0.15)",
  "0px 2px 3px rgba(0,0,0,0.30), 0px 6px 10px 4px rgba(0,0,0,0.15)",
  "0px 4px 4px rgba(0,0,0,0.30), 0px 8px 12px 6px rgba(0,0,0,0.15)",
];
const shadows = Array.from({ length: 25 }, (_, i) => ELEVATION[Math.min(i, 5)]) as unknown as [
  "none", string, string, string, string, string, string, string, string, string,
  string, string, string, string, string, string, string, string, string, string,
  string, string, string, string, string,
];

function paletteFor(s: M3Scheme, mode: "light" | "dark") {
  const money = MONEY_COLORS[mode];
  return {
    primary: { main: s.primary, contrastText: s.onPrimary },
    secondary: { main: s.secondary, contrastText: s.onSecondary },
    error: { main: s.error, contrastText: s.onError },
    success: { main: money.positive, contrastText: "#fff" },
    warning: { main: money.warning, contrastText: "#fff" },
    info: { main: s.tertiary, contrastText: s.onTertiary },
    background: { default: s.surface, paper: s.surfaceContainerLow },
    text: {
      primary: s.onSurface,
      secondary: s.onSurfaceVariant,
      disabled: alpha(s.onSurface, 0.38),
    },
    divider: s.outlineVariant,
    action: {
      active: s.onSurfaceVariant,
      hover: alpha(s.onSurface, 0.08),
      hoverOpacity: 0.08,
      selected: alpha(s.onSurface, 0.12),
      selectedOpacity: 0.12,
      focus: alpha(s.onSurface, 0.12),
      focusOpacity: 0.12,
      disabled: alpha(s.onSurface, 0.38),
      disabledBackground: alpha(s.onSurface, 0.12),
    },
    m3: s,
  };
}

export const DRAWER_WIDTH = 280;
export const NAV_BAR_HEIGHT = 80;
export const APP_BAR_HEIGHT = 64;

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data" },
  colorSchemes: {
    light: { palette: paletteFor(M3_LIGHT, "light") },
    dark: { palette: paletteFor(M3_DARK, "dark") },
  },
  shape: { borderRadius: 12 },
  shadows,
  typography: {
    fontFamily: 'var(--font-roboto), Roboto, "Helvetica Neue", Arial, sans-serif',
    // Headline L / M / S, Title L / M / S mapped onto h1–h6.
    h1: {
      fontSize: "1.75rem",
      lineHeight: 36 / 28,
      fontWeight: 400,
      letterSpacing: 0,
      "@media (min-width:900px)": { fontSize: "2rem", lineHeight: 40 / 32 },
    },
    h2: { fontSize: "1.75rem", lineHeight: 36 / 28, fontWeight: 400, letterSpacing: 0 },
    h3: { fontSize: "1.5rem", lineHeight: 32 / 24, fontWeight: 400, letterSpacing: 0 },
    h4: { fontSize: "1.375rem", lineHeight: 28 / 22, fontWeight: 400, letterSpacing: 0 },
    h5: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 500, letterSpacing: "0.009em" },
    h6: { fontSize: "0.875rem", lineHeight: 20 / 14, fontWeight: 500, letterSpacing: "0.007em" },
    subtitle1: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 500, letterSpacing: "0.009em" },
    subtitle2: { fontSize: "0.875rem", lineHeight: 20 / 14, fontWeight: 500, letterSpacing: "0.007em" },
    // Body L / M / S
    body1: { fontSize: "1rem", lineHeight: 1.5, letterSpacing: "0.031em" },
    body2: { fontSize: "0.875rem", lineHeight: 20 / 14, letterSpacing: "0.018em" },
    caption: { fontSize: "0.75rem", lineHeight: 16 / 12, letterSpacing: "0.033em" },
    // Label M (used as an eyebrow / field label). M3 avoids all-caps.
    overline: {
      fontSize: "0.75rem",
      lineHeight: 16 / 12,
      fontWeight: 500,
      letterSpacing: "0.042em",
      textTransform: "none",
    },
    // Label L
    button: {
      fontSize: "0.875rem",
      lineHeight: 20 / 14,
      fontWeight: 500,
      letterSpacing: "0.007em",
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" },
        "strong, b": { fontWeight: 500 },
      },
    },
    // ── Surfaces ────────────────────────────────────────────────────
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: v("surfaceContainerLow"),
          variants: [
            {
              props: { variant: "outlined" },
              style: {
                backgroundColor: v("surface"),
                borderColor: v("outlineVariant"),
              },
            },
            {
              props: { variant: "filled" },
              style: {
                backgroundColor: v("surfaceContainerHighest"),
                boxShadow: "none",
              },
            },
            {
              props: { variant: "elevation" },
              style: { boxShadow: ELEVATION[1] },
            },
          ],
        },
      },
    },
    MuiCardContent: {
      styleOverrides: { root: { padding: 16, "&:last-child": { paddingBottom: 16 } } },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { padding: "16px 16px 8px" },
        title: { fontSize: "1rem", fontWeight: 500, lineHeight: 1.5 },
        subheader: { fontSize: "0.875rem" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          backgroundColor: v("surfaceContainerHigh"),
          boxShadow: ELEVATION[3],
          "&.MuiDialog-paperFullScreen": {
            borderRadius: 0,
            backgroundColor: v("surface"),
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { padding: "24px 24px 16px", fontSize: "1.5rem", lineHeight: 32 / 24, fontWeight: 400 },
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: "0 24px 8px" } },
    },
    MuiDialogContentText: {
      styleOverrides: { root: { color: v("onSurfaceVariant") } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: "16px 24px 24px", gap: 8 } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 4,
          backgroundColor: v("surfaceContainer"),
          boxShadow: ELEVATION[2],
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: { root: { minHeight: 48, paddingInline: 12 } },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { borderRadius: 4, backgroundColor: v("surfaceContainer"), boxShadow: ELEVATION[2] },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: v("surfaceContainerLow"),
          borderRight: "none",
          backgroundImage: "none",
          variants: [
            { props: { anchor: "left" }, style: { borderRadius: "0 16px 16px 0" } },
            { props: { anchor: "left", variant: "permanent" }, style: { borderRadius: 0 } },
            { props: { anchor: "bottom" }, style: { borderRadius: "28px 28px 0 0" } },
          ],
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "default" },
      styleOverrides: {
        colorDefault: {
          backgroundColor: v("surface"),
          color: v("onSurface"),
          backgroundImage: "none",
        },
      },
    },
    MuiToolbar: {
      styleOverrides: { root: { minHeight: APP_BAR_HEIGHT, "@media (min-width:600px)": { minHeight: APP_BAR_HEIGHT } } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: v("inverseSurface"),
          color: v("inverseOnSurface"),
          borderRadius: 4,
          fontSize: "0.75rem",
          padding: "6px 8px",
        },
        arrow: { color: v("inverseSurface") },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: v("inverseSurface"),
          color: v("inverseOnSurface"),
          borderRadius: 4,
          boxShadow: ELEVATION[3],
          minWidth: 0,
        },
      },
    },
    // ── Actions ─────────────────────────────────────────────────────
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 20,
          minHeight: 40,
          paddingInline: 24,
          "&.MuiButton-sizeSmall": { minHeight: 32, paddingInline: 16, borderRadius: 16 },
          "&.MuiButton-sizeLarge": { minHeight: 48, paddingInline: 28, borderRadius: 24 },
          variants: [
            {
              props: { variant: "tonal" },
              style: {
                backgroundColor: v("secondaryContainer"),
                color: v("onSecondaryContainer"),
                "&:hover": {
                  backgroundColor: layer(v("onSecondaryContainer"), v("secondaryContainer"), 8),
                },
                "&.Mui-disabled": {
                  backgroundColor: "var(--mui-palette-action-disabledBackground)",
                  color: "var(--mui-palette-action-disabled)",
                },
              },
            },
            {
              props: { variant: "outlined" },
              style: { borderColor: v("outline") },
            },
          ],
        },
        startIcon: { marginLeft: -8, marginRight: 8 },
        endIcon: { marginRight: -8, marginLeft: 8 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { color: v("onSurfaceVariant") },
      },
    },
    MuiFab: {
      defaultProps: { color: "primary" },
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: ELEVATION[3],
          textTransform: "none",
          "&:hover": { boxShadow: ELEVATION[4] },
          "&:active": { boxShadow: ELEVATION[3] },
        },
        // M3 FAB default: primary container.
        primary: {
          backgroundColor: v("primaryContainer"),
          color: v("onPrimaryContainer"),
          "&:hover": {
            backgroundColor: layer(v("onPrimaryContainer"), v("primaryContainer"), 8),
          },
        },
        extended: { height: 56, paddingInline: 20, borderRadius: 16, fontWeight: 500 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
        outlined: { borderColor: v("outline") },
        filled: {
          backgroundColor: v("secondaryContainer"),
          color: v("onSecondaryContainer"),
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: { fontWeight: 500, fontSize: "0.6875rem" },
      },
    },
    // ── Navigation ─────────────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          minHeight: 56,
          paddingInline: 16,
          color: v("onSurfaceVariant"),
          "&:hover": { backgroundColor: layer(v("onSurface"), "transparent", 8) },
          "&.Mui-selected": {
            backgroundColor: v("secondaryContainer"),
            color: v("onSecondaryContainer"),
            fontWeight: 600,
            "& .MuiListItemIcon-root": { color: v("onSecondaryContainer") },
            "&:hover": {
              backgroundColor: layer(v("onSecondaryContainer"), v("secondaryContainer"), 8),
            },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: { root: { minWidth: 0, marginRight: 12, color: v("onSurfaceVariant") } },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: "0.875rem", fontWeight: 500, letterSpacing: "0.007em" },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
          color: v("onSurfaceVariant"),
          fontSize: "0.875rem",
          fontWeight: 500,
          lineHeight: "48px",
          paddingInline: 28,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: "3px 3px 0 0" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 500, minHeight: 48, letterSpacing: "0.007em" },
      },
    },
    // ── Inputs ──────────────────────────────────────────────────────
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "medium", fullWidth: true },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: v("outline") },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: v("onSurface") },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderRadius: "4px 4px 0 0",
          backgroundColor: v("surfaceContainerHighest"),
          "&:hover": { backgroundColor: layer(v("onSurface"), v("surfaceContainerHighest"), 8) },
          "&.Mui-focused": { backgroundColor: v("surfaceContainerHighest") },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: v("onSurfaceVariant") } },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { marginInline: 16 } },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 52,
          height: 32,
          padding: 0,
          "& .MuiSwitch-switchBase": {
            padding: 0,
            margin: 8,
            transitionDuration: "200ms",
            "& .MuiSwitch-thumb": {
              width: 16,
              height: 16,
              backgroundColor: v("outline"),
              boxShadow: "none",
              transition: "width 150ms, height 150ms, margin 150ms",
            },
            "&:hover .MuiSwitch-thumb": { width: 28, height: 28, margin: -6 },
            "&.Mui-checked": {
              transform: "translateX(20px)",
              margin: 4,
              "& .MuiSwitch-thumb": { width: 24, height: 24, backgroundColor: v("onPrimary") },
              "&:hover .MuiSwitch-thumb": { width: 28, height: 28, margin: -2 },
              "& + .MuiSwitch-track": {
                opacity: 1,
                backgroundColor: v("primary"),
                borderColor: v("primary"),
              },
              "&.Mui-disabled + .MuiSwitch-track": { opacity: 0.12 },
            },
          },
          "& .MuiSwitch-track": {
            borderRadius: 16,
            opacity: 1,
            backgroundColor: v("surfaceContainerHighest"),
            border: `2px solid ${v("outline")}`,
            boxSizing: "border-box",
            transition: "background-color 200ms, border-color 200ms",
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: { root: { color: v("onSurfaceVariant") } },
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: v("onSurfaceVariant") } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderColor: v("outline"),
          "&.Mui-selected": {
            backgroundColor: v("secondaryContainer"),
            color: v("onSecondaryContainer"),
          },
        },
      },
    },
    // ── Data display ───────────────────────────────────────────────
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: v("outlineVariant"), padding: "12px 16px" },
        head: {
          color: v("onSurfaceVariant"),
          fontWeight: 500,
          fontSize: "0.75rem",
          letterSpacing: "0.042em",
          lineHeight: 16 / 12,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&:last-child .MuiTableCell-body": { borderBottom: 0 } },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 4, borderRadius: 2, backgroundColor: v("surfaceContainerHighest") },
        bar: { borderRadius: 2 },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: v("outlineVariant") } },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          variants: [
            {
              props: { variant: "standard", severity: "error" },
              style: { backgroundColor: v("errorContainer"), color: v("onErrorContainer") },
            },
            {
              props: { variant: "standard", severity: "info" },
              style: { backgroundColor: v("tertiaryContainer"), color: v("onTertiaryContainer") },
            },
            {
              props: { variant: "standard", severity: "warning" },
              style: { backgroundColor: v("secondaryContainer"), color: v("onSecondaryContainer") },
            },
            {
              props: { variant: "standard", severity: "success" },
              style: { backgroundColor: v("primaryContainer"), color: v("onPrimaryContainer") },
            },
          ],
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
  },
});

export type AppTheme = typeof theme;
