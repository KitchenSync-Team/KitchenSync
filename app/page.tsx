import Link from "next/link";

import { AuthButton } from "@/components/auth/auth-button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Leaf, Refrigerator, UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

const highlights = [
  {
    title: "Know what you have",
    description:
      "Instantly scan receipts or add items manually to keep your pantry inventory accurate across every location.",
    icon: Refrigerator,
  },
  {
    title: "Stop wasting food",
    description:
      "KitchenSync alerts you before ingredients expire so you can plan meals and save money.",
    icon: Leaf,
  },
  {
    title: "Cook smarter together",
    description:
      "Share a kitchen and track preferences so recipe suggestions reflect everyone’s needs.",
    icon: UtensilsCrossed,
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-lime-50 via-white to-emerald-100/40 dark:from-background dark:via-background dark:to-background">
      <div className="absolute inset-x-0 top-[-8rem] z-0 mx-auto h-[28rem] w-[28rem] rounded-full bg-lime-300/30 blur-3xl dark:bg-emerald-900/40" />

      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="rounded-md bg-emerald-600 px-2 py-1 text-xs uppercase text-emerald-50">
            KS
          </span>
          KitchenSync
        </Link>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <AuthButton />
        </div>
      </nav>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 pb-16 pt-12 md:flex-row md:items-center md:gap-20">
        <div className="flex-1 space-y-8">
          <Badge variant="secondary" className="uppercase tracking-widest">Reduce Food Waste</Badge>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Welcome to KitchenSync
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Track every ingredient, skip the spoiled food, and keep your whole kitchen on the same page. Log in to get started—or create an account to spin up your first shared pantry in minutes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/auth/login">Login to KitchenSync</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/sign-up">Create a free account</Link>
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <div className="grid gap-6 md:grid-cols-1">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-emerald-900/10 bg-white/60 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md dark:border-emerald-100/10 dark:bg-emerald-950/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-800/60 dark:text-emerald-200">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-medium">{item.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-emerald-900/10 bg-white/60 py-6 backdrop-blur dark:border-emerald-100/10 dark:bg-emerald-950/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} KitchenSync. Built for kitchens that care about reducing waste.</p>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="hover:underline">
              Log in
            </Link>
            <Link href="/auth/sign-up" className="hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
