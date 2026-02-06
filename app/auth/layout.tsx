import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-lime-50 via-white to-emerald-100/40 dark:from-background dark:via-background dark:to-background">
      <div className="grid min-h-screen place-items-stretch md:grid-cols-[1fr_480px]">
        <div className="relative hidden flex-col justify-between overflow-hidden p-10 text-emerald-950 dark:text-emerald-50 md:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(132,204,22,0.25),_transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.25),_transparent)]" />
          <div className="relative z-10 flex flex-col gap-8">
            <Link href="/" className="inline-flex w-fit items-center gap-3 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm backdrop-blur dark:bg-emerald-900/40 dark:text-emerald-100">
              <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs uppercase text-white">
                KS
              </span>
              KitchenSync
            </Link>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight">
                Your kitchen, perfectly in sync.
              </h1>
              <p className="max-w-sm text-base text-emerald-900/80 dark:text-emerald-100/80">
                Manage your pantry, stay ahead of expirations, and coordinate shopping trips with everyone under your roof.
              </p>
            </div>
          </div>
          <div className="relative z-10 space-y-2 text-sm text-emerald-900/70 dark:text-emerald-100/70">
            <p>Invite your kitchen crew when you’re ready—KitchenSync scales from roommates to families.</p>
            <p>Need help? Visit the docs or reach out to the KitchenSync team.</p>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-12">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
