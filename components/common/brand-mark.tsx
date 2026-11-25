import { HeartPulse } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <HeartPulse className="size-5" strokeWidth={2.2} />
    </span>
  );
}

export function Brand({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <div className="leading-tight">
        <span className={cn("block text-lg font-semibold tracking-tight", inverted ? "text-sidebar-accent-foreground" : "text-foreground")}>
          gestasys
        </span>
        <span className={cn("block text-[11px]", inverted ? "text-sidebar-foreground/60" : "text-muted-foreground")}>
          Seguimiento materno
        </span>
      </div>
    </div>
  );
}
