import { Box, Typography, Button, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import {
  ErrorOutline,
  SentimentDissatisfied,
  CloudOff,
  FolderOpen,
} from '@mui/icons-material';

/**
 * Generic Error Display Component
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  icon: Icon = ErrorOutline,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        textAlign: 'center',
        px: 3,
      }}
    >
      <Icon
        sx={{
          fontSize: 80,
          color: 'error.main',
          mb: 2,
          opacity: 0.8,
        }}
      />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
        {message}
      </Typography>
      {onRetry && (
        <Button
          variant="contained"
          color="primary"
          onClick={onRetry}
          sx={{ borderRadius: 2, px: 4, py: 1.5 }}
        >
          Try Again
        </Button>
      )}
    </Box>
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
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        textAlign: 'center',
        px: 3,
        py: 6,
        bgcolor: 'background.default',
        border: '2px dashed',
        borderColor: 'divider',
        borderRadius: 3,
      }}
    >
      <Icon
        sx={{
          fontSize: 80,
          color: 'text.secondary',
          mb: 2,
          opacity: 0.5,
        }}
      />
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        {message}
      </Typography>
      {action && actionLabel && (
        <Button
          variant="contained"
          color="primary"
          onClick={action}
          sx={{ borderRadius: 2, px: 4 }}
        >
          {actionLabel}
        </Button>
      )}
    </Paper>
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
    icon={SentimentDissatisfied}
  />
);

export default ErrorState;
