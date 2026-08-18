import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  wrapperClassName?: string;
  size?: "sm" | "md" | "lg";
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, children, disabled, size = "md", ...props }, ref) => (
    <div className={cn("relative w-full", disabled && "opacity-90", wrapperClassName)}>
      <select
        ref={ref}
        disabled={disabled}
        className={cn(
          "w-full appearance-none rounded-lg border border-slate-300 bg-white pr-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
          size === "sm" ? "h-8 pl-2.5 text-xs" : size === "lg" ? "h-11 pl-3 text-sm" : "h-10 pl-3 text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
      </span>
    </div>
  ),
);
Select.displayName = "Select";
