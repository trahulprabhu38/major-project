import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * Full Page Loading Spinner
 */
export const PageLoader = ({ message = 'Loading...' }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      gap: 2,
    }}
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <CircularProgress size={60} thickness={4} />
    </motion.div>
    <Typography variant="body1" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

/**
 * Inline Loading Spinner
 */
export const InlineLoader = ({ size = 40, message }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', py: 2 }}>
    <CircularProgress size={size} />
    {message && (
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    )}
  </Box>
);

/**
 * Card Skeleton Loader
 */
export const CardSkeleton = ({ count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <Box
        key={index}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          mb: 2,
        }}
      >
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={120} sx={{ borderRadius: 2 }} />
      </Box>
    ))}
  </>
);

/**
 * Table Skeleton Loader
 */
export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <Box>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            variant="rectangular"
            width={`${100 / cols}%`}
            height={40}
            sx={{ borderRadius: 1 }}
          />
        ))}
      </Box>
    ))}
  </Box>
);

/**
 * Dashboard Stats Skeleton
 */
export const StatsSkeleton = ({ count = 4 }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: `repeat(${count}, 1fr)` }, gap: 3 }}>
    {Array.from({ length: count }).map((_, index) => (
      <Box
        key={index}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Skeleton variant="text" width="50%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="30%" height={40} />
      </Box>
    ))}
  </Box>
);

export default PageLoader;
