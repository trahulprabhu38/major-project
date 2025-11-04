import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Add,
  School,
  MoreVert,
  Edit,
  Delete,
  BarChart,
  People,
  Dashboard,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { courseAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';
import { PageLoader } from '../../components/shared/Loading';
import { ErrorState, EmptyState } from '../../components/shared/ErrorState';

const MotionCard = motion(Card);

const Courses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    semester: '',
    year: '',
    credits: 3,
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await courseAPI.getAll();
      setCourses(response.data.data || []);
    } catch (err) {
      console.error('Error loading courses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDialogOpen = (course = null) => {
    if (course) {
      setEditMode(true);
      setSelectedCourse(course);
      setFormData({
        code: course.code,
        name: course.name,
        description: course.description || '',
        semester: course.semester,
        year: course.year,
        credits: course.credits || 3,
      });
    } else {
      setEditMode(false);
      setSelectedCourse(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        semester: '',
        year: new Date().getFullYear(),
        credits: 3,
      });
    }
    setDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditMode(false);
    setSelectedCourse(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await courseAPI.update(selectedCourse.id, formData);
        toast.success('Course updated successfully!');
      } else {
        await courseAPI.create(formData);
        toast.success('Course created successfully!');
      }
      handleDialogClose();
      loadCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    try {
      await courseAPI.delete(courseId);
      toast.success('Course deleted successfully!');
      loadCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleMenuOpen = (event, course) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedCourse(course);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedCourse(null);
  };

  if (loading) return <PageLoader message="Loading courses..." />;
  if (error) return <ErrorState onRetry={loadCourses} />;

  return (
    <PageLayout
      title="My Courses"
      subtitle="Manage your courses and view analytics"
      icon={School}
      breadcrumbs={[
        { label: 'Dashboard', to: '/teacher/dashboard', icon: Dashboard },
        { label: 'Courses' },
      ]}
      actions={
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleDialogOpen()}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.5,
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
              boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)',
            },
          }}
        >
          Create Course
        </Button>
      }
    >
      {courses.length === 0 ? (
        <EmptyState
          title="No Courses Created"
          message="Get started by creating your first course"
          action={() => handleDialogOpen()}
          actionLabel="Create Course"
        />
      ) : (
        <Grid container spacing={3}>
          {courses.map((course, index) => (
            <Grid item xs={12} md={6} lg={4} key={course.id}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => navigate(`/teacher/courses/${course.id}`)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 3,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  },
                }}
              >
                {/* Header with Gradient */}
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${
                      index % 4 === 0
                        ? '#2563eb'
                        : index % 4 === 1
                        ? '#7c3aed'
                        : index % 4 === 2
                        ? '#059669'
                        : '#ea580c'
                    } 0%, ${
                      index % 4 === 0
                        ? '#1e40af'
                        : index % 4 === 1
                        ? '#6d28d9'
                        : index % 4 === 2
                        ? '#047857'
                        : '#c2410c'
                    } 100%)`,
                    p: 3,
                    color: 'white',
                    position: 'relative',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {course.code}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip
                        label={`Sem ${course.semester}`}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.25)',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, course)}
                        sx={{ color: 'white', ml: 1 }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.95 }}>
                    {course.name}
                  </Typography>
                </Box>

                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Credits
                      </Typography>
                      <Chip label={course.credits || 3} size="small" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Academic Year
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {course.year}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Students Enrolled
                      </Typography>
                      <Chip
                        icon={<People fontSize="small" />}
                        label={course.enrolled_students || 0}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  </Box>

                  {course.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        mt: 2,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {course.description}
                    </Typography>
                  )}

                  <Box
                    sx={{
                      mt: 2,
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      color: 'primary.main',
                    }}
                  >
                    <BarChart fontSize="small" />
                    <Typography variant="body2" fontWeight={600}>
                      View Analytics
                    </Typography>
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Course Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            handleDialogOpen(selectedCourse);
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit Course
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDelete(selectedCourse.id);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete Course
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
            {editMode ? 'Edit Course' : 'Create New Course'}
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Course Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                fullWidth
                placeholder="e.g., CS101"
                disabled={editMode}
              />
              <TextField
                label="Course Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
                placeholder="e.g., Data Structures"
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
                placeholder="Brief description of the course"
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Semester"
                  type="number"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                  required
                  fullWidth
                  InputProps={{ inputProps: { min: 1, max: 8 } }}
                />
                <TextField
                  label="Academic Year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  required
                  fullWidth
                  InputProps={{ inputProps: { min: 2020, max: 2030 } }}
                />
              </Box>
              <TextField
                label="Credits"
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                required
                fullWidth
                InputProps={{ inputProps: { min: 1, max: 6 } }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleDialogClose} variant="outlined" sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              }}
            >
              {editMode ? 'Update Course' : 'Create Course'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </PageLayout>
  );
};

export default Courses;
