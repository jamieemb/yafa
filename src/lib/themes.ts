// Theme catalogue. Six palettes — Treasury (the original) plus five
// classic terminal/editor themes. Each one is fully defined in
// globals.css under `.theme-<id>`. Adding a theme means: add to this
// list, add the class block in globals.css, done.
export const THEMES = [
  "treasury",
  "dracula",
  "monokai",
  "solarized",
  "nord",
  "gruvbox",
] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  treasury: "Treasury",
  dracula: "Dracula",
  monokai: "Monokai",
  solarized: "Solarized Dark",
  nord: "Nord",
  gruvbox: "Gruvbox Dark",
};

export const THEME_DESCRIPTIONS: Record<Theme, string> = {
  treasury: "Original — warm cream, navy primary, coral accent.",
  dracula: "Iconic dark editor theme. Purple primary, pink accent.",
  monokai: "Sublime Text classic. Green-on-graphite with pink highlights.",
  solarized: "Ethan Schoonover's deep teal background, warm accents.",
  nord: "Arctic palette of polar night and frost.",
  gruvbox: "Retro warm darks with orange and green accents.",
};

// Six-swatch preview used in the settings picker — order is meaningful:
// background, card, primary, positive, negative, accent.
export const THEME_PREVIEWS: Record<
  Theme,
  { bg: string; card: string; primary: string; positive: string; negative: string; accent: string }
> = {
  treasury: {
    bg: "#F0EEEB",
    card: "#FFFFFF",
    primary: "#003A6C",
    positive: "#4F7E5C",
    negative: "#C75744",
    accent: "#FD8973",
  },
  dracula: {
    bg: "#282A36",
    card: "#21222C",
    primary: "#BD93F9",
    positive: "#50FA7B",
    negative: "#FF5555",
    accent: "#FF79C6",
  },
  monokai: {
    bg: "#272822",
    card: "#2D2E27",
    primary: "#A6E22E",
    positive: "#A6E22E",
    negative: "#F92672",
    accent: "#F92672",
  },
  solarized: {
    bg: "#002B36",
    card: "#073642",
    primary: "#268BD2",
    positive: "#859900",
    negative: "#DC322F",
    accent: "#B58900",
  },
  nord: {
    bg: "#2E3440",
    card: "#3B4252",
    primary: "#88C0D0",
    positive: "#A3BE8C",
    negative: "#BF616A",
    accent: "#5E81AC",
  },
  gruvbox: {
    bg: "#282828",
    card: "#32302F",
    primary: "#FE8019",
    positive: "#B8BB26",
    negative: "#FB4934",
    accent: "#FABD2F",
  },
};

export function isTheme(value: string | null | undefined): value is Theme {
  return THEMES.includes(value as Theme);
}
