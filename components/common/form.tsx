import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("grid content-start gap-1.5", className)}>
      <span className="text-sm font-medium text-foreground">
        {label}
        {hint && <span className="ml-1 text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function FormGrid({ cols = 2, className, children }: { cols?: 1 | 2 | 3; className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormActions({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mt-6 flex flex-wrap items-center justify-end gap-2", className)}>{children}</div>;
}

export function Hint({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>{children}</p>;
}

/** Columna que ocupa todo el ancho de un FormGrid. */
export const full = "sm:col-span-full";
