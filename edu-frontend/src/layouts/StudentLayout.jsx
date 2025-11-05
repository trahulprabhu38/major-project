import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme as useMuiTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Dashboard,
  School,
  PersonAdd,
  BarChart,
  Settings,
  Logout,
  Menu as MenuIcon,
  ChevronLeft,
  AccountCircle,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/shared/ThemeToggle';

const drawerWidth = 260;

const StudentLayout = () => {
  const muiTheme = useMuiTheme();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

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
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  // Sidebar menu items
  const menuItems = [
    { label: 'Dashboard', path: '/student/dashboard', icon: <Dashboard /> },
    { label: 'Enroll in Course', path: '/student/enroll', icon: <PersonAdd /> },
    { label: 'My Courses', path: '/student/courses', icon: <School /> },
    { label: 'Analytics', path: '/student/analytics', icon: <BarChart /> },
    { label: 'Analysis', path: '/student/analysis', icon: <TrendingUp /> },
    { label: 'Settings', path: '/student/settings', icon: <Settings /> },
  ];

  const isActive = (path) => location.pathname === path;

  // Sidebar content
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar Header */}
      <Box
        sx={{
          p: 3,
          background: isDark
            ? 'linear-gradient(180deg, #0B1625 0%, #101B33 100%)'
            : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background 0.5s ease',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <School sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Student Portal
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              OBE System
            </Typography>
          </Box>
        </Box>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}>
            <ChevronLeft />
          </IconButton>
        )}
      </Box>

      {/* Navigation Menu */}
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {menuItems.map((item, index) => {
          const active = isActive(item.path);
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Tooltip title={item.label} placement="right" arrow>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      borderRadius: 2,
                      py: 1.5,
                      px: 2,
                      bgcolor: active
                        ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'primary.main')
                        : 'transparent',
                      color: active ? (isDark ? '#60a5fa' : 'white') : (isDark ? '#E2E8F0' : 'text.primary'),
                      '&:hover': {
                        bgcolor: active
                          ? (isDark ? 'rgba(59, 130, 246, 0.3)' : 'primary.dark')
                          : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'action.hover'),
                        boxShadow: isDark && active ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: active ? (isDark ? '#60a5fa' : 'white') : (isDark ? '#94A3B8' : 'text.secondary'),
                        minWidth: 40,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: active ? 600 : 500,
                        fontSize: '0.95rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            </motion.div>
          );
        })}
      </List>

      {/* User Info at Bottom */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'divider',
          bgcolor: isDark ? '#0B1625' : 'background.paper',
          transition: 'all 0.3s ease',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 40,
              height: 40,
              fontWeight: 700,
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{
      display: 'flex',
      minHeight: '100vh',
      bgcolor: isDark ? '#0D1B2A' : 'background.default',
      transition: 'background-color 0.5s ease',
    }}>
      {/* Top AppBar - Fixed position with offset for drawer */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: isDark ? '#0B1625' : 'white',
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'divider',
          color: isDark ? '#E2E8F0' : 'text.primary',
          boxShadow: isDark ? '0 0 20px rgba(59, 130, 246, 0.1)' : '0px 2px 6px rgba(0,0,0,0.1)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: 'all 0.5s ease',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <School
            sx={{
              mr: 2,
              fontSize: 32,
              color: 'primary.main',
              display: { xs: 'none', md: 'block' },
            }}
          />

          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            OBE CO/PO Analysis System
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ThemeToggle />
            <IconButton onClick={handleMenuOpen}>
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 36,
                  height: 36,
                }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>

          {/* User Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                borderRadius: 2,
                minWidth: 200,
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
            <MenuItem onClick={() => { handleMenuClose(); navigate('/student/profile'); }}>
              <AccountCircle sx={{ mr: 1.5 }} fontSize="small" />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1.5 }} fontSize="small" color="error" />
              <Typography color="error.main">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer - Desktop: Permanent, Mobile: Temporary */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              border: 'none',
              background: isDark ? 'linear-gradient(180deg, #0B1625 0%, #101B33 100%)' : '#fff',
              transition: 'background 0.5s ease',
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              border: 'none',
              borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
              background: isDark ? 'linear-gradient(180deg, #0B1625 0%, #101B33 100%)' : '#fff',
              transition: 'all 0.5s ease',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: isDark ? '#0D1B2A' : 'background.default',
          minHeight: '100vh',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '56px', sm: '64px' }, // AppBar height offset
          transition: muiTheme.transitions.create(['margin', 'width', 'background-color'], {
            easing: muiTheme.transitions.easing.sharp,
            duration: muiTheme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default StudentLayout;
