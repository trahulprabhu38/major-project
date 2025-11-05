import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  alpha,
  LinearProgress,
  Divider,
  Paper,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudUpload,
  AutoAwesome,
  CheckCircle,
  Cancel,
  Refresh,
  Download,
  Description,
  TrendingUp,
  School,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { coGeneratorAPI } from "../../services/coGeneratorAPI";
import axios from "axios";

const MotionCard = motion(Card);
const MotionBox = motion(Box);

// Bloom's Taxonomy color mapping
const bloomColors = {
  Remember: "#ef4444",
  Understand: "#f59e0b",
  Apply: "#eab308",
  Analyze: "#84cc16",
  Evaluate: "#22c55e",
  Create: "#06b6d4",
};

const COGenerator = () => {
  const { user } = useAuth();
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseId, setCourseId] = useState(null);
  const [file, setFile] = useState(null);
  const [numCOs, setNumCOs] = useState(5);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatedCOs, setGeneratedCOs] = useState([]);
  const [stats, setStats] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setGeneratedCOs([]);
    }
  };

  // Create or get course
  const createOrGetCourse = async () => {
    if (!courseCode || !courseName) {
      setSnackbar({
        open: true,
        message: "Please enter both course code and course name",
        severity: "warning",
      });
      return null;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/courses/create-or-get`,
        {
          course_code: courseCode,
          course_name: courseName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const course = response.data.data;
      setCourseId(course.id);

      setSnackbar({
        open: true,
        message: response.data.created
          ? "Course created successfully!"
          : "Course already exists",
        severity: "success",
      });

      return course.id;
    } catch (error) {
      console.error("Course creation error:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to create/get course",
        severity: "error",
      });
      return null;
    }
  };

  // Handle syllabus upload
  const handleUpload = async () => {
    if (!file) {
      setSnackbar({
        open: true,
        message: "Please upload a syllabus file",
        severity: "warning",
      });
      return;
    }

    // Ensure course code and name are provided
    if (!courseCode || !courseName) {
      setSnackbar({
        open: true,
        message: "Please enter both course code and course name",
        severity: "warning",
      });
      return;
    }

    // Create course if needed
    if (!courseId) {
      const createdCourseId = await createOrGetCourse();
      if (!createdCourseId) return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? prev : prev + 10));
      }, 300);

      // Upload with course_id, course_code, and teacher_id
      await coGeneratorAPI.uploadSyllabus(file, courseId, courseCode, user.id);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setSnackbar({
        open: true,
        message: "Syllabus uploaded successfully! Ingestion started in background.",
        severity: "success",
      });
    } catch (error) {
      console.error("Upload error:", error);
      const errorMsg = error.response?.data?.detail || error.message || "Upload failed";
      setSnackbar({
        open: true,
        message: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
        severity: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle CO generation
  const handleGenerate = async () => {
    // Ensure course code and name are provided
    if (!courseCode || !courseName) {
      setSnackbar({
        open: true,
        message: "Please enter both course code and course name",
        severity: "warning",
      });
      return;
    }

    // Create course if needed
    if (!courseId) {
      const createdCourseId = await createOrGetCourse();
      if (!createdCourseId) return;
    }

    try {
      setGenerating(true);
      setGeneratedCOs([]);

      // Generate with course_id and course_code
      const response = await coGeneratorAPI.generateCOs(courseId, courseCode, numCOs);

      // Backend returns { contexts: [...], total_docs: N }
      if (response.data.contexts && response.data.contexts.length > 0) {
        // Convert contexts to CO format for display
        const cos = response.data.contexts.map((ctx, idx) => ({
          id: `temp_${idx}`,
          co_number: idx + 1,
          co_text: ctx.document || ctx.text || "Generated CO",
          bloom_level: ctx.metadata?.bloom_level || "Apply",
          confidence: 1 - (ctx.distance || 0),
          verified: false
        }));
        setGeneratedCOs(cos);
        fetchStats();
        setSnackbar({
          open: true,
          message: `Retrieved ${cos.length} contexts from ChromaDB! (Total docs: ${response.data.total_docs})`,
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: "No contexts found. Please upload syllabus first.",
          severity: "warning",
        });
      }
    } catch (error) {
      console.error("Generation error:", error);
      const errorMsg = error.response?.data?.detail || error.message || "CO generation failed";
      setSnackbar({
        open: true,
        message: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
        severity: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Fetch CO statistics
  const fetchStats = async () => {
    if (!courseId || !courseCode) return;

    try {
      const response = await coGeneratorAPI.getCOStats(courseId, courseCode);
      // Backend returns { course_id, course_code, chroma_doc_count }
      setStats({
        total_cos: response.data.chroma_doc_count || 0,
        verified_cos: 0,
        bloom_distribution: {}
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  // Handle CO verification
  const handleVerify = async (coId, verified) => {
    try {
      await coGeneratorAPI.verifyCO(coId, verified);

      setGeneratedCOs((prev) =>
        prev.map((co) => (co.id === coId ? { ...co, verified } : co))
      );

      setSnackbar({
        open: true,
        message: verified ? "CO verified ✓" : "CO unverified",
        severity: "success",
      });

      fetchStats();
    } catch (error) {
      console.error("Verification error:", error);
      setSnackbar({
        open: true,
        message: "Verification failed",
        severity: "error",
      });
    }
  };

  // Load existing COs when course ID changes
  useEffect(() => {
    if (courseId) {
      loadExistingCOs();
      fetchStats();
    }
  }, [courseId]);

  const loadExistingCOs = async () => {
    if (!courseId) return;

    try {
      const response = await coGeneratorAPI.listCOsByCourse(courseId, false);
      setGeneratedCOs(response.data.cos || []);
    } catch (error) {
      console.error("Failed to load COs:", error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box
          sx={{
            mb: 4,
            p: 3,
            borderRadius: 2,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
            color: "white",
            boxShadow: 4,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <AutoAwesome sx={{ fontSize: 48 }} />
            <Typography variant="h4" fontWeight="bold">
              📘 Course Outcome Generator
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.95 }}>
            Enter course details, upload syllabus, and generate AI-powered Course Outcomes with Bloom's Taxonomy classification
          </Typography>
        </Box>
      </MotionBox>

      {/* Course Details Input Section */}
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        sx={{
          mb: 3,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: 3,
          border: 2,
          borderColor: "primary.main",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            <School sx={{ verticalAlign: "middle", mr: 1 }} />
            Step 1: Enter Course Details
          </Typography>

          <Stack spacing={2.5} sx={{ mt: 2 }}>
            {/* Course Code Input */}
            <TextField
              fullWidth
              label="Course Code"
              placeholder="e.g., 22CS202"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
              variant="outlined"
              helperText="Enter the unique course code"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontWeight: 600,
                },
              }}
            />

            {/* Course Name Input */}
            <TextField
              fullWidth
              label="Course Name"
              placeholder="e.g., Data Structures and Algorithms"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              variant="outlined"
              helperText="Enter the full course name"
            />

            {/* Display Course ID if created */}
            {courseId && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: "success.main",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CheckCircle />
                <Typography variant="body2" fontWeight="600">
                  Course ready: {courseCode} - {courseName}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </MotionCard>

      {/* Syllabus Upload Section */}
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        sx={{
          mb: 3,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            <CloudUpload sx={{ verticalAlign: "middle", mr: 1 }} />
            Step 2: Upload Syllabus Document
          </Typography>

          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* File Upload */}
            <Box>
              <input
                accept=".pdf,.docx,.txt"
                style={{ display: "none" }}
                id="syllabus-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="syllabus-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  sx={{ mr: 2 }}
                  size="large"
                >
                  Choose Syllabus File
                </Button>
              </label>
              {file && (
                <Chip
                  icon={<Description />}
                  label={file.name}
                  onDelete={() => setFile(null)}
                  color="primary"
                  size="medium"
                />
              )}
            </Box>

            {/* Upload Progress */}
            {uploading && (
              <Box>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="caption" sx={{ mt: 0.5, display: "block" }}>
                  Uploading and processing... {uploadProgress}%
                </Typography>
              </Box>
            )}

            {/* Upload Button */}
            <Button
              variant="contained"
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
              onClick={handleUpload}
              disabled={!file || uploading}
              size="large"
              sx={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                "&:hover": {
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                },
              }}
            >
              {uploading ? "Uploading..." : "Upload Syllabus"}
            </Button>
          </Stack>
        </CardContent>
      </MotionCard>

      {/* CO Generation Section */}
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        sx={{
          mb: 3,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            <AutoAwesome sx={{ verticalAlign: "middle", mr: 1 }} />
            Step 3: Generate Course Outcomes
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center" flexWrap="wrap">
            <TextField
              type="number"
              label="Number of COs"
              value={numCOs}
              onChange={(e) => setNumCOs(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
              inputProps={{ min: 1, max: 10 }}
              sx={{ width: 150 }}
              helperText="1-10 COs"
            />

            <Button
              variant="contained"
              startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
              onClick={handleGenerate}
              disabled={!courseCode || !courseName || generating}
              size="large"
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                "&:hover": {
                  background: "linear-gradient(135deg, #5568d3 0%, #6a4093 100%)",
                },
                minWidth: 180,
              }}
            >
              {generating ? "Generating..." : "Generate COs"}
            </Button>

            {generatedCOs.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadExistingCOs}
                size="large"
              >
                Refresh
              </Button>
            )}
          </Stack>
        </CardContent>
      </MotionCard>

      {/* Statistics Section */}
      {stats && (
        <MotionBox
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          sx={{ mb: 3 }}
        >
          <Stack direction="row" spacing={2}>
            <Paper
              sx={{
                flex: 1,
                p: 2,
                background: (theme) =>
                  theme.palette.mode === "dark"
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {stats.total_cos}
              </Typography>
              <Typography variant="body2">Total COs</Typography>
            </Paper>

            <Paper
              sx={{
                flex: 1,
                p: 2,
                background: (theme) =>
                  theme.palette.mode === "dark"
                    ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                    : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {stats.verified_cos}
              </Typography>
              <Typography variant="body2">Verified</Typography>
            </Paper>

            <Paper
              sx={{
                flex: 1,
                p: 2,
                background: (theme) =>
                  theme.palette.mode === "dark"
                    ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                    : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                color: "white",
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {Object.keys(stats.bloom_distribution || {}).length}
              </Typography>
              <Typography variant="body2">Bloom Levels</Typography>
            </Paper>
          </Stack>
        </MotionBox>
      )}

      {/* Generated COs Display */}
      {generatedCOs.length > 0 && (
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
            <TrendingUp sx={{ verticalAlign: "middle", mr: 1 }} />
            Generated Course Outcomes ({generatedCOs.length})
          </Typography>

          <Stack spacing={2}>
            <AnimatePresence>
              {generatedCOs.map((co, index) => (
                <MotionCard
                  key={co.id || index}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  sx={{
                    border: 2,
                    borderColor: co.verified ? "success.main" : "divider",
                    background: (theme) =>
                      theme.palette.mode === "dark"
                        ? alpha(bloomColors[co.bloom_level] || "#334155", 0.15)
                        : co.verified
                        ? alpha("#10b981", 0.05)
                        : "background.paper",
                    transition: "all 0.3s ease",
                    cursor: "default",
                    boxShadow: co.verified ? 4 : 2,
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Chip
                        label={`CO ${co.co_number || index + 1}`}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 700 }}
                      />
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Chip
                          label={co.bloom_level}
                          size="small"
                          sx={{
                            bgcolor: bloomColors[co.bloom_level] || "#gray",
                            color: "white",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        />
                        {co.confidence && (
                          <Chip
                            label={`${(co.confidence * 100).toFixed(0)}%`}
                            size="small"
                            variant="outlined"
                            color="info"
                          />
                        )}
                      </Box>
                    </Box>

                    <Typography variant="body1" sx={{ my: 2, lineHeight: 1.7, fontWeight: 500 }}>
                      {co.co_text}
                    </Typography>

                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {co.verified ? (
                          <CheckCircle sx={{ color: "success.main", fontSize: 18 }} />
                        ) : null}
                        <Typography
                          variant="caption"
                          color={co.verified ? "success.main" : "text.secondary"}
                          fontWeight={co.verified ? 600 : 400}
                        >
                          {co.verified ? "Verified by Teacher" : "Pending Verification"}
                        </Typography>
                      </Box>

                      <Box>
                        {!co.verified ? (
                          <Tooltip title="Verify CO">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleVerify(co.id, true)}
                              sx={{
                                "&:hover": {
                                  transform: "scale(1.1)",
                                  transition: "transform 0.2s",
                                },
                              }}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Unverify CO">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleVerify(co.id, false)}
                              sx={{
                                "&:hover": {
                                  transform: "scale(1.1)",
                                  transition: "transform 0.2s",
                                },
                              }}
                            >
                              <Cancel />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </MotionCard>
              ))}
            </AnimatePresence>
          </Stack>
        </MotionBox>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default COGenerator;
