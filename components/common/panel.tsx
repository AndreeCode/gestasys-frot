import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  as: Tag = "section",
  className,
  children,
}: {
  as?: "section" | "article";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn("rounded-xl bg-card p-5 text-card-foreground shadow-xs ring-1 ring-foreground/8 sm:p-6", className)}>
      {children}
    </Tag>
  );
}

export function PanelHeading({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function InfoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</dl>;
}

export function InfoItem({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg bg-muted/60 px-3.5 py-2.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words text-foreground">{children}</dd>
    </div>
  );
}
