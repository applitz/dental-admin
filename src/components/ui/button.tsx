import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-600 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // `default` and legacy `primary` are the same brand-blue button.
        default: "bg-dental-600 text-white hover:bg-dental-700",
        primary: "bg-dental-600 text-white hover:bg-dental-700",
        // `secondary` (legacy) and `outline` are the bordered white button.
        secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        ghost: "text-slate-600 hover:bg-slate-100",
        subtle: "bg-dental-50 text-dental-700 hover:bg-dental-100",
        destructive:
          "border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
