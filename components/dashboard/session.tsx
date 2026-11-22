"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Profile } from "@/lib/api/types";

type SessionValue = { profile: Profile; can: (code: string) => boolean; reloadProfile: () => void };

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  profile,
  reloadProfile,
  children,
}: {
  profile: Profile;
  reloadProfile: () => void;
  children: ReactNode;
}) {
  const can = (code: string) => profile.permissions.includes(code);
  return <SessionContext.Provider value={{ profile, can, reloadProfile }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession debe usarse dentro de SessionProvider");
  return value;
}
