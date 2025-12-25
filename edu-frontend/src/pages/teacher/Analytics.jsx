import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  GraduationCap,
  Users,
  FileText,
  Upload,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { courseAPI, marksheetAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';
import { PageLoader } from '../../components/shared/Loading';
import StatsCard from '../../components/shared/StatsCard';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Alert } from '../../components/ui/alert';
import { CHART_COLORS } from '../../config/chartColors';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courseData, setCourseData] = useState(null);
  const [students, setStudents] = useState([]);
  const [marksheets, setMarksheets] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [coPoMapping, setCOPOMapping] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData(selectedCourse);
      loadCOPOMapping(selectedCourse);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getAll();
      const courseList = response.data.data || [];
      setCourses(courseList);

      if (courseList.length > 0) {
        setSelectedCourse(courseList[0].id);
      } else {
        toast.info('No courses found. Please create a course first.');
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error(error.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseData = async (courseId) => {
    try {
      setLoadingData(true);

      const [courseRes, studentsRes, marksheetsRes] = await Promise.all([
        courseAPI.getById(courseId),
        courseAPI.getEnrolledStudents(courseId),
        marksheetAPI.getByCourse(courseId).catch(() => ({ data: { data: [] } })),
      ]);

      setCourseData(courseRes.data.data);
      setStudents(studentsRes.data.data || []);
      setMarksheets(marksheetsRes.data.data || []);

      if ((marksheetsRes.data.data || []).length === 0) {
        toast.info('No marksheets uploaded yet. Upload CIE data to see analytics.');
      }
    } catch (error) {
      console.error('Error loading course data:', error);
      toast.error(error.response?.data?.message || 'Failed to load course data');
    } finally {
      setLoadingData(false);
    }
  };

  const loadCOPOMapping = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/attainment/course/${courseId}/co-po-mapping`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCOPOMapping(response.data.data);
    } catch (error) {
      console.error('Error loading CO-PO mapping:', error);
    }
  };

  if (loading) return <PageLoader message="Loading analytics..." />;

  const selectedCourseInfo = courses.find(c => c.id === selectedCourse);

  // Calculate analytics from marksheet data
  const totalCOs = courseData?.course_outcomes?.length || 0;
  const totalStudents = students.length;
  const totalAssessments = marksheets.length;

  // Prepare chart data from marksheets
  const assessmentData = marksheets.map((marksheet, idx) => ({
    name: marksheet.assessment_name || `Assessment ${idx + 1}`,
    students: (marksheet.row_count || 1) - 1,
    columns: marksheet.columns?.length || 0,
    uploadDate: new Date(marksheet.created_at).toLocaleDateString(),
  }));

  return (
    <PageLayout
      title="Course Analytics"
      subtitle="Comprehensive performance analytics and attainment tracking"
      icon={TrendingUp}
      breadcrumbs={[
        { label: 'Dashboard', to: '/teacher/dashboard' },
        { label: 'Analytics' },
      ]}
      actions={
        <div className="relative">
          <label htmlFor="course-select" className="block text-xs font-medium text-neutral-600 dark:text-dark-text-secondary mb-1">
            Select Course
          </label>
          <div className="relative">
            <select
              id="course-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="appearance-none w-full min-w-[300px] px-4 py-2 pr-10 bg-white dark:bg-dark-bg-secondary border-2 border-neutral-300 dark:border-dark-border rounded-xl text-sm font-medium text-neutral-800 dark:text-dark-text-primary focus:outline-none focus:border-primary-500 dark:focus:border-dark-green-500"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none" />
          </div>
        </div>
      }
    >
      {courses.length === 0 ? (
        <Alert className="border-2">
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-neutral-800 dark:text-dark-text-primary">
              No Courses Found
            </h4>
            <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
              You don't have any courses yet. Please create a course first to view analytics.
            </p>
            <Button
              onClick={() => navigate('/teacher/courses')}
              className="mt-4"
            >
              Go to Courses
            </Button>
          </div>
        </Alert>
      ) : !selectedCourse ? (
        <Alert>Please select a course to view analytics</Alert>
      ) : loadingData ? (
        <div className="flex justify-center py-16">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Course Info Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 text-white border-0">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-[auto,1fr,auto] gap-4 items-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                    <GraduationCap className="w-9 h-9" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold mb-2">
                      {selectedCourseInfo?.code}
                    </h2>
                    <p className="text-xl opacity-90 mb-3">
                      {selectedCourseInfo?.name}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className="bg-white/90 text-primary-700 dark:text-dark-green-700 hover:bg-white">
                        Semester {selectedCourseInfo?.semester}
                      </Badge>
                      <Badge className="bg-white/90 text-primary-700 dark:text-dark-green-700 hover:bg-white">
                        {selectedCourseInfo?.credits || 3} Credits
                      </Badge>
                      <Badge className="bg-white/90 text-primary-700 dark:text-dark-green-700 hover:bg-white">
                        {selectedCourseInfo?.year || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => navigate('/teacher/upload')}
                    className="bg-white text-primary-600 hover:bg-white/90 dark:text-dark-green-600"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Marks
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <StatsCard
              title="Course Outcomes"
              value={totalCOs}
              icon={FileText}
              color="primary"
            />
            <StatsCard
              title="Enrolled Students"
              value={totalStudents}
              icon={Users}
              color="success"
            />
            <StatsCard
              title="Assessments Uploaded"
              value={totalAssessments}
              icon={Upload}
              color="warning"
            />
            <StatsCard
              title="Academic Year"
              value={selectedCourseInfo?.year || '--'}
              icon={GraduationCap}
              color="secondary"
            />
          </div>

          {marksheets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-12 text-center bg-neutral-50 dark:bg-dark-bg-secondary">
                <Upload className="w-20 h-20 text-neutral-400 dark:text-dark-text-muted mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-neutral-800 dark:text-dark-text-primary mb-3">
                  No Assessment Data Available
                </h3>
                <p className="text-neutral-600 dark:text-dark-text-secondary mb-6 max-w-2xl mx-auto">
                  Upload CIE (Continuous Internal Evaluation) marksheets to view comprehensive analytics,
                  attainment calculations, and performance insights for this course.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => navigate('/teacher/upload')}
                    className="bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 px-8 py-3"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Marks
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate(`/teacher/courses/${selectedCourse}`)}
                  >
                    View Course Details
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Assessment Overview Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card className="h-full">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                          Assessment Overview
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-6">
                          Students and columns per assessment
                        </p>
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={assessmentData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#D8CBC0" />
                            <XAxis dataKey="name" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #E9762B',
                                borderRadius: '8px',
                              }}
                            />
                            <Legend />
                            <Bar dataKey="students" fill={CHART_COLORS.primary} name="Students" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="columns" fill={CHART_COLORS.accent} name="Columns" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card className="h-full">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                          Quick Actions
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-6">
                          Manage your course data
                        </p>
                        <div className="flex flex-col gap-3">
                          <Button
                            variant="outline"
                            onClick={() => navigate('/teacher/upload')}
                            className="justify-start py-3 h-auto"
                          >
                            <Upload className="w-5 h-5 mr-3" />
                            Upload New Assessment
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/teacher/courses/${selectedCourse}`)}
                            className="justify-start py-3 h-auto"
                          >
                            <Eye className="w-5 h-5 mr-3" />
                            View Course Details
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigate('/teacher/courses')}
                            className="justify-start py-3 h-auto"
                          >
                            <GraduationCap className="w-5 h-5 mr-3" />
                            All Courses
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>

              {/* Uploaded Marksheets Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary">
                          Uploaded Assessments ({marksheets.length})
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                          CIE and assessment marksheets
                        </p>
                      </div>
                      <Button
                        onClick={() => navigate('/teacher/upload')}
                        className="bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload More
                      </Button>
                    </div>

                    <div className="border border-neutral-200 dark:border-dark-border rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-neutral-50 dark:bg-dark-bg-secondary">
                              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">Assessment Name</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">File Name</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">Students</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">Columns</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">Uploaded On</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-700 dark:text-dark-text-primary">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {marksheets.map((marksheet) => (
                              <tr key={marksheet.id} className="border-t border-neutral-200 dark:border-dark-border hover:bg-neutral-50 dark:hover:bg-dark-bg-secondary">
                                <td className="px-4 py-3">
                                  <span className="text-sm font-semibold text-neutral-800 dark:text-dark-text-primary">
                                    {marksheet.assessment_name || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs font-mono text-neutral-600 dark:text-dark-text-secondary">
                                    {marksheet.file_name}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant="outline">
                                    {(marksheet.row_count || 1) - 1}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant="outline" className="border-secondary-500 text-secondary-600 dark:border-secondary-400 dark:text-secondary-400">
                                    {marksheet.columns?.length || 0}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm text-neutral-700 dark:text-dark-text-secondary">
                                  {new Date(marksheet.created_at || marksheet.uploadDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/teacher/courses/${selectedCourse}`)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* CO-PO Mapping Heatmap */}
              {coPoMapping && coPoMapping.cos.length > 0 && coPoMapping.pos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
                        CO-PO Mapping Heatmap
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-6">
                        Correlation levels: <strong className="text-success-600">High (3)</strong>, <strong className="text-warning-600">Medium (2)</strong>, <strong className="text-blue-600">Low (1)</strong>, <strong className="text-neutral-400">None (0)</strong>
                      </p>

                      <div className="border border-neutral-200 dark:border-dark-border rounded-2xl overflow-hidden max-h-[600px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-bold bg-neutral-100 dark:bg-dark-bg-tertiary text-neutral-700 dark:text-dark-text-primary min-w-[100px] sticky left-0 z-20">
                                CO / PO
                              </th>
                              {coPoMapping.pos.map(po => (
                                <th
                                  key={po.po_number}
                                  className="px-4 py-3 text-center text-sm font-bold bg-neutral-100 dark:bg-dark-bg-tertiary text-neutral-700 dark:text-dark-text-primary min-w-[60px] whitespace-nowrap"
                                >
                                  PO{po.po_number}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {coPoMapping.cos.map(co => (
                              <tr key={co.co_number} className="hover:bg-neutral-50 dark:hover:bg-dark-bg-secondary">
                                <td className="px-4 py-3 font-bold text-neutral-800 dark:text-dark-text-primary bg-white dark:bg-dark-bg-primary sticky left-0 border-r border-neutral-200 dark:border-dark-border">
                                  CO{co.co_number}
                                </td>
                                {coPoMapping.pos.map(po => {
                                  const level = coPoMapping.mappingMatrix[co.co_number]?.[po.po_number] || 0;
                                  const getColor = (level) => {
                                    if (level === 3) return 'bg-success-500 hover:bg-success-600';
                                    if (level === 2) return 'bg-warning-500 hover:bg-warning-600';
                                    if (level === 1) return 'bg-blue-500 hover:bg-blue-600';
                                    return 'bg-neutral-200 dark:bg-dark-bg-tertiary';
                                  };
                                  const getLabel = (level) => {
                                    if (level === 3) return 'H';
                                    if (level === 2) return 'M';
                                    if (level === 1) return 'L';
                                    return '-';
                                  };
                                  return (
                                    <td
                                      key={po.po_number}
                                      className="px-4 py-3 text-center border-r border-neutral-200 dark:border-dark-border transition-all"
                                    >
                                      <span className={`inline-flex items-center justify-center min-w-[36px] h-7 rounded-lg px-2 font-bold text-sm ${getColor(level)} ${level > 0 ? 'text-white' : 'text-neutral-500'}`}>
                                        {getLabel(level)}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* CO Descriptions */}
                      <div className="mt-6 p-4 rounded-2xl bg-neutral-50 dark:bg-dark-bg-secondary">
                        <h4 className="text-sm font-bold text-neutral-700 dark:text-dark-text-primary mb-4">
                          Course Outcomes
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {coPoMapping.cos.map(co => (
                            <div key={co.co_number} className="flex gap-3">
                              <Badge className="mt-1 flex-shrink-0">CO{co.co_number}</Badge>
                              <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                                {co.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* PO Descriptions */}
                      <div className="mt-4 p-4 rounded-2xl bg-neutral-50 dark:bg-dark-bg-secondary">
                        <h4 className="text-sm font-bold text-neutral-700 dark:text-dark-text-primary mb-4">
                          Program Outcomes
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {coPoMapping.pos.map(po => (
                            <div key={po.po_number} className="flex gap-3">
                              <Badge variant="outline" className="mt-1 flex-shrink-0 border-secondary-500 text-secondary-600 dark:border-secondary-400 dark:text-secondary-400">PO{po.po_number}</Badge>
                              <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                                {po.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default Analytics;
