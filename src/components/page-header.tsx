import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface Props {
  /** Section name shown above the title, e.g. "Books". */
  eyebrow?: string;
  title: string;
  description?: string;
  /**
   * Buttons / dialog triggers. Stack under the title on phones, sit to
   * the right on larger screens. Pass a <ResponsiveAction> for the
   * primary "New …" action so it becomes a FAB on mobile.
   */
  actions?: ReactNode;
}

/** Standard page header (M3 headline + supporting text). Server-component friendly. */
export function PageHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: { xs: "stretch", md: "flex-end" },
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow ? (
          <Typography variant="overline" color="text.secondary" component="p">
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}
        >
          {actions}
        </Stack>
      ) : null}
    </Box>
  );
}

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  /** Small supporting text on the right (e.g. a total). */
  meta?: ReactNode;
  actions?: ReactNode;
  /** Heading level for semantics; visual style is the same. */
  component?: "h2" | "h3";
}

/** Heading row for a section within a page. */
export function SectionHeader({
  title,
  eyebrow,
  meta,
  actions,
  component = "h2",
}: SectionHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        mb: 1.5,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow ? (
          <Typography variant="overline" color="text.secondary" component="p">
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h5" component={component}>
          {title}
        </Typography>
      </Box>
      {meta || actions ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {meta ? (
            <Typography variant="body2" color="text.secondary">
              {meta}
            </Typography>
          ) : null}
          {actions}
        </Stack>
      ) : null}
    </Box>
  );
}
