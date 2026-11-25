import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold tracking-[0.14em] text-primary uppercase", className)}>{children}</p>;
}

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: ReactNode;
  title: string;
  subtitle: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </section>
  );
}
