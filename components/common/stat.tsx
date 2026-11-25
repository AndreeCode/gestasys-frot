import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatsGrid({ children }: { children: ReactNode }) {
  return <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</section>;
}

const TONES = {
  primary: "bg-accent text-accent-foreground",
  info: "bg-info/12 text-info",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/12 text-success",
};

export function Stat({
  label,
  value,
  detail,
  positive,
  warning,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
  warning?: boolean;
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
}) {
  return (
    <article className="rounded-xl bg-card p-5 shadow-xs ring-1 ring-foreground/8">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn("grid size-9 place-items-center rounded-lg", TONES[tone])}>
            <Icon className="size-[18px]" />
          </span>
        )}
      </div>
      <strong className="mt-2 block text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value}</strong>
      <small
        className={cn(
          "mt-1 block min-h-4 text-xs",
          positive ? "font-medium text-success" : warning ? "font-medium text-warning" : "text-muted-foreground",
        )}
      >
        {positive ? "↑ " : warning ? "• " : ""}
        {detail}
      </small>
    </article>
  );
}
