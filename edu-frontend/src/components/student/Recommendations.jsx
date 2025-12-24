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
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  CircularProgress,
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
} from '@mui/icons-material';
import { recommendationAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Recommendations = ({ courseId, courseCode }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [feedbackDialog, setFeedbackDialog] = useState({ open: false, resource: null });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (courseId && user?.usn) {
      loadRecommendations();
    }
  }, [courseId, user?.usn]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine internal number from course (you might need to adjust this logic)
      // For now, using a default of 1
      const internalNo = 1;

      const response = await recommendationAPI.getRecommendations({
        student_id: user.usn,
        course_id: parseInt(courseId), // Convert to integer
        internal_no: internalNo,
        threshold: 5, // Fixed field name
        use_cf: true, // Fixed field name
        cf_weight: 0.7,
        top_k_per_co: 7,
      });

      setRecommendations(response.data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      // Handle validation errors properly
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          const errorMessages = err.response.data.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
          setError(errorMessages);
        } else {
          setError(err.response.data.detail);
        }
      } else {
        setError(err.message || 'Failed to load recommendations');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (resourceId, vote) => {
    try {
      await recommendationAPI.voteResource({
        student_id: user.usn,
        resource_id: resourceId,
        vote: vote, // 1 for upvote, -1 for downvote
      });
      // Reload recommendations to reflect vote
      loadRecommendations();
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
      await recommendationAPI.submitFeedback({
        student_id: user.usn,
        resource_id: feedbackDialog.resource.resource_id,
        rating: rating,
        comment: comment,
      });
      setFeedbackDialog({ open: false, resource: null });
      loadRecommendations();
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  const handleMarkComplete = async (resourceId) => {
    try {
      await recommendationAPI.markComplete({
        student_id: user.usn,
        resource_id: resourceId,
      });
      loadRecommendations();
    } catch (err) {
      console.error('Error marking complete:', err);
    }
  };

  const getResourceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <VideoLibrary />;
      case 'article':
      case 'reading':
        return <Article />;
      default:
        return <LinkIcon />;
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
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
      <Card sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading personalized recommendations...
        </Typography>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button size="small" onClick={loadRecommendations} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!recommendations) {
    return (
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Personalized Learning Resources
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No recommendations available. Complete some assessments to get personalized recommendations.
        </Typography>
      </Card>
    );
  }

  // Group recommendations by CO
  const recommendationsByCO = {};
  if (recommendations.recommendations) {
    Object.entries(recommendations.recommendations).forEach(([co, resources]) => {
      if (!recommendationsByCO[co]) {
        recommendationsByCO[co] = [];
      }
      recommendationsByCO[co] = resources || [];
    });
  }

  return (
    <Box>
      <Card sx={{ mb: 3, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Personalized Learning Recommendations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Based on your performance in {courseCode || 'this course'}
            </Typography>
          </Box>
          <Button variant="outlined" onClick={loadRecommendations}>
            Refresh
          </Button>
        </Box>

        {recommendations.weak_questions && recommendations.weak_questions.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Areas for Improvement:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {recommendations.weak_questions.map((q, idx) => (
                <Chip key={idx} label={q} size="small" />
              ))}
            </Box>
          </Alert>
        )}

        {recommendations.kpis && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Expected Improvement:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {recommendations.kpis.expected_improvement || 'N/A'}
            </Typography>
          </Box>
        )}
      </Card>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="By Course Outcome" />
        <Tab label="All Resources" />
      </Tabs>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          {Object.entries(recommendationsByCO).map(([co, resources]) => (
            <Grid item xs={12} key={co}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <School color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      {co.toUpperCase()}
                    </Typography>
                    <Chip label={`${resources.length} resources`} size="small" />
                  </Box>

                  <List>
                    {resources.map((resource, idx) => (
                      <ListItem
                        key={idx}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          mb: 1,
                          bgcolor: 'background.paper',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'start', gap: 2, flex: 1 }}>
                          <Box sx={{ color: 'primary.main', mt: 0.5 }}>
                            {getResourceIcon(resource.type)}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                              {resource.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {resource.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
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
                              {resource.effectiveness && (
                                <Chip
                                  icon={<TrendingUp />}
                                  label={`${(resource.effectiveness * 100).toFixed(0)}% effective`}
                                  size="small"
                                  color="success"
                                />
                              )}
                            </Box>
                            <Button
                              size="small"
                              variant="outlined"
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              startIcon={<LinkIcon />}
                            >
                              Open Resource
                            </Button>
                          </Box>
                        </Box>
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleVote(resource.resource_id, 1)}
                              color="success"
                            >
                              <ThumbUp fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleVote(resource.resource_id, -1)}
                              color="error"
                            >
                              <ThumbDown fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenFeedback(resource)}
                              color="primary"
                            >
                              <Star fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleMarkComplete(resource.resource_id)}
                              color="success"
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tabValue === 1 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <List>
              {Object.values(recommendationsByCO)
                .flat()
                .map((resource, idx) => (
                  <ListItem
                    key={idx}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 2, flex: 1 }}>
                      <Box sx={{ color: 'primary.main', mt: 0.5 }}>
                        {getResourceIcon(resource.type)}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
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
                    </Box>
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        variant="outlined"
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog.open} onClose={() => setFeedbackDialog({ open: false, resource: null })}>
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
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog({ open: false, resource: null })}>Cancel</Button>
          <Button onClick={handleSubmitFeedback} variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Recommendations;

