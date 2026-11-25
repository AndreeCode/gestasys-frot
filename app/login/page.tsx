import type { Metadata } from "next";

import { LoginForm, type LoginReason } from "@/components/login/login-form";

export const metadata: Metadata = { title: "Iniciar sesión | gestasys" };

const REASONS = new Set<LoginReason>(["salida", "expirada"]);

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const motivo = (await searchParams).motivo;
  const reason = typeof motivo === "string" && REASONS.has(motivo as LoginReason) ? (motivo as LoginReason) : null;
  return <LoginForm reason={reason} />;
}
