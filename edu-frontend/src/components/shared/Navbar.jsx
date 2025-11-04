import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  School,
  Dashboard,
  Assignment,
  BarChart,
  Upload,
  PersonAdd,
  Logout,
  AccountCircle,
  Menu as MenuIcon,
  Close,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
    handleMenuClose();
  };

  // Define navigation items based on role
  const teacherNav = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <Dashboard /> },
    { label: 'Courses', path: '/teacher/courses', icon: <School /> },
    { label: 'Analytics', path: '/teacher/analytics', icon: <BarChart /> },
    { label: 'Upload', path: '/teacher/upload', icon: <Upload /> },
  ];

  const studentNav = [
    { label: 'Dashboard', path: '/student/dashboard', icon: <Dashboard /> },
    { label: 'Enroll', path: '/student/enroll', icon: <PersonAdd /> },
  ];

  const navItems = user?.role === 'teacher' ? teacherNav : studentNav;

  const isActive = (path) => location.pathname === path;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Logo & Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <School sx={{ fontSize: 32, color: 'white' }} />
          </motion.div>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'white',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              OBE System
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.8)',
                display: { xs: 'none', md: 'block' },
              }}
            >
              CO/PO Attainment Analysis
            </Typography>
          </Box>
        </Box>

        {/* Desktop Navigation */}
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {navItems.map((item) => (
              <motion.div
                key={item.path}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  startIcon={item.icon}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    color: 'white',
                    px: 2.5,
                    py: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    bgcolor: isActive(item.path)
                      ? 'rgba(255,255,255,0.2)'
                      : 'transparent',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.15)',
                    },
                  }}
                >
                  {item.label}
                </Button>
              </motion.div>
            ))}
          </Box>
        )}

        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!isMobile && (
            <Chip
              label={user?.role === 'teacher' ? 'Teacher' : 'Student'}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
                borderRadius: 2,
              }}
            />
          )}

          <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
            <Avatar
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                width: 40,
                height: 40,
                fontWeight: 700,
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>

          {isMobile && (
            <IconButton
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              sx={{ color: 'white', ml: 1 }}
            >
              {mobileMenuOpen ? <Close /> : <MenuIcon />}
            </IconButton>
          )}
        </Box>

        {/* User Dropdown Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              mt: 1.5,
              borderRadius: 2,
              minWidth: 220,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => handleNavigation('/profile')}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <Box sx={{ bgcolor: 'rgba(0,0,0,0.1)', py: 2 }}>
              {navItems.map((item) => (
                <motion.div
                  key={item.path}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    fullWidth
                    startIcon={item.icon}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      color: 'white',
                      justifyContent: 'flex-start',
                      px: 3,
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      bgcolor: isActive(item.path)
                        ? 'rgba(255,255,255,0.2)'
                        : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.15)',
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                </motion.div>
              ))}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </AppBar>
  );
};

export default Navbar;
