import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-white dark:ring-offset-dark-bg-primary transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-dark-green-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-600 hover:to-secondary-600 shadow-md hover:shadow-lg transform hover:scale-105 dark:from-dark-green-500 dark:to-secondary-600",
        accent: "bg-gradient-to-r from-accent-500 to-accent-400 text-white hover:from-accent-600 hover:to-accent-500 shadow-md hover:shadow-lg transform hover:scale-105 dark:from-dark-accent-500 dark:to-accent-600",
        destructive: "bg-error-500 text-white hover:bg-error-600 shadow-sm hover:shadow-md",
        outline: "border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-bg-secondary hover:bg-neutral-100 dark:hover:bg-dark-bg-tertiary hover:text-neutral-900 dark:hover:text-dark-text-primary text-neutral-700 dark:text-dark-text-primary",
        secondary: "bg-neutral-200 dark:bg-dark-bg-tertiary text-neutral-900 dark:text-dark-text-primary hover:bg-neutral-300 dark:hover:bg-neutral-700",
        ghost: "hover:bg-neutral-100 dark:hover:bg-dark-bg-tertiary hover:text-neutral-900 dark:hover:text-dark-text-primary text-neutral-700 dark:text-dark-text-secondary",
        link: "text-primary-600 dark:text-dark-green-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
