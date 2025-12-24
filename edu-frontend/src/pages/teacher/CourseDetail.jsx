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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  TablePagination,
  CircularProgress,
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
  Assignment,
  Delete,
  Visibility,
  AutoAwesome,
  CheckCircle,
  Star,
  TrendingUp,
  Science,
  Verified,
  Add,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { courseAPI, marksheetAPI, aiCOAPI, courseOutcomesAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';
import { PageLoader } from '../../components/shared/Loading';
import { ErrorState, EmptyState } from '../../components/shared/ErrorState';
import StatsCard from '../../components/shared/StatsCard';
import COMappingUpload from '../../components/upload/COMappingUpload';
import ManualCOManager from '../../components/teacher/ManualCOManager';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [marksheets, setMarksheets] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedMarksheet, setSelectedMarksheet] = useState(null);
  const [marksheetData, setMarksheetData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataPage, setDataPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // AI-generated COs state
  const [aiCOs, setAICOs] = useState([]);
  const [loadingAICOs, setLoadingAICOs] = useState(false);
  const [coStatistics, setCOStatistics] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Manual CO Manager state
  const [manualCOModalOpen, setManualCOModalOpen] = useState(false);

  useEffect(() => {
    loadCourseDetails();
    loadAICOs();
  }, [id]);

  const loadAICOs = async () => {
    try {
      setLoadingAICOs(true);
      // Fetch all course outcomes (both manual and AI-generated)
      const [cosRes, statsRes] = await Promise.all([
        courseOutcomesAPI.getByCourse(id),
        aiCOAPI.getStatistics(id).catch(() => ({ data: { statistics: null } })),
      ]);
      setAICOs(cosRes.data.cos || []);
      setCOStatistics(statsRes.data.statistics);
    } catch (err) {
      console.error('Error loading COs:', err);
      // Don't show error, just log it
    } finally {
      setLoadingAICOs(false);
    }
  };

  const loadCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseRes, studentsRes, marksheetsRes] = await Promise.all([
        courseAPI.getById(id),
        courseAPI.getEnrolledStudents(id),
        marksheetAPI.getByCourse(id).catch(() => ({ data: { data: [] } })),
      ]);

      setCourse(courseRes.data.data);
      setStudents(studentsRes.data.data || []);
      setMarksheets(marksheetsRes.data.data || []);
    } catch (err) {
      console.error('Error loading course details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateAttainment = async () => {
    try {
      setCalculating(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/attainment/course/${id}/recalculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Calculation failed');
      }

      toast.success('Attainment calculations completed successfully!');
      // Reload course details to refresh stats
      await loadCourseDetails();
    } catch (err) {
      console.error('Calculation error:', err);
      toast.error('Failed to calculate attainment. Please ensure marksheets are uploaded.');
    } finally {
      setCalculating(false);
    }
  };

  const handleDeleteMarksheet = async (marksheetId) => {
    if (!window.confirm('Are you sure you want to delete this marksheet? This action cannot be undone.')) {
      return;
    }
    try {
      await marksheetAPI.delete(marksheetId);
      toast.success('Marksheet deleted successfully!');
      loadCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete marksheet');
    }
  };

  const handleOpenDetails = async (marksheet) => {
    setSelectedMarksheet(marksheet);
    setDetailsModalOpen(true);
    setDataPage(0);
    await fetchMarksheetData(marksheet.id, 0, rowsPerPage);
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedMarksheet(null);
    setMarksheetData(null);
  };

  const fetchMarksheetData = async (marksheetId, page, limit) => {
    try {
      setLoadingData(true);
      const offset = page * limit;
      const response = await marksheetAPI.getData(marksheetId, { limit, offset });
      setMarksheetData(response.data.data);
    } catch (err) {
      console.error('Error fetching marksheet data:', err);
      toast.error('Failed to load marksheet data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setDataPage(newPage);
    if (selectedMarksheet) {
      fetchMarksheetData(selectedMarksheet.id, newPage, rowsPerPage);
    }
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setDataPage(0);
    if (selectedMarksheet) {
      fetchMarksheetData(selectedMarksheet.id, 0, newRowsPerPage);
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
            variant="outlined"
            startIcon={<BarChart />}
            onClick={() => navigate(`/teacher/attainment/${id}`)}
            sx={{ color: 'success.main', borderColor: 'success.main' }}
          >
            View Dashboard
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

      {/* AI-Generated Course Outcomes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            mb: 4,
            border: '2px solid',
            borderColor: aiCOs.length > 0 ? 'primary.main' : 'divider',
            background: aiCOs.length > 0
              ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.03) 0%, rgba(124, 58, 237, 0.02) 100%)'
              : 'background.paper',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  }}
                >
                  <AutoAwesome sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Course Outcomes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {aiCOs.length > 0
                      ? `${aiCOs.length} COs defined • ${aiCOs.filter(co => co.is_ai_generated).length} AI-generated • ${aiCOs.filter(co => !co.is_ai_generated).length} Manual`
                      : 'Add course outcomes using AI generation or manually'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {aiCOs.length === 0 && (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<AutoAwesome />}
                      onClick={() => navigate('/teacher/co-generator')}
                      sx={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
                        },
                      }}
                    >
                      Generate with AI
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => setManualCOModalOpen(true)}
                    >
                      Add Manually
                    </Button>
                  </>
                )}
                {aiCOs.length > 0 && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<AutoAwesome />}
                      onClick={() => navigate('/teacher/co-generator')}
                      size="small"
                    >
                      Regenerate with AI
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => setManualCOModalOpen(true)}
                      size="small"
                    >
                      Edit Manually
                    </Button>
                  </>
                )}
              </Box>
            </Box>

            {loadingAICOs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : aiCOs.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 6,
                  px: 3,
                  borderRadius: 2,
                  border: '2px dashed',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                <Science sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Course Outcomes Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Add course outcomes using our AI-powered generator or create them manually.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<AutoAwesome />}
                    onClick={() => navigate('/teacher/co-generator')}
                    sx={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    }}
                  >
                    Generate with AI
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => setManualCOModalOpen(true)}
                  >
                    Add Manually
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                {/* Statistics Banner */}
                {coStatistics && (
                  <Box
                    sx={{
                      mb: 3,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'background.default',
                      display: 'flex',
                      gap: 3,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total COs</Typography>
                      <Typography variant="h6" fontWeight="bold">{coStatistics.total_cos}</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Approved</Typography>
                      <Typography variant="h6" fontWeight="bold" color="success.main">
                        {coStatistics.approved_cos}
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Avg Quality</Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {((coStatistics.avg_quality || 0) * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                    {coStatistics.bloom_levels && coStatistics.bloom_levels.length > 0 && (
                      <>
                        <Divider orientation="vertical" flexItem />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Bloom Levels</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {coStatistics.bloom_levels.map((level) => (
                              <Chip key={level} label={level} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      </>
                    )}
                  </Box>
                )}

                {/* COs Grid */}
                <Grid container spacing={2}>
                  {aiCOs.map((co, index) => {
                    const getBloomColor = (level) => {
                      const colors = {
                        Apply: '#3b82f6',
                        Analyze: '#8b5cf6',
                        Evaluate: '#ec4899',
                        Create: '#10b981',
                      };
                      return colors[level] || '#6b7280';
                    };

                    const getQualityColor = (score) => {
                      if (score >= 0.8) return 'success';
                      if (score >= 0.6) return 'warning';
                      return 'error';
                    };

                    return (
                      <Grid item xs={12} md={6} key={co.id}>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card
                            sx={{
                              height: '100%',
                              border: '1px solid',
                              borderColor: co.approved ? 'success.main' : 'divider',
                              bgcolor: 'background.paper',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                boxShadow: 3,
                                transform: 'translateY(-2px)',
                              },
                            }}
                          >
                            <CardContent>
                              {/* Header */}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  <Chip
                                    label={`CO${co.co_number}`}
                                    sx={{
                                      bgcolor: getBloomColor(co.bloom_level),
                                      color: 'white',
                                      fontWeight: 'bold',
                                      fontSize: '0.85rem',
                                    }}
                                  />
                                  <Chip
                                    label={co.bloom_level}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderColor: getBloomColor(co.bloom_level),
                                      color: getBloomColor(co.bloom_level),
                                    }}
                                  />
                                  {co.is_ai_generated ? (
                                    <Chip
                                      label="AI"
                                      size="small"
                                      icon={<AutoAwesome sx={{ fontSize: 14 }} />}
                                      sx={{
                                        bgcolor: 'primary.light',
                                        color: 'primary.dark',
                                        fontWeight: 'bold',
                                      }}
                                    />
                                  ) : (
                                    <Chip
                                      label="Manual"
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        borderColor: 'text.secondary',
                                        color: 'text.secondary',
                                      }}
                                    />
                                  )}
                                </Box>
                                {co.approved && (
                                  <Chip
                                    label="Approved"
                                    size="small"
                                    color="success"
                                    icon={<Verified />}
                                  />
                                )}
                              </Box>

                              {/* Description */}
                              <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
                                {co.description}
                              </Typography>

                              {/* Footer */}
                              <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <TrendingUp sx={{ fontSize: 14 }} />
                                  PO Mappings: {co.po_mappings_raw || co.po_numbers?.join(', ') || 'N/A'}
                                </Typography>
                                {co.generation_date && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Generated: {new Date(co.generation_date).toLocaleDateString()}
                                  </Typography>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    );
                  })}
                </Grid>
              </>
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
          <Tab label="Uploaded Marksheets" icon={<Assignment />} iconPosition="start" />
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

        {/* Uploaded Marksheets Tab */}
        {activeTab === 1 && (
          <CardContent sx={{ p: 3 }}>
            {marksheets.length === 0 ? (
              <EmptyState
                title="No Marksheets Uploaded"
                message="No mark sheets have been uploaded for this course yet. Upload marks from the upload page."
                action={() => navigate('/teacher/upload')}
                actionLabel="Upload Marks"
              />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Assessment Mark Sheets ({marksheets.length})
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Upload />}
                    onClick={() => navigate('/teacher/upload')}
                    sx={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    }}
                  >
                    Upload New Marksheet
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  {marksheets.map((marksheet, index) => (
                    <Grid item xs={12} md={6} key={marksheet.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            border: '2px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
                              transform: 'translateY(-2px)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'start' }}>
                              <Box
                                sx={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 2,
                                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  flexShrink: 0,
                                }}
                              >
                                <Assignment />
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                  {marksheet.assessment_name || 'Assessment'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {marksheet.file_name}
                                </Typography>
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteMarksheet(marksheet.id)}
                              sx={{
                                '&:hover': {
                                  bgcolor: 'error.light',
                                  color: 'white',
                                },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                Uploaded On:
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {new Date(marksheet.created_at || marksheet.uploadDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                Students:
                              </Typography>
                              <Chip label={(marksheet.row_count || 1) - 1} size="small" color="primary" />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                Columns:
                              </Typography>
                              <Chip
                                label={marksheet.columns?.length || 0}
                                size="small"
                                variant="outlined"
                                color="secondary"
                              />
                            </Box>
                          </Box>

                          {/* CO Mapping Upload */}
                          <Box sx={{ mt: 2 }}>
                            <COMappingUpload courseId={id} marksheet={marksheet} />
                          </Box>

                          <Box
                            sx={{
                              mt: 2,
                              pt: 2,
                              borderTop: '1px solid',
                              borderColor: 'divider',
                              display: 'flex',
                              gap: 1,
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              fullWidth
                              onClick={() => handleOpenDetails(marksheet)}
                            >
                              View Details
                            </Button>
                          </Box>
                        </Paper>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </CardContent>
        )}
      </Card>

      {/* Marksheet Details Modal */}
      <Dialog
        open={detailsModalOpen}
        onClose={handleCloseDetails}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 2.5,
          }}
        >
          <Assignment />
          <Box component="span" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
            Marksheet Details
          </Box>
        </DialogTitle>

        <DialogContent sx={{ mt: 3 }}>
          {selectedMarksheet && (
            <Box>
              {/* Assessment Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Assessment Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Assessment Name"
                      secondary={selectedMarksheet.assessment_name || 'N/A'}
                      primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
                    />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemText
                      primary="File Name"
                      secondary={selectedMarksheet.file_name || 'N/A'}
                      primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
                    />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemText
                      primary="Table Name"
                      secondary={selectedMarksheet.table_name || 'N/A'}
                      primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'body1', color: 'text.primary', fontFamily: 'monospace' }}
                    />
                  </ListItem>
                </List>
              </Box>

              {/* Statistics */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Statistics
                </Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        border: '2px solid',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        bgcolor: 'primary.light',
                      }}
                    >
                      <Typography variant="h4" fontWeight="bold" color="primary.main">
                        {(selectedMarksheet.row_count || 1) - 1}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        Students
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        border: '2px solid',
                        borderColor: 'secondary.main',
                        borderRadius: 2,
                        bgcolor: 'secondary.light',
                      }}
                    >
                      <Typography variant="h4" fontWeight="bold" color="secondary.main">
                        {selectedMarksheet.columns?.length || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        Columns
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>

              {/* Upload Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Upload Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Uploaded On"
                      secondary={
                        selectedMarksheet.created_at || selectedMarksheet.uploadDate
                          ? new Date(selectedMarksheet.created_at || selectedMarksheet.uploadDate).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'
                      }
                      primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
                    />
                  </ListItem>
                  {selectedMarksheet.uploaded_by_name && (
                    <>
                      <Divider component="li" />
                      <ListItem>
                        <ListItemText
                          primary="Uploaded By"
                          secondary={selectedMarksheet.uploaded_by_name}
                          primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
                        />
                      </ListItem>
                    </>
                  )}
                </List>
              </Box>

              {/* Columns */}
              {selectedMarksheet.columns && selectedMarksheet.columns.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold">
                    Columns ({selectedMarksheet.columns.length})
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 1,
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedMarksheet.columns.map((col, index) => (
                        <Chip
                          key={index}
                          label={col}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                          }}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Box>
              )}

              {/* Data Table */}
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Data Preview
                </Typography>
                {loadingData ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : marksheetData && marksheetData.rows && marksheetData.rows.length > 0 ? (
                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                      mt: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      maxHeight: 500,
                    }}
                  >
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          {marksheetData.columns.map((col, index) => (
                            <TableCell
                              key={index}
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {marksheetData.rows.map((row, rowIndex) => (
                          <TableRow
                            key={rowIndex}
                            hover
                            sx={{
                              '&:nth-of-type(odd)': {
                                bgcolor: 'action.hover',
                              },
                            }}
                          >
                            {marksheetData.columns.map((col, colIndex) => (
                              <TableCell
                                key={colIndex}
                                sx={{
                                  fontSize: '0.75rem',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <TablePagination
                      component="div"
                      count={marksheetData.total || 0}
                      page={dataPage}
                      onPageChange={handleChangePage}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    />
                  </TableContainer>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 1,
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No data available
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={handleCloseDetails} variant="outlined" sx={{ borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual CO Manager Modal */}
      <ManualCOManager
        open={manualCOModalOpen}
        onClose={() => setManualCOModalOpen(false)}
        courseId={id}
        onSuccess={() => {
          loadAICOs();
          loadCourseDetails();
        }}
      />
    </PageLayout>
  );
};

export default CourseDetail;
