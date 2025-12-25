import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default:
          "bg-white dark:bg-dark-card border-neutral-200 dark:border-dark-border text-neutral-800 dark:text-dark-text-primary",
        success:
          "border-success-500/50 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 [&>svg]:text-success-600 dark:[&>svg]:text-success-500",
        warning:
          "border-warning-500/50 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 [&>svg]:text-warning-600 dark:[&>svg]:text-warning-500",
        error:
          "border-error-500/50 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 [&>svg]:text-error-600 dark:[&>svg]:text-error-500",
        info:
          "border-primary-500/50 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 [&>svg]:text-primary-600 dark:[&>svg]:text-dark-green-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
