import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
} from '@mui/material';
import {
  School,
  TrendingUp,
  ArrowForward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import PageLayout from '../../components/shared/PageLayout';
import { PageLoader } from '../../components/shared/Loading';
import { ErrorState } from '../../components/shared/ErrorState';

const MotionCard = motion.create(Card);

const StudentCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await studentAPI.getCourses();
      setCourses(response.data.data || []);
    } catch (err) {
      console.error('Error loading courses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Loading your courses..." />;
  if (error) return <ErrorState onRetry={loadCourses} />;

  return (
    <PageLayout
      title="My Courses"
      subtitle="View all your enrolled courses and access detailed analytics"
      icon={School}
    >
      {courses.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 3,
          }}
        >
          <School
            sx={{
              fontSize: 80,
              color: 'primary.main',
              mb: 2,
              opacity: 0.8,
            }}
          />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            No Courses Enrolled Yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Start your learning journey by enrolling in courses.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {courses.map((course, index) => (
            <Grid item xs={12} md={6} lg={4} key={course.id}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => navigate(`/student/courses/${course.id}`)}
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
                      index % 3 === 0 ? '#2563eb' : index % 3 === 1 ? '#7c3aed' : '#059669'
                    } 0%, ${
                      index % 3 === 0 ? '#1e40af' : index % 3 === 1 ? '#6d28d9' : '#047857'
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
                    <Chip
                      label={`Sem ${course.semester}`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.25)',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
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
                        Instructor
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {course.teacher_name || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Chip
                        label={course.status || 'Active'}
                        size="small"
                        color="success"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </Box>

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
                    <TrendingUp fontSize="small" />
                    <Typography variant="body2" fontWeight={600}>
                      View Performance Analytics
                    </Typography>
                    <ArrowForward fontSize="small" />
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      )}
    </PageLayout>
  );
};

export default StudentCourses;
