import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { AppShell } from "@/components/app-shell";
import { ThemeRegistry } from "@/components/theme-registry";
import { ToastProvider } from "@/components/toast";
import { getSettings } from "@/lib/settings";
import { M3_DARK, M3_LIGHT } from "@/lib/m3-colors";
import "./globals.css";

// Roboto (Material's type face), self-hosted by next/font and handed to
// the MUI theme via the --font-roboto custom property.
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "YAFA — Yet Another Finance App",
  description: "Personal finance management",
  applicationName: "YAFA",
  appleWebApp: { capable: true, title: "YAFA", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: M3_LIGHT.surface },
    { media: "(prefers-color-scheme: dark)", color: M3_DARK.surface },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();
  const preference = settings.theme;

  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body>
        {/* Sets data-mui-color-scheme before first paint so "system"
            and dark preferences never flash light. */}
        <InitColorSchemeScript defaultMode={preference} />
        <ThemeRegistry preference={preference}>
          <ToastProvider>
            <AppShell preference={preference}>{children}</AppShell>
          </ToastProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
