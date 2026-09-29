// Navigation model shared by the desktop drawer, the mobile navigation
// bar and the "More" sheet. Pure data — no React — so it can be imported
// anywhere.

export interface NavItem {
  href: string;
  label: string;
  /** Short label for the bottom navigation bar (≤ 12 chars). */
  shortLabel?: string;
  /** Key into the icon map in app-shell.tsx. */
  icon: NavIconKey;
  /** Show the review-queue count badge. */
  hasBadge?: boolean;
}

export type NavIconKey =
  | "dashboard"
  | "income"
  | "recurring"
  | "transactions"
  | "cycles"
  | "review"
  | "calendar"
  | "people"
  | "renewals"
  | "meters"
  | "mileage"
  | "imports"
  | "settings"
  | "more";

export interface NavSection {
  section: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    section: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    section: "Books",
    items: [
      { href: "/income", label: "Income", icon: "income" },
      { href: "/recurring", label: "Recurring", icon: "recurring" },
      { href: "/transactions", label: "Transactions", icon: "transactions" },
      { href: "/cycles", label: "Pay cycles", icon: "cycles" },
      { href: "/review", label: "Review", icon: "review", hasBadge: true },
    ],
  },
  {
    section: "Plan",
    items: [
      { href: "/calendar", label: "Calendar", icon: "calendar" },
      { href: "/people", label: "People", icon: "people" },
    ],
  },
  {
    section: "Life admin",
    items: [
      { href: "/renewals", label: "Renewals", icon: "renewals" },
      { href: "/meters", label: "Meter readings", shortLabel: "Meters", icon: "meters" },
      { href: "/mileage", label: "Mileage", icon: "mileage" },
    ],
  },
  {
    section: "Data",
    items: [{ href: "/imports", label: "Imports", icon: "imports" }],
  },
  {
    section: "System",
    items: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

// The four fixed destinations on the mobile navigation bar (M3 allows
// 3–5). Everything else lives behind "More".
export const MOBILE_NAV_HREFS = [
  "/dashboard",
  "/transactions",
  "/review",
  "/recurring",
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Section eyebrow for the page currently shown. */
export function sectionFor(pathname: string): string | undefined {
  return NAV_SECTIONS.find((s) => s.items.some((i) => isActivePath(pathname, i.href)))
    ?.section;
}

export function navItemFor(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((i) => isActivePath(pathname, i.href));
}
