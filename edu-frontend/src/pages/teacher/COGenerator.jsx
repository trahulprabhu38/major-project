import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Divider,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  CloudUpload,
  Psychology,
  AutoAwesome,
  CheckCircle,
  Cancel,
  Refresh,
  Download,
  ExpandMore,
  Info,
  TrendingUp,
  Speed,
  Assessment,
  Lightbulb,
  School,
  Save,
  ArrowForward,
  ArrowBack,
  Verified,
  Star,
  EmojiEvents,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { courseAPI, aiCOAPI } from '../../services/api';
import {
  generateCOs,
  regenerateCO,
  getDashboardMetrics,
  getProfilerStats,
  exportMetrics,
  submitFeedback as submitCOFeedback,
  getBloomTaxonomy,
  getPODescriptions,
  healthCheck,
} from '../../services/coGeneratorAPI';

const COGenerator = () => {
  const { isDark } = useTheme();

  // Course selection state
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedCourseDetails, setSelectedCourseDetails] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseStatistics, setCourseStatistics] = useState(null);

  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Select Course', 'Upload Materials', 'Configure & Generate', 'Review & Save'];

  // State management
  const [files, setFiles] = useState([]);
  const [numApply, setNumApply] = useState(2);
  const [numAnalyze, setNumAnalyze] = useState(2);
  const [useChromaDB, setUseChromaDB] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedCOs, setGeneratedCOs] = useState([]);
  const [pipelineMetrics, setPipelineMetrics] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [savedToDB, setSavedToDB] = useState(false);
  const [savingToDB, setSavingToDB] = useState(false);

  // Dashboard metrics
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [serviceHealth, setServiceHealth] = useState(null);

  // Dialog states
  const [regenerateDialog, setRegenerateDialog] = useState(false);
  const [selectedCO, setSelectedCO] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Load initial data
  useEffect(() => {
    loadInitialData();
    loadTeacherCourses();
  }, []);

  // Load course statistics when course is selected
  useEffect(() => {
    if (selectedCourse) {
      loadCourseStatistics();
    }
  }, [selectedCourse]);

  const loadTeacherCourses = async () => {
    try {
      const response = await courseAPI.getAll();
      const coursesData = response.data.courses || response.data.data || response.data;
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setLoadingCourses(false);
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load courses');
      setCourses([]); // Ensure courses is always an array
      setLoadingCourses(false);
    }
  };

  const loadCourseStatistics = async () => {
    try {
      const stats = await aiCOAPI.getStatistics(selectedCourse);
      setCourseStatistics(stats.data.statistics);
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  const loadInitialData = async () => {
    try {
      const health = await healthCheck();
      setServiceHealth(health);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const loadDashboardMetrics = async () => {
    try {
      const dashboard = await getDashboardMetrics();
      setDashboardMetrics(dashboard);
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
    }
  };

  const handleCourseSelect = (courseId) => {
    setSelectedCourse(courseId);
    const course = Array.isArray(courses) ? courses.find(c => c.id === courseId) : null;
    setSelectedCourseDetails(course);
    setError(null);
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedCourse) {
      setError('Please select a course first');
      return;
    }
    if (activeStep === 1 && files.length === 0) {
      setError('Please upload at least one file');
      return;
    }
    setActiveStep((prev) => prev + 1);
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
    setError(null);
  };

  const handleRemoveFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleGenerateCOs = async () => {
    if (numApply + numAnalyze !== 4) {
      setError('Total number of COs must equal 4');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await generateCOs(files, numApply, numAnalyze, useChromaDB);

      setGeneratedCOs(result.cos);
      setPipelineMetrics(result.pipeline_metrics);
      setSessionId(result.session_id);
      setSuccess(`Successfully generated ${result.cos.length} Course Outcomes!`);
      setActiveStep(3); // Move to review step

      loadDashboardMetrics();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate COs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDB = async () => {
    setSavingToDB(true);
    try {
      const saveData = {
        courseId: selectedCourse,
        sessionId: sessionId,
        cos: generatedCOs,
        pipelineMetrics: pipelineMetrics,
        configuration: {
          num_apply: numApply,
          num_analyze: numAnalyze,
          use_chromadb: useChromaDB,
        },
        fileNames: files.map(f => f.name),
      };

      await aiCOAPI.save(saveData);
      setSavedToDB(true);
      setSuccess('🎉 COs saved to database successfully! They are now visible in the course detail page.');

      // Reload statistics
      loadCourseStatistics();
    } catch (err) {
      setError('Failed to save COs to database');
      console.error(err);
    } finally {
      setSavingToDB(false);
    }
  };

  const handleRegenerateCO = async () => {
    if (!selectedCO) return;

    setLoading(true);
    try {
      const result = await regenerateCO(
        selectedCO.co_num,
        selectedCO.co_text,
        selectedCO.bloom_level,
        feedbackText
      );

      const updatedCOs = generatedCOs.map((co) =>
        co.co_num === selectedCO.co_num
          ? {
              ...co,
              co_text: result.regenerated_text,
              reward_score: result.quality_metrics.overall,
              individual_scores: {
                vtu: result.quality_metrics.vtu,
                obe: result.quality_metrics.obe,
                bloom: result.quality_metrics.bloom,
              },
            }
          : co
      );

      setGeneratedCOs(updatedCOs);
      setSuccess('CO regenerated successfully!');
      setRegenerateDialog(false);
      setFeedbackText('');
      setSavedToDB(false);
    } catch (err) {
      setError('Failed to regenerate CO. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCO = async (co, approved) => {
    if (!sessionId) return;

    try {
      await submitCOFeedback(sessionId, co.co_num, approved);

      setGeneratedCOs(generatedCOs.map((c) =>
        c.co_num === co.co_num ? { ...c, approved } : c
      ));
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  const getBloomLevelColor = (level) => {
    const colors = {
      Apply: '#3b82f6',
      Analyze: '#8b5cf6',
      Evaluate: '#ec4899',
      Create: '#10b981',
    };
    return colors[level] || '#6b7280';
  };

  const getQualityColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  // Render different steps
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderCourseSelection();
      case 1:
        return renderFileUpload();
      case 2:
        return renderConfiguration();
      case 3:
        return renderReviewAndSave();
      default:
        return null;
    }
  };

  const renderCourseSelection = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Paper sx={{ p: 4, bgcolor: isDark ? '#1e293b' : 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <School sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Select Course / Subject
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose the course for which you want to generate COs
            </Typography>
          </Box>
        </Box>

        {/* Course Statistics if previously generated */}
        {courseStatistics && courseStatistics.total_cos > 0 && selectedCourse && (
          <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
            <AlertTitle>Existing COs Found</AlertTitle>
            This course already has {courseStatistics.total_cos} AI-generated COs
            ({courseStatistics.approved_cos} approved). Generating new COs will replace them.
          </Alert>
        )}

        <FormControl fullWidth size="large">
          <InputLabel>Select Course *</InputLabel>
          <Select
            value={selectedCourse}
            onChange={(e) => handleCourseSelect(e.target.value)}
            label="Select Course *"
            disabled={loadingCourses}
          >
            {loadingCourses ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                Loading courses...
              </MenuItem>
            ) : !Array.isArray(courses) || courses.length === 0 ? (
              <MenuItem disabled>No courses available</MenuItem>
            ) : (
              courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body1" fontWeight={600}>
                      {course.code} - {course.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Semester {course.semester} • {course.department} • {course.credits} Credits
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {selectedCourseDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card sx={{ mt: 3, bgcolor: isDark ? '#0f172a' : '#f8fafc', border: '1px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Selected Course Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Code</Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedCourseDetails.code}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Name</Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedCourseDetails.name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Semester</Typography>
                    <Typography variant="body1">{selectedCourseDetails.semester}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Credits</Typography>
                    <Typography variant="body1">{selectedCourseDetails.credits}</Typography>
                  </Grid>
                  {selectedCourseDetails.description && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Description</Typography>
                      <Typography variant="body2">{selectedCourseDetails.description}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </Paper>
    </motion.div>
  );

  const renderFileUpload = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Paper sx={{ p: 4, bgcolor: isDark ? '#1e293b' : 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <CloudUpload sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Upload Course Materials
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload syllabi, lecture notes, or course content (PDF, PPTX, DOCX, TXT)
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          component="label"
          fullWidth
          startIcon={<CloudUpload />}
          sx={{
            py: 6,
            borderStyle: 'dashed',
            borderWidth: 3,
            borderColor: 'primary.main',
            background: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.02)',
            '&:hover': {
              borderStyle: 'dashed',
              borderWidth: 3,
              background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
            },
          }}
        >
          <Box>
            <Typography variant="h6">Click to Choose Files or Drag & Drop</Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: PDF, PPTX, DOCX, TXT (Multiple files allowed)
            </Typography>
          </Box>
          <input
            type="file"
            hidden
            multiple
            accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
            onChange={handleFileChange}
          />
        </Button>

        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Selected Files ({files.length})
              </Typography>
              <Stack spacing={1}>
                {files.map((file, index) => (
                  <Card key={index} sx={{ bgcolor: isDark ? '#0f172a' : '#f8fafc' }}>
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CloudUpload color="primary" />
                          <Box>
                            <Typography variant="body1" fontWeight={600}>{file.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton onClick={() => handleRemoveFile(index)} color="error">
                          <Cancel />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          </motion.div>
        )}
      </Paper>
    </motion.div>
  );

  const renderConfiguration = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Paper sx={{ p: 4, bgcolor: isDark ? '#1e293b' : 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <AutoAwesome sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Configure & Generate
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set CO distribution and generate AI-powered course outcomes
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: isDark ? '#0f172a' : '#f8fafc', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Apply-level COs (CO1-CO4)
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Count</Typography>
                  <Chip label={numApply} color="primary" size="small" />
                </Box>
                <Slider
                  value={numApply}
                  onChange={(_, value) => {
                    setNumApply(value);
                    setNumAnalyze(4 - value);
                  }}
                  min={0}
                  max={4}
                  marks
                  valueLabelDisplay="auto"
                  sx={{ mt: 2 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Apply: Demonstrate, Implement, Use, Execute
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: isDark ? '#0f172a' : '#f8fafc', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Analyze-level COs (CO1-CO4)
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Count</Typography>
                  <Chip label={numAnalyze} color="secondary" size="small" />
                </Box>
                <Slider
                  value={numAnalyze}
                  onChange={(_, value) => {
                    setNumAnalyze(value);
                    setNumApply(4 - value);
                  }}
                  min={0}
                  max={4}
                  marks
                  valueLabelDisplay="auto"
                  sx={{ mt: 2 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Analyze: Examine, Compare, Investigate, Differentiate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ bgcolor: isDark ? '#0f172a' : '#f8fafc' }}>
              <CardContent>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useChromaDB}
                      onChange={(e) => setUseChromaDB(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Use ChromaDB for Enhanced Context Retrieval
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Leverages vector database for better syllabus-aligned CO generation
                      </Typography>
                    </Box>
                  }
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Button
          variant="contained"
          fullWidth
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
          onClick={handleGenerateCOs}
          disabled={loading}
          sx={{
            py: 2,
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
              boxShadow: '0 6px 30px rgba(37, 99, 235, 0.6)',
            },
          }}
        >
          {loading ? 'Generating Course Outcomes...' : '✨ Generate Course Outcomes with AI'}
        </Button>

        {loading && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress
              sx={{
                height: 8,
                borderRadius: 4,
                background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
                  borderRadius: 4,
                },
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              🚀 Processing {files.length} file(s) and generating COs with AI magic...
            </Typography>
          </Box>
        )}
      </Paper>
    </motion.div>
  );

  const renderReviewAndSave = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Grid container spacing={3}>
        {/* Generated COs */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, bgcolor: isDark ? '#1e293b' : 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <EmojiEvents sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    Generated Course Outcomes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review, approve, and save to {selectedCourseDetails?.code}
                  </Typography>
                </Box>
              </Box>
              {!savedToDB && (
                <Chip
                  label="Not Saved"
                  color="warning"
                  size="small"
                  icon={<Info />}
                />
              )}
            </Box>

            <Stack spacing={2}>
              {generatedCOs.map((co, index) => (
                <motion.div
                  key={`co-item-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    sx={{
                      border: '2px solid',
                      borderColor: co.approved ? 'success.main' : 'divider',
                      bgcolor: isDark ? '#0f172a' : 'background.paper',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <Chip
                              label={`CO${co.co_num}`}
                              sx={{
                                bgcolor: getBloomLevelColor(co.bloom_level),
                                color: 'white',
                                fontWeight: 'bold',
                              }}
                            />
                            <Chip
                              label={co.bloom_level}
                              variant="outlined"
                              size="small"
                              sx={{ borderColor: getBloomLevelColor(co.bloom_level) }}
                            />
                            {/* <Chip
                              label={`Quality: ${(co.reward_score * 100).toFixed(0)}%`}
                              color={getQualityColor(co.reward_score)}
                              size="small"
                              icon={<Star />}
                            /> */}
                            {co.approved && (
                              <Chip
                                label="Approved"
                                color="success"
                                size="small"
                                icon={<Verified />}
                              />
                            )}
                          </Stack>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {co.co_text}
                          </Typography>
                          <Typography variant="caption" color="text">
                             PO Mappings: {co.po_mappings}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                          <Tooltip title={co.approved ? "Approved" : "Approve"}>
                            <IconButton
                              size="small"
                              color={co.approved ? 'success' : 'default'}
                              onClick={() => handleApproveCO(co, true)}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Regenerate">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedCO(co);
                                setRegenerateDialog(true);
                              }}
                            >
                              <Refresh />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      {/* Quality Metrics */}
                      <Accordion sx={{ bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="caption" fontWeight="bold">
                             Quality Metrics Breakdown
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2}>
                            {Object.entries(co.individual_scores || {}).map(([key, value], idx) => (
                              <Grid item xs={6} key={`score-${index}-${key}`}>
                                <Typography variant="caption" color="text.secondary" textTransform="capitalize">
                                  {key === 'vtu' ? 'VTU Compliance' : key === 'obe' ? 'OBE Alignment' : key}
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={value * 100}
                                  color={getQualityColor(value)}
                                  sx={{
                                    mt: 0.5,
                                    height: 8,
                                    borderRadius: 4,
                                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                  }}
                                />
                                <Typography variant="caption" fontWeight="bold">
                                  {(value * 100).toFixed(0)}%
                                </Typography>
                              </Grid>
                            ))}
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* Save Button */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={savingToDB ? <CircularProgress size={20} color="inherit" /> : savedToDB ? <Verified /> : <Save />}
              onClick={handleSaveToDB}
              disabled={savingToDB || savedToDB}
              color={savedToDB ? 'success' : 'primary'}
              sx={{
                py: 2,
                background: savedToDB
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              }}
            >
              {savingToDB ? 'Saving to Database...' : savedToDB ? '✅ Saved to Database Successfully!' : `💾 Save COs to ${selectedCourseDetails?.code}`}
            </Button>

            {savedToDB && (
              <Alert severity="success" sx={{ mt: 2 }} icon={<EmojiEvents />}>
                <AlertTitle>Success!</AlertTitle>
                COs have been saved to <strong>{selectedCourseDetails?.code}</strong>.
                They are now visible in the course detail page for both teachers and students.
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Pipeline Metrics */}
        <Grid item xs={12} lg={4}>
          {pipelineMetrics && (
            <Paper sx={{ p: 3, bgcolor: isDark ? '#1e293b' : 'white', position: 'sticky', top: 20 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                 Pipeline Metrics
              </Typography>

              <Stack spacing={2}>
                {/* Quality Metrics */}
                <Card sx={{ bgcolor: isDark ? '#0f172a' : '#f8fafc' }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Quality Scores
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">Avg Quality</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={pipelineMetrics.average_quality_score * 100}
                          color="primary"
                          sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" fontWeight="bold">
                          {(pipelineMetrics.average_quality_score * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">VTU Compliance</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={pipelineMetrics.average_vtu_compliance * 100}
                          color="success"
                          sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" fontWeight="bold">
                          {(pipelineMetrics.average_vtu_compliance * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Bloom Accuracy</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={pipelineMetrics.bloom_classification_accuracy * 100}
                          color="warning"
                          sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" fontWeight="bold">
                          {(pipelineMetrics.bloom_classification_accuracy * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card sx={{ bgcolor: isDark ? '#0f172a' : '#f8fafc' }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Performance
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Document Processing</Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {pipelineMetrics.document_processing_ms.toFixed(0)}ms
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">LLM Inference</Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {pipelineMetrics.llm_inference_ms.toFixed(0)}ms
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Refinement</Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {pipelineMetrics.refinement_ms.toFixed(0)}ms
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" fontWeight="bold">Total Time</Typography>
                        <Typography variant="caption" fontWeight="bold" color="primary.main">
                          {pipelineMetrics.total_pipeline_ms.toFixed(0)}ms
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                {/* ML Metrics */}
                {pipelineMetrics.ml_metrics && (
                  <Card sx={{ bgcolor: isDark ? '#0f172a' : '#f8fafc' }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      ML Performance
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Inference Latency</Typography>
                          <Typography variant="h6" color="primary.main">
                            {pipelineMetrics.ml_metrics.inference_latency_ms.toFixed(1)}ms
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Throughput</Typography>
                          <Typography variant="h6" color="success.main">
                            {pipelineMetrics.ml_metrics.throughput_cos_per_sec.toFixed(2)} CO/s
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>
    </motion.div>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              }}
            >
              <Psychology sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                AI-Powered CO Generator
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate VTU-aligned Course Outcomes with advanced AI pipeline
              </Typography>
            </Box>
          </Box>

          {/* Service Health */}
          {serviceHealth && (
            <Alert
              severity={serviceHealth.status === 'healthy' ? 'success' : 'error'}
              icon={<Verified />}
              sx={{ mt: 2 }}
            >
              Service Status: <strong>{serviceHealth.status.toUpperCase()}</strong>
            </Alert>
          )}
        </Box>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
              {error}
            </Alert>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>
              {success}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: isDark ? '#1e293b' : 'white' }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      <Box sx={{ mb: 3 }}>
        {renderStepContent()}
      </Box>

      {/* Navigation Buttons */}
      <Paper sx={{ p: 3, bgcolor: isDark ? '#1e293b' : 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBack />}
            size="large"
          >
            Back
          </Button>
          {activeStep < steps.length - 1 && (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowForward />}
              size="large"
            >
              {activeStep === steps.length - 2 ? 'Review' : 'Next'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Regenerate Dialog */}
      <Dialog
        open={regenerateDialog}
        onClose={() => setRegenerateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Regenerate Course Outcome</DialogTitle>
        <DialogContent>
          {selectedCO && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current CO: {selectedCO.co_text}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Feedback / Instructions"
                placeholder="Enter specific feedback or instructions for regeneration..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRegenerateCO}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
          >
            Regenerate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default COGenerator;