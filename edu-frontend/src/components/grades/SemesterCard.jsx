import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { CheckCircle, Cancel, Schedule, ArrowForward } from '@mui/icons-material';
import GradeBadge from './GradeBadge';

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
          icon: <CheckCircle sx={{ fontSize: 16 }} />,
          color: '#43a047',
          bgColor: '#43a04715',
          borderColor: '#43a047',
          label: 'Completed'
        };
      case 'detained':
        return {
          icon: <Cancel sx={{ fontSize: 16 }} />,
          color: '#e53935',
          bgColor: '#e5393515',
          borderColor: '#e53935',
          label: 'Detained'
        };
      case 'in_progress':
        return {
          icon: <Schedule sx={{ fontSize: 16 }} />,
          color: '#fb8c00',
          bgColor: '#fb8c0015',
          borderColor: '#fb8c00',
          label: 'In Progress'
        };
      default: // not_started
        return {
          icon: null,
          color: '#9e9e9e',
          bgColor: '#f5f5f5',
          borderColor: '#e0e0e0',
          label: 'Not Started'
        };
    }
  };

  const config = getStatusConfig(status);
  const sgpaValue = sgpa !== null ? parseFloat(sgpa).toFixed(2) : '--';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
      <Card
        onClick={onClick}
        sx={{
          width: 140,
          height: 160,
          cursor: onClick ? 'pointer' : 'default',
          bgcolor: config.bgColor,
          border: `2px solid ${isActive ? config.color : config.borderColor}`,
          borderRadius: 2,
          transition: 'all 0.3s',
          '&:hover': onClick ? {
            transform: 'translateY(-4px)',
            boxShadow: 6,
            borderColor: config.color
          } : {}
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Semester Number */}
          <Typography
            variant="h6"
            fontWeight="bold"
            color={config.color}
            gutterBottom
          >
            Semester {semester}
          </Typography>

          {/* Year */}
          {year && (
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              {year}
            </Typography>
          )}

          {/* SGPA */}
          <Box sx={{ my: 2, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight="bold" color={config.color}>
              {sgpaValue}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              SGPA
            </Typography>
          </Box>

          {/* Credits */}
          <Typography variant="caption" color="text.secondary" display="block">
            Credits: {creditsEarned || 0}/{credits || 0}
          </Typography>

          {/* Status Chip */}
          <Chip
            size="small"
            icon={config.icon}
            label={config.label}
            sx={{
              mt: 1,
              fontSize: '0.65rem',
              height: 22,
              bgcolor: config.color,
              color: '#fff',
              '& .MuiChip-icon': {
                color: '#fff'
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Arrow connector (shown for all except last semester) */}
      {semester < 8 && (
        <ArrowForward
          sx={{
            mx: 1,
            color: config.color,
            fontSize: 28
          }}
        />
      )}
    </Box>
  );
};

export default SemesterCard;
