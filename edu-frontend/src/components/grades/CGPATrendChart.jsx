import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';

/**
 * CGPATrendChart Component
 * Displays CGPA and SGPA trend across semesters using Recharts
 */
const CGPATrendChart = ({ cgpaHistory, height = 300 }) => {
  if (!cgpaHistory || cgpaHistory.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No CGPA history available
        </Typography>
      </Paper>
    );
  }

  // Transform data for Recharts
  const chartData = cgpaHistory.map(item => ({
    semester: `Sem ${item.semester}`,
    SGPA: parseFloat(item.sgpa) || 0,
    CGPA: parseFloat(item.cgpa) || 0,
    year: item.academicYear
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, border: '1px solid #e0e0e0' }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            {payload[0].payload.semester}
          </Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="caption" display="block" sx={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}
            </Typography>
          ))}
          {payload[0].payload.year && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              Year: {payload[0].payload.year}
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold">
        CGPA Progression
      </Typography>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCGPA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2196f3" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2196f3" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSGPA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

          <XAxis
            dataKey="semester"
            tick={{ fontSize: 12 }}
            stroke="#666"
          />

          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: 'GPA', angle: -90, position: 'insideLeft' }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />

          {/* CGPA Area */}
          <Area
            type="monotone"
            dataKey="CGPA"
            stroke="#2196f3"
            strokeWidth={0}
            fill="url(#colorCGPA)"
          />

          {/* SGPA Line */}
          <Line
            type="monotone"
            dataKey="SGPA"
            stroke="#4caf50"
            strokeWidth={2}
            dot={{ r: 4, fill: '#4caf50' }}
            activeDot={{ r: 6 }}
          />

          {/* CGPA Line */}
          <Line
            type="monotone"
            dataKey="CGPA"
            stroke="#2196f3"
            strokeWidth={3}
            dot={{ r: 5, fill: '#2196f3' }}
            activeDot={{ r: 7 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend Info */}
      <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 3, bgcolor: '#4caf50', borderRadius: 1 }} />
          <Typography variant="caption">SGPA (Semester GPA)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 3, bgcolor: '#2196f3', borderRadius: 1 }} />
          <Typography variant="caption">CGPA (Cumulative GPA)</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default CGPATrendChart;
