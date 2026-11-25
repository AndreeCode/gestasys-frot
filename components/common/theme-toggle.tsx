"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme !== "system") root.classList.add(theme);
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(EVENT));
}

const EVENT = "gestasys-theme";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function current(): Theme {
  const root = document.documentElement;
  return root.classList.contains("dark") ? "dark" : root.classList.contains("light") ? "light" : "system";
}

/** Selector de tema: guarda la preferencia en una cookie que el layout lee en el servidor (sin parpadeo). */
export function ThemeToggle({ className, compact }: { className?: string; compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, current, () => "system" as Theme);

  return (
    <div
      role="radiogroup"
      aria-label="Tema de color"
      className={cn("inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-xs", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          title={`Tema ${label.toLowerCase()}`}
          onClick={() => apply(value)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
            theme === value ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" />
          {!compact && label}
        </button>
      ))}
    </div>
  );
}
