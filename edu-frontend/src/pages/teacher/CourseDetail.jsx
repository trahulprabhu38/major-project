import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  ArrowBack,
  People,
  BarChart,
  Upload,
  School,
  Dashboard,
  Email,
  Person,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { courseAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';
import { PageLoader } from '../../components/shared/Loading';
import { ErrorState, EmptyState } from '../../components/shared/ErrorState';
import StatsCard from '../../components/shared/StatsCard';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadCourseDetails();
  }, [id]);

  const loadCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseRes, studentsRes] = await Promise.all([
        courseAPI.getById(id),
        courseAPI.getEnrolledStudents(id),
      ]);

      setCourse(courseRes.data.data);
      setStudents(studentsRes.data.data || []);
    } catch (err) {
      console.error('Error loading course details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Loading course details..." />;
  if (error) return <ErrorState onRetry={loadCourseDetails} />;

  return (
    <PageLayout
      title={course?.name || 'Course Details'}
      subtitle={`${course?.code || ''} - ${course?.semester ? `Semester ${course.semester}` : ''}`}
      icon={School}
      breadcrumbs={[
        { label: 'Dashboard', to: '/teacher/dashboard', icon: Dashboard },
        { label: 'Courses', to: '/teacher/courses' },
        { label: course?.code || 'Details' },
      ]}
      actions={
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/teacher/courses')}
          >
            Back
          </Button>
          <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={() => navigate('/teacher/upload')}
            sx={{
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            }}
          >
            Upload Marks
          </Button>
        </Box>
      }
    >
      {/* Course Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Enrolled Students"
            value={students.length}
            icon={People}
            color="primary.main"
            bgColor="primary.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Credits"
            value={course?.credits || 3}
            icon={School}
            color="success.main"
            bgColor="success.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Course Outcomes"
            value={course?.course_outcomes?.length || 0}
            icon={BarChart}
            color="warning.main"
            bgColor="warning.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Academic Year"
            value={course?.year || '--'}
            icon={Dashboard}
            color="secondary.main"
            bgColor="secondary.light"
          />
        </Grid>
      </Grid>

      {/* Course Information Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Course Information
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                    Course Code:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {course?.code}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                    Course Name:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {course?.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                    Semester:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {course?.semester}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                    Academic Year:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {course?.year}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                    Credits:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {course?.credits || 3}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                    Instructor:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {course?.teacher_name || 'You'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            {course?.description && (
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Description:</strong>
                </Typography>
                <Typography variant="body2">{course.description}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs for different sections */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
          }}
        >
          <Tab label="Enrolled Students" icon={<People />} iconPosition="start" />
          <Tab
            label="Course Outcomes"
            icon={<BarChart />}
            iconPosition="start"
            disabled={!course?.course_outcomes?.length}
          />
        </Tabs>

        {/* Students Tab */}
        {activeTab === 0 && (
          <CardContent sx={{ p: 3 }}>
            {students.length === 0 ? (
              <EmptyState
                title="No Students Enrolled"
                message="No students have been enrolled in this course yet."
              />
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell><strong>USN</strong></TableCell>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Department</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Enrolled On</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id} hover>
                        <TableCell>
                          <Chip label={student.usn} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight={600}>
                              {student.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email fontSize="small" color="action" />
                            <Typography variant="body2">{student.email}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{student.department || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={student.status || 'Active'}
                            color="success"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          {student.enrollment_date
                            ? new Date(student.enrollment_date).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        )}

        {/* Course Outcomes Tab */}
        {activeTab === 1 && (
          <CardContent sx={{ p: 3 }}>
            {course?.course_outcomes?.length === 0 ? (
              <EmptyState title="No Course Outcomes" message="Course outcomes have not been defined yet." />
            ) : (
              <Grid container spacing={2}>
                {course?.course_outcomes?.map((co) => (
                  <Grid item xs={12} key={co.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        '&:hover': { bgcolor: 'grey.50' },
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Chip label={`CO${co.co_number}`} color="primary" sx={{ fontWeight: 600 }} />
                        <Typography variant="body2">{co.description}</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        )}
      </Card>
    </PageLayout>
  );
};

export default CourseDetail;
