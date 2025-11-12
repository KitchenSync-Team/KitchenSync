import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SupabaseSessionProvider } from "@/components/auth/supabase-session-provider";
import { SupabaseSessionListener } from "@/components/auth/supabase-session-listener";
import { ActiveThemeProvider } from "@/components/theme/active-theme";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "KitchenSync",
  description:
    "KitchenSync keeps every kitchen in sync—from pantry inventory to expiring ingredients and grocery receipts.",
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

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
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
          <SupabaseSessionListener accessToken={session?.access_token ?? undefined} />
        </SupabaseSessionProvider>
      </body>
    </html>
  );
}
