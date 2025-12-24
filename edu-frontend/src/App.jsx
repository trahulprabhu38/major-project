import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline, Box } from "@mui/material";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { useMemo } from "react";

// Pages - Authentication
import Login from "./pages/Login";
import Register from "./pages/Register";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherCourses from "./pages/teacher/Courses";
import TeacherAnalytics from "./pages/teacher/Analytics";
import TeacherCourseDetail from "./pages/teacher/CourseDetail";
import StudentAnalysis from "./pages/teacher/StudentAnalysis";

import UploadMarksNew from "./pages/teacher/UploadMarksNew";
import SEEUpload from "./pages/teacher/SEEUpload";
import StudentProgression from "./pages/teacher/StudentProgression";

import DynamicDashboard from "./pages/teacher/DynamicDashboard";
import COGenerator from "./pages/teacher/COGenerator";

// Student Pages
import StudentDashboard from "./pages/student/Dashboard";
import StudentCourses from "./pages/student/Courses";
import StudentCourseDetail from "./pages/student/CourseDetail";
import StudentCourseAnalytics from "./pages/student/CourseAnalytics";
import StudentEnroll from "./pages/student/Enroll";
import DBMSRecommender from "./pages/student/DBMSRecommender";

// Shared Pages
import Settings from "./pages/shared/Settings";


// Layouts
import StudentLayout from "./layouts/StudentLayout";
import TeacherLayout from "./layouts/TeacherLayout";

// Shared Components
import ProtectedRoute from "./components/shared/ProtectedRoute";

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: { main: "#2563eb", light: "#60a5fa", dark: "#1e40af" },
    secondary: { main: "#8b5cf6", light: "#a78bfa", dark: "#7c3aed" },
    success: { main: "#10b981" },
    error: { main: "#ef4444" },
    warning: { main: "#f59e0b" },
    info: { main: "#06b6d4" },
    background:
      mode === "dark"
        ? { default: "#0f172a", paper: "#1e293b" }
        : { default: "#f8fafc", paper: "#ffffff" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Layout wrapper - Not needed anymore as both roles use their own layouts
const Layout = ({ children }) => {
  return <Box>{children}</Box>;
};

// Wrapper component to access theme context
const AppContent = () => {
  const { isDark } = useTheme();
  const theme = useMemo(() => getTheme(isDark ? 'dark' : 'light'), [isDark]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Layout>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: "#363636",
                    color: "#fff",
                    borderRadius: "10px",
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />

            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Teacher Protected Routes - Wrapped in TeacherLayout */}
              <Route
                path="/teacher/*"
                element={<ProtectedRoute requiredRole="teacher" />}
              >
                <Route element={<TeacherLayout />}>
                  <Route path="dashboard" element={<TeacherDashboard />} />
                  <Route path="courses" element={<TeacherCourses />} />
                  <Route path="courses/:id" element={<TeacherCourseDetail />} />
                  <Route path="analytics" element={<TeacherAnalytics />} />
                  <Route path="student-analysis" element={<StudentAnalysis />} />
                  {/* <Route path="analysis" element={<Analysis />} /> */}
                  <Route path="co-generator" element={<COGenerator />} />
                  <Route path="upload" element={<UploadMarksNew />} />
                  <Route path="see-upload" element={<SEEUpload />} />
                  <Route path="student-progression" element={<StudentProgression />} />
                  {/* <Route path="upload-old" element={<UploadMarks />} /> */}
                  {/* <Route path="static-analysis" element={<StaticAnalysis />} /> */}
                  <Route path="attainment/:courseId" element={<DynamicDashboard />} />
                  <Route path="settings" element={<Settings />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>
              </Route>

              {/* Student Protected Routes - Wrapped in StudentLayout */}
              <Route
                path="/student/*"
                element={<ProtectedRoute requiredRole="student" />}
              >
                <Route element={<StudentLayout />}>
                  <Route path="dashboard" element={<StudentDashboard />} />
                  <Route path="enroll" element={<StudentEnroll />} />
                  <Route path="courses" element={<StudentCourses />} />
                  <Route path="courses/:courseId" element={<StudentCourseDetail />} />
                  <Route path="courses/:courseId/analytics" element={<StudentCourseAnalytics />} />
                  <Route path="dbms-recommender" element={<DBMSRecommender />} />
                  {/* <Route path="analysis" element={<Analysis />} /> */}
                  <Route path="settings" element={<Settings />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>
              </Route>

              {/* Default Redirects */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </MuiThemeProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
