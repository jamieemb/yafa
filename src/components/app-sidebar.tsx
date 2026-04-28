"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Receipt,
  Inbox,
  Upload,
  Wallet,
  CircleCheck,
  CalendarDays,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  hasBadge?: boolean;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const NAV_ITEMS: NavSection[] = [
  {
    section: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "Books",
    items: [
      { href: "/income", label: "Income", icon: Wallet },
      { href: "/recurring", label: "Recurring", icon: ListChecks },
      { href: "/transactions", label: "Transactions", icon: Receipt },
      { href: "/cycles", label: "Pay cycles", icon: CircleCheck },
      { href: "/review", label: "Review", icon: Inbox, hasBadge: true },
    ],
  },
  {
    section: "Plan",
    items: [
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/people", label: "People", icon: Users },
    ],
  },
  {
    section: "Data",
    items: [{ href: "/imports", label: "Imports", icon: Upload }],
  },
  {
    section: "System",
    items: [{ href: "/settings", label: "Settings", icon: SettingsIcon }],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  // Fetch the review queue size so it can show up as a sidebar badge.
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
    <aside className="hidden md:flex w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex-col">
      <div className="px-6 pt-6 pb-5 border-b border-sidebar-border">
        <Link href="/dashboard" aria-label="YAFA — home">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {NAV_ITEMS.map(({ section, items }) => (
          <div key={section}>
            <p className="label-eyebrow px-3 mb-2">{section}</p>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon, hasBadge }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "group flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            "size-3.5",
                            active && "text-primary",
                          )}
                        />
                        {label}
                      </span>
                      {hasBadge && reviewCount && reviewCount > 0 ? (
                        <span className="rounded-sm bg-primary/15 text-primary text-[10px] font-medium px-1.5 py-0.5 tabular-nums">
                          {reviewCount}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-sidebar-border">
        <p className="label-eyebrow">YAFA v0.1 · single-user</p>
      </div>
    </aside>
  );
}
