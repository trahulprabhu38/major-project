import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Grid,
} from '@mui/material';
import { PersonAdd, School } from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { studentAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';

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
    <PageLayout
      title="Enroll in Course"
      subtitle="Register for a new course"
      icon={PersonAdd}
      breadcrumbs={[
        { label: 'Dashboard', to: '/student/dashboard', icon: School },
        { label: 'Enroll' },
      ]}
    >
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 4 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Please enter the course details provided by your instructor to enroll.
              </Alert>

              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Course Code"
                      name="course_code"
                      value={formData.course_code}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 22AI071"
                      helperText="Enter the course code (e.g., 22AI071)"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Course Name"
                      name="course_name"
                      value={formData.course_name}
                      onChange={handleChange}
                      placeholder="e.g., Database Management Systems"
                      helperText="Optional: Course name for reference"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Teacher Name"
                      name="teacher_name"
                      value={formData.teacher_name}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Rahul Prabhu"
                      helperText="Enter the teacher's full name"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Semester</InputLabel>
                      <Select
                        name="semester"
                        value={formData.semester}
                        onChange={handleChange}
                        label="Semester"
                      >
                        {semesters.map((sem) => (
                          <MenuItem key={sem} value={sem}>
                            Semester {sem}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Branch</InputLabel>
                      <Select
                        name="branch"
                        value={formData.branch}
                        onChange={handleChange}
                        label="Branch"
                      >
                        {branches.map((branch) => (
                          <MenuItem key={branch} value={branch}>
                            {branch}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => navigate('/student/dashboard')}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={loading}
                          startIcon={<PersonAdd />}
                          sx={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                            px: 4,
                            '&:hover': {
                              background: 'linear-gradient(135deg, #1e40af 0%, #6d28d9 100%)',
                            },
                          }}
                        >
                          {loading ? 'Enrolling...' : 'Enroll Now'}
                        </Button>
                      </motion.div>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </PageLayout>
  );
};

export default Enroll;
