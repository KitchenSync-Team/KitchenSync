"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

type SessionContextValue = {
  session: Session | null;
  setSession: (session: Session | null) => void;
};

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

type SupabaseSessionProviderProps = {
  children: ReactNode;
  session: Session | null;
};

export function SupabaseSessionProvider({
  children,
  session,
}: SupabaseSessionProviderProps) {
  const [currentSession, setCurrentSession] = useState<Session | null>(
    session,
  );

  useEffect(() => {
    setCurrentSession(session);
  }, [session?.access_token, session]);

  const value = useMemo(
    () => ({
      session: currentSession,
      setSession: setCurrentSession,
    }),
    [currentSession],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSupabaseSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error(
      "useSupabaseSession must be used within a SupabaseSessionProvider",
    );
  }

  return context;
}
