import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  School,
  TrendingUp,
  AssignmentTurnedIn,
  EmojiEvents,
  PersonAdd,
  ArrowForward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';
import { PageLoader } from '../../components/shared/Loading';
import { ErrorState, EmptyState } from '../../components/shared/ErrorState';
import StatsCard from '../../components/shared/StatsCard';

const MotionCard = motion.create(Card);
const MotionBox = motion.create(Box);

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const [coursePerformance, setCoursePerformance] = useState({});

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await studentAPI.getCourses();
      const coursesData = response.data.data || [];
      setCourses(coursesData);

      // Load performance data for each course
      const performanceData = {};
      for (const course of coursesData) {
        try {
          const [marksRes, analyticsRes] = await Promise.all([
            studentAPI.getMarks(course.id).catch(() => ({ data: { data: [] } })),
            studentAPI.getAnalytics(course.id).catch(() => ({ data: { data: {} } })),
          ]);

          const marks = marksRes.data.data || [];
          const totalMarks = marks.reduce((sum, m) => sum + m.totalMarks, 0);
          const totalMaxMarks = marks.reduce((sum, m) => sum + m.maxMarks, 0);
          const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

          performanceData[course.id] = {
            percentage: overallPercentage,
            totalMarks,
            totalMaxMarks,
            assessmentCount: marks.length,
            rank: analyticsRes.data.data?.rank,
            totalStudents: analyticsRes.data.data?.totalStudents,
          };
        } catch (err) {
          console.error(`Error loading performance for course ${course.id}:`, err);
        }
      }
      setCoursePerformance(performanceData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Loading your dashboard..." />;
  if (error) return <ErrorState onRetry={loadDashboardData} />;

  // Calculate dashboard stats
  const totalCourses = courses.length;
  const currentSemesterCourses = courses.filter(
    (c) => c.semester === Math.max(...courses.map((course) => course.semester))
  );
  
  const avgPerformance = courses.length > 0
    ? courses.reduce((sum, c) => sum + (coursePerformance[c.id]?.percentage || 0), 0) / courses.length
    : 0;
  
  const coursesWithMarks = courses.filter(c => coursePerformance[c.id]?.assessmentCount > 0).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, pl: { md: 2 } }}>
      {/* Hero Welcome Card */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{ mb: 4 }}
      >
        <Card
          sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            color: 'white',
            borderRadius: 4,
            p: { xs: 3, md: 4 },
            boxShadow: '0 8px 32px rgba(37, 99, 235, 0.2)',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <School sx={{ fontSize: 48, opacity: 0.9 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Welcome, {user?.name?.split(' ')[0]}! 
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.95 }}>
                  {totalCourses > 0
                    ? "Track your learning outcomes and course progress."
                    : 'Get started by enrolling in your courses below.'}
                </Typography>
              </Box>
            </Box>

            {user?.department && (
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={`Department: ${user.department}`}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
                {user?.usn && (
                  <Chip
                    label={`USN: ${user.usn}`}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </MotionBox>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <StatsCard
              title="Total Courses"
              value={totalCourses}
              icon={School}
              color="primary.main"
              bgColor="primary.light"
            />
          </motion.div>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <StatsCard
              title="Current Semester"
              value={currentSemesterCourses.length}
              icon={AssignmentTurnedIn}
              color="success.main"
              bgColor="success.light"
              subtitle="Active courses"
            />
          </motion.div>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <StatsCard
              title="Avg Performance"
              value={`${avgPerformance.toFixed(1)}%`}
              icon={TrendingUp}
              color="secondary.main"
              bgColor="secondary.light"
              subtitle="Overall grade"
            />
          </motion.div>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <StatsCard
              title="Class Rank"
              value="--"
              icon={EmojiEvents}
              color="warning.main"
              bgColor="warning.light"
              subtitle="Out of total"
            />
          </motion.div>
        </Grid>
      </Grid>

      {/* Enrolled Courses or Empty State */}
      {courses.length === 0 ? (
        <MotionBox
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              textAlign: 'center',
              py: 6,
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            }}
          >
            <CardContent>
              <PersonAdd
                sx={{
                  fontSize: 80,
                  color: 'primary.main',
                  mb: 2,
                  opacity: 0.8,
                }}
              />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                No Courses Enrolled Yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
                Start your learning journey by enrolling in courses. Select a course from the sidebar to get started.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/student/enroll')}
                sx={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                Enroll in Course
              </Button>
            </CardContent>
          </Card>
        </MotionBox>
      ) : (
        <>
          {/* Courses Section Header */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Your Courses
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click on any course to view detailed analytics
              </Typography>
            </Box>
          </Box>

          {/* Courses Grid */}
          <Grid container spacing={3}>
            {courses.map((course, index) => (
              <Grid item xs={12} md={6} lg={4} key={course.id}>
                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  onClick={() => navigate(`/student/courses/${course.id}`)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 3,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  {/* Header with Gradient */}
                  <Box
                    sx={{
                      background: `linear-gradient(135deg, ${
                        index % 3 === 0 ? '#2563eb' : index % 3 === 1 ? '#7c3aed' : '#059669'
                      } 0%, ${
                        index % 3 === 0 ? '#1e40af' : index % 3 === 1 ? '#6d28d9' : '#047857'
                      } 100%)`,
                      p: 3,
                      color: 'white',
                      position: 'relative',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {course.code}
                      </Typography>
                      <Chip
                        label={`Sem ${course.semester}`}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.25)',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ opacity: 0.95 }}>
                      {course.name}
                    </Typography>
                  </Box>

                  <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {coursePerformance[course.id] && (
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Performance
                            </Typography>
                            <Chip
                              label={`${coursePerformance[course.id].percentage.toFixed(1)}%`}
                              size="small"
                              color={
                                coursePerformance[course.id].percentage >= 60
                                  ? 'success'
                                  : coursePerformance[course.id].percentage >= 40
                                  ? 'warning'
                                  : 'error'
                              }
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={coursePerformance[course.id].percentage}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor:
                                  coursePerformance[course.id].percentage >= 60
                                    ? 'success.main'
                                    : coursePerformance[course.id].percentage >= 40
                                    ? 'warning.main'
                                    : 'error.main',
                              },
                            }}
                          />
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Credits
                        </Typography>
                        <Chip label={course.credits || 3} size="small" variant="outlined" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Instructor
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {course.teacher_name || 'N/A'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Assessments
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {coursePerformance[course.id]?.assessmentCount || 0}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        color: 'primary.main',
                      }}
                    >
                      <TrendingUp fontSize="small" />
                      <Typography variant="body2" fontWeight={600}>
                        View Performance Analytics
                      </Typography>
                      <ArrowForward fontSize="small" />
                    </Box>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default StudentDashboard;
