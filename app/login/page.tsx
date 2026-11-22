import type { Metadata } from "next";

import { LoginForm } from "@/components/login/login-form";

export const metadata: Metadata = { title: "Iniciar sesión | gestasys" };

export default function LoginPage() {
  return <LoginForm />;
}
