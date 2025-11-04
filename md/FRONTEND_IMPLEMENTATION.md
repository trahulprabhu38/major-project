# Frontend Implementation Guide

## ✅ Completed Setup

- [x] Material UI installed
- [x] Framer Motion installed
- [x] Recharts installed
- [x] Zustand installed
- [x] React Dropzone installed
- [x] App.jsx configured with MUI theme
- [x] Tailwind CSS configured

---

## 📁 Required File Structure

```
edu-frontend/src/
├── components/
│   ├── shared/
│   │   ├── ProtectedRoute.jsx
│   │   ├── Navbar.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── AnimatedCard.jsx
│   ├── teacher/
│   │   ├── StatsCard.jsx
│   │   ├── CourseCard.jsx
│   │   ├── UploadZone.jsx
│   │   └── AttainmentChart.jsx
│   └── student/
│       ├── ScoreCard.jsx
│       ├── RadarChart.jsx
│       └── ProgressChart.jsx
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── teacher/
│   │   └── Dashboard.jsx
│   └── student/
│       └── Dashboard.jsx
├── contexts/
│   └── AuthContext.jsx (already exists)
├── services/
│   └── api.js (already exists)
└── App.jsx (already updated)
```

---

## 🔐 1. Protected Route Component

**File: `src/components/shared/ProtectedRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

---

## 🎨 2. Animated Login Page

**File: `src/pages/Login.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, School } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const MotionPaper = motion(Paper);
const MotionBox = motion(Box);

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData);

    if (result.success) {
      if (result.user.role === 'student') {
        navigate('/student/dashboard');
      } else if (result.user.role === 'teacher') {
        navigate('/teacher/dashboard');
      }
    }

    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <MotionPaper
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          elevation={10}
          sx={{ p: 4, borderRadius: 4 }}
        >
          <MotionBox
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            sx={{ textAlign: 'center', mb: 3 }}
          >
            <School sx={{ fontSize: 60, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              OBE Portal
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Outcome-Based Education Analysis System
            </Typography>
          </MotionBox>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              margin="normal"
              autoComplete="email"
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5568d3 30%, #6a3f8f 90%)',
                },
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link to="/register" style={{ color: '#667eea', textDecoration: 'none' }}>
                  Register
                </Link>
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="caption">
                <strong>Demo:</strong> teacher@example.edu / password123<br />
                student1@example.edu / password123
              </Typography>
            </Alert>
          </form>
        </MotionPaper>
      </Container>
    </Box>
  );
}
```

---

## 🏫 3. Teacher Dashboard (Overview)

**File: `src/pages/teacher/Dashboard.jsx`**

```jsx
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
  Avatar,
  Button,
} from '@mui/material';
import { School, Assignment, People, TrendingUp, Logout } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { courseAPI } from '../../services/api';

const MotionPaper = motion(Paper);

function StatsCard({ title, value, icon, color, delay }) {
  return (
    <MotionPaper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      elevation={2}
      sx={{ p: 3, height: '100%' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ mt: 1 }}>
            {value}
          </Typography>
        </Box>
        <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </MotionPaper>
  );
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    assessments: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await courseAPI.getAll();
      const courses = response.data.data || [];
      setStats({
        courses: courses.length,
        students: courses.reduce((sum, c) => sum + (c.enrolled_students || 0), 0),
        assessments: courses.reduce((sum, c) => sum + (c.assessments_count || 0), 0),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navbar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <School sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Teacher Dashboard
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
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Welcome back, {user?.name}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Here's what's happening with your courses today.
          </Typography>
        </motion.div>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <StatsCard
              title="Total Courses"
              value={stats.courses}
              icon={<School />}
              color="primary.main"
              delay={0.1}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatsCard
              title="Total Students"
              value={stats.students}
              icon={<People />}
              color="success.main"
              delay={0.2}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatsCard
              title="Assessments"
              value={stats.assessments}
              icon={<Assignment />}
              color="secondary.main"
              delay={0.3}
            />
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Assignment />}
              sx={{ py: 2 }}
            >
              View Courses
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<TrendingUp />}
              sx={{ py: 2 }}
            >
              View Analytics
            </Button>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
```

---

## 🎓 4. Student Dashboard

**File: `src/pages/student/Dashboard.jsx`**

```jsx
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
```

---

## 📝 5. Register Page (Optional)

**File: `src/pages/Register.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { School } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const MotionPaper = motion(Paper);

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student',
    usn: '',
    department: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await register(formData);

    if (result.success) {
      if (result.user.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/teacher/dashboard');
      }
    }

    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <MotionPaper
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          elevation={10}
          sx={{ p: 4, borderRadius: 4 }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <School sx={{ fontSize: 60, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight="bold">
              Create Account
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              margin="normal"
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              margin="normal"
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              margin="normal"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
              </Select>
            </FormControl>

            {formData.role === 'student' && (
              <TextField
                fullWidth
                label="USN"
                value={formData.usn}
                onChange={(e) => setFormData({ ...formData, usn: e.target.value })}
                required
                margin="normal"
              />
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, py: 1.5 }}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#667eea', textDecoration: 'none' }}>
                Already have an account? Sign In
              </Link>
            </Box>
          </form>
        </MotionPaper>
      </Container>
    </Box>
  );
}
```

---

## ✅ Implementation Checklist

- [ ] Copy all component files to correct locations
- [ ] Test login flow
- [ ] Test teacher dashboard
- [ ] Test student dashboard
- [ ] Add more features (upload, charts, etc.)

---

## 🚀 Next Steps

1. **Create missing components** - Copy code above to respective files
2. **Test authentication** - Login as teacher/student
3. **Add more features**:
   - File upload with drag-drop
   - Charts (Recharts for CO/PO visualization)
   - Course management pages
   - Analytics views

4. **Backend updates** - Update auth controller to use MongoDB for teachers

---

**All UI libraries are installed and ready to use!**
