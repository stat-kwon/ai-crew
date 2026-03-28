import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary-container text-on-secondary-container",
        success: "bg-emerald-50 text-emerald-600",
        warning: "bg-amber-50 text-amber-600",
        error: "bg-rose-50 text-rose-600",
        outline: "border border-outline-variant text-on-surface-variant",
        muted: "bg-slate-100 text-slate-600",
        pending: "bg-slate-100 text-slate-600",
        running: "bg-primary/10 text-primary",
        completed: "bg-emerald-50 text-emerald-600",
        failed: "bg-rose-50 text-rose-600",
      },
      size: {
        default: "px-2.5 py-0.5",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
