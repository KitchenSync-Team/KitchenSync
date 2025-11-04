import { redirect } from "next/navigation";

import {
  MissingKitchenError,
  loadKitchenData,
} from "@/lib/kitchen";
import { createClient } from "@/lib/supabase/server";

export async function resolveKitchen() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  try {
    const kitchenSnapshot = await loadKitchenData(supabase, user.id);

    if (!kitchenSnapshot.user.onboardingComplete) {
      redirect("/protected/onboarding");
    }

    return kitchenSnapshot;
  } catch (err) {
    if (err instanceof MissingKitchenError) {
      redirect("/protected/onboarding");
    }
    throw err;
  }
}
