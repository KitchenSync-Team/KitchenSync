import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthButton } from "@/components/auth/auth-button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight } from "lucide-react";

import laptopPlanning from "@/app/assets/home/high-def-hand-using-laptop-in-kitchen-ingredients-in-background.jpg";
import heroCouple from "@/app/assets/home/high-def-man-and-woman-looking-at-phone-in-kitchen-while-cooking.jpeg";
import tabletCooking from "@/app/assets/home/high-def-man-looking-at-ipad-while-cooking.jpg";
import phoneIngredients from "@/app/assets/home/high-def-phone-in-the-middle-of-ingredients-on-table.jpg";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/protected");
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-100/35 dark:from-background dark:via-background dark:to-background">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[8%] top-[1%] h-[20rem] w-[20rem] rounded-full bg-emerald-200/22 blur-3xl dark:bg-emerald-900/28 sm:h-[24rem] sm:w-[24rem]" />
        <div className="absolute bottom-[2%] right-[6%] h-[22rem] w-[22rem] rounded-full bg-emerald-300/14 blur-3xl dark:bg-emerald-900/22 sm:h-[26rem] sm:w-[26rem]" />
      </div>

      <nav className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="inline-flex items-center text-3xl font-semibold tracking-tight">
          <span>Kitchen</span>
          <span className="text-emerald-600 dark:text-emerald-400">
            Sync
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <AuthButton />
        </div>
      </nav>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-10 pt-3 md:pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-900/10 shadow-sm dark:border-emerald-100/10">
          <div className="relative aspect-[4/5] w-full sm:aspect-[16/11] md:aspect-[16/10] 2xl:aspect-[16/9]">
            <Image
              src={heroCouple}
              alt="Two people coordinating cooking plans together on a phone in the kitchen."
              fill
              className="object-cover object-[34%_30%] md:object-[52%_34%]"
              sizes="(max-width: 1280px) 100vw, 1152px"
              quality={95}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 md:p-10">
              <Badge
                variant="secondary"
                className="pointer-events-none mb-4 border border-white/70 bg-white/90 font-medium text-emerald-900 transition-none hover:bg-white/90 hover:text-emerald-900"
              >
                Shared Kitchen Intelligence
              </Badge>
              <h1 className="max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Kitchen<span className="text-emerald-300">Sync</span> keeps your pantry, meals, and people in sync.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50 sm:text-base lg:text-lg">
                Track what you have, see what is expiring, and make better cooking decisions together.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/auth/sign-up">
                    Create account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/40 bg-white/15 text-white hover:bg-white/20 hover:text-white"
                >
                  <Link href="/auth/login">Log in</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-10">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:text-emerald-300">
            What KitchenSync does
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            A shared operating system for the modern kitchen.
          </h2>
          <div className="mt-5 space-y-2 text-base leading-relaxed text-foreground/80 dark:text-muted-foreground">
            <p>Shared pantry inventory your whole household can trust.</p>
            <p>Expiration visibility before good food goes to waste.</p>
            <p>Smarter meal decisions with everyone working from the same information.</p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="space-y-12">
          <div className="grid items-center gap-6 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-900/10 dark:border-emerald-100/10">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={laptopPlanning}
                    alt="Using a laptop in the kitchen while ingredients are laid out for prep."
                    fill
                    className="object-cover object-[58%_45%]"
                    sizes="(max-width: 768px) 100vw, 672px"
                    quality={95}
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-5">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:text-emerald-300">
                Multi-platform planning
              </p>
              <p className="mt-3 text-lg leading-relaxed text-foreground/90">
                Start on desktop while planning the week, then continue from your phone in the kitchen.
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid items-center gap-6 md:grid-cols-12">
            <div className="order-2 md:order-1 md:col-span-5">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:text-emerald-300">
                Ease of use
              </p>
              <p className="mt-3 text-lg leading-relaxed text-foreground/90">
                Keep ingredients and decisions centered in one place so anyone can jump in without friction.
              </p>
            </div>
            <div className="order-1 md:order-2 md:col-span-7">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-900/10 dark:border-emerald-100/10">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={phoneIngredients}
                    alt="Phone at the center of ingredient prep on a wooden table."
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 100vw, 672px"
                    quality={95}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid items-center gap-6 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-900/10 dark:border-emerald-100/10">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={tabletCooking}
                    alt="Cook following steps on a tablet while preparing vegetables."
                    fill
                    className="object-cover object-[54%_42%]"
                    sizes="(max-width: 768px) 100vw, 672px"
                    quality={95}
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-5">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:text-emerald-300">
                Action in the moment
              </p>
              <p className="mt-3 text-lg leading-relaxed text-foreground/90">
                Follow along while cooking and keep inventory updates simple enough to actually maintain.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-12">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-emerald-900/10 bg-white/70 p-6 md:flex-row md:items-center md:p-8 dark:border-emerald-100/10 dark:bg-background/70">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:text-emerald-300">
                Get started
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">Bring your kitchen into sync in minutes.</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/auth/sign-up">Sign up</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/login">Log in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 shrink-0 border-t border-emerald-900/10 bg-white py-6 dark:border-emerald-100/10 dark:bg-background/80">
        <div className="mx-auto w-full max-w-6xl px-6 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} KitchenSync. Built for kitchens that care about reducing waste.</p>
        </div>
      </footer>
    </main>
  );
}
