"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { SvgIconComponent } from "@mui/icons-material";
import SpaceDashboardOutlined from "@mui/icons-material/SpaceDashboardOutlined";
import SpaceDashboardRounded from "@mui/icons-material/SpaceDashboardRounded";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import PaymentsRounded from "@mui/icons-material/PaymentsRounded";
import EventRepeatOutlined from "@mui/icons-material/EventRepeatOutlined";
import EventRepeatRounded from "@mui/icons-material/EventRepeatRounded";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import TaskAltRounded from "@mui/icons-material/TaskAltRounded";
import InboxOutlined from "@mui/icons-material/InboxOutlined";
import InboxRounded from "@mui/icons-material/InboxRounded";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import GroupOutlined from "@mui/icons-material/GroupOutlined";
import GroupRounded from "@mui/icons-material/GroupRounded";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import SpeedOutlined from "@mui/icons-material/SpeedOutlined";
import SpeedRounded from "@mui/icons-material/SpeedRounded";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import DirectionsCarRounded from "@mui/icons-material/DirectionsCarRounded";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import ChecklistOutlined from "@mui/icons-material/ChecklistOutlined";
import ChecklistRounded from "@mui/icons-material/ChecklistRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import BrightnessAutoOutlined from "@mui/icons-material/BrightnessAutoOutlined";
import { LogoMark } from "@/components/logo";
import { EdgeSwipeBack } from "@/components/edge-swipe-back";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { useAppTheme } from "@/components/theme-registry";
import {
  ALL_NAV_ITEMS,
  MOBILE_NAV_HREFS,
  NAV_SECTIONS,
  isActivePath,
  navItemFor,
  type NavIconKey,
  type NavItem,
} from "@/components/nav";
import { APP_BAR_HEIGHT, DRAWER_WIDTH, NAV_BAR_HEIGHT, RAIL_WIDTH } from "@/lib/theme";
import type { Theme } from "@/lib/themes";

// Outlined icon at rest, filled when active (M3 navigation guidance).
const ICONS: Record<NavIconKey, [SvgIconComponent, SvgIconComponent]> = {
  dashboard: [SpaceDashboardOutlined, SpaceDashboardRounded],
  income: [PaymentsOutlined, PaymentsRounded],
  recurring: [EventRepeatOutlined, EventRepeatRounded],
  transactions: [ReceiptLongOutlined, ReceiptLongRounded],
  cycles: [TaskAltOutlined, TaskAltRounded],
  review: [InboxOutlined, InboxRounded],
  calendar: [CalendarMonthOutlined, CalendarMonthRounded],
  people: [GroupOutlined, GroupRounded],
  renewals: [EventAvailableOutlined, EventAvailableRounded],
  meters: [SpeedOutlined, SpeedRounded],
  mileage: [DirectionsCarOutlined, DirectionsCarRounded],
  imports: [UploadFileOutlined, UploadFileRounded],
  settings: [SettingsOutlined, SettingsRounded],
  setup: [ChecklistOutlined, ChecklistRounded],
  more: [MoreHorizRounded, MoreHorizRounded],
};

const THEME_CYCLE: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
const THEME_ICON: Record<Theme, SvgIconComponent> = {
  light: LightModeOutlined,
  dark: DarkModeOutlined,
  system: BrightnessAutoOutlined,
};
const THEME_LABEL: Record<Theme, string> = {
  light: "Theme: light",
  dark: "Theme: dark",
  system: "Theme: match system",
};

interface Props {
  preference: Theme;
  children: React.ReactNode;
}

/**
 * Responsive M3 shell. Phones and tablets get a top app bar plus a
 * bottom navigation bar (4 destinations + "More" sheet); from the md
 * breakpoint a permanent navigation drawer takes over. Both layouts are
 * rendered and switched with CSS so server and client markup match.
 */
export function AppShell({ preference, children }: Props) {
  const pathname = usePathname();
  const [reviewCount, setReviewCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const current = navItemFor(pathname);

  // Review-queue size for the badges; refreshed on navigation.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/review-count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => {
        if (!cancelled) setReviewCount(d.count ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <SkipLink />
      <EdgeSwipeBack />

      {/* ── Mobile top app bar ─────────────────────────────────── */}
      {/* pt: with a translucent iOS status bar the bar starts under it.
          On tablets the bar sits to the right of the navigation rail. */}
      <AppBar
        position="fixed"
        sx={{
          display: { md: "none" },
          pt: "env(safe-area-inset-top)",
          left: { xs: 0, sm: RAIL_WIDTH },
          width: { xs: "100%", sm: `calc(100% - ${RAIL_WIDTH}px)` },
        }}
      >
        <Toolbar sx={{ gap: 1.5, px: 2 }}>
          <Box
            component={Link}
            href="/dashboard"
            aria-label="YAFA home"
            sx={{ display: { xs: "flex", sm: "none" } }}
          >
            <LogoMark size={28} />
          </Box>
          <Typography variant="h4" component="div" noWrap sx={{ flex: 1, fontSize: "1.375rem" }}>
            {current?.label ?? "YAFA"}
          </Typography>
          <ThemeToggle preference={preference} />
        </Toolbar>
      </AppBar>

      {/* ── Desktop navigation drawer ─────────────────────────── */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 3.5, pt: 3, pb: 1 }}>
          <LogoMark size={32} />
          <Box>
            <Typography variant="h5" component="div" sx={{ lineHeight: 1.2 }}>
              YAFA
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Yet Another Finance App
            </Typography>
          </Box>
        </Box>
        <Box component="nav" aria-label="Main navigation" sx={{ flex: 1, overflowY: "auto", pb: 2 }}>
          {NAV_SECTIONS.map(({ section, items }) => (
            <List key={section} dense disablePadding subheader={<ListSubheader disableSticky>{section}</ListSubheader>} sx={{ px: 1.5 }}>
              {items.map((item) => (
                <NavListItem key={item.href} item={item} pathname={pathname} reviewCount={reviewCount} />
              ))}
            </List>
          ))}
        </Box>
        <Box sx={{ px: 1.5, pb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
            v0.2 · single-user
          </Typography>
          <ThemeToggle preference={preference} />
        </Box>
      </Drawer>

      {/* ── Tablet navigation rail (sm to md) ─────────────────── */}
      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{
          display: { xs: "none", sm: "flex", md: "none" },
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: RAIL_WIDTH,
          flexDirection: "column",
          alignItems: "center",
          pt: "calc(env(safe-area-inset-top) + 12px)",
          pb: "calc(env(safe-area-inset-bottom) + 16px)",
          bgcolor: "m3.surface",
          zIndex: (t) => t.zIndex.appBar + 1,
        }}
      >
        <Box component={Link} href="/dashboard" aria-label="YAFA home" sx={{ display: "flex", mb: 2.5 }}>
          <LogoMark size={32} />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}>
          {MOBILE_NAV_HREFS.map((href) => {
            const item = ALL_NAV_ITEMS.find((i) => i.href === href)!;
            return (
              <NavBarItem
                key={href}
                rail
                item={item}
                active={isActivePath(pathname, href)}
                badge={item.hasBadge ? reviewCount : 0}
              />
            );
          })}
          <NavBarItem
            rail
            item={{ href: "#more", label: "More", icon: "more" }}
            active={moreOpen || (Boolean(current) && !MOBILE_NAV_HREFS.includes(current!.href as (typeof MOBILE_NAV_HREFS)[number]))}
            onClick={() => setMoreOpen(true)}
          />
        </Box>
        <Box sx={{ mt: "auto" }}>
          <ThemeToggle preference={preference} />
        </Box>
      </Box>

      {/* ── Content ───────────────────────────────────────────── */}
      <Box
        component="main"
        id="main-content"
        sx={{
          flex: 1,
          minWidth: 0,
          pt: { xs: `calc(${APP_BAR_HEIGHT}px + env(safe-area-inset-top))`, md: 0 },
          pb: { xs: `calc(${NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom))`, sm: 0 },
          pl: { xs: 0, sm: `${RAIL_WIDTH}px`, md: 0 },
        }}
      >
        <PullToRefresh>
          <Container
            maxWidth="lg"
            sx={{
              pt: { xs: 2, sm: 3, md: 4 },
              // Extra room on phones so a FAB never covers the last row.
              pb: { xs: 12, sm: 12, md: 4 },
              px: { xs: 2, sm: 3, md: 4 },
              display: "flex",
              flexDirection: "column",
              gap: { xs: 3, md: 4 },
            }}
          >
            {children}
          </Container>
        </PullToRefresh>
      </Box>

      {/* ── Mobile navigation bar ─────────────────────────────── */}
      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{
          display: { xs: "flex", sm: "none" },
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: `calc(${NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
          pb: "env(safe-area-inset-bottom)",
          bgcolor: "m3.surfaceContainer",
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        {MOBILE_NAV_HREFS.map((href) => {
          const item = ALL_NAV_ITEMS.find((i) => i.href === href)!;
          return (
            <NavBarItem
              key={href}
              item={item}
              active={isActivePath(pathname, href)}
              badge={item.hasBadge ? reviewCount : 0}
            />
          );
        })}
        <NavBarItem
          item={{ href: "#more", label: "More", icon: "more" }}
          active={moreOpen || (Boolean(current) && !MOBILE_NAV_HREFS.includes(current!.href as (typeof MOBILE_NAV_HREFS)[number]))}
          onClick={() => setMoreOpen(true)}
        />
      </Box>

      {/* ── "More" bottom sheet ───────────────────────────────── */}
      <SwipeableDrawer
        anchor="bottom"
        open={moreOpen}
        onOpen={() => setMoreOpen(true)}
        onClose={() => setMoreOpen(false)}
        disableSwipeToOpen
        sx={{ display: { md: "none" } }}
        slotProps={{ paper: { sx: { maxHeight: "85dvh", pb: "env(safe-area-inset-bottom)" } } }}
      >
        <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: "m3.onSurfaceVariant", opacity: 0.4, mx: "auto", mt: 2, mb: 1 }} />
        <Box sx={{ overflowY: "auto", px: 1.5, pb: 2 }}>
          {NAV_SECTIONS.map(({ section, items }) => (
            <List key={section} dense disablePadding subheader={<ListSubheader disableSticky>{section}</ListSubheader>}>
              {items.map((item) => (
                <NavListItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  reviewCount={reviewCount}
                  onNavigate={() => setMoreOpen(false)}
                />
              ))}
            </List>
          ))}
        </Box>
      </SwipeableDrawer>
    </Box>
  );
}

function NavListItem({
  item,
  pathname,
  reviewCount,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  reviewCount: number;
  /** Called on click, e.g. to close the sheet the list sits in. */
  onNavigate?: () => void;
}) {
  const active = isActivePath(pathname, item.href);
  const Icon = ICONS[item.icon][active ? 1 : 0];
  return (
    <ListItemButton
      component={Link}
      href={item.href}
      selected={active}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      sx={{ mb: 0.25 }}
    >
      <ListItemIcon>
        <Icon />
      </ListItemIcon>
      <ListItemText primary={item.label} />
      {item.hasBadge && reviewCount > 0 ? (
        <Typography variant="overline" component="span" className="tabular" aria-label={`${reviewCount} awaiting review`}>
          {reviewCount}
        </Typography>
      ) : null}
    </ListItemButton>
  );
}

function NavBarItem({
  item,
  active,
  badge = 0,
  onClick,
  rail = false,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
  onClick?: () => void;
  /** Vertical rail item (tablet) instead of a bottom-bar destination. */
  rail?: boolean;
}) {
  const Icon = ICONS[item.icon][active ? 1 : 0];
  const label = item.shortLabel ?? item.label;
  const content = (
    <>
      <Box
        sx={{
          width: 64,
          height: 32,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: active ? "m3.secondaryContainer" : "transparent",
          color: active ? "m3.onSecondaryContainer" : "m3.onSurfaceVariant",
          transition: "background-color 150ms",
        }}
      >
        <Badge badgeContent={badge} color="error" max={99} overlap="circular">
          <Icon fontSize="small" />
        </Badge>
      </Box>
      <Typography
        variant="overline"
        component="span"
        sx={{ color: active ? "m3.onSurface" : "m3.onSurfaceVariant", fontWeight: active ? 700 : 500, lineHeight: 1.3 }}
      >
        {label}
      </Typography>
    </>
  );
  const sx = {
    flex: rail ? "none" : 1,
    width: rail ? "100%" : undefined,
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 0.5,
    pt: rail ? 0.5 : 1.5,
    pb: rail ? 0.5 : 2,
  };
  if (onClick) {
    return (
      <ButtonBase onClick={onClick} aria-haspopup="dialog" aria-expanded={active} sx={sx}>
        {content}
      </ButtonBase>
    );
  }
  return (
    <ButtonBase component={Link} href={item.href} aria-current={active ? "page" : undefined} sx={sx}>
      {content}
    </ButtonBase>
  );
}

function ThemeToggle({ preference: fallback }: { preference: Theme }) {
  const { preference, setPreference } = useAppTheme(fallback);
  const Icon = THEME_ICON[preference];
  return (
    <Tooltip title={`${THEME_LABEL[preference]} — tap to change`}>
      <IconButton aria-label={`${THEME_LABEL[preference]}. Change theme`} onClick={() => setPreference(THEME_CYCLE[preference])}>
        <Icon />
      </IconButton>
    </Tooltip>
  );
}

function SkipLink() {
  return (
    <Box
      component="a"
      href="#main-content"
      sx={{
        position: "absolute",
        left: 8,
        top: -64,
        zIndex: (t) => t.zIndex.tooltip,
        px: 2,
        py: 1,
        borderRadius: 20,
        bgcolor: "primary.main",
        color: "primary.contrastText",
        "&:focus": { top: 8 },
      }}
    >
      Skip to content
    </Box>
  );
}
