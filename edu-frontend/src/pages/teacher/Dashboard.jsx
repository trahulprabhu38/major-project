import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  TrendingUp,
  Upload,
  BarChart3,
  Users,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { courseAPI } from '../../services/api';
import { Spinner } from '../../components/ui/progress';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalAssessments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await courseAPI.getAll();
      const courses = response.data.data || [];

      setStats({
        totalCourses: courses.length,
        totalStudents: 0,
        totalAssessments: 0,
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-neutral-600 dark:text-dark-text-secondary">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-error-600 mb-4">Error loading dashboard</p>
          <button onClick={loadDashboardData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Quick access cards data
  const quickAccessCards = [
    {
      title: 'Upload Assessments',
      description: 'Upload marks and question papers',
      icon: Upload,
      color: 'text-primary-600 dark:text-dark-green-500',
      bgColor: 'bg-primary-50 dark:bg-primary-900/20',
      path: '/teacher/upload',
    },
    {
      title: 'View Analytics',
      description: 'CO/PO attainment analysis',
      icon: BarChart3,
      color: 'text-secondary-600 dark:text-secondary-500',
      bgColor: 'bg-secondary-50 dark:bg-secondary-900/20',
      path: '/teacher/analytics',
    },
    {
      title: 'Manage Courses',
      description: 'View and edit course details',
      icon: GraduationCap,
      color: 'text-accent-600 dark:text-dark-accent-500',
      bgColor: 'bg-accent-50 dark:bg-accent-900/20',
      path: '/teacher/courses',
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Hero Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-gradient-to-br from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 rounded-2xl p-6 md:p-8 text-white shadow-xl">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-white/95 text-base md:text-lg">
                Manage your courses, track assessments, and analyze CO/PO attainment.
              </p>
            </div>
          </div>

          {user?.department && (
            <div className="flex gap-2 flex-wrap mt-4">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                Department: {user.department}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                Teacher
              </Badge>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Courses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Card className="hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-neutral-600 dark:text-dark-text-secondary">
                  Total Courses
                </p>
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary-600 dark:text-dark-green-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary-600 dark:text-dark-green-500">
                {stats.totalCourses}
              </p>
              <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                Active courses
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Students */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className="hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-neutral-600 dark:text-dark-text-secondary">
                  Total Students
                </p>
                <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-success-600 dark:text-success-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-success-600 dark:text-success-500">
                {stats.totalStudents}
              </p>
              <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                Enrolled students
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assessments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-neutral-600 dark:text-dark-text-secondary">
                  Assessments
                </p>
                <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-secondary-600 dark:text-secondary-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-secondary-600 dark:text-secondary-500">
                {stats.totalAssessments}
              </p>
              <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                Total evaluations
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avg Attainment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-neutral-600 dark:text-dark-text-secondary">
                  Avg Attainment
                </p>
                <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-warning-600 dark:text-warning-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-warning-600 dark:text-warning-500">
                --
              </p>
              <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                Overall percentage
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Access Section */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-1">
            Quick Access
          </h2>
          <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
            Navigate to commonly used features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {quickAccessCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
                whileHover={{ scale: 1.05, y: -8 }}
              >
                <Card
                  onClick={() => navigate(card.path)}
                  className="cursor-pointer hover:shadow-xl transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div
                      className={`w-16 h-16 rounded-xl ${card.bgColor} flex items-center justify-center mb-4`}
                    >
                      <Icon className={`w-8 h-8 ${card.color}`} />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                      {card.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-3">
                      {card.description}
                    </p>
                    <div className={`flex items-center gap-1 ${card.color}`}>
                      <span className="text-sm font-semibold">Open</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
