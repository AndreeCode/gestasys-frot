import type { ReactNode } from "react";

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      {sidebar}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-10 sm:px-6 lg:px-8 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
