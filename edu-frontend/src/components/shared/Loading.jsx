import { motion } from 'framer-motion';
import { Spinner } from '../ui/progress';

/**
 * Full Page Loading Spinner
 */
export const PageLoader = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Spinner size="lg" />
    </motion.div>
    <p className="text-neutral-600 dark:text-dark-text-secondary">
      {message}
    </p>
  </div>
);

/**
 * Inline Loading Spinner
 */
export const InlineLoader = ({ size = 'default', message }) => (
  <div className="flex items-center gap-4 justify-center py-4">
    <Spinner size={size} />
    {message && (
      <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
        {message}
      </p>
    )}
  </div>
);

/**
 * Card Skeleton Loader
 */
export const CardSkeleton = ({ count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="p-6 border border-neutral-200 dark:border-dark-border rounded-2xl mb-4 animate-pulse"
      >
        <div className="h-8 bg-neutral-200 dark:bg-dark-bg-tertiary rounded w-3/5 mb-2" />
        <div className="h-6 bg-neutral-200 dark:bg-dark-bg-tertiary rounded w-2/5 mb-4" />
        <div className="h-30 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-lg" />
      </div>
    ))}
  </>
);

/**
 * Table Skeleton Loader
 */
export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 mb-4">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div
            key={colIndex}
            className="h-10 bg-neutral-200 dark:bg-dark-bg-tertiary rounded animate-pulse"
            style={{ width: `${100 / cols}%` }}
          />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Dashboard Stats Skeleton
 */
export const StatsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="p-6 border border-neutral-200 dark:border-dark-border rounded-2xl animate-pulse"
      >
        <div className="h-6 bg-neutral-200 dark:bg-dark-bg-tertiary rounded w-1/2 mb-2" />
        <div className="h-10 bg-neutral-200 dark:bg-dark-bg-tertiary rounded w-1/3" />
      </div>
    ))}
  </div>
);

export default PageLoader;
