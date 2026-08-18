"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type ConfirmOptions = {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Promise-based confirmation, a drop-in for `window.confirm`:
 *   if (!(await confirm({ title, message }))) return;
 * Renders one shared styled ConfirmDialog and resolves on confirm/cancel.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setState(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setState(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={state !== null}
        title={state?.title ?? ""}
        message={state?.message ?? ""}
        confirmLabel={state?.confirmLabel}
        cancelLabel={state?.cancelLabel}
        tone={state?.tone}
        onClose={() => settle(false)}
        onConfirm={() => settle(true)}
      />
    </ConfirmContext.Provider>
  );
}

/** Returns a `confirm(opts) => Promise<boolean>`. Falls back to window.confirm
 * (message only) if the provider isn't mounted. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx;
  return async (opts) =>
    typeof window !== "undefined"
      ? window.confirm(typeof opts.message === "string" ? opts.message : opts.title)
      : false;
}
