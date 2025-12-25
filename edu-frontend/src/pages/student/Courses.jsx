import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  TrendingUp,
  ArrowRight,
  Award,
  Target,
} from 'lucide-react';
import { studentAPI, gradesAPI } from '../../services/api';
import { Spinner } from '../../components/ui/progress';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const StudentCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coursePerformance, setCoursePerformance] = useState({});

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await studentAPI.getCourses();
      const coursesData = response.data.data || [];
      setCourses(coursesData);

      // Fetch performance data for each course
      const performancePromises = coursesData.map(async (course) => {
        try {
          const [analyticsRes, gradeRes] = await Promise.all([
            studentAPI.getAnalytics(course.id).catch(() => ({ data: null })),
            studentAPI.getScores(course.id).catch(() => ({ data: null })),
          ]);
          return {
            courseId: course.id,
            analytics: analyticsRes.data,
            scores: gradeRes.data,
          };
        } catch (err) {
          return { courseId: course.id, analytics: null, scores: null };
        }
      });

      const performanceData = await Promise.all(performancePromises);
      const performanceMap = {};
      performanceData.forEach((data) => {
        performanceMap[data.courseId] = data;
      });
      setCoursePerformance(performanceMap);
    } catch (err) {
      console.error('Error loading courses:', err);
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
          <p className="mt-4 text-neutral-600 dark:text-dark-text-secondary">Loading your courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-error-600 mb-4">Error loading courses</p>
          <button onClick={loadCourses} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-dark-text-primary">
          My Courses
        </h1>
        <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mt-1">
          View all your enrolled courses and access detailed analytics
        </p>
      </div>

      {courses.length === 0 ? (
        <Card className="text-center py-12 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-dark-bg-secondary dark:to-dark-bg-tertiary">
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <GraduationCap className="w-20 h-20 text-primary-600 dark:text-dark-green-500 opacity-80" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text-primary">
              No Courses Enrolled Yet
            </h2>
            <p className="text-neutral-600 dark:text-dark-text-secondary max-w-md mx-auto">
              Start your learning journey by enrolling in courses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course, index) => {
            const gradientColors = [
              'from-primary-500 to-primary-600 dark:from-dark-green-500 dark:to-dark-green-600',
              'from-secondary-500 to-secondary-600 dark:from-secondary-600 dark:to-secondary-700',
              'from-success-500 to-success-600 dark:from-success-600 dark:to-success-700',
            ];

            const performance = coursePerformance[course.id];
            const grade = performance?.scores?.grade || 'N/A';
            const percentage = performance?.scores?.percentage || 0;
            const avgCOAttainment = performance?.analytics?.avgCOAttainment || 0;

            const getGradeColor = (grade) => {
              const colors = {
                'O': 'bg-success-600',
                'A+': 'bg-success-500',
                'A': 'bg-primary-600',
                'B+': 'bg-primary-500',
                'B': 'bg-warning-500',
                'C': 'bg-warning-600',
                'P': 'bg-neutral-500',
                'F': 'bg-error-600',
              };
              return colors[grade] || 'bg-neutral-500';
            };

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
                  <div className={`bg-gradient-to-br ${gradientColors[index % 3]} p-6 text-white relative`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold">{course.code}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-white/25 text-white border-white/30 hover:bg-white/35">
                          Sem {course.semester}
                        </Badge>
                        {grade !== 'N/A' && (
                          <div className={`${getGradeColor(grade)} text-white px-3 py-1 rounded-lg font-bold text-sm`}>
                            {grade}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-white/95">{course.name}</p>
                  </div>

                  <CardContent className="p-6 space-y-3">
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

                    {/* Performance Metrics */}
                    {percentage > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-600 dark:text-dark-text-secondary flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Your Score
                          </span>
                          <span className="text-sm font-bold text-primary-600 dark:text-dark-green-500">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {avgCOAttainment > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600 dark:text-dark-text-secondary flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          CO Attainment
                        </span>
                        <span className="text-sm font-bold text-secondary-600 dark:text-secondary-500">
                          {avgCOAttainment.toFixed(1)}%
                        </span>
                      </div>
                    )}

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
      )}
    </div>
  );
};

export default StudentCourses;
