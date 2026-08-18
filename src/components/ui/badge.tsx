import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        info: "bg-dental-50 text-dental-700",
        success: "bg-emerald-50 text-emerald-700",
        warn: "bg-amber-50 text-amber-700",
        danger: "bg-red-50 text-red-700",
        muted: "bg-slate-100 text-slate-600",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Small colored status dot + label (for health/status rows). */
export function StatusDot({
  tone = "muted",
  children,
  className,
}: {
  tone?: "success" | "warn" | "danger" | "muted";
  children?: React.ReactNode;
  className?: string;
}) {
  const dot = {
    success: "bg-emerald-500",
    warn: "bg-amber-500",
    danger: "bg-red-500",
    muted: "bg-slate-300",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-slate-700", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} aria-hidden />
      {children}
    </span>
  );
}
