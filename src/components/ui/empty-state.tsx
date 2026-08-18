import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
