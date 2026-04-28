import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { getSettings } from "@/lib/settings";
import { isTheme } from "@/lib/themes";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YAFA — Yet Another Finance App",
  description: "Personal finance management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();
  const theme = isTheme(settings.theme) ? settings.theme : "treasury";
  // The default treasury palette lives on `:root`, so we only need a
  // class for the non-default themes.
  const themeClass = theme === "treasury" ? "" : `theme-${theme}`;

  // Detect dark themes so toaster matches the surface — sonner's
  // `theme` prop drives whether the toast surface is dark or light.
  const isDarkTheme = theme !== "treasury";

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${themeClass} h-full`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="flex-1 min-w-0">
            <div className="mx-auto max-w-7xl px-8 py-8 lg:px-10 lg:py-10">
              {children}
            </div>
          </main>
        </div>
        <Toaster
          theme={isDarkTheme ? "dark" : "light"}
          richColors
          position="top-right"
        />
      </body>
    </html>
  );
}
