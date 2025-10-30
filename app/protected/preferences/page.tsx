import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <section className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Account preferences</h1>
        <p className="text-sm text-muted-foreground">
          Personalization controls will live here. For now, jump back to the dashboard to keep
          working in KitchenSync.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            We&apos;re building rich controls for household defaults, notification settings, and
            dietary preferences. Check back in the next release.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          In the meantime, you can update your basic profile details through the onboarding flow or
          by contacting your KitchenSync administrator.
        </CardContent>
      </Card>
    </section>
  );
}
