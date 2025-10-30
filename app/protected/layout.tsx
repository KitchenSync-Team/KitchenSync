import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 via-white to-emerald-50/30 dark:from-background dark:via-background dark:to-background">
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
