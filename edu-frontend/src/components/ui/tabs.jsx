import * as React from 'react';
import { cn } from '../../lib/utils';

const TabsContext = React.createContext();

export function Tabs({ value, onValueChange, className, children, ...props }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'inline-flex h-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-dark-bg-secondary p-1 border-2 border-neutral-200 dark:border-dark-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className, children, ...props }) {
  const context = React.useContext(TabsContext);
  const isActive = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 text-white shadow-md'
          : 'text-neutral-600 dark:text-dark-text-secondary hover:bg-neutral-200 dark:hover:bg-dark-bg-tertiary',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children, ...props }) {
  const context = React.useContext(TabsContext);

  if (context.value !== value) return null;

  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}
