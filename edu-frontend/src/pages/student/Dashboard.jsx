import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  TrendingUp,
  ClipboardList,
  Trophy,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';
import { Spinner } from '../../components/ui/progress';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const [coursePerformance, setCoursePerformance] = useState({});

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await studentAPI.getCourses();
      const coursesData = response.data.data || [];
      setCourses(coursesData);

      // Load performance data for each course
      const performanceData = {};
      for (const course of coursesData) {
        try {
          const [marksRes, analyticsRes] = await Promise.all([
            studentAPI.getMarks(course.id).catch(() => ({ data: { data: [] } })),
            studentAPI.getAnalytics(course.id).catch(() => ({ data: { data: {} } })),
          ]);

          const marks = marksRes.data.data || [];
          const totalMarks = marks.reduce((sum, m) => sum + m.totalMarks, 0);
          const totalMaxMarks = marks.reduce((sum, m) => sum + m.maxMarks, 0);
          const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

          performanceData[course.id] = {
            percentage: overallPercentage,
            totalMarks,
            totalMaxMarks,
            assessmentCount: marks.length,
            rank: analyticsRes.data.data?.rank,
            totalStudents: analyticsRes.data.data?.totalStudents,
          };
        } catch (err) {
          console.error(`Error loading performance for course ${course.id}:`, err);
        }
      }
      setCoursePerformance(performanceData);
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

  // Calculate dashboard stats
  const totalCourses = courses.length;
  const currentSemesterCourses = courses.filter(
    (c) => c.semester === Math.max(...courses.map((course) => course.semester))
  );
  
  const avgPerformance = courses.length > 0
    ? courses.reduce((sum, c) => sum + (coursePerformance[c.id]?.percentage || 0), 0) / courses.length
    : 0;
  
  const coursesWithMarks = courses.filter(c => coursePerformance[c.id]?.assessmentCount > 0).length;

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
                Welcome, {user?.name}!
              </h1>
              <p className="text-white/95 text-base md:text-lg">
                {totalCourses > 0
                  ? "Track your learning outcomes and course progress."
                  : 'Get started by enrolling in your courses below.'}
              </p>
            </div>
          </div>

          {user?.department && (
            <div className="flex gap-2 flex-wrap mt-4">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                Department: {user.department}
              </Badge>
              {user?.usn && (
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  USN: {user.usn}
                </Badge>
              )}
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
                {totalCourses}
              </p>
              <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                Enrolled courses
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Semester */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className="hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-neutral-600 dark:text-dark-text-secondary">
                  Current Semester
                </p>
                <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-success-600 dark:text-success-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-success-600 dark:text-success-500">
                {currentSemesterCourses.length}
              </p>
              <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                Active courses
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avg Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-neutral-600 dark:text-dark-text-secondary">
                  Avg Performance
                </p>
                <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-secondary-600 dark:text-secondary-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-secondary-600 dark:text-secondary-500">
                {avgPerformance.toFixed(1)}%
              </p>
              <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                Overall grade
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Class Rank */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-neutral-600 dark:text-dark-text-secondary">
                  Class Rank
                </p>
                <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-warning-600 dark:text-warning-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-warning-600 dark:text-warning-500">
                --
              </p>
              <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                Out of total
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Enrolled Courses or Empty State */}
      {courses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="text-center py-12 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-dark-bg-secondary dark:to-dark-bg-tertiary">
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <UserPlus className="w-20 h-20 text-primary-600 dark:text-dark-green-500 opacity-80" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text-primary">
                No Courses Enrolled Yet
              </h2>
              <p className="text-neutral-600 dark:text-dark-text-secondary max-w-md mx-auto">
                Start your learning journey by enrolling in courses. Select a course from the sidebar to get started.
              </p>
              <div className="pt-2">
                <Button
                  size="lg"
                  onClick={() => navigate('/student/enroll')}
                  className="px-6"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Enroll in Course
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Courses Section Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-1">
              Your Courses
            </h2>
            <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
              Click on any course to view detailed analytics
            </p>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course, index) => {
              const gradientColors = [
                'from-primary-500 to-primary-600 dark:from-dark-green-500 dark:to-dark-green-600',
                'from-secondary-500 to-secondary-600 dark:from-secondary-600 dark:to-secondary-700',
                'from-success-500 to-success-600 dark:from-success-600 dark:to-success-700',
              ];
              const performance = coursePerformance[course.id];
              const percentage = performance?.percentage || 0;
              const performanceColor =
                percentage >= 60 ? 'success' : percentage >= 40 ? 'warning' : 'error';

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                >
                  <Card
                    onClick={() => navigate(`/student/courses/${course.id}`)}
                    className="cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    {/* Header with Gradient */}
                    <div className={`bg-gradient-to-br ${gradientColors[index % 3]} p-6 text-white`}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold">{course.code}</h3>
                        <Badge className="bg-white/25 text-white border-white/30 hover:bg-white/35">
                          Sem {course.semester}
                        </Badge>
                      </div>
                      <p className="text-sm text-white/95">{course.name}</p>
                    </div>

                    <CardContent className="p-6 space-y-4">
                      {performance && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                              Performance
                            </span>
                            <Badge variant={performanceColor}>
                              {percentage.toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="h-2 w-full bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                percentage >= 60
                                  ? 'bg-success-500'
                                  : percentage >= 40
                                  ? 'bg-warning-500'
                                  : 'bg-error-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                            Credits
                          </span>
                          <Badge variant="outline">{course.credits || 3}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                            Instructor
                          </span>
                          <span className="text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">
                            {course.teacher_name || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                            Assessments
                          </span>
                          <span className="text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">
                            {performance?.assessmentCount || 0}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-neutral-200 dark:border-dark-border flex items-center justify-center gap-2 text-primary-600 dark:text-dark-green-500">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-semibold">View Performance Analytics</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDashboard;
