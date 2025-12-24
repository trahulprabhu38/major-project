import React from 'react';
import { Chip } from '@mui/material';

/**
 * GradeBadge Component
 * Displays a color-coded badge for letter grades
 */
const GradeBadge = ({ grade, size = 'medium', showPoints = false, gradePoints = null }) => {
  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
        return { bg: '#2e7d32', text: '#fff' }; // Dark Green
      case 'A':
        return { bg: '#43a047', text: '#fff' }; // Green
      case 'B+':
        return { bg: '#7cb342', text: '#fff' }; // Light Green
      case 'B':
        return { bg: '#c0ca33', text: '#000' }; // Lime
      case 'C+':
        return { bg: '#fdd835', text: '#000' }; // Yellow
      case 'C':
        return { bg: '#ffb300', text: '#000' }; // Amber
      case 'D':
        return { bg: '#fb8c00', text: '#fff' }; // Orange
      case 'E':
        return { bg: '#f4511e', text: '#fff' }; // Deep Orange
      case 'F':
        return { bg: '#e53935', text: '#fff' }; // Red
      default:
        return { bg: '#9e9e9e', text: '#fff' }; // Grey
    }
  };

  if (!grade) {
    return (
      <Chip
        label="N/A"
        size={size}
        sx={{
          bgcolor: '#e0e0e0',
          color: '#757575',
          fontWeight: 'bold'
        }}
      />
    );
  }

  const colors = getGradeColor(grade);
  const label = showPoints && gradePoints !== null
    ? `${grade} (${gradePoints})`
    : grade;

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        bgcolor: colors.bg,
        color: colors.text,
        fontWeight: 'bold',
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        minWidth: size === 'small' ? '45px' : '60px'
      }}
    />
  );
};

export default GradeBadge;
