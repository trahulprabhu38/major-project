import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  CircularProgress,
  Slider,
  FormControlLabel,
  Switch,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  School,
  VideoLibrary,
  Article,
  Link as LinkIcon,
  ThumbUp,
  ThumbDown,
  CheckCircle,
  Star,
  AccessTime,
  TrendingUp,
  Timeline,
  ExpandMore,
  Refresh,
  CalendarToday,
  Book,
  Speed,
  EmojiEvents,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { dbmsRecommenderAPI } from '../../services/dbmsRecommenderAPI';

const MotionCard = motion.create(Card);
const MotionBox = motion.create(Box);

const DBMSRecommender = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [feedbackDialog, setFeedbackDialog] = useState({ open: false, resource: null });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [studyPlan, setStudyPlan] = useState(null);

  // Settings
  const [internalNo, setInternalNo] = useState(1);
  const [threshold, setThreshold] = useState(5);
  const [useCF, setUseCF] = useState(true);
  const [cfWeight, setCfWeight] = useState(0.7);
  const [studyDays, setStudyDays] = useState(7);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (user?.usn) {
      loadRecommendations();
    }
  }, [user?.usn, internalNo]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dbmsRecommenderAPI.getRecommendations({
        student_id: user.usn,
        internal_no: internalNo,
        threshold: threshold,
        top_k_per_co: 7,
        use_cf: useCF,
        cf_weight: cfWeight,
      });

      setRecommendations(response.data);

      // Auto-generate study plan
      if (response.data.recommendations) {
        const planResponse = await dbmsRecommenderAPI.generateStudyPlan({
          recommendations: response.data.recommendations,
          study_days: studyDays,
        });
        setStudyPlan(planResponse.data);
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (resourceId, vote) => {
    try {
      await dbmsRecommenderAPI.submitVote({
        student_id: user.usn,
        resource_id: resourceId,
        vote: vote,
      });
      // Show success message without reloading
      console.log('Vote submitted successfully');
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleOpenFeedback = (resource) => {
    setFeedbackDialog({ open: true, resource });
    setRating(5);
    setComment('');
  };

  const handleSubmitFeedback = async () => {
    try {
      await dbmsRecommenderAPI.submitFeedback({
        student_id: user.usn,
        resource_id: feedbackDialog.resource.resource_id,
        rating: rating,
        comment: comment,
      });
      setFeedbackDialog({ open: false, resource: null });
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  const handleMarkComplete = async (resourceId) => {
    try {
      await dbmsRecommenderAPI.markComplete({
        student_id: user.usn,
        resource_id: resourceId,
      });
      // Show success message
      console.log('Resource marked as completed');
    } catch (err) {
      console.error('Error marking complete:', err);
    }
  };

  const getResourceIcon = (type) => {
    const t = String(type || 'article').toLowerCase();
    if (t.includes('video')) return <VideoLibrary />;
    if (t.includes('article') || t.includes('reading')) return <Article />;
    if (t.includes('tutorial')) return <School />;
    if (t.includes('practice')) return <Speed />;
    return <Book />;
  };

  const getDifficultyColor = (difficulty) => {
    switch (String(difficulty || 'medium').toLowerCase()) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Analyzing your performance...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Generating personalized recommendations
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Button size="small" onClick={loadRecommendations} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  if (!recommendations) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <School sx={{ fontSize: 80, color: 'primary.main', opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            DBMS Resource Recommender
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No recommendations available. Select your internal test to get started.
          </Typography>
        </Card>
      </Box>
    );
  }

  const recommendationsByCO = recommendations.recommendations || {};
  const totalResources = recommendations.total_resources || 0;
  const totalTime = recommendations.total_time_minutes || 0;
  const cosCount = recommendations.cos_count || 0;
  const weakQuestions = recommendations.weak_questions || [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Hero Header */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 4,
            p: 4,
            mb: 3,
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                📚 DBMS Resource Recommender
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.95, mb: 2 }}>
                Personalized Learning Path for Database Management Systems
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`Student: ${user?.usn}`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
                />
                <Chip
                  label={`Internal ${internalNo}`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
                />
                {useCF && (
                  <Chip
                    label="Collaborative Filtering ON"
                    icon={<EmojiEvents sx={{ color: 'white !important' }} />}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
                  />
                )}
              </Box>
            </Box>
            <Button
              variant="contained"
              onClick={() => setShowSettings(!showSettings)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              Settings
            </Button>
          </Box>
        </Card>
      </MotionBox>

      {/* Settings Panel */}
      {showSettings && (
        <MotionCard
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          sx={{ mb: 3, p: 3 }}
        >
          <Typography variant="h6" gutterBottom>
            🎓 Recommendation Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Internal Test Number</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {[1, 2, 3].map((num) => (
                  <Button
                    key={num}
                    variant={internalNo === num ? 'contained' : 'outlined'}
                    onClick={() => setInternalNo(num)}
                  >
                    Internal {num}
                  </Button>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Question Pass Threshold: {threshold}/10
              </Typography>
              <Slider
                value={threshold}
                onChange={(e, val) => setThreshold(val)}
                min={1}
                max={10}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch checked={useCF} onChange={(e) => setUseCF(e.target.checked)} />
                }
                label="Use Collaborative Filtering"
              />
              {useCF && (
                <Box sx={{ mt: 1 }}>
                  <Typography gutterBottom>CF Weight: {cfWeight.toFixed(1)}</Typography>
                  <Slider
                    value={cfWeight}
                    onChange={(e, val) => setCfWeight(val)}
                    min={0}
                    max={1}
                    step={0.1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Study Plan Days: {studyDays}</Typography>
              <Slider
                value={studyDays}
                onChange={(e, val) => setStudyDays(val)}
                min={1}
                max={30}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={loadRecommendations}
                startIcon={<Refresh />}
                fullWidth
              >
                Apply Settings & Reload
              </Button>
            </Grid>
          </Grid>
        </MotionCard>
      )}

      {/* KPI Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MotionCard
            whileHover={{ scale: 1.05 }}
            sx={{ 
              borderRadius: 3, 
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              borderTop: '4px solid #F44336'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Weak Questions
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="#F44336" sx={{ my: 1 }}>
                {weakQuestions.length}
              </Typography>
              <Typography variant="caption" color={weakQuestions.length > 0 ? 'error' : 'success'}>
                {weakQuestions.length > 0 ? `${weakQuestions.length} areas need work` : '✓ All Good'}
              </Typography>
            </CardContent>
          </MotionCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MotionCard
            whileHover={{ scale: 1.05 }}
            sx={{ 
              borderRadius: 3, 
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              borderTop: '4px solid #667eea'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Resources
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="#667eea" sx={{ my: 1 }}>
                {totalResources}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                📚 Recommended
              </Typography>
            </CardContent>
          </MotionCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MotionCard
            whileHover={{ scale: 1.05 }}
            sx={{ 
              borderRadius: 3, 
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              borderTop: '4px solid #FF9800'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Study Time
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="#FF9800" sx={{ my: 1 }}>
                {Math.floor(totalTime / 60)}h {totalTime % 60}m
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ⏱️ Estimated
              </Typography>
            </CardContent>
          </MotionCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MotionCard
            whileHover={{ scale: 1.05 }}
            sx={{ 
              borderRadius: 3, 
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              borderTop: '4px solid #9C27B0'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                COs to Cover
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="#9C27B0" sx={{ my: 1 }}>
                {cosCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                🎯 Focus Areas
              </Typography>
            </CardContent>
          </MotionCard>
        </Grid>
      </Grid>

      {/* Weak Questions Analysis */}
      {weakQuestions.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            📋 Performance Analysis for Internal {internalNo}
          </Typography>
          {useCF && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              🤖 Using <strong>Collaborative Filtering</strong> mode - recommendations based on
              ratings from students with similar skill gaps (CF weight: {(cfWeight * 100).toFixed(0)}%)
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            <Typography variant="body2" fontWeight="bold">Weak Questions:</Typography>
            {weakQuestions.map((q, idx) => (
              <Chip key={idx} label={`Q${q}`} size="small" color="error" />
            ))}
          </Box>
          {recommendations.co_map && Object.keys(recommendations.co_map).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Course Outcomes Affected:
              </Typography>
              {Object.entries(recommendations.co_map).map(([co, questions]) => (
                <Typography key={co} variant="body2">
                  <strong>{co}:</strong> Questions {questions.join(', ')}
                </Typography>
              ))}
            </Box>
          )}
        </Alert>
      )}

      {/* Study Plan */}
      {studyPlan && studyPlan.daily_schedule && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CalendarToday color="primary" />
              <Typography variant="h6" fontWeight="bold">
                📅 Personalized Study Plan ({studyPlan.total_days} days)
              </Typography>
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              To complete all resources in <strong>{studyPlan.total_days} days</strong>, you'll
              need approximately <strong>{studyPlan.hours_per_day} hours/day</strong>
            </Alert>
            {Object.entries(studyPlan.daily_schedule).map(([day, items]) => {
              const totalDayMin = items.reduce((sum, item) => sum + (item.duration || 0), 0);
              return (
                <Accordion key={day}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography fontWeight="bold">
                      📆 Day {day} ({totalDayMin} minutes)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {items.map((item, idx) => (
                        <ListItem key={idx}>
                          <ListItemText
                            primary={item.resource.title}
                            secondary={`${item.co} - ${item.duration} min`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="By Course Outcome" />
        <Tab label="All Resources" />
      </Tabs>

      {/* Recommendations by CO */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {Object.entries(recommendationsByCO).map(([co, resources]) => (
            <Grid item xs={12} key={co}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ borderRadius: 3 }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <School color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      {co.toUpperCase()}
                    </Typography>
                    <Chip label={`${resources.length} resources`} size="small" />
                  </Box>

                  {recommendations.co_map && recommendations.co_map[co] && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      This addresses your weak questions:{' '}
                      {recommendations.co_map[co].map((q) => `Q${q}`).join(', ')}
                    </Alert>
                  )}

                  <List>
                    {resources.map((resource, idx) => (
                      <Paper
                        key={idx}
                        elevation={2}
                        sx={{
                          p: 2,
                          mb: 2,
                          borderRadius: 2,
                          transition: 'all 0.3s',
                          '&:hover': { boxShadow: 6 },
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Box sx={{ color: 'primary.main', mt: 0.5 }}>
                            {getResourceIcon(resource.type)}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                              {resource.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {resource.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                              <Chip
                                label={resource.difficulty || 'medium'}
                                size="small"
                                color={getDifficultyColor(resource.difficulty)}
                              />
                              <Chip
                                icon={<AccessTime />}
                                label={`${resource.estimated_time_min || 0} min`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={resource.topic || 'General'}
                                size="small"
                                variant="outlined"
                              />
                              {resource.cf_rating && (
                                <Chip
                                  label={`${(resource.cf_rating * 100).toFixed(0)}% rated by similar students`}
                                  size="small"
                                  color="success"
                                />
                              )}
                              {resource.hybrid_score && (
                                <Chip
                                  icon={<TrendingUp />}
                                  label={`Score: ${resource.hybrid_score.toFixed(2)}`}
                                  size="small"
                                  color="primary"
                                />
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                size="small"
                                variant="contained"
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                startIcon={<LinkIcon />}
                              >
                                Open Resource
                              </Button>
                              <IconButton
                                size="small"
                                onClick={() => handleVote(resource.resource_id, 1)}
                                color="success"
                                title="Upvote"
                              >
                                <ThumbUp fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleVote(resource.resource_id, -1)}
                                color="error"
                                title="Downvote"
                              >
                                <ThumbDown fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenFeedback(resource)}
                                color="primary"
                                title="Rate"
                              >
                                <Star fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleMarkComplete(resource.resource_id)}
                                color="success"
                                title="Mark Complete"
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </List>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* All Resources Tab */}
      {tabValue === 1 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <List>
              {Object.values(recommendationsByCO)
                .flat()
                .map((resource, idx) => (
                  <Paper
                    key={idx}
                    elevation={1}
                    sx={{ p: 2, mb: 2, borderRadius: 2 }}
                  >
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'start' }}>
                      <Box sx={{ color: 'primary.main', mt: 0.5 }}>
                        {getResourceIcon(resource.type)}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {resource.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {resource.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={resource.CO} size="small" color="primary" />
                          <Chip
                            label={resource.difficulty || 'medium'}
                            size="small"
                            color={getDifficultyColor(resource.difficulty)}
                          />
                        </Box>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                      </Button>
                    </Box>
                  </Paper>
                ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Feedback Dialog */}
      <Dialog
        open={feedbackDialog.open}
        onClose={() => setFeedbackDialog({ open: false, resource: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rate Resource</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {feedbackDialog.resource?.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <Typography>Rating:</Typography>
              <Rating
                value={rating}
                onChange={(e, newValue) => setRating(newValue)}
                size="large"
              />
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              sx={{ mt: 2 }}
              placeholder="What helped? Anything missing?"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog({ open: false, resource: null })}>
            Cancel
          </Button>
          <Button onClick={handleSubmitFeedback} variant="contained">
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DBMSRecommender;

