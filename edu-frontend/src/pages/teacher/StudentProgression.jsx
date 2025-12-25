import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  User,
  GraduationCap,
  TrendingUp
} from 'lucide-react';
import {
  CGPACard,
  SemesterCard,
  CourseGradeTable,
  CGPATrendChart,
  SemesterSubjectManager
} from '../../components/grades';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Alert } from '../../components/ui/alert';

/**
 * StudentProgression Component
 * Displays comprehensive 8-semester progression timeline for students
 * Shows CGPA, semester-wise breakdown, and course details
 */
const StudentProgression = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [progressionData, setProgressionData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/students/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setStudents(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadStudentProgression = async (studentId) => {
    setLoading(true);
    setError(null);
    setProgressionData(null);
    setSelectedSemester(null);

    try {
      const response = await fetch(`http://localhost:8080/api/progression/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setProgressionData(result.data);
      } else {
        setError(result.message || 'Failed to load progression data');
      }
    } catch (err) {
      setError('Failed to load progression data: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    if (student) {
      loadStudentProgression(student.id);
    } else {
      setProgressionData(null);
      setSelectedSemester(null);
    }
  };

  const handleSemesterClick = (semester) => {
    setSelectedSemester(selectedSemester === semester ? null : semester);
  };

  const handleExport = () => {
    if (!progressionData) return;

    const jsonData = JSON.stringify(progressionData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progression_${progressionData.student.usn}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.usn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
          Student Progression Tracker
        </h1>
        <p className="text-neutral-600 dark:text-dark-text-secondary">
          View comprehensive 8-semester academic progression with CGPA tracking
        </p>
      </div>

      {/* Student Search */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                Search Student by USN or Name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-neutral-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg-primary text-neutral-800 dark:text-dark-text-primary placeholder:text-neutral-500 focus:outline-none focus:border-primary-500 dark:focus:border-dark-green-500"
                />
              </div>
              {filteredStudents.length > 0 && searchQuery && (
                <div className="mt-2 max-h-60 overflow-y-auto border-2 border-neutral-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg-primary">
                  {filteredStudents.slice(0, 10).map((student) => (
                    <button
                      key={student.id}
                      onClick={() => {
                        handleStudentSelect(student);
                        setSearchQuery('');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-dark-bg-secondary transition-colors border-b border-neutral-100 dark:border-dark-border last:border-0"
                    >
                      <p className="font-medium text-neutral-800 dark:text-dark-text-primary">
                        {student.usn}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                        {student.name}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!progressionData}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Progression Data */}
      {progressionData && !loading && (
        <>
          {/* Student Info Card */}
          <Card className="mb-8 border-l-4 border-l-primary-500">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text-primary">
                      {progressionData.student.name}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                      {progressionData.student.usn}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary-600 dark:text-dark-green-500" />
                  <div>
                    <p className="text-xs text-neutral-600 dark:text-dark-text-secondary">
                      Department
                    </p>
                    <p className="text-sm font-medium text-neutral-800 dark:text-dark-text-primary">
                      {progressionData.student.department}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-neutral-600 dark:text-dark-text-secondary">
                    Current Semester
                  </p>
                  <p className="text-2xl font-bold text-primary-600 dark:text-dark-green-500">
                    Semester {progressionData.currentSemester}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600 dark:text-dark-text-secondary">
                    Total Credits
                  </p>
                  <p className="text-2xl font-bold text-success-600 dark:text-success-500">
                    {progressionData.totalCredits}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CGPA Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="md:col-span-2">
              <CGPACard
                cgpa={progressionData.cgpa}
                label="Overall CGPA"
                size="large"
              />
            </div>
            <div className="md:col-span-3">
              <CGPATrendChart
                cgpaHistory={progressionData.cgpaHistory}
                height={200}
              />
            </div>
          </div>

          {/* Semester Timeline */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-6">
                8-Semester Progression Timeline
              </h2>

              {/* Grid Layout - 4 cards per row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {progressionData.semesters.map((sem) => (
                  <SemesterCard
                    key={sem.semester}
                    semester={sem.semester}
                    sgpa={sem.sgpa}
                    status={sem.status}
                    credits={sem.credits}
                    creditsEarned={sem.creditsEarned}
                    year={sem.year}
                    onClick={() => handleSemesterClick(sem.semester)}
                    isActive={selectedSemester === sem.semester}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-t-4 border-t-primary-500">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-2">
                  Semesters Completed
                </p>
                <p className="text-4xl font-bold text-primary-600 dark:text-dark-green-500">
                  {progressionData.semestersCompleted}/8
                </p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-success-500">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-2">
                  Courses Completed
                </p>
                <p className="text-4xl font-bold text-success-600 dark:text-success-500">
                  {progressionData.totalCoursesCompleted}
                </p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-error-500">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-2">
                  Courses Failed
                </p>
                <p className="text-4xl font-bold text-error-600 dark:text-error-500">
                  {progressionData.totalCoursesFailed}
                </p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-accent-500">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-2">
                  Pass Percentage
                </p>
                <p className="text-4xl font-bold text-accent-600 dark:text-accent-500">
                  {progressionData.totalCoursesCompleted > 0
                    ? Math.round((progressionData.totalCoursesCompleted / (progressionData.totalCoursesCompleted + progressionData.totalCoursesFailed)) * 100)
                    : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Semester Details (Expandable) */}
          {selectedSemester && (
            <Card className="mb-8 animate-in fade-in-0 slide-in-from-top-4">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary">
                    Semester {selectedSemester} - Course Details
                  </h2>
                  <button
                    onClick={() => setSelectedSemester(null)}
                    className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-dark-text-secondary dark:hover:bg-dark-bg-tertiary transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 rotate-180" />
                  </button>
                </div>

                <div className="h-px bg-neutral-200 dark:bg-dark-border mb-6" />

                {(() => {
                  try {
                    const semester = progressionData?.semesters?.find(s => s.semester === selectedSemester);
                    if (!semester) {
                      return (
                        <Alert variant="info">
                          No data available for Semester {selectedSemester}
                        </Alert>
                      );
                    }

                    const courses = semester.courses || [];
                    if (courses.length === 0) {
                      return (
                        <Alert variant="info">
                          No course data available for this semester
                        </Alert>
                      );
                    }

                    return (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div>
                            <p className="text-xs text-neutral-600 dark:text-dark-text-secondary mb-1">
                              Academic Year
                            </p>
                            <p className="text-lg font-bold text-neutral-800 dark:text-dark-text-primary">
                              {semester.year || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-600 dark:text-dark-text-secondary mb-1">
                              SGPA
                            </p>
                            <p className="text-lg font-bold text-primary-600 dark:text-dark-green-500">
                              {semester.sgpa !== null && semester.sgpa !== undefined ? semester.sgpa.toFixed(2) : '--'} / 10
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-600 dark:text-dark-text-secondary mb-1">
                              Courses
                            </p>
                            <p className="text-lg font-bold text-neutral-800 dark:text-dark-text-primary">
                              {semester.coursesPassed || 0}/{semester.coursesRegistered || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-600 dark:text-dark-text-secondary mb-1">
                              Credits Earned
                            </p>
                            <p className="text-lg font-bold text-success-600 dark:text-success-500">
                              {semester.creditsEarned || 0}/{semester.credits || 0}
                            </p>
                          </div>
                        </div>

                        <CourseGradeTable courses={courses} showSummary={true} />
                      </>
                    );
                  } catch (err) {
                    console.error('Error rendering semester details:', err);
                    return (
                      <Alert variant="warning">
                        Unable to load semester details. Please try again.
                      </Alert>
                    );
                  }
                })()}
              </CardContent>
            </Card>
          )}

          {/* Semester Subject Management */}
          {selectedSemester && selectedStudent && (
            <div className="mb-8">
              <SemesterSubjectManager
                studentId={selectedStudent.id}
                semester={selectedSemester}
                academicYear={
                  progressionData?.semesters?.find(s => s.semester === selectedSemester)?.year ||
                  new Date().getFullYear()
                }
                onUpdate={() => {
                  if (selectedStudent?.id) {
                    loadStudentProgression(selectedStudent.id);
                  }
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!selectedStudent && !loading && (
        <Card className="p-16 text-center">
          <Search className="w-20 h-20 text-neutral-300 dark:text-dark-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
            Select a student to view their progression
          </h3>
          <p className="text-neutral-600 dark:text-dark-text-secondary">
            Use the search box above to find a student by USN or name
          </p>
        </Card>
      )}
    </div>
  );
};

export default StudentProgression;
