"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; tone: ToastTone; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE = {
  success: { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  error: { icon: XCircle, cls: "border-red-200 bg-red-50 text-red-800" },
  info: { icon: Info, cls: "border-dental-200 bg-dental-50 text-dental-800" },
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
              {toasts.map((t) => {
                const { icon: Icon, cls } = TONE[t.tone];
                return (
                  <div
                    key={t.id}
                    role="status"
                    className={cn(
                      "pointer-events-auto flex w-full max-w-sm animate-fade-in-up items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg",
                      cls,
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">{t.message}</span>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      aria-label="Dismiss"
                      className="shrink-0 opacity-60 transition hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

/** Fire transient toasts. Safe no-op if the provider isn't mounted. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  return ctx ?? { success: () => {}, error: () => {}, info: () => {} };
}
