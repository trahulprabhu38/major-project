import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Button,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, School, Star, ArrowBack, Assessment } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { studentAPI, courseAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';
import { PageLoader } from '../../components/shared/Loading';
import { ErrorState } from '../../components/shared/ErrorState';
import StatsCard from '../../components/shared/StatsCard';

const CourseAnalytics = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseInfo, setCourseInfo] = useState(null);
  const [scores, setScores] = useState([]);
  const [coPerformance, setCoPerformance] = useState([]);
  const [poPerformance, setPoPerformance] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [courseId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseRes, scoresRes, coRes, poRes, analyticsRes] = await Promise.all([
        courseAPI.getById(courseId),
        studentAPI.getScores(courseId),
        studentAPI.getCOPerformance(courseId),
        studentAPI.getPOPerformance(courseId),
        studentAPI.getAnalytics(courseId),
      ]);

      setCourseInfo(courseRes.data.data);
      setScores(scoresRes.data.data || []);
      setCoPerformance(coRes.data.data || []);
      setPoPerformance(poRes.data.data || []);
      setAnalytics(analyticsRes.data.data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Loading analytics..." />;
  if (error) return <ErrorState onRetry={loadAnalytics} />;

  // Prepare chart data
  const coChartData = coPerformance.map((co) => ({
    co: `CO${co.coNumber}`,
    performance: parseFloat(co.percentage) || 0,
    fullMark: 100,
  }));

  const poChartData = poPerformance.map((po) => ({
    po: `PO${po.poNumber}`,
    attainment: parseFloat(po.percentage) || 0,
    fullMark: 100,
  }));

  const assessmentTrendData = scores.map((assessment, index) => ({
    name: assessment.name.substring(0, 15),
    percentage: parseFloat(assessment.percentage) || 0,
  }));

  return (
    <PageLayout
      title={courseInfo?.name || 'Course Analytics'}
      subtitle={`${courseInfo?.code || ''} - Detailed Performance Analysis`}
      icon={Assessment}
      breadcrumbs={[
        { label: 'Dashboard', to: '/student/dashboard', icon: School },
        { label: courseInfo?.name || 'Analytics' },
      ]}
      actions={
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/student/dashboard')}
        >
          Back to Dashboard
        </Button>
      }
    >
      {/* Performance Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Your Average"
            value={`${analytics?.studentAverage || 0}%`}
            icon={TrendingUp}
            color="primary.main"
            bgColor="primary.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Class Average"
            value={`${analytics?.classAverage || 0}%`}
            icon={School}
            color="info.main"
            bgColor="info.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Your Rank"
            value={`${analytics?.rank || '--'}/${analytics?.totalStudents || '--'}`}
            icon={Star}
            color="warning.main"
            bgColor="warning.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Assessments"
            value={scores.length}
            icon={Assessment}
            color="success.main"
            bgColor="success.light"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* CO Performance Bar Chart */}
        <Grid item xs={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Course Outcome (CO) Performance
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Your performance across all course outcomes
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="co" stroke="#666" />
                  <YAxis stroke="#666" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="performance" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>

        {/* PO Attainment Radar Chart */}
        <Grid item xs={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Program Outcome (PO) Attainment
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Contribution to program outcomes
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={poChartData}>
                  <PolarGrid stroke="#e0e0e0" />
                  <PolarAngleAxis dataKey="po" stroke="#666" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666" />
                  <Radar
                    name="PO Attainment"
                    dataKey="attainment"
                    stroke="#7c3aed"
                    fill="#7c3aed"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>

        {/* Assessment Trend Line Chart */}
        {assessmentTrendData.length > 0 && (
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Assessment Performance Trend
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Your performance across different assessments
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={assessmentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Grid>
        )}
      </Grid>

      {/* CO Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Detailed CO Performance
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>CO Number</strong></TableCell>
                    <TableCell><strong>Marks Obtained</strong></TableCell>
                    <TableCell><strong>Max Marks</strong></TableCell>
                    <TableCell><strong>Performance</strong></TableCell>
                    <TableCell><strong>Progress</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {coPerformance.map((co) => {
                    const percentage = parseFloat(co.percentage) || 0;
                    return (
                      <TableRow key={co.coNumber} hover>
                        <TableCell>
                          <Chip label={`CO ${co.coNumber}`} color="primary" size="small" />
                        </TableCell>
                        <TableCell>{co.scored || 0}</TableCell>
                        <TableCell>{co.maxMarks || 0}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            sx={{
                              color:
                                percentage >= 80
                                  ? 'success.main'
                                  : percentage >= 60
                                  ? 'warning.main'
                                  : 'error.main',
                            }}
                          >
                            {percentage.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ width: '40%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={percentage}
                              sx={{
                                flex: 1,
                                height: 8,
                                borderRadius: 4,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 4,
                                  bgcolor:
                                    percentage >= 80
                                      ? 'success.main'
                                      : percentage >= 60
                                      ? 'warning.main'
                                      : 'error.main',
                                },
                              }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </motion.div>
    </PageLayout>
  );
};

export default CourseAnalytics;
