import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Autocomplete
} from '@mui/material';
import {
  Search,
  Download,
  ExpandMore,
  Person,
  School,
  TrendingUp
} from '@mui/icons-material';
import {
  CGPACard,
  SemesterCard,
  CourseGradeTable,
  CGPATrendChart
} from '../../components/grades';

/**
 * StudentProgression Component
 * Displays comprehensive 8-semester progression timeline for students
 * Shows CGPA, semester-wise breakdown, and course details
 */
const StudentProgression = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [progressionData, setProgressionData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/students/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setStudents(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadStudentProgression = async (studentId) => {
    setLoading(true);
    setError(null);
    setProgressionData(null);
    setSelectedSemester(null);

    try {
      const response = await fetch(`http://localhost:8080/api/progression/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setProgressionData(result.data);
      } else {
        setError(result.message || 'Failed to load progression data');
      }
    } catch (err) {
      setError('Failed to load progression data: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (event, value) => {
    setSelectedStudent(value);
    if (value) {
      loadStudentProgression(value.id);
    } else {
      setProgressionData(null);
      setSelectedSemester(null);
    }
  };

  const handleSemesterClick = (semester) => {
    setSelectedSemester(selectedSemester === semester ? null : semester);
  };

  const handleExport = () => {
    if (!progressionData) return;

    const jsonData = JSON.stringify(progressionData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progression_${progressionData.student.usn}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.usn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Student Progression Tracker
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View comprehensive 8-semester academic progression with CGPA tracking
        </Typography>
      </Box>

      {/* Student Search */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Autocomplete
              options={filteredStudents}
              getOptionLabel={(option) => `${option.usn} - ${option.name}`}
              value={selectedStudent}
              onChange={handleStudentSelect}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Student by USN or Name"
                  placeholder="Type to search..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <Search sx={{ mr: 1, color: 'text.secondary' }} />
                        {params.InputProps.startAdornment}
                      </>
                    )
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Download />}
              onClick={handleExport}
              disabled={!progressionData}
            >
              Export Data
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Progression Data */}
      {progressionData && !loading && (
        <>
          {/* Student Info Card */}
          <Paper elevation={2} sx={{ p: 3, mb: 4, bgcolor: 'primary.50' }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person sx={{ color: 'primary.main', fontSize: 40 }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {progressionData.student.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {progressionData.student.usn}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <School sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Department
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {progressionData.student.department}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Current Semester
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    Semester {progressionData.currentSemester}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Credits
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {progressionData.totalCredits}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* CGPA Overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <CGPACard
                cgpa={progressionData.cgpa}
                label="Overall CGPA"
                size="large"
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <CGPATrendChart
                cgpaHistory={progressionData.cgpaHistory}
                height={200}
              />
            </Grid>
          </Grid>

          {/* Semester Timeline (Horizontal Flowchart) */}
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
              8-Semester Progression Timeline
            </Typography>

            {/* Desktop View - Horizontal Scroll */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                overflowX: 'auto',
                pb: 2,
                '&::-webkit-scrollbar': {
                  height: 8
                },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: 'grey.400',
                  borderRadius: 4
                }
              }}
            >
              {progressionData.semesters.map((sem) => (
                <SemesterCard
                  key={sem.semester}
                  semester={sem.semester}
                  sgpa={sem.sgpa}
                  status={sem.status}
                  credits={sem.credits}
                  creditsEarned={sem.creditsEarned}
                  year={sem.year}
                  onClick={() => handleSemesterClick(sem.semester)}
                  isActive={selectedSemester === sem.semester}
                />
              ))}
            </Box>

            {/* Mobile View - Grid */}
            <Grid container spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
              {progressionData.semesters.map((sem) => (
                <Grid item xs={6} sm={4} key={sem.semester}>
                  <SemesterCard
                    semester={sem.semester}
                    sgpa={sem.sgpa}
                    status={sem.status}
                    credits={sem.credits}
                    creditsEarned={sem.creditsEarned}
                    year={sem.year}
                    onClick={() => handleSemesterClick(sem.semester)}
                    isActive={selectedSemester === sem.semester}
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Performance Summary */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Semesters Completed
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    {progressionData.semestersCompleted}/8
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Courses Completed
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {progressionData.totalCoursesCompleted}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Courses Failed
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {progressionData.totalCoursesFailed}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Pass Percentage
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {progressionData.totalCoursesCompleted > 0
                      ? Math.round((progressionData.totalCoursesCompleted / (progressionData.totalCoursesCompleted + progressionData.totalCoursesFailed)) * 100)
                      : 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Semester Details (Expandable) */}
          {selectedSemester && (
            <>
              <Collapse in={selectedSemester !== null}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight="bold">
                      Semester {selectedSemester} - Course Details
                    </Typography>
                    <IconButton onClick={() => setSelectedSemester(null)}>
                      <ExpandMore />
                    </IconButton>
                  </Box>

                  <Divider sx={{ mb: 3 }} />

                  {(() => {
                    const semester = progressionData.semesters.find(s => s.semester === selectedSemester);
                    if (!semester || semester.courses.length === 0) {
                      return (
                        <Alert severity="info">
                          No course data available for this semester
                        </Alert>
                      );
                    }

                    return (
                      <>
                        <Box sx={{ mb: 3 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography variant="caption" color="text.secondary">
                                Academic Year
                              </Typography>
                              <Typography variant="h6" fontWeight="bold">
                                {semester.year || 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography variant="caption" color="text.secondary">
                                SGPA
                              </Typography>
                              <Typography variant="h6" fontWeight="bold" color="primary.main">
                                {semester.sgpa ? semester.sgpa.toFixed(2) : '--'} / 10
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography variant="caption" color="text.secondary">
                                Courses
                              </Typography>
                              <Typography variant="h6" fontWeight="bold">
                                {semester.coursesPassed}/{semester.coursesRegistered}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography variant="caption" color="text.secondary">
                                Credits Earned
                              </Typography>
                              <Typography variant="h6" fontWeight="bold" color="success.main">
                                {semester.creditsEarned}/{semester.credits}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>

                        <CourseGradeTable courses={semester.courses} showSummary={true} />
                      </>
                    );
                  })()}
                </Paper>
              </Collapse>
            </>
          )}
        </>
      )}

      {/* Empty State */}
      {!selectedStudent && !loading && (
        <Paper elevation={1} sx={{ p: 8, textAlign: 'center' }}>
          <Search sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Select a student to view their progression
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the search box above to find a student by USN or name
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default StudentProgression;
