import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Button,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ArrowBack,
  Assessment,
  TrendingUp,
  School,
  ExpandMore,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { studentAPI, courseAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';
import { PageLoader } from '../../components/shared/Loading';
import { ErrorState } from '../../components/shared/ErrorState';
import StatsCard from '../../components/shared/StatsCard';
import Recommendations from '../../components/student/Recommendations';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#ca8a04'];

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  const [courseInfo, setCourseInfo] = useState(null);
  const [marks, setMarks] = useState([]);
  const [coAttainment, setCOAttainment] = useState({ combined: [], perAssessment: [] });
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseRes, marksRes, coRes, analyticsRes] = await Promise.all([
        courseAPI.getById(courseId),
        studentAPI.getMarks(courseId),
        studentAPI.getCOAttainment(courseId),
        studentAPI.getAnalytics(courseId),
      ]);

      setCourseInfo(courseRes.data.data);
      setMarks(marksRes.data.data || []);
      setCOAttainment(coRes.data.data || { combined: [], perAssessment: [] });
      setAnalytics(analyticsRes.data.data);
    } catch (err) {
      console.error('Error loading course data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Loading course details..." />;
  if (error) return <ErrorState onRetry={loadCourseData} />;

  // Calculate overall stats
  const totalMarks = marks.reduce((sum, m) => sum + m.totalMarks, 0);
  const totalMaxMarks = marks.reduce((sum, m) => sum + m.maxMarks, 0);
  const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

  // Prepare chart data
  const assessmentChartData = marks.map((m) => ({
    name: m.assessmentName || m.assessmentType || 'Assessment',
    marks: m.totalMarks,
    max: m.maxMarks,
    percentage: m.percentage,
  }));

  const coChartData = coAttainment.combined.map((co) => ({
    name: `CO${co.co_number}`,
    attainment: parseFloat(co.attainment_percent || 0),
    max: 100,
  }));

  const coPieData = coAttainment.combined.map((co) => ({
    name: `CO${co.co_number}`,
    value: parseFloat(co.attainment_percent || 0),
  }));

  return (
    <PageLayout
      title={courseInfo?.name || 'Course Details'}
      subtitle={`${courseInfo?.code || ''} - Your Performance Overview`}
      icon={School}
      breadcrumbs={[
        { label: 'Dashboard', to: '/student/dashboard', icon: School },
        { label: courseInfo?.name || 'Course' },
      ]}
      actions={
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/student/dashboard')}
        >
          Back
        </Button>
      }
    >
      {/* Overall Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Overall Percentage"
            value={`${overallPercentage.toFixed(1)}%`}
            icon={TrendingUp}
            color="primary.main"
            bgColor="primary.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Marks"
            value={`${totalMarks.toFixed(1)} / ${totalMaxMarks.toFixed(1)}`}
            icon={Assessment}
            color="info.main"
            bgColor="info.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Assessments"
            value={marks.length}
            icon={School}
            color="success.main"
            bgColor="success.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Your Rank"
            value={`${analytics?.rank || '--'}/${analytics?.totalStudents || '--'}`}
            icon={TrendingUp}
            color="warning.main"
            bgColor="warning.light"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Marks Breakdown" />
          <Tab label="CO Attainment" />
          <Tab label="Performance Analysis" />
          <Tab label="Recommendations" />
        </Tabs>
      </Card>

      {/* Tab 0: Marks Breakdown */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Assessment Performance Chart */}
          <Grid item xs={12} lg={8}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Assessment Performance
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={assessmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="marks" fill="#2563eb" name="Marks Obtained" />
                    <Bar dataKey="max" fill="#e5e7eb" name="Max Marks" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Grid>

          {/* Assessment List */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                All Assessments
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {marks.map((assessment, index) => (
                  <Box key={index}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {assessment.assessmentName || assessment.assessmentType}
                      </Typography>
                      <Chip
                        label={`${assessment.percentage.toFixed(1)}%`}
                        size="small"
                        color={assessment.percentage >= 60 ? 'success' : assessment.percentage >= 40 ? 'warning' : 'error'}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={assessment.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          bgcolor: assessment.percentage >= 60 ? 'success.main' : assessment.percentage >= 40 ? 'warning.main' : 'error.main',
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {assessment.totalMarks.toFixed(1)} / {assessment.maxMarks.toFixed(1)} marks
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>

          {/* Detailed Marks Table */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Detailed Marks Breakdown
                </Typography>
                {marks.map((assessment, idx) => (
                  <Accordion key={idx} sx={{ mt: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {assessment.assessmentName || assessment.assessmentType}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {assessment.assessmentType && `${assessment.assessmentType} • `}
                            {new Date(assessment.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${assessment.percentage.toFixed(1)}%`}
                          color={assessment.percentage >= 60 ? 'success' : assessment.percentage >= 40 ? 'warning' : 'error'}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>CO</strong></TableCell>
                              <TableCell align="right"><strong>Obtained</strong></TableCell>
                              <TableCell align="right"><strong>Max</strong></TableCell>
                              <TableCell align="right"><strong>Percentage</strong></TableCell>
                              <TableCell><strong>Status</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {assessment.coBreakdown && assessment.coBreakdown.length > 0 ? (
                              assessment.coBreakdown.map((co, coIdx) => (
                                <TableRow key={coIdx}>
                                  <TableCell>
                                    <Chip label={`CO${co.coNumber}`} size="small" color="primary" />
                                  </TableCell>
                                  <TableCell align="right">{co.obtained.toFixed(1)}</TableCell>
                                  <TableCell align="right">{co.max.toFixed(1)}</TableCell>
                                  <TableCell align="right">
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: co.percentage >= 60 ? 'success.main' : co.percentage >= 40 ? 'warning.main' : 'error.main',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {co.percentage.toFixed(1)}%
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {co.percentage >= 60 ? (
                                      <CheckCircle color="success" fontSize="small" />
                                    ) : (
                                      <Cancel color="error" fontSize="small" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  <Typography variant="body2" color="text.secondary">
                                    No CO breakdown available
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="body2">
                          <strong>Total:</strong> {assessment.totalMarks.toFixed(1)} / {assessment.maxMarks.toFixed(1)} marks
                        </Typography>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: CO Attainment */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Combined CO Attainment
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="attainment" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                CO Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={coPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {coPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  CO Attainment Details
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>CO</strong></TableCell>
                        <TableCell><strong>Description</strong></TableCell>
                        <TableCell align="right"><strong>Max Marks</strong></TableCell>
                        <TableCell align="right"><strong>Attainment %</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {coAttainment.combined.map((co, idx) => {
                        const attainment = parseFloat(co.attainment_percent || 0);
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <Chip label={`CO${co.co_number}`} color="primary" />
                            </TableCell>
                            <TableCell>{co.description || 'N/A'}</TableCell>
                            <TableCell align="right">{parseFloat(co.total_max_marks || 0).toFixed(1)}</TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                sx={{
                                  color: attainment >= 60 ? 'success.main' : attainment >= 40 ? 'warning.main' : 'error.main',
                                  fontWeight: 600,
                                }}
                              >
                                {attainment.toFixed(1)}%
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {attainment >= 60 ? (
                                <Chip label="Achieved" color="success" size="small" />
                              ) : (
                                <Chip label="Not Achieved" color="error" size="small" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Performance Analysis */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Performance Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={assessmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', r: 6 }}
                    name="Percentage"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Your Performance vs Class Average
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Your Average</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {analytics?.studentAverage || 0}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={parseFloat(analytics?.studentAverage || 0)}
                    sx={{ height: 10, borderRadius: 2 }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Class Average</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {analytics?.classAverage || 0}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={parseFloat(analytics?.classAverage || 0)}
                    color="secondary"
                    sx={{ height: 10, borderRadius: 2 }}
                  />
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Performance Summary
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Overall Percentage</Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {overallPercentage.toFixed(1)}%
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary">Class Rank</Typography>
                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                    {analytics?.rank || '--'} / {analytics?.totalStudents || '--'}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Assessments</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {marks.length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Recommendations */}
      {tabValue === 3 && (
        <Box>
          <Recommendations courseId={courseId} courseCode={courseInfo?.code} />
        </Box>
      )}
    </PageLayout>
  );
};

export default CourseDetail;

