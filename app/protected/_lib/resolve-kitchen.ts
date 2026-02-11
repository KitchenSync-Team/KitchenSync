import { redirect } from "next/navigation";

import { ensureKitchenContext } from "@/lib/domain/kitchen-bootstrap";
import {
  MissingKitchenError,
  loadKitchenData,
} from "@/lib/domain/kitchen";
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
    await ensureKitchenContext(supabase, user);
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
