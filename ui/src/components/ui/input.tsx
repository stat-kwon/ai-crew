import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all duration-200",
          "placeholder:text-slate-400",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
