import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Assessment,
  TrendingUp,
  People,
  EmojiEvents,
  Refresh,
  Download,
  Visibility,
  ArrowBack,
  School,
  Upload,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import PageLayout from '../../components/shared/PageLayout';
import StatsCard from '../../components/shared/StatsCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const DynamicDashboard = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [coAttainment, setCOAttainment] = useState([]);
  const [coAttainmentWithThreshold, setCOAttainmentWithThreshold] = useState([]);
  const [threshold, setThreshold] = useState(70);
  const [poAttainment, setPOAttainment] = useState([]);
  const [students, setStudents] = useState([]);
  const [course, setCourse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
    loadCourseDetails();
  }, [courseId]);

  const loadCourseDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourse(response.data.data);
    } catch (err) {
      console.error('Error loading course:', err);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      // Validate courseId
      if (!courseId) {
        setError('Invalid course ID');
        setLoading(false);
        return;
      }

      // Load all data in parallel
      const [dashboardRes, coRes, coThresholdRes, poRes, studentsRes] = await Promise.all([
        axios.get(`${API_URL}/attainment/course/${courseId}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => ({ data: { dashboard: null }, error: err })),
        axios.get(`${API_URL}/attainment/course/${courseId}/co-attainment`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => ({ data: { coAttainment: [] }, error: err })),
        axios.get(`${API_URL}/attainment/course/${courseId}/co-attainment-with-threshold`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => ({ data: { coAttainment: [], threshold: 70 }, error: err })),
        axios.get(`${API_URL}/attainment/course/${courseId}/po-attainment`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => ({ data: { poAttainment: [] }, error: err })),
        axios.get(`${API_URL}/attainment/course/${courseId}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => ({ data: { students: [], gradeDistribution: [] }, error: err })),
      ]);

      setDashboardData(dashboardRes.data.dashboard || {
        coSummary: { avg_co_attainment: 0, total_cos: 0 },
        poSummary: { avg_po_level: 0, avg_po_percentage: 0, total_pos: 0 },
        studentStats: { total_students: 0, avg_percentage: 0, min_percentage: 0, max_percentage: 0 },
        gradeDistribution: [],
        bloomDistribution: [],
        assessmentTrends: []
      });
      console.log('Dashboard data:', dashboardRes);
      setCOAttainment(coRes.data.coAttainment || []);
      setCOAttainmentWithThreshold(coThresholdRes.data.coAttainment || []);
      setThreshold(coThresholdRes.data.threshold || 70);
      setPOAttainment(poRes.data.poAttainment || []);
      setStudents(studentsRes.data.students || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/attainment/course/${courseId}/recalculate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Attainment recalculated successfully!');
      await loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to recalculate');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} /> 
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadDashboardData}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!dashboardData || (dashboardData.studentStats?.total_students === 0 && coAttainment.length === 0)) {
    return (
      <PageLayout
        title={`Attainment Dashboard - ${course?.code || 'Course'}`}
        subtitle={course?.name || 'Dynamic CO/PO Attainment Analysis'}
        icon={Assessment}
        breadcrumbs={[
          { label: 'Dashboard', to: '/teacher/dashboard' },
          { label: course?.code || 'Course' },
        ]}
      >
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Assessment sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Alert severity="info" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h6" gutterBottom>No Attainment Data Available</Typography>
            <Typography variant="body2">
              Upload assessment marks and the system will automatically calculate CO/PO attainment for this course.
            </Typography>
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => navigate('/teacher/upload')}
              size="large"
            >
              Upload Marks
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/teacher/courses')}
              size="large"
            >
              Back to Courses
            </Button>
          </Box>
        </Box>
      </PageLayout>
    );
  }

  // Prepare chart data
  // CO Attainment vs Threshold
  const coThresholdChartData = coAttainmentWithThreshold.map(co => ({
    name: `CO${co.co_number}`,
    Attainment: parseFloat(co.attainment || 0),
    Target: threshold,
  }));

  const poRadarData = poAttainment.map(po => ({
    po: `PO${po.po_number}`,
    attainment: parseFloat(po.attainment_level || 0).toFixed(2),
    fullMark: 3,
  }));

  // Bloom's Taxonomy Distribution
  const bloomColors = {
    Remember: '#10b981',
    Understand: '#3b82f6',
    Apply: '#8b5cf6',
    Analyze: '#f59e0b',
    Evaluate: '#f97316',
    Create: '#ef4444',
  };

  const bloomChartData = (dashboardData.bloomDistribution || []).map(b => ({
    name: b.bloom_level,
    value: parseInt(b.count),
    color: bloomColors[b.bloom_level] || '#6b7280',
  }));

  // Assessment Performance Trends
  const assessmentTrendsChartData = (dashboardData.assessmentTrends || []).map(a => ({
    name: a.name,
    score: parseFloat(a.avg_percentage || 0).toFixed(1),
    date: new Date(a.assessment_date).toLocaleDateString('en-US', { month: 'short' }),
  }));

  const gradeColors = {
    S: '#10b981',
    A: '#3b82f6',
    B: '#8b5cf6',
    C: '#f59e0b',
    D: '#f97316',
    E: '#ef4444',
    F: '#991b1b',
  };

  const gradeChartData = (dashboardData.gradeDistribution || []).map(g => ({
    name: g.grade,
    value: parseInt(g.count),
    color: gradeColors[g.grade] || '#6b7280',
  }));

  return (
    <PageLayout
      title={`Attainment Dashboard - ${course?.code || 'Course'}`}
      subtitle={course?.name || 'Dynamic CO/PO Attainment Analysis'}
      icon={Assessment}
      breadcrumbs={[
        { label: 'Dashboard', to: '/teacher/dashboard' },
        { label: course?.code || 'Course' },
      ]}
      actions={
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/teacher/courses')}
          >
            Back to Courses
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRecalculate}
            disabled={refreshing}
          >
            {refreshing ? 'Recalculating...' : 'Recalculate'}
          </Button>
        </Box>
      }
    >
      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Avg CO Attainment"
            value={`${parseInt(dashboardData.coSummary?.avg_co_attainment || 0).toFixed(2)}%`}
            icon={TrendingUp}
            color="primary.main"
            bgColor="primary.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Avg PO Level"
            value={parseFloat(dashboardData.poSummary?.avg_po_level || 0).toFixed(2)}
            subtitle="out of 3.0"
            icon={EmojiEvents}
            color="success.main"
            bgColor="success.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Students"
            value={dashboardData.studentStats?.total_students || 0}
            icon={People}
            color="warning.main"
            bgColor="warning.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Avg Student Score"
            value={`${parseFloat(dashboardData.studentStats?.avg_percentage || 0).toFixed(1)}%`}
            icon={School}
            color="secondary.main"
            bgColor="secondary.light"
          />
        </Grid>
      </Grid>

      {/* CO Attainment vs Threshold Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Course Outcome (CO) Attainment Levels
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Comparison of actual attainment vs. target threshold ({threshold}%)
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={coThresholdChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} label={{ value: 'Attainment %', angle: -90, position: 'insideLeft' }} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="Attainment" fill="#3b82f6" name="Attainment %" />
                <Bar dataKey="Target" fill="#ef4444" name="Target %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Bloom's Taxonomy Distribution */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Bloom's Taxonomy Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Distribution of COs across cognitive levels
                </Typography>
                {bloomChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={bloomChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <RechartsTooltip />
                      <Bar dataKey="value" name="Count">
                        {bloomChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No Bloom's level data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* PO Attainment Radar Chart */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Program Outcome (PO) Attainment
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Performance across program outcomes
                </Typography>
                {poRadarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={poRadarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="po" />
                      <PolarRadiusAxis angle={90} domain={[0, 3]} />
                      <Radar
                        name="Attainment Level"
                        dataKey="attainment"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.6}
                      />
                      <RechartsTooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No PO attainment data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Assessment Performance Trends */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Assessment Performance Trends
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Average scores across internal assessments
                </Typography>
                {assessmentTrendsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={assessmentTrendsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} label={{ value: 'Score %', angle: -90, position: 'insideLeft' }} />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="Avg Score %" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No assessment data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Grade Distribution Pie Chart */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Grade Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Student performance breakdown by grade
                </Typography>
                {gradeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={gradeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {gradeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No grade data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Student Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Student Performance ({students.length})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download />}
              >
                Export
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>Rank</strong></TableCell>
                    <TableCell><strong>USN</strong></TableCell>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell align="center"><strong>CIE %</strong></TableCell>
                    <TableCell align="center"><strong>SEE %</strong></TableCell>
                    <TableCell align="center"><strong>Total %</strong></TableCell>
                    <TableCell align="center"><strong>Grade</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.slice(0, 20).map((student, index) => (
                    <TableRow key={student.id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{student.usn}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={parseFloat(student.cie_percentage || 0)}
                            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption">
                            {parseFloat(student.cie_percentage || 0).toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={parseFloat(student.see_percentage || 0)}
                            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption">
                            {parseFloat(student.see_percentage || 0).toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold">
                          {parseFloat(student.percentage || 0).toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={student.grade}
                          sx={{
                            bgcolor: gradeColors[student.grade],
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/teacher/student/${student.id}/course/${courseId}`)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {students.length > 20 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Showing top 20 students. {students.length - 20} more available.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PageLayout>
  );
};

export default DynamicDashboard;
