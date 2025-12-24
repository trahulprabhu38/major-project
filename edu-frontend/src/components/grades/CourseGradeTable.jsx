import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import GradeBadge from './GradeBadge';

/**
 * CourseGradeTable Component
 * Displays detailed course-wise grades for a semester
 */
const CourseGradeTable = ({ courses, showSummary = true }) => {
  if (!courses || courses.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No course data available
        </Typography>
      </Box>
    );
  }

  const totalCredits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
  const earnedCredits = courses.reduce((sum, c) => sum + (c.passed ? (c.credits || 0) : 0), 0);
  const passedCount = courses.filter(c => c.passed).length;
  const failedCount = courses.filter(c => !c.passed).length;

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell><strong>Code</strong></TableCell>
              <TableCell><strong>Course Name</strong></TableCell>
              <TableCell align="center"><strong>Credits</strong></TableCell>
              <TableCell align="center"><strong>CIE</strong></TableCell>
              <TableCell align="center"><strong>SEE</strong></TableCell>
              <TableCell align="center"><strong>Final</strong></TableCell>
              <TableCell align="center"><strong>%</strong></TableCell>
              <TableCell align="center"><strong>Grade</strong></TableCell>
              <TableCell align="center"><strong>GP</strong></TableCell>
              <TableCell align="center"><strong>Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map((course, index) => (
              <TableRow
                key={index}
                sx={{
                  '&:hover': { bgcolor: 'grey.50' },
                  bgcolor: course.passed ? 'inherit' : 'error.50'
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {course.code}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {course.name}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip label={course.credits || 3} size="small" sx={{ fontWeight: 'bold' }} />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {course.cieMarks !== null ? course.cieMarks.toFixed(1) : '--'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {course.seeMarks !== null ? course.seeMarks.toFixed(1) : '--'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="medium">
                    {course.finalMarks !== null ? course.finalMarks.toFixed(1) : '--'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {course.percentage !== null ? `${course.percentage.toFixed(1)}%` : '--'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <GradeBadge grade={course.grade} size="small" />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="bold">
                    {course.gradePoints !== null ? course.gradePoints.toFixed(1) : '--'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {course.passed ? (
                    <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                  ) : (
                    <Cancel sx={{ color: 'error.main', fontSize: 20 }} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      {showSummary && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'space-around' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Courses
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {courses.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Credits
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {earnedCredits}/{totalCredits}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Passed
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {passedCount}
              </Typography>
            </Box>
            {failedCount > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Failed
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="error.main">
                  {failedCount}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CourseGradeTable;
