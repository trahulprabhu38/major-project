import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
} from '@mui/material';
import {
  School,
  TrendingUp,
  Upload,
  BarChart,
  People,
  Assignment,
  ArrowForward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { courseAPI } from '../../services/api';
import { PageLoader } from '../../components/shared/Loading';
import { ErrorState } from '../../components/shared/ErrorState';

const MotionCard = motion(Card);
const MotionBox = motion(Box);

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

  if (loading) return <PageLoader message="Loading your dashboard..." />;
  if (error) return <ErrorState onRetry={loadDashboardData} />;

  // Quick access cards data
  const quickAccessCards = [
    {
      title: 'Upload Assessments',
      description: 'Upload marks and question papers',
      icon: Upload,
      color: '#2563eb',
      bgColor: 'rgba(37, 99, 235, 0.1)',
      path: '/teacher/upload',
    },
    {
      title: 'View Analytics',
      description: 'CO/PO attainment analysis',
      icon: BarChart,
      color: '#7c3aed',
      bgColor: 'rgba(124, 58, 237, 0.1)',
      path: '/teacher/analytics',
    },
    {
      title: 'Manage Courses',
      description: 'View and edit course details',
      icon: School,
      color: '#059669',
      bgColor: 'rgba(5, 150, 105, 0.1)',
      path: '/teacher/courses',
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, pl: { md: 2 } }}>
      {/* Hero Welcome Card */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{ mb: 4 }}
      >
        <Card
          sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            color: 'white',
            borderRadius: 4,
            p: { xs: 3, md: 4 },
            boxShadow: '0 8px 32px rgba(37, 99, 235, 0.2)',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <School sx={{ fontSize: 48, opacity: 0.9 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Welcome back, {user?.name?.split(' ')[0]}! 👋
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.95 }}>
                  Manage your courses, track assessments, and analyze CO/PO attainment.
                </Typography>
              </Box>
            </Box>

            {user?.department && (
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={`Department: ${user.department}`}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
                <Chip
                  label="Teacher"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </MotionBox>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Total Courses
                  </Typography>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                    <School sx={{ color: 'primary.main' }} />
                  </Avatar>
                </Box>
                <Typography variant="h3" fontWeight="bold" color="primary.main">
                  {stats.totalCourses}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active courses
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Total Students
                  </Typography>
                  <Avatar sx={{ bgcolor: 'success.light', width: 48, height: 48 }}>
                    <People sx={{ color: 'success.main' }} />
                  </Avatar>
                </Box>
                <Typography variant="h3" fontWeight="bold" color="success.main">
                  {stats.totalStudents}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Enrolled students
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Assessments
                  </Typography>
                  <Avatar sx={{ bgcolor: 'secondary.light', width: 48, height: 48 }}>
                    <Assignment sx={{ color: 'secondary.main' }} />
                  </Avatar>
                </Box>
                <Typography variant="h3" fontWeight="bold" color="secondary.main">
                  {stats.totalAssessments}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total evaluations
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Avg Attainment
                  </Typography>
                  <Avatar sx={{ bgcolor: 'warning.light', width: 48, height: 48 }}>
                    <TrendingUp sx={{ color: 'warning.main' }} />
                  </Avatar>
                </Box>
                <Typography variant="h3" fontWeight="bold" color="warning.main">
                  --
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Overall percentage
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Quick Access Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Quick Access
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Navigate to commonly used features
        </Typography>

        <Grid container spacing={3}>
          {quickAccessCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <Grid item xs={12} md={4} key={index}>
                <MotionCard
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  onClick={() => navigate(card.path)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 3,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: card.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <IconComponent sx={{ fontSize: 32, color: card.color }} />
                    </Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {card.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: card.color }}>
                      <Typography variant="body2" fontWeight={600}>
                        Open
                      </Typography>
                      <ArrowForward fontSize="small" />
                    </Box>
                  </CardContent>
                </MotionCard>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
};

export default TeacherDashboard;
