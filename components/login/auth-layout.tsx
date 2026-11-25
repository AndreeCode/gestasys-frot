import { Building2, HeartPulse, Network, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/common/brand-mark";
import { Eyebrow } from "@/components/common/page-heading";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";

const LEVELS = [
  { icon: Network, label: "Red de Salud" },
  { icon: Building2, label: "Microredes" },
  { icon: HeartPulse, label: "Establecimientos" },
];

/** Esquema Red → Microred → EE.SS.: identidad del sistema sin párrafos. */
function Hierarchy() {
  return (
    <ol className="space-y-3">
      {LEVELS.map(({ icon: Icon, label }, i) => (
        <li key={label} className="relative flex items-center gap-3" style={{ marginLeft: `${i * 36}px` }}>
          {i > 0 && (
            <span
              aria-hidden
              className="absolute top-[-12px] left-[-16px] h-8 w-3.5 rounded-bl-md border-b-2 border-l-2 border-primary/35"
            />
          )}
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-sm ring-1 ring-primary/15">
            <Icon className="size-5" />
          </span>
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </li>
      ))}
    </ol>
  );
}

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
  wide,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(320px,26rem)_minmax(0,1fr)]">
      <aside className="hidden flex-col justify-between border-r border-border bg-panel px-10 py-12 lg:flex">
        <div>
          <BrandMark className="size-14 rounded-2xl [&_svg]:size-7" />
          <p className="mt-5 text-2xl font-semibold tracking-tight text-foreground">gestasys</p>
          <p className="text-sm text-muted-foreground">Red de Salud Huamanga</p>
        </div>
        <Hierarchy />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" /> Uso exclusivo del personal autorizado
        </p>
      </aside>

      <section className="relative flex items-center justify-center px-5 py-16 sm:px-10">
        <ThemeToggle compact className="absolute top-4 right-4" />
        <div className={cn("w-full", wide ? "max-w-lg" : "max-w-[25rem]")}>
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <BrandMark className="size-11 [&_svg]:size-6" />
            <div className="leading-tight">
              <span className="block text-lg font-semibold tracking-tight">gestasys</span>
              <span className="block text-xs text-muted-foreground">Red de Salud Huamanga</span>
            </div>
          </div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">{description}</p>
          {children}
          {footer && <div className="mt-8">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
