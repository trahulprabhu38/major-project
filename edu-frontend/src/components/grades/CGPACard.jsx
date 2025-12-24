import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

/**
 * CGPACard Component
 * Displays CGPA with visual indicators
 */
const CGPACard = ({
  cgpa,
  label = 'CGPA',
  maxCGPA = 10,
  trend = null, // 'up', 'down', 'flat'
  showProgress = true,
  size = 'medium'
}) => {
  const cgpaValue = parseFloat(cgpa) || 0;
  const percentage = (cgpaValue / maxCGPA) * 100;

  const getCGPAColor = (cgpa) => {
    if (cgpa >= 9.0) return '#2e7d32'; // Dark Green
    if (cgpa >= 8.0) return '#43a047'; // Green
    if (cgpa >= 7.0) return '#7cb342'; // Light Green
    if (cgpa >= 6.0) return '#fdd835'; // Yellow
    if (cgpa >= 5.0) return '#ffb300'; // Amber
    if (cgpa >= 4.0) return '#fb8c00'; // Orange
    return '#e53935'; // Red
  };

  const cgpaColor = getCGPAColor(cgpaValue);

  const getTrendIcon = () => {
    if (!trend) return null;

    const iconProps = { sx: { ml: 1, fontSize: size === 'small' ? 18 : 24 } };

    switch (trend) {
      case 'up':
        return <TrendingUp {...iconProps} sx={{ ...iconProps.sx, color: '#43a047' }} />;
      case 'down':
        return <TrendingDown {...iconProps} sx={{ ...iconProps.sx, color: '#e53935' }} />;
      case 'flat':
        return <TrendingFlat {...iconProps} sx={{ ...iconProps.sx, color: '#9e9e9e' }} />;
      default:
        return null;
    }
  };

  const cardHeight = size === 'small' ? 120 : size === 'large' ? 200 : 150;
  const fontSize = size === 'small' ? '2rem' : size === 'large' ? '3.5rem' : '3rem';

  return (
    <Card
      elevation={3}
      sx={{
        height: cardHeight,
        background: `linear-gradient(135deg, ${cgpaColor}15 0%, ${cgpaColor}05 100%)`,
        border: `2px solid ${cgpaColor}`,
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.02)'
        }
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Typography variant="overline" color="text.secondary" fontWeight="bold">
          {label}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
          <Typography
            variant="h2"
            fontWeight="bold"
            sx={{
              fontSize: fontSize,
              color: cgpaColor,
              lineHeight: 1
            }}
          >
            {cgpaValue.toFixed(2)}
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{
              ml: 0.5,
              alignSelf: 'flex-end',
              mb: size === 'small' ? 0.5 : 1
            }}
          >
            /{maxCGPA}
          </Typography>
          {getTrendIcon()}
        </Box>

        {showProgress && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: `${cgpaColor}20`,
                '& .MuiLinearProgress-bar': {
                  bgcolor: cgpaColor,
                  borderRadius: 4
                }
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CGPACard;
