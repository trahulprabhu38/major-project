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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Dashboard, TrendingUp, School, People, Assessment } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { courseAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';
import { PageLoader } from '../../components/shared/Loading';
import { ErrorState, EmptyState } from '../../components/shared/ErrorState';
import StatsCard from '../../components/shared/StatsCard';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#dc2626', '#ca8a04'];

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCourse && selectedCourse !== 'all') {
      loadCourseAnalytics(selectedCourse);
    }
  }, [selectedCourse]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await courseAPI.getAll();
      setCourses(response.data.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseAnalytics = async (courseId) => {
    try {
      const response = await courseAPI.getAnalytics(courseId);
      setAnalyticsData(response.data.data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  };

  if (loading) return <PageLoader message="Loading analytics..." />;
  if (error) return <ErrorState onRetry={loadData} />;

  // Prepare chart data
  const coAttainmentData =
    analyticsData?.coAttainment?.map((co) => ({
      co: `CO${co.co_number}`,
      attainment: parseFloat(co.avg_attainment) || 0,
    })) || [];

  const poAttainmentData =
    analyticsData?.poAttainment?.map((po) => ({
      po: `PO${po.po_number}`,
      attainment: parseFloat(po.attainment_level) || 0,
    })) || [];

  const performanceDistData =
    analyticsData?.performanceDistribution?.map((item) => ({
      range: item.grade_range,
      count: parseInt(item.student_count) || 0,
    })) || [];

  const assessmentTrendData =
    analyticsData?.assessmentTrend?.map((assessment) => ({
      name: assessment.name.substring(0, 15),
      avg: parseFloat(assessment.avg_percentage) || 0,
    })) || [];

  // Overall stats
  const totalStudents = courses.reduce((sum, course) => sum + (course.enrolled_students || 0), 0);
  const totalCourses = courses.length;

  return (
    <PageLayout
      title="Analytics Dashboard"
      subtitle="Comprehensive performance analytics and insights"
      icon={TrendingUp}
      breadcrumbs={[
        { label: 'Dashboard', to: '/teacher/dashboard', icon: Dashboard },
        { label: 'Analytics' },
      ]}
      actions={
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Select Course</InputLabel>
          <Select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            label="Select Course"
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">All Courses</MenuItem>
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {course.code} - {course.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      }
    >
      {/* Overall Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Courses"
            value={totalCourses}
            icon={School}
            color="primary.main"
            bgColor="primary.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Students"
            value={totalStudents}
            icon={People}
            color="success.main"
            bgColor="success.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Active Assessments"
            value="--"
            icon={Assessment}
            color="warning.main"
            bgColor="warning.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Avg Attainment"
            value="--"
            icon={TrendingUp}
            color="secondary.main"
            bgColor="secondary.light"
          />
        </Grid>
      </Grid>

      {selectedCourse === 'all' ? (
        <EmptyState
          title="Select a Course"
          message="Choose a course from the dropdown to view detailed analytics"
        />
      ) : analyticsData ? (
        <Grid container spacing={3}>
          {/* CO Attainment Chart */}
          {coAttainmentData.length > 0 && (
            <Grid item xs={12} lg={6}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    CO Attainment Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Average attainment across course outcomes
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={coAttainmentData}>
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
                      <Bar dataKey="attainment" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </motion.div>
            </Grid>
          )}

          {/* PO Attainment Chart */}
          {poAttainmentData.length > 0 && (
            <Grid item xs={12} lg={6}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    PO Attainment Levels
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Program outcome attainment distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={poAttainmentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="po" stroke="#666" />
                      <YAxis stroke="#666" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="attainment" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </motion.div>
            </Grid>
          )}

          {/* Performance Distribution */}
          {performanceDistData.length > 0 && (
            <Grid item xs={12} lg={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Student Performance Distribution
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Distribution of students across grade ranges
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={performanceDistData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.range}: ${entry.count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {performanceDistData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </motion.div>
            </Grid>
          )}

          {/* Assessment Trend */}
          {assessmentTrendData.length > 0 && (
            <Grid item xs={12} lg={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Assessment Performance Trend
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Class average across different assessments
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
                        dataKey="avg"
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

          {/* CO Performance Summary */}
          {coAttainmentData.length > 0 && (
            <Grid item xs={12}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    CO Performance Summary
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                    {coAttainmentData.map((co, index) => (
                      <Chip
                        key={index}
                        label={`${co.co}: ${co.attainment.toFixed(1)}%`}
                        color={co.attainment >= 70 ? 'success' : co.attainment >= 50 ? 'warning' : 'error'}
                        sx={{ fontWeight: 600, fontSize: '0.9rem', px: 1 }}
                      />
                    ))}
                  </Box>
                </Card>
              </motion.div>
            </Grid>
          )}
        </Grid>
      ) : (
        <PageLoader message="Loading course analytics..." />
      )}
    </PageLayout>
  );
};

export default Analytics;
