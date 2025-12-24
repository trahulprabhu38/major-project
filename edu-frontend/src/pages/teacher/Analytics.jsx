import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  School,
  People,
  Assessment,
  Upload,
  Visibility,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { courseAPI, marksheetAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';
import { PageLoader } from '../../components/shared/Loading';
import StatsCard from '../../components/shared/StatsCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const COLORS = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#dc2626', '#ca8a04'];

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courseData, setCourseData] = useState(null);
  const [students, setStudents] = useState([]);
  const [marksheets, setMarksheets] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [coPoMapping, setCOPOMapping] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData(selectedCourse);
      loadCOPOMapping(selectedCourse);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getAll();
      const courseList = response.data.data || [];
      setCourses(courseList);

      if (courseList.length > 0) {
        setSelectedCourse(courseList[0].id);
      } else {
        toast.info('No courses found. Please create a course first.');
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error(error.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseData = async (courseId) => {
    try {
      setLoadingData(true);

      // Use the SAME endpoints as CourseDetail page
      const [courseRes, studentsRes, marksheetsRes] = await Promise.all([
        courseAPI.getById(courseId),
        courseAPI.getEnrolledStudents(courseId),
        marksheetAPI.getByCourse(courseId).catch(() => ({ data: { data: [] } })),
      ]);

      setCourseData(courseRes.data.data);
      setStudents(studentsRes.data.data || []);
      setMarksheets(marksheetsRes.data.data || []);

      if ((marksheetsRes.data.data || []).length === 0) {
        toast.info('No marksheets uploaded yet. Upload CIE data to see analytics.');
      }
    } catch (error) {
      console.error('Error loading course data:', error);
      toast.error(error.response?.data?.message || 'Failed to load course data');
    } finally {
      setLoadingData(false);
    }
  };

  const loadCOPOMapping = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/attainment/course/${courseId}/co-po-mapping`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCOPOMapping(response.data.data);
    } catch (error) {
      console.error('Error loading CO-PO mapping:', error);
      // Don't show error toast as mapping might not exist yet
    }
  };

  if (loading) return <PageLoader message="Loading analytics..." />;

  const selectedCourseInfo = courses.find(c => c.id === selectedCourse);

  // Calculate analytics from marksheet data
  const totalCOs = courseData?.course_outcomes?.length || 0;
  const totalStudents = students.length;
  const totalAssessments = marksheets.length;

  // Prepare chart data from marksheets
  const assessmentData = marksheets.map((marksheet, idx) => ({
    name: marksheet.assessment_name || `Assessment ${idx + 1}`,
    students: (marksheet.row_count || 1) - 1,
    columns: marksheet.columns?.length || 0,
    uploadDate: new Date(marksheet.created_at).toLocaleDateString(),
  }));

  return (
    <PageLayout
      title="Course Analytics"
      subtitle="Comprehensive performance analytics and attainment tracking"
      icon={TrendingUp}
      breadcrumbs={[
        { label: 'Dashboard', to: '/teacher/dashboard' },
        { label: 'Analytics' },
      ]}
      actions={
        <FormControl size="small" sx={{ minWidth: 300 }}>
          <InputLabel>Select Course</InputLabel>
          <Select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            label="Select Course"
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {course.code} - {course.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      }
    >
      {courses.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            No Courses Found
          </Typography>
          <Typography variant="body2">
            You don't have any courses yet. Please create a course first to view analytics.
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate('/teacher/courses')}
          >
            Go to Courses
          </Button>
        </Alert>
      ) : !selectedCourse ? (
        <Alert severity="info">Please select a course to view analytics</Alert>
      ) : loadingData ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Box>
          {/* Course Info Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card sx={{ mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', color: 'white' }}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <School sx={{ fontSize: 36 }} />
                    </Box>
                  </Grid>
                  <Grid item xs>
                    <Typography variant="h4" fontWeight="bold">
                      {selectedCourseInfo?.code}
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, mt: 0.5 }}>
                      {selectedCourseInfo?.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Chip
                        label={`Semester ${selectedCourseInfo?.semester}`}
                        sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'primary.main', fontWeight: 600 }}
                      />
                      <Chip
                        label={`${selectedCourseInfo?.credits || 3} Credits`}
                        sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'primary.main', fontWeight: 600 }}
                      />
                      <Chip
                        label={selectedCourseInfo?.year || 'N/A'}
                        sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'primary.main', fontWeight: 600 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<Upload />}
                      onClick={() => navigate('/teacher/upload')}
                      sx={{
                        bgcolor: 'white',
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.9)',
                        },
                      }}
                    >
                      Upload Marks
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Course Outcomes"
                value={totalCOs}
                icon={Assessment}
                color="primary.main"
                bgColor="primary.light"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Enrolled Students"
                value={totalStudents}
                icon={People}
                color="success.main"
                bgColor="success.light"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Assessments Uploaded"
                value={totalAssessments}
                icon={Upload}
                color="warning.main"
                bgColor="warning.light"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Academic Year"
                value={selectedCourseInfo?.year || '--'}
                icon={School}
                color="secondary.main"
                bgColor="secondary.light"
              />
            </Grid>
          </Grid>

          {marksheets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card sx={{ borderRadius: 3, p: 6, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Upload sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  No Assessment Data Available
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
                  Upload CIE (Continuous Internal Evaluation) marksheets to view comprehensive analytics,
                  attainment calculations, and performance insights for this course.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Upload />}
                    onClick={() => navigate('/teacher/upload')}
                    sx={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      px: 4,
                      py: 1.5,
                    }}
                  >
                    Upload Marks
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate(`/teacher/courses/${selectedCourse}`)}
                  >
                    View Course Details
                  </Button>
                </Box>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Assessment Overview Chart */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} lg={8}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card sx={{ borderRadius: 3, p: 3, height: '100%' }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Assessment Overview
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Students and columns per assessment
                      </Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={assessmentData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="students" fill="#2563eb" name="Students" />
                          <Bar dataKey="columns" fill="#7c3aed" name="Columns" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </motion.div>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card sx={{ borderRadius: 3, p: 3, height: '100%' }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Quick Actions
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Manage your course data
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<Upload />}
                          onClick={() => navigate('/teacher/upload')}
                          sx={{ py: 1.5 }}
                        >
                          Upload New Assessment
                        </Button>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<Visibility />}
                          onClick={() => navigate(`/teacher/courses/${selectedCourse}`)}
                          sx={{ py: 1.5 }}
                        >
                          View Course Details
                        </Button>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<School />}
                          onClick={() => navigate('/teacher/courses')}
                          sx={{ py: 1.5 }}
                        >
                          All Courses
                        </Button>
                      </Box>
                    </Card>
                  </motion.div>
                </Grid>
              </Grid>


              {/* Uploaded Marksheets Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Card sx={{ borderRadius: 3, p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Uploaded Assessments ({marksheets.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        CIE and assessment marksheets
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<Upload />}
                      onClick={() => navigate('/teacher/upload')}
                      sx={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      }}
                    >
                      Upload More
                    </Button>
                  </Box>

                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell><strong>Assessment Name</strong></TableCell>
                          <TableCell><strong>File Name</strong></TableCell>
                          <TableCell align="center"><strong>Students</strong></TableCell>
                          <TableCell align="center"><strong>Columns</strong></TableCell>
                          <TableCell><strong>Uploaded On</strong></TableCell>
                          <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {marksheets.map((marksheet) => (
                          <TableRow key={marksheet.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {marksheet.assessment_name || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {marksheet.file_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={(marksheet.row_count || 1) - 1}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={marksheet.columns?.length || 0}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(marksheet.created_at || marksheet.uploadDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Visibility />}
                                onClick={() => navigate(`/teacher/courses/${selectedCourse}`)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </motion.div>

              {/* CO-PO Mapping Heatmap */}
              {coPoMapping && coPoMapping.cos.length > 0 && coPoMapping.pos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  style={{ marginTop: '24px' }}
                >
                  <Card sx={{ borderRadius: 3, p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      CO-PO Mapping Heatmap
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Correlation levels: <strong style={{color: '#10b981'}}>High (3)</strong>, <strong style={{color: '#f59e0b'}}>Medium (2)</strong>, <strong style={{color: '#3b82f6'}}>Low (1)</strong>, <strong style={{color: '#e5e7eb'}}>None (0)</strong>
                    </Typography>

                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 600, overflow: 'auto' }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100', minWidth: 100, position: 'sticky', left: 0, zIndex: 3 }}>
                              CO / PO
                            </TableCell>
                            {coPoMapping.pos.map(po => (
                              <TableCell
                                key={po.po_number}
                                align="center"
                                sx={{
                                  fontWeight: 'bold',
                                  bgcolor: 'grey.100',
                                  minWidth: 60,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                PO{po.po_number}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {coPoMapping.cos.map(co => (
                            <TableRow key={co.co_number} hover>
                              <TableCell
                                sx={{
                                  fontWeight: 'bold',
                                  bgcolor: 'background.paper',
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 1,
                                  borderRight: '1px solid',
                                  borderColor: 'divider'
                                }}
                              >
                                CO{co.co_number}
                              </TableCell>
                              {coPoMapping.pos.map(po => {

                                console.log(coPoMapping)
                                console.log(coPoMapping.mappingMatrix[co.co_number]?.[po.po_number])

                                const level = coPoMapping.mappingMatrix[co.co_number]?.[po.po_number] || 0;
                                const getColor = (level) => {
                                  if (level === 3) return '#10b981';
                                  if (level === 2) return '#f59e0b';
                                  if (level === 1) return '#3b82f6';
                                  return '#e5e7eb';
                                };
                                const getLabel = (level) => {
                                  if (level === 3) return 'H';
                                  if (level === 2) return 'M';
                                  if (level === 1) return 'L';
                                  return '-';
                                };
                                return (
                                  <TableCell
                                    key={po.po_number}
                                    align="center"
                                    sx={{
                                      bgcolor: level > 0 ? `${getColor(level)}15` : 'transparent',
                                      borderRight: '1px solid',
                                      borderColor: 'divider',
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        bgcolor: level > 0 ? `${getColor(level)}30` : 'grey.100',
                                        transform: 'scale(1.1)',
                                      }
                                    }}
                                  >
                                    <Chip
                                      label={getLabel(level)}
                                      size="small"
                                      sx={{
                                        bgcolor: getColor(level),
                                        color: level > 0 ? 'white' : 'text.secondary',
                                        fontWeight: 'bold',
                                        minWidth: 36,
                                        height: 28,
                                        fontSize: '0.85rem',
                                      }}
                                    />
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* CO Descriptions */}
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Course Outcomes
                      </Typography>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        {coPoMapping.cos.map(co => (
                          <Grid item xs={12} md={6} key={co.co_number}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'start' }}>
                              <Chip label={`CO${co.co_number}`} size="small" color="primary" sx={{ mt: 0.5 }} />
                              <Typography variant="body2" color="text.secondary">
                                {co.description}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>

                    {/* PO Descriptions */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Program Outcomes
                      </Typography>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        {coPoMapping.pos.map(po => (
                          <Grid item xs={12} md={6} key={po.po_number}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'start' }}>
                              <Chip label={`PO${po.po_number}`} size="small" color="secondary" sx={{ mt: 0.5 }} />
                              <Typography variant="body2" color="text.secondary">
                                {po.description}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </Box>
      )}
    </PageLayout>
  );
};

export default Analytics;
