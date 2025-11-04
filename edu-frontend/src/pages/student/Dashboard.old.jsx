import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { School, Logout, TrendingUp } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';

const MotionCard = motion(Card);

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await studentAPI.getCourses();
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <School sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Student Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.name}
          </Typography>
          <IconButton color="inherit" onClick={logout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Hi {user?.name}! 📚
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Track your academic progress and performance.
          </Typography>
        </motion.div>

        <Grid container spacing={3}>
          {courses.map((course, index) => (
            <Grid item xs={12} md={6} key={course.id}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.03 }}
                sx={{ cursor: 'pointer' }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {course.code}
                    </Typography>
                    <Chip label={`Sem ${course.semester}`} color="primary" size="small" />
                  </Box>
                  <Typography variant="body1" color="text.secondary">
                    {course.name}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Chip icon={<TrendingUp />} label="View Performance" size="small" />
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
