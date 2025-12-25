import * as React from "react";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-dark-bg-tertiary",
      className
    )}
    {...props}
  >
    <div
      className="h-full w-full flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 transition-all duration-500"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
));
Progress.displayName = "Progress";

// Spinner component for loading states
const Spinner = React.forwardRef(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    default: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "inline-block animate-spin rounded-full border-solid border-primary-500 border-r-transparent dark:border-dark-green-500 dark:border-r-transparent",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
Spinner.displayName = "Spinner";

export { Progress, Spinner };
