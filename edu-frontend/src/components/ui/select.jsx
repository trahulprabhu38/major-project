import * as React from "react";
import { cn } from "@/lib/utils";

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-all duration-300",
        "border-neutral-300 bg-white text-neutral-800 ring-offset-white",
        "dark:border-dark-border dark:bg-dark-bg-secondary dark:text-dark-text-primary dark:ring-offset-dark-bg-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-dark-green-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&>option]:bg-white [&>option]:text-neutral-800 dark:[&>option]:bg-dark-bg-secondary dark:[&>option]:text-dark-text-primary",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

export { Select };
