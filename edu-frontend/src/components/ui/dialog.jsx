import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Dialog({ open, onOpenChange, children }) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

export function DialogContent({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'relative z-50 w-full max-w-lg bg-white dark:bg-dark-bg-secondary rounded-2xl shadow-2xl p-6 animate-in fade-in-0 zoom-in-95',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, children, ...props }) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children, ...props }) {
  return (
    <h2
      className={cn(
        'text-xl font-bold text-neutral-800 dark:text-dark-text-primary',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({ className, children, ...props }) {
  return (
    <p
      className={cn('text-sm text-neutral-600 dark:text-dark-text-secondary', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function DialogFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('flex items-center justify-end gap-3 mt-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogClose({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'absolute right-4 top-4 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-dark-bg-tertiary transition-colors',
        className
      )}
      {...props}
    >
      {children || <X className="w-5 h-5" />}
    </button>
  );
}
