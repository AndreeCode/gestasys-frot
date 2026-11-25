import type { ReactNode } from "react";

import type { PregnancyStatus, RiskLevel } from "@/lib/api/types";
import { RISK_LABELS, STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const TONE = {
  neutral: "bg-muted text-muted-foreground ring-foreground/10",
  primary: "bg-accent text-accent-foreground ring-primary/20",
  success: "bg-success/10 text-success ring-success/25",
  warning: "bg-warning/12 text-warning ring-warning/30",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  info: "bg-info/10 text-info ring-info/25",
} as const;

export type Tone = keyof typeof TONE;

export function Pill({
  tone = "neutral",
  dot,
  title,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const RISK_TONE: Record<RiskLevel, Tone> = { low: "success", medium: "warning", high: "danger" };
const STATUS_TONE: Record<PregnancyStatus, Tone> = { pending: "warning", in_followup: "primary", completed: "success" };

export function RiskBadge({ level, prefix }: { level: RiskLevel; prefix?: boolean }) {
  return (
    <Pill tone={RISK_TONE[level]}>
      {prefix ? `Riesgo ${RISK_LABELS[level].toLowerCase()}` : RISK_LABELS[level]}
    </Pill>
  );
}

export function StatusBadge({ status }: { status: PregnancyStatus }) {
  return (
    <Pill tone={STATUS_TONE[status]} dot>
      {STATUS_LABELS[status]}
    </Pill>
  );
}

export function StatusDot({ tone }: { tone: "ok" | "warn" | "bad" }) {
  const color = tone === "ok" ? "bg-success" : tone === "warn" ? "bg-warning" : "bg-destructive";
  return (
    <span className={cn("relative mt-1.5 size-2 shrink-0 rounded-full", color)}>
      {tone === "bad" && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-50", color)} />}
    </span>
  );
}
