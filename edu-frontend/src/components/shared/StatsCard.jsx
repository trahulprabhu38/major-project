import { Card, CardContent, Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * Reusable Statistics Card Component
 */
const StatsCard = ({
  title,
  value,
  icon: Icon,
  color = 'primary.main',
  bgColor = 'primary.light',
  subtitle,
  trend,
  onClick,
}) => {
  const MotionCard = motion(Card);

  return (
    <MotionCard
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 3,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        position: 'relative',
        transition: 'box-shadow 0.3s ease',
        '&:hover': {
          boxShadow: onClick ? '0 8px 24px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.08)',
        },
      }}
    >
      {/* Background Gradient */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '40%',
          height: '100%',
          background: `linear-gradient(135deg, ${bgColor}20 0%, ${bgColor}05 100%)`,
          opacity: 0.3,
        }}
      />

      <CardContent sx={{ position: 'relative', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: `${bgColor}20`,
              }}
            >
              <Icon sx={{ fontSize: 28, color }} />
            </Box>
          )}
        </Box>

        <Typography
          variant="h3"
          fontWeight="bold"
          sx={{
            color: 'text.primary',
            mb: trend ? 1 : 0,
          }}
        >
          {value}
        </Typography>

        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: trend.isPositive ? 'success.main' : 'error.main',
                fontWeight: 600,
              }}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {trend.label}
            </Typography>
          </Box>
        )}
      </CardContent>
    </MotionCard>
  );
};

export default StatsCard;
