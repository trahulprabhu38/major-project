import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, GraduationCap, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI } from '../../services/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';

const branches = ['CSE', 'ISE', 'AIML', 'ECE', 'ME', 'CIVIL'];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

const Enroll = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    teacher_name: '',
    semester: '',
    branch: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.course_code || !formData.teacher_name || !formData.semester || !formData.branch) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await studentAPI.enroll(formData);

      if (response.data.success) {
        toast.success('Successfully enrolled in course!');
        setTimeout(() => navigate('/student/dashboard'), 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-dark-text-primary">
          Enroll in Course
        </h1>
        <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mt-1">
          Register for a new course
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Info Alert */}
              <div className="flex gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                <Info className="w-5 h-5 text-primary-600 dark:text-dark-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-primary-800 dark:text-primary-200">
                  Please enter the course details provided by your instructor to enroll.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Course Code */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                    Course Code *
                  </label>
                  <Input
                    name="course_code"
                    value={formData.course_code}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 22AI071"
                  />
                  <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                    Enter the course code (e.g., 22AI071)
                  </p>
                </div>

                {/* Course Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                    Course Name
                  </label>
                  <Input
                    name="course_name"
                    value={formData.course_name}
                    onChange={handleChange}
                    placeholder="e.g., Database Management Systems"
                  />
                  <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                    Optional: Course name for reference
                  </p>
                </div>

                {/* Teacher Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                    Teacher Name *
                  </label>
                  <Input
                    name="teacher_name"
                    value={formData.teacher_name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Rahul Prabhu"
                  />
                  <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-1">
                    Enter the teacher's full name
                  </p>
                </div>

                {/* Semester and Branch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                      Semester *
                    </label>
                    <Select
                      name="semester"
                      value={formData.semester}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Semester</option>
                      {semesters.map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                      Branch *
                    </label>
                    <Select
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/student/dashboard')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button type="submit" disabled={loading} size="lg" className="px-6">
                      <UserPlus className="w-5 h-5 mr-2" />
                      {loading ? 'Enrolling...' : 'Enroll Now'}
                    </Button>
                  </motion.div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Enroll;
