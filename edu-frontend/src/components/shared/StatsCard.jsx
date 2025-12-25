import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/card';

/**
 * Reusable Statistics Card Component
 */
const StatsCard = ({
  title,
  value,
  icon: Icon,
  color = 'primary',
  subtitle,
  trend,
  onClick,
}) => {
  // Map color names to Tailwind classes
  const colorClasses = {
    primary: {
      icon: 'text-primary-600 dark:text-dark-green-500',
      bg: 'bg-primary-100 dark:bg-primary-900/30',
      gradient: 'from-primary-100/20 to-primary-100/5',
    },
    success: {
      icon: 'text-success-600 dark:text-success-500',
      bg: 'bg-success-100 dark:bg-success-900/30',
      gradient: 'from-success-100/20 to-success-100/5',
    },
    secondary: {
      icon: 'text-secondary-600 dark:text-secondary-500',
      bg: 'bg-secondary-100 dark:bg-secondary-900/30',
      gradient: 'from-secondary-100/20 to-secondary-100/5',
    },
    warning: {
      icon: 'text-warning-600 dark:text-warning-500',
      bg: 'bg-warning-100 dark:bg-warning-900/30',
      gradient: 'from-warning-100/20 to-warning-100/5',
    },
  };

  const colors = colorClasses[color] || colorClasses.primary;

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : ''}
    >
      <Card className="shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden relative">
        {/* Background Gradient */}
        <div className={`absolute top-0 right-0 w-2/5 h-full bg-gradient-to-br ${colors.gradient} opacity-30`} />

        <CardContent className="p-6 relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-dark-text-secondary">
                {title}
              </p>
              {subtitle && (
                <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {Icon && (
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${colors.bg}`}>
                <Icon className={`w-7 h-7 ${colors.icon}`} />
              </div>
            )}
          </div>

          <h3 className={`text-3xl font-bold text-neutral-800 dark:text-dark-text-primary ${trend ? 'mb-2' : ''}`}>
            {value}
          </h3>

          {trend && (
            <div className="flex items-center gap-1">
              <span className={`text-xs font-semibold ${trend.isPositive ? 'text-success-600 dark:text-success-500' : 'text-error-600 dark:text-error-500'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-xs text-neutral-500 dark:text-dark-text-muted">
                {trend.label}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
