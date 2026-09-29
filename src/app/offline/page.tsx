import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import { LinkButton } from "@/components/next-link";

// Served by the service worker when a navigation fails (no network, or
// the server/VPN is unreachable). Static so it can be precached.
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <Box
      sx={{
        minHeight: "60dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 2,
        px: 3,
      }}
    >
      <CloudOffOutlined sx={{ fontSize: 56, color: "text.secondary" }} />
      <Typography variant="h3" component="h1">
        You&apos;re offline
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420 }}>
        YAFA needs to reach your server for live figures. Check your connection or VPN, then try again.
      </Typography>
      <LinkButton href="/dashboard" variant="tonal" arrow={false}>
        Try again
      </LinkButton>
    </Box>
  );
}
