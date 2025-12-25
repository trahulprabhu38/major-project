import { motion } from 'framer-motion';
import {
  AlertCircle,
  Frown,
  CloudOff,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Generic Error Display Component
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  icon: Icon = AlertCircle,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
      <Icon className="w-20 h-20 text-error-600 dark:text-error-500 mb-4 opacity-80" />
      <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
        {title}
      </h2>
      <p className="text-neutral-600 dark:text-dark-text-secondary mb-6 max-w-lg">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} size="lg">
          Try Again
        </Button>
      )}
    </div>
  </motion.div>
);

/**
 * Empty State Component
 */
export const EmptyState = ({
  title = 'No data available',
  message = "We couldn't find any data to display.",
  icon: Icon = FolderOpen,
  action,
  actionLabel,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6 py-12 bg-neutral-50 dark:bg-dark-bg-secondary border-2 border-dashed border-neutral-300 dark:border-dark-border rounded-2xl">
      <Icon className="w-20 h-20 text-neutral-400 dark:text-dark-text-muted mb-4 opacity-50" />
      <h3 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
        {title}
      </h3>
      <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-6 max-w-md">
        {message}
      </p>
      {action && actionLabel && (
        <Button onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  </motion.div>
);

/**
 * Network Error Component
 */
export const NetworkError = ({ onRetry }) => (
  <ErrorState
    title="Connection Error"
    message="Unable to connect to the server. Please check your internet connection and try again."
    onRetry={onRetry}
    icon={CloudOff}
  />
);

/**
 * Not Found Component
 */
export const NotFound = ({ message = 'The page you are looking for does not exist.' }) => (
  <ErrorState
    title="404 - Not Found"
    message={message}
    icon={Frown}
  />
);

export default ErrorState;
