import { redirect } from "next/navigation";

import {
  MissingKitchenError,
  fetchDashboardData,
} from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";

export async function resolveDashboardData() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  try {
    return await fetchDashboardData(supabase, user.id);
  } catch (err) {
    if (err instanceof MissingKitchenError) {
      redirect("/protected/onboarding");
    }
    throw err;
  }
}
