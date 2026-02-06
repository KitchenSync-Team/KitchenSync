import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { SupabaseSessionProvider } from "@/components/auth/supabase-session-provider";
import { SupabaseSessionListener } from "@/components/auth/supabase-session-listener";
import { ActiveThemeProvider } from "@/components/theme/active-theme";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "KitchenSync",
  description:
    "KitchenSync keeps every kitchen in sync—from pantry inventory to expiring ingredients and shared receipts.",
  openGraph: {
    title: "KitchenSync",
    description:
      "Stay ahead of food waste with real-time pantry tracking, reminders, and collaboration.",
    url: defaultUrl,
    siteName: "KitchenSync",
  },
  twitter: {
    card: "summary_large_image",
    title: "KitchenSync",
    description:
      "Reduce food waste with KitchenSync's shared pantry manager and smart reminders.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <SupabaseSessionProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ActiveThemeProvider>{children}</ActiveThemeProvider>
            <Toaster richColors position="top-center" />
          </ThemeProvider>
          <SupabaseSessionListener />
        </SupabaseSessionProvider>
      </body>
    </html>
  );
}
