import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

/**
 * SemesterCard Component
 * Displays semester summary in timeline flowchart
 */
const SemesterCard = ({
  semester,
  sgpa,
  status, // 'completed', 'in_progress', 'not_started', 'detained'
  credits,
  creditsEarned,
  year,
  onClick,
  isActive = false
}) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-success-600 dark:text-success-500',
          bgColor: 'bg-success-50 dark:bg-success-900/20',
          borderColor: 'border-success-500',
          badgeVariant: 'success',
          label: 'Completed'
        };
      case 'detained':
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-error-600 dark:text-error-500',
          bgColor: 'bg-error-50 dark:bg-error-900/20',
          borderColor: 'border-error-500',
          badgeVariant: 'error',
          label: 'Detained'
        };
      case 'in_progress':
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-warning-600 dark:text-warning-500',
          bgColor: 'bg-warning-50 dark:bg-warning-900/20',
          borderColor: 'border-warning-500',
          badgeVariant: 'warning',
          label: 'In Progress'
        };
      default: // not_started
        return {
          icon: null,
          color: 'text-neutral-500 dark:text-dark-text-muted',
          bgColor: 'bg-neutral-50 dark:bg-dark-bg-tertiary',
          borderColor: 'border-neutral-300 dark:border-dark-border',
          badgeVariant: 'outline',
          label: 'Not Started'
        };
    }
  };

  const config = getStatusConfig(status);
  const sgpaValue = sgpa !== null && sgpa !== undefined ? parseFloat(sgpa).toFixed(2) : '--';

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.05, y: -4 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card
        onClick={onClick}
        className={`
          w-full h-[180px]
          ${config.bgColor}
          border-2 ${isActive ? config.borderColor : 'border-neutral-200 dark:border-dark-border'}
          ${onClick ? 'cursor-pointer hover:shadow-xl' : 'cursor-default'}
          transition-all duration-300
          ${isActive ? 'shadow-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-dark-bg-primary' : ''}
        `}
        style={{
          ringColor: isActive ? config.borderColor : 'transparent'
        }}
      >
        <CardContent className="p-4 h-full flex flex-col">
          {/* Semester Number */}
          <h3 className={`text-lg font-bold ${config.color} mb-1`}>
            Semester {semester}
          </h3>

          {/* Year */}
          {year && (
            <p className="text-xs text-neutral-500 dark:text-dark-text-muted mb-3">
              {year}
            </p>
          )}

          {/* SGPA */}
          <div className="flex-1 flex flex-col items-center justify-center my-2">
            <div className={`text-4xl font-bold ${config.color}`}>
              {sgpaValue}
            </div>
            <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
              SGPA / 10.0
            </p>
          </div>

          {/* Credits */}
          <p className="text-xs text-neutral-600 dark:text-dark-text-secondary mb-2">
            Credits: <span className="font-semibold">{creditsEarned || 0}</span>/{credits || 0}
          </p>

          {/* Status Badge */}
          <Badge variant={config.badgeVariant} className="w-full justify-center gap-1">
            {config.icon}
            <span className="text-[0.7rem]">{config.label}</span>
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SemesterCard;
