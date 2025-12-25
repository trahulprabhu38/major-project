import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  BarChart3,
  TrendingUp,
  Users,
  Trophy,
  RefreshCw,
  Download,
  Eye,
  ArrowLeft,
  GraduationCap,
  Upload,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import PageLayout from '../../components/shared/PageLayout';
import StatsCard from '../../components/shared/StatsCard';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Alert } from '../../components/ui/alert';
import { CHART_COLORS } from '../../config/chartColors';

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

      if (!courseId) {
        setError('Invalid course ID');
        setLoading(false);
        return;
      }

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
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
        <Button onClick={loadDashboardData}>
          Retry
        </Button>
      </div>
    );
  }

  if (!dashboardData || (dashboardData.studentStats?.total_students === 0 && coAttainment.length === 0)) {
    return (
      <PageLayout
        title={`Attainment Dashboard - ${course?.code || 'Course'}`}
        subtitle={course?.name || 'Dynamic CO/PO Attainment Analysis'}
        icon={BarChart3}
        breadcrumbs={[
          { label: 'Dashboard', to: '/teacher/dashboard' },
          { label: course?.code || 'Course' },
        ]}
      >
        <div className="p-8 text-center">
          <BarChart3 className="w-20 h-20 text-neutral-400 dark:text-dark-text-muted mx-auto mb-4" />
          <Alert variant="info" className="mb-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold mb-2">No Attainment Data Available</h3>
            <p className="text-sm">
              Upload assessment marks and the system will automatically calculate CO/PO attainment for this course.
            </p>
          </Alert>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => navigate('/teacher/upload')}
              className="bg-gradient-to-r from-primary-500 to-secondary-500"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Marks
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/teacher/courses')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Prepare chart data
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

  const bloomChartData = (dashboardData.bloomDistribution || []).map(b => ({
    name: b.bloom_level,
    value: parseInt(b.count),
    color: CHART_COLORS.bloomColors[b.bloom_level] || CHART_COLORS.neutral,
  }));

  const assessmentTrendsChartData = (dashboardData.assessmentTrends || []).map(a => ({
    name: a.name,
    score: parseFloat(a.avg_percentage || 0).toFixed(1),
    date: new Date(a.assessment_date).toLocaleDateString('en-US', { month: 'short' }),
  }));

  const gradeChartData = (dashboardData.gradeDistribution || []).map(g => ({
    name: g.grade,
    value: parseInt(g.count),
    color: CHART_COLORS.gradeColors[g.grade] || CHART_COLORS.neutral,
  }));

  return (
    <PageLayout
      title={`Attainment Dashboard - ${course?.code || 'Course'}`}
      subtitle={course?.name || 'Dynamic CO/PO Attainment Analysis'}
      icon={BarChart3}
      breadcrumbs={[
        { label: 'Dashboard', to: '/teacher/dashboard' },
        { label: course?.code || 'Course' },
      ]}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/teacher/courses')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Recalculating...' : 'Recalculate'}
          </Button>
        </div>
      }
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Avg CO Attainment"
          value={`${parseFloat(dashboardData.coSummary?.avg_co_attainment || 0).toFixed(2)}%`}
          icon={TrendingUp}
          color="primary"
        />
        <StatsCard
          title="Avg PO Level"
          value={parseFloat(dashboardData.poSummary?.avg_po_level || 0).toFixed(2)}
          subtitle="out of 3.0"
          icon={Trophy}
          color="success"
        />
        <StatsCard
          title="Total Students"
          value={dashboardData.studentStats?.total_students || 0}
          icon={Users}
          color="warning"
        />
        <StatsCard
          title="Avg Student Score"
          value={`${parseFloat(dashboardData.studentStats?.avg_percentage || 0).toFixed(1)}%`}
          icon={GraduationCap}
          color="secondary"
        />
      </div>

      {/* CO Attainment vs Threshold Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
              Course Outcome (CO) Attainment Levels
            </h2>
            <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-6">
              Comparison of actual attainment vs. target threshold ({threshold}%)
            </p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={coThresholdChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8CBC0" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} label={{ value: 'Attainment %', angle: -90, position: 'insideLeft' }} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="Attainment" fill={CHART_COLORS.primary} name="Attainment %" />
                <Bar dataKey="Target" fill={CHART_COLORS.error} name="Target %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Bloom's Taxonomy Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                Bloom's Taxonomy Distribution
              </h2>
              <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-4">
                Distribution of COs across cognitive levels
              </p>
              {bloomChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={bloomChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#D8CBC0" />
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
                <div className="text-center py-16">
                  <p className="text-neutral-600 dark:text-dark-text-secondary">
                    No Bloom's level data available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* PO Attainment Radar Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                Program Outcome (PO) Attainment
              </h2>
              <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-4">
                Performance across program outcomes
              </p>
              {poRadarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={poRadarData}>
                    <PolarGrid stroke="#D8CBC0" />
                    <PolarAngleAxis dataKey="po" />
                    <PolarRadiusAxis angle={90} domain={[0, 3]} />
                    <Radar
                      name="Attainment Level"
                      dataKey="attainment"
                      stroke={CHART_COLORS.secondary}
                      fill={CHART_COLORS.secondary}
                      fillOpacity={0.6}
                    />
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-16">
                  <p className="text-neutral-600 dark:text-dark-text-secondary">
                    No PO attainment data available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Assessment Performance Trends */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                Assessment Performance Trends
              </h2>
              <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-4">
                Average scores across internal assessments
              </p>
              {assessmentTrendsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={assessmentTrendsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D8CBC0" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} label={{ value: 'Score %', angle: -90, position: 'insideLeft' }} />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke={CHART_COLORS.primary} strokeWidth={2} name="Avg Score %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-16">
                  <p className="text-neutral-600 dark:text-dark-text-secondary">
                    No assessment data available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Grade Distribution Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                Grade Distribution
              </h2>
              <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-4">
                Student performance breakdown by grade
              </p>
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
                <div className="text-center py-16">
                  <p className="text-neutral-600 dark:text-dark-text-secondary">
                    No grade data available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Student Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary">
                Student Performance ({students.length})
              </h2>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100 dark:bg-dark-bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">Rank</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">USN</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">Name</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">CIE %</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">SEE %</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">Total %</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">Grade</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-dark-border">
                  {students.slice(0, 20).map((student, index) => (
                    <tr key={student.id} className="hover:bg-neutral-50 dark:hover:bg-dark-bg-secondary transition-colors">
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-dark-text-primary">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-dark-text-primary">{student.usn}</td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-dark-text-primary">{student.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
                              style={{ width: `${parseFloat(student.cie_percentage || 0)}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-600 dark:text-dark-text-secondary min-w-[45px]">
                            {parseFloat(student.cie_percentage || 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
                              style={{ width: `${parseFloat(student.see_percentage || 0)}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-600 dark:text-dark-text-secondary min-w-[45px]">
                            {parseFloat(student.see_percentage || 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-neutral-800 dark:text-dark-text-primary">
                        {parseFloat(student.percentage || 0).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-block px-3 py-1 rounded-lg text-white font-bold text-sm"
                          style={{ backgroundColor: CHART_COLORS.gradeColors[student.grade] || CHART_COLORS.neutral }}
                        >
                          {student.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/teacher/student/${student.id}/course/${courseId}`)}
                          className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 dark:text-dark-green-500 dark:hover:bg-primary-900/20 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {students.length > 20 && (
              <div className="mt-4 text-center">
                <p className="text-xs text-neutral-500 dark:text-dark-text-muted">
                  Showing top 20 students. {students.length - 20} more available.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PageLayout>
  );
};

export default DynamicDashboard;
