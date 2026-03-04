import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-gradient-to-b from-background via-background to-emerald-100/20 dark:to-emerald-950/20">
      <div className="pointer-events-none absolute left-[-12rem] top-[-10rem] h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/20" />
      <div className="pointer-events-none absolute bottom-[-12rem] right-[-10rem] h-96 w-96 rounded-full bg-lime-200/30 blur-3xl dark:bg-emerald-400/10" />

      <div className="absolute inset-x-0 top-0 z-20 px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-3xl font-semibold tracking-tight text-foreground"
          >
            <span>
              Kitchen<span className="text-emerald-600 dark:text-emerald-400">Sync</span>
            </span>
          </Link>
          <ThemeSwitcher />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-24 sm:px-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </main>
  );
}
