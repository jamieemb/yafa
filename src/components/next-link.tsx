"use client";

import type { ReactNode } from "react";
import NextLink from "next/link";
import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";

interface LinkButtonProps {
  href: string;
  children: ReactNode;
  variant?: "text" | "tonal" | "outlined" | "contained";
  size?: "small" | "medium";
  /** Trailing arrow; on by default for text links to another page. */
  arrow?: boolean;
}

/**
 * MUI Button routed through next/link. Lives in a client file because a
 * Server Component can't pass `component={Link}` (a function) to MUI.
 */
export function LinkButton({
  href,
  children,
  variant = "text",
  size = "small",
  arrow = variant === "text",
}: LinkButtonProps) {
  return (
    <Button
      component={NextLink}
      href={href}
      variant={variant}
      size={size}
      endIcon={arrow ? <ArrowForwardRounded /> : undefined}
    >
      {children}
    </Button>
  );
}

/** Inline text link with client-side routing. */
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <MuiLink component={NextLink} href={href} underline="hover">
      {children}
    </MuiLink>
  );
}
