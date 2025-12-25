import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Consistent Page Layout Component
 * Provides standard page structure with header, breadcrumbs, and content area
 */
const PageLayout = ({
  title,
  subtitle,
  icon: Icon,
  breadcrumbs = [],
  actions,
  children,
  maxWidth = 'xl',
  noPadding = false,
}) => {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
  };

  return (
    <div className={`min-h-screen bg-neutral-100 dark:bg-dark-bg-primary ${noPadding ? '' : 'pt-8 pb-12'}`}>
      <div className={`mx-auto px-4 md:px-6 ${maxWidthClasses[maxWidth] || maxWidthClasses.xl}`}>
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <nav className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-dark-text-muted" />
                  )}
                  {crumb.to ? (
                    <Link
                      to={crumb.to}
                      className="flex items-center gap-1.5 text-neutral-600 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-green-500 transition-colors"
                    >
                      {crumb.icon && <crumb.icon className="w-4 h-4" />}
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1.5 text-neutral-800 dark:text-dark-text-primary font-medium">
                      {crumb.icon && <crumb.icon className="w-4 h-4" />}
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          </motion.div>
        )}

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {Icon && (
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 text-white shadow-lg">
                  <Icon className="w-8 h-8" />
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 bg-clip-text text-transparent">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm md:text-base text-neutral-600 dark:text-dark-text-secondary mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {actions && (
              <div className="flex gap-2 items-center">
                {actions}
              </div>
            )}
          </div>
        </motion.div>

        {/* Page Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default PageLayout;
