import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface Props {
  title: string;
  description?: string;
  /** A large Material icon, e.g. <ReceiptLongOutlined fontSize="inherit" />. */
  icon?: ReactNode;
  /** Usually the same "New …" trigger shown in the page header. */
  action?: ReactNode;
}

/** Placeholder for lists with no rows yet. */
export function EmptyState({ title, description, icon, action }: Props) {
  return (
    <Box
      sx={{
        py: 8,
        px: 3,
        textAlign: "center",
        borderRadius: 4,
        bgcolor: "m3.surfaceContainerLow",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      {icon ? (
        <Box sx={{ fontSize: 48, color: "text.secondary", display: "flex" }}>{icon}</Box>
      ) : null}
      <Typography variant="h5" component="h2">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 1 }}>{action}</Box> : null}
    </Box>
  );
}
