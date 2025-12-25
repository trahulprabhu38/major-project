/**
 * Centralized Chart Color Configuration
 *
 * This file defines the color palette for all Recharts visualizations
 * across the application, ensuring consistency with the green theme.
 *
 * Usage:
 * import { CHART_COLORS, CHART_GRADIENTS, getChartColor } from '@/config/chartColors';
 *
 * <Bar dataKey="value" fill={CHART_COLORS.primary} />
 * <Line stroke={getChartColor(index)} />
 */

// Primary chart colors based on the green theme
export const CHART_COLORS = {
  // Main green shades
  primary: '#41644A',      // Dark green - primary UI element
  secondary: '#0D4715',    // Darker green - emphasis
  tertiary: '#5A8566',     // Medium green - for dark mode
  light: '#6FA87D',        // Light green - success states

  // Accent colors
  accent: '#E9762B',       // Orange - accents and highlights
  accentLight: '#F7A855',  // Light orange - for dark mode

  // Status colors
  success: '#41644A',      // Green - success/high performance
  warning: '#E9762B',      // Orange - warning/medium performance
  error: '#DC2626',        // Red - error/low performance
  info: '#5A8566',         // Medium green - info

  // Neutral colors
  neutral: '#8B7B6B',      // Gray-brown - neutral data
  neutralLight: '#D8CBC0', // Light gray-brown - backgrounds

  // Grid and axis colors
  grid: '#E9762B',         // Light gray for grid lines (light mode)
  gridDark: 'rgba(65, 100, 74, 0.15)', // Green-tinted grid (dark mode)
  axis: '#6B7280',         // Gray for axis text
  axisDark: '#9CA3AF',     // Light gray for axis text (dark mode)
};

// Color arrays for multi-series charts
export const CHART_COLOR_PALETTE = [
  CHART_COLORS.primary,     // #41644A
  CHART_COLORS.accent,      // #E9762B
  CHART_COLORS.tertiary,    // #5A8866
  CHART_COLORS.light,       // #6FA87D
  CHART_COLORS.secondary,   // #0D4715
  CHART_COLORS.accentLight, // #F7A855
  CHART_COLORS.info,        // #5A8566
  CHART_COLORS.neutral,     // #8B7B6B
];

// Dark mode color palette
export const CHART_COLOR_PALETTE_DARK = [
  CHART_COLORS.tertiary,    // #5A8566 - lighter green for visibility
  CHART_COLORS.accentLight, // #F7A855 - lighter orange
  CHART_COLORS.light,       // #6FA87D
  CHART_COLORS.primary,     // #41644A
  CHART_COLORS.accent,      // #E9762B
  CHART_COLORS.info,        // #5A8566
  CHART_COLORS.neutral,     // #8B7B6B
];

// Gradient definitions for area charts
export const CHART_GRADIENTS = {
  primary: {
    id: 'primaryGradient',
    colors: [
      { offset: '0%', color: '#41644A', opacity: 0.8 },
      { offset: '100%', color: '#41644A', opacity: 0.1 },
    ],
  },
  secondary: {
    id: 'secondaryGradient',
    colors: [
      { offset: '0%', color: '#0D4715', opacity: 0.8 },
      { offset: '100%', color: '#0D4715', opacity: 0.1 },
    ],
  },
  accent: {
    id: 'accentGradient',
    colors: [
      { offset: '0%', color: '#E9762B', opacity: 0.8 },
      { offset: '100%', color: '#E9762B', opacity: 0.1 },
    ],
  },
  success: {
    id: 'successGradient',
    colors: [
      { offset: '0%', color: '#6FA87D', opacity: 0.8 },
      { offset: '100%', color: '#6FA87D', opacity: 0.1 },
    ],
  },
};

// Performance-based color mapping
export const getPerformanceColor = (percentage) => {
  if (percentage >= 75) return CHART_COLORS.success;
  if (percentage >= 60) return CHART_COLORS.light;
  if (percentage >= 40) return CHART_COLORS.warning;
  return CHART_COLORS.error;
};

// Get color by index (rotates through palette)
export const getChartColor = (index, isDark = false) => {
  const palette = isDark ? CHART_COLOR_PALETTE_DARK : CHART_COLOR_PALETTE;
  return palette[index % palette.length];
};

// Tooltip styles
export const TOOLTIP_STYLES = {
  light: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E9762B',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  dark: {
    backgroundColor: '#2A1F18',
    border: '1px solid rgba(65, 100, 74, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
};

// Legend styles
export const LEGEND_STYLES = {
  light: {
    iconType: 'circle',
    wrapperStyle: {
      paddingTop: '20px',
      fontSize: '14px',
      color: '#374151',
    },
  },
  dark: {
    iconType: 'circle',
    wrapperStyle: {
      paddingTop: '20px',
      fontSize: '14px',
      color: '#EBE1D1',
    },
  },
};

// Common chart configuration
export const CHART_CONFIG = {
  // Margins for responsive charts
  margin: {
    top: 10,
    right: 30,
    left: 0,
    bottom: 0,
  },

  // Animation settings
  animation: {
    animationDuration: 800,
    animationEasing: 'ease-in-out',
  },

  // Grid settings
  grid: {
    light: {
      stroke: CHART_COLORS.grid,
      strokeDasharray: '3 3',
    },
    dark: {
      stroke: CHART_COLORS.gridDark,
      strokeDasharray: '3 3',
    },
  },

  // Axis settings
  axis: {
    light: {
      stroke: CHART_COLORS.axis,
      tick: { fill: CHART_COLORS.axis, fontSize: 12 },
    },
    dark: {
      stroke: CHART_COLORS.axisDark,
      tick: { fill: CHART_COLORS.axisDark, fontSize: 12 },
    },
  },
};

// CO/PO Attainment color mapping
export const getAttainmentColor = (value) => {
  if (value >= 3) return CHART_COLORS.success;      // Excellent: >= 3
  if (value >= 2) return CHART_COLORS.light;        // Good: 2-3
  if (value >= 1.5) return CHART_COLORS.warning;    // Average: 1.5-2
  return CHART_COLORS.error;                         // Poor: < 1.5
};

// Grade distribution colors
export const GRADE_COLORS = {
  'S': CHART_COLORS.success,      // Excellent
  'A': CHART_COLORS.light,        // Very Good
  'B': CHART_COLORS.tertiary,     // Good
  'C': CHART_COLORS.warning,      // Average
  'D': CHART_COLORS.accent,       // Below Average
  'E': CHART_COLORS.error,        // Poor
  'F': CHART_COLORS.error,        // Fail
};

// Bloom's Taxonomy colors
export const BLOOM_COLORS = {
  'Remember': '#10b981',    // Green
  'Understand': '#3b82f6',  // Blue
  'Apply': '#8b5cf6',       // Purple
  'Analyze': '#f59e0b',     // Amber
  'Evaluate': '#f97316',    // Orange
  'Create': '#ef4444',      // Red
};

// Add to CHART_COLORS for easier access
CHART_COLORS.gradeColors = GRADE_COLORS;
CHART_COLORS.bloomColors = BLOOM_COLORS;

export default {
  CHART_COLORS,
  CHART_COLOR_PALETTE,
  CHART_COLOR_PALETTE_DARK,
  CHART_GRADIENTS,
  getPerformanceColor,
  getChartColor,
  getAttainmentColor,
  TOOLTIP_STYLES,
  LEGEND_STYLES,
  CHART_CONFIG,
  GRADE_COLORS,
  BLOOM_COLORS,
};
