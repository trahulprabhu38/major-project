import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { TrendingUp, GraduationCap, Star, ArrowLeft, FileText } from 'lucide-react';
import { studentAPI, courseAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';
import { PageLoader } from '../../components/shared/Loading';
import { ErrorState } from '../../components/shared/ErrorState';
import StatsCard from '../../components/shared/StatsCard';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { CHART_COLORS } from '../../config/chartColors';

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
      icon={FileText}
      breadcrumbs={[
        { label: 'Dashboard', to: '/student/dashboard', icon: GraduationCap },
        { label: courseInfo?.name || 'Analytics' },
      ]}
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/student/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      }
    >
      {/* Performance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Your Average"
          value={`${analytics?.studentAverage || 0}%`}
          icon={TrendingUp}
          color="primary"
        />
        <StatsCard
          title="Class Average"
          value={`${analytics?.classAverage || 0}%`}
          icon={GraduationCap}
          color="success"
        />
        <StatsCard
          title="Your Rank"
          value={`${analytics?.rank || '--'}/${analytics?.totalStudents || '--'}`}
          icon={Star}
          color="warning"
        />
        <StatsCard
          title="Assessments"
          value={scores.length}
          icon={FileText}
          color="secondary"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* CO Performance Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                Course Outcome (CO) Performance
              </h3>
              <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-6">
                Your performance across all course outcomes
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8CBC0" />
                  <XAxis dataKey="co" stroke="#666" />
                  <YAxis stroke="#666" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E9762B',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="performance" fill={CHART_COLORS.primary} radius={[8, 8, 0, 0]} name="Performance %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* PO Attainment Radar Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                Program Outcome (PO) Attainment
              </h3>
              <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-6">
                Contribution to program outcomes
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={poChartData}>
                  <PolarGrid stroke="#D8CBC0" />
                  <PolarAngleAxis dataKey="po" stroke="#666" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666" />
                  <Radar
                    name="PO Attainment"
                    dataKey="attainment"
                    stroke={CHART_COLORS.secondary}
                    fill={CHART_COLORS.secondary}
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E9762B',
                      borderRadius: '8px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assessment Trend Line Chart */}
        {assessmentTrendData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                  Assessment Performance Trend
                </h3>
                <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-6">
                  Your performance across different assessments
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={assessmentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D8CBC0" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E9762B',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke={CHART_COLORS.success}
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS.success, r: 6 }}
                      activeDot={{ r: 8 }}
                      name="Percentage"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* CO Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-6">
              Detailed CO Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-dark-border">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">CO Number</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">Marks Obtained</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">Max Marks</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">Performance</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {coPerformance.map((co) => {
                    const percentage = parseFloat(co.percentage) || 0;
                    return (
                      <tr key={co.coNumber} className="border-b border-neutral-200 dark:border-dark-border hover:bg-neutral-50 dark:hover:bg-dark-bg-secondary">
                        <td className="px-4 py-3">
                          <Badge>CO {co.coNumber}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-dark-text-secondary">
                          {co.scored || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-dark-text-secondary">
                          {co.maxMarks || 0}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${
                            percentage >= 80
                              ? 'text-success-600 dark:text-success-500'
                              : percentage >= 60
                              ? 'text-warning-600 dark:text-warning-500'
                              : 'text-error-600 dark:text-error-500'
                          }`}>
                            {percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  percentage >= 80
                                    ? 'bg-success-500'
                                    : percentage >= 60
                                    ? 'bg-warning-500'
                                    : 'bg-error-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageLayout>
  );
};

export default CourseAnalytics;
