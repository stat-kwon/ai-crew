import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-md shadow-primary/20 hover:opacity-90",
        secondary:
          "bg-secondary-container text-on-secondary-container hover:opacity-90",
        outline:
          "border-2 border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-low",
        ghost:
          "bg-transparent text-on-surface hover:bg-surface-container-low",
        destructive:
          "bg-error text-white shadow-md shadow-error/20 hover:opacity-90",
        success:
          "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:opacity-90",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
