"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  titleAside?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

/**
 * Portal-based modal — the single dialog primitive for the admin panel.
 * Renders into <body> so the fixed overlay is anchored to the viewport, closes
 * on Escape / backdrop click, and locks body scroll while open.
 */
export function Modal({
  open,
  title,
  description,
  titleAside,
  footer,
  onClose,
  children,
  className,
}: Props) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative my-auto w-full max-w-lg animate-fade-in-up rounded-2xl border border-slate-200 bg-white shadow-2xl",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                {titleAside}
              </div>
              {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" aria-hidden />
            </Button>
          </div>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
