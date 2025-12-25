import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-500 text-white hover:bg-primary-600 dark:bg-dark-green-500 dark:hover:bg-dark-green-600",
        secondary:
          "border-transparent bg-secondary-500 text-white hover:bg-secondary-600",
        success:
          "border-transparent bg-success-500 text-white hover:bg-success-600",
        warning:
          "border-transparent bg-warning-500 text-white hover:bg-warning-600 dark:bg-dark-accent-500",
        error:
          "border-transparent bg-error-500 text-white hover:bg-error-600",
        outline:
          "border-neutral-300 dark:border-dark-border text-neutral-700 dark:text-dark-text-primary hover:bg-neutral-100 dark:hover:bg-dark-bg-tertiary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge, badgeVariants };
