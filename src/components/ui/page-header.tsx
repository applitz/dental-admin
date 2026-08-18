import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  onBack,
  backLabel,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** When provided, renders a back link above the title. */
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </button>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
