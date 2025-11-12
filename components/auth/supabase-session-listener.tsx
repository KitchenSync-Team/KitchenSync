"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useSupabaseSession } from "./supabase-session-provider";

type SupabaseSessionListenerProps = {
  accessToken?: string;
};

const EVENTS_TRIGGERING_REFRESH = new Set([
  "SIGNED_IN",
  "SIGNED_OUT",
  "USER_UPDATED",
  "PASSWORD_RECOVERY",
]);

export function SupabaseSessionListener({
  accessToken,
}: SupabaseSessionListenerProps) {
  const router = useRouter();
  const { setSession } = useSupabaseSession();

  useEffect(() => {
    const { data: authListener } = createClient().auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (event && EVENTS_TRIGGERING_REFRESH.has(event)) {
          router.refresh();
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [accessToken, router, setSession]);

  return null;
}
