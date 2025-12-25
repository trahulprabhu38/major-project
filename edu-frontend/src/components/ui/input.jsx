import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium transition-all duration-300",
        "border-neutral-300 bg-white ring-offset-white placeholder:text-neutral-400 text-neutral-800",
        "dark:border-dark-border dark:bg-dark-bg-secondary dark:text-dark-text-primary dark:placeholder:text-dark-text-muted dark:ring-offset-dark-bg-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-dark-green-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
