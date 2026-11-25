"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "success" | "danger";
type Toast = { id: number; text: string; tone: Tone };

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (text: string, tone: Tone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list.slice(-3), { id, text, tone }]);
      setTimeout(() => dismiss(id), tone === "danger" ? 7000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-100 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = toast.tone === "danger" ? AlertCircle : CheckCircle2;
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full animate-in items-start gap-3 rounded-xl border bg-popover p-4 text-sm text-popover-foreground shadow-lg fade-in-0 slide-in-from-bottom-2",
                toast.tone === "danger" ? "border-destructive/30" : "border-success/30",
              )}
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", toast.tone === "danger" ? "text-destructive" : "text-success")} />
              <p className="flex-1 leading-snug">{toast.text}</p>
              <button
                className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cerrar aviso"
                onClick={() => dismiss(toast.id)}
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useNotify() {
  return useContext(ToastContext);
}
