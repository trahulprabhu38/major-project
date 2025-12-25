import { useState, useEffect, Fragment } from 'react';
import {
  GraduationCap,
  Video,
  FileText,
  Link as LinkIcon,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Star,
  Clock,
  TrendingUp,
  ChevronDown,
  RefreshCw,
  Calendar,
  Book,
  Gauge,
  Trophy,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { dbmsRecommenderAPI } from '../../services/dbmsRecommenderAPI';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Alert } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

const MotionCard = motion.create(Card);

const DBMSRecommender = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [tabValue, setTabValue] = useState('by-co');
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
  const [expandedDays, setExpandedDays] = useState({});

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
      console.log('Resource marked as completed');
    } catch (err) {
      console.error('Error marking complete:', err);
    }
  };

  const getResourceIcon = (type) => {
    const t = String(type || 'article').toLowerCase();
    if (t.includes('video')) return <Video className="w-5 h-5" />;
    if (t.includes('article') || t.includes('reading')) return <FileText className="w-5 h-5" />;
    if (t.includes('tutorial')) return <GraduationCap className="w-5 h-5" />;
    if (t.includes('practice')) return <Gauge className="w-5 h-5" />;
    return <Book className="w-5 h-5" />;
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text-primary">
          Analyzing your performance...
        </h2>
        <p className="text-neutral-600 dark:text-dark-text-secondary">
          Generating personalized recommendations
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
        <Button onClick={loadRecommendations}>Retry</Button>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <GraduationCap className="w-20 h-20 text-primary-500 dark:text-dark-green-500 opacity-50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-2">
            DBMS Resource Recommender
          </h2>
          <p className="text-neutral-600 dark:text-dark-text-secondary">
            No recommendations available. Select your internal test to get started.
          </p>
        </Card>
      </div>
    );
  }

  const recommendationsByCO = recommendations.recommendations || {};
  const totalResources = recommendations.total_resources || 0;
  const totalTime = recommendations.total_time_minutes || 0;
  const cosCount = recommendations.cos_count || 0;
  const weakQuestions = recommendations.weak_questions || [];

  return (
    <div className="p-4 md:p-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 text-white rounded-3xl p-6 mb-6 shadow-2xl">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                📚 DBMS Resource Recommender
              </h1>
              <p className="text-white/95 mb-4">
                Personalized Learning Path for Database Management Systems
              </p>
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-white/20 text-white border-white/30">
                  Student: {user?.usn}
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30">
                  Internal {internalNo}
                </Badge>
                {useCF && (
                  <Badge className="bg-white/20 text-white border-white/30">
                    <Trophy className="w-3 h-3 mr-1" />
                    Collaborative Filtering ON
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="bg-white/20 hover:bg-white/30 border-white/30 text-white"
              onClick={() => setShowSettings(!showSettings)}
            >
              Settings
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mb-6 p-6">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary mb-4">
                🎓 Recommendation Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2">
                    Internal Test Number
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((num) => (
                      <Button
                        key={num}
                        variant={internalNo === num ? 'default' : 'outline'}
                        onClick={() => setInternalNo(num)}
                      >
                        Internal {num}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2">
                    Question Pass Threshold: {threshold}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2">
                    <input
                      type="checkbox"
                      checked={useCF}
                      onChange={(e) => setUseCF(e.target.checked)}
                      className="w-5 h-5 accent-primary-500"
                    />
                    Use Collaborative Filtering
                  </label>
                  {useCF && (
                    <div className="mt-2">
                      <label className="block text-sm text-neutral-600 dark:text-dark-text-secondary mb-1">
                        CF Weight: {cfWeight.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={cfWeight}
                        onChange={(e) => setCfWeight(Number(e.target.value))}
                        className="w-full h-2 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-lg appearance-none cursor-pointer accent-primary-500"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2">
                    Study Plan Days: {studyDays}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={studyDays}
                    onChange={(e) => setStudyDays(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    onClick={loadRecommendations}
                    className="w-full bg-gradient-to-r from-primary-500 to-secondary-500"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Apply Settings & Reload
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MotionCard
          whileHover={{ scale: 1.05 }}
          className="border-t-4 border-error-500"
        >
          <CardContent className="text-center p-6">
            <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-1">
              Weak Questions
            </p>
            <h3 className="text-4xl font-bold text-error-600 dark:text-error-500 my-2">
              {weakQuestions.length}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-dark-text-muted">
              {weakQuestions.length > 0 ? `${weakQuestions.length} areas need work` : '✓ All Good'}
            </p>
          </CardContent>
        </MotionCard>
        <MotionCard
          whileHover={{ scale: 1.05 }}
          className="border-t-4 border-primary-500"
        >
          <CardContent className="text-center p-6">
            <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-1">
              Resources
            </p>
            <h3 className="text-4xl font-bold text-primary-600 dark:text-dark-green-500 my-2">
              {totalResources}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-dark-text-muted">
              📚 Recommended
            </p>
          </CardContent>
        </MotionCard>
        <MotionCard
          whileHover={{ scale: 1.05 }}
          className="border-t-4 border-accent-500"
        >
          <CardContent className="text-center p-6">
            <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-1">
              Study Time
            </p>
            <h3 className="text-4xl font-bold text-accent-600 dark:text-accent-500 my-2">
              {Math.floor(totalTime / 60)}h {totalTime % 60}m
            </h3>
            <p className="text-xs text-neutral-500 dark:text-dark-text-muted">
              ⏱️ Estimated
            </p>
          </CardContent>
        </MotionCard>
        <MotionCard
          whileHover={{ scale: 1.05 }}
          className="border-t-4 border-secondary-500"
        >
          <CardContent className="text-center p-6">
            <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-1">
              COs to Cover
            </p>
            <h3 className="text-4xl font-bold text-secondary-600 dark:text-secondary-500 my-2">
              {cosCount}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-dark-text-muted">
              🎯 Focus Areas
            </p>
          </CardContent>
        </MotionCard>
      </div>

      {/* Weak Questions Analysis */}
      {weakQuestions.length > 0 && (
        <Alert variant="warning" className="mb-6">
          <h3 className="font-bold text-lg mb-2">
            📋 Performance Analysis for Internal {internalNo}
          </h3>
          {useCF && (
            <p className="text-sm mb-2">
              🤖 Using <strong>Collaborative Filtering</strong> mode - recommendations based on
              ratings from students with similar skill gaps (CF weight: {(cfWeight * 100).toFixed(0)}%)
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <p className="text-sm font-semibold">Weak Questions:</p>
            {weakQuestions.map((q, idx) => (
              <Badge key={idx} variant="error">
                Q{q}
              </Badge>
            ))}
          </div>
          {recommendations.co_map && Object.keys(recommendations.co_map).length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold mb-1">Course Outcomes Affected:</p>
              {Object.entries(recommendations.co_map).map(([co, questions]) => (
                <p key={co} className="text-sm">
                  <strong>{co}:</strong> Questions {questions.join(', ')}
                </p>
              ))}
            </div>
          )}
        </Alert>
      )}

      {/* Study Plan */}
      {studyPlan && studyPlan.daily_schedule && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-6 h-6 text-primary-600 dark:text-dark-green-500" />
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary">
                📅 Personalized Study Plan ({studyPlan.total_days} days)
              </h2>
            </div>
            <Alert variant="info" className="mb-4">
              To complete all resources in <strong>{studyPlan.total_days} days</strong>, you'll
              need approximately <strong>{studyPlan.hours_per_day} hours/day</strong>
            </Alert>
            <div className="space-y-2">
              {Object.entries(studyPlan.daily_schedule).map(([day, items]) => {
                const totalDayMin = items.reduce((sum, item) => sum + (item.duration || 0), 0);
                const isExpanded = expandedDays[day];
                return (
                  <div key={day} className="border-2 border-neutral-200 dark:border-dark-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }))}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg-secondary flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-dark-bg-tertiary transition-colors"
                    >
                      <span className="font-bold text-neutral-800 dark:text-dark-text-primary">
                        📆 Day {day} ({totalDayMin} minutes)
                      </span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-2">
                            {items.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-dark-bg-primary border border-neutral-200 dark:border-dark-border rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium text-neutral-800 dark:text-dark-text-primary">
                                    {item.resource.title}
                                  </p>
                                  <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                                    {item.co} - {item.duration} min
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onValueChange={setTabValue} className="mb-6">
        <TabsList>
          <TabsTrigger value="by-co">By Course Outcome</TabsTrigger>
          <TabsTrigger value="all">All Resources</TabsTrigger>
        </TabsList>

        {/* Recommendations by CO */}
        <TabsContent value="by-co" className="space-y-6 mt-6">
          {Object.entries(recommendationsByCO).map(([co, resources]) => (
            <motion.div
              key={co}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-6 h-6 text-primary-600 dark:text-dark-green-500" />
                    <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary">
                      {co.toUpperCase()}
                    </h2>
                    <Badge>{resources.length} resources</Badge>
                  </div>

                  {recommendations.co_map && recommendations.co_map[co] && (
                    <Alert variant="info" className="mb-4">
                      This addresses your weak questions:{' '}
                      {recommendations.co_map[co].map((q) => `Q${q}`).join(', ')}
                    </Alert>
                  )}

                  <div className="space-y-4">
                    {resources.map((resource, idx) => (
                      <div
                        key={idx}
                        className="p-4 border-2 border-neutral-200 dark:border-dark-border rounded-xl hover:shadow-lg transition-shadow"
                      >
                        <div className="flex gap-4">
                          <div className="text-primary-600 dark:text-dark-green-500 mt-1">
                            {getResourceIcon(resource.type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-neutral-800 dark:text-dark-text-primary mb-2">
                              {resource.title}
                            </h3>
                            <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mb-3">
                              {resource.description}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge variant={getDifficultyColor(resource.difficulty)}>
                                {resource.difficulty || 'medium'}
                              </Badge>
                              <Badge variant="outline">
                                <Clock className="w-3 h-3 mr-1" />
                                {resource.estimated_time_min || 0} min
                              </Badge>
                              <Badge variant="outline">
                                {resource.topic || 'General'}
                              </Badge>
                              {resource.cf_rating && (
                                <Badge variant="success">
                                  {(resource.cf_rating * 100).toFixed(0)}% rated by similar students
                                </Badge>
                              )}
                              {resource.hybrid_score && (
                                <Badge>
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  Score: {resource.hybrid_score.toFixed(2)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                asChild
                                className="bg-gradient-to-r from-primary-500 to-secondary-500"
                              >
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <LinkIcon className="w-4 h-4 mr-2" />
                                  Open Resource
                                </a>
                              </Button>
                              <button
                                onClick={() => handleVote(resource.resource_id, 1)}
                                className="p-2 rounded-lg text-success-600 hover:bg-success-50 dark:text-success-500 dark:hover:bg-success-900/20 transition-colors"
                                title="Upvote"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleVote(resource.resource_id, -1)}
                                className="p-2 rounded-lg text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-900/20 transition-colors"
                                title="Downvote"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenFeedback(resource)}
                                className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 dark:text-dark-green-500 dark:hover:bg-primary-900/20 transition-colors"
                                title="Rate"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMarkComplete(resource.resource_id)}
                                className="p-2 rounded-lg text-success-600 hover:bg-success-50 dark:text-success-500 dark:hover:bg-success-900/20 transition-colors"
                                title="Mark Complete"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* All Resources Tab */}
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Object.values(recommendationsByCO)
                  .flat()
                  .map((resource, idx) => (
                    <div
                      key={idx}
                      className="p-4 border border-neutral-200 dark:border-dark-border rounded-xl"
                    >
                      <div className="flex gap-4 items-start">
                        <div className="text-primary-600 dark:text-dark-green-500 mt-1">
                          {getResourceIcon(resource.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-neutral-800 dark:text-dark-text-primary">
                            {resource.title}
                          </h3>
                          <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                            {resource.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge>{resource.CO}</Badge>
                            <Badge variant={getDifficultyColor(resource.difficulty)}>
                              {resource.difficulty || 'medium'}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog.open} onOpenChange={(open) => !open && setFeedbackDialog({ open: false, resource: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <h3 className="font-semibold text-neutral-800 dark:text-dark-text-primary">
              {feedbackDialog.resource?.title}
            </h3>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                Rating:
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 transition-colors ${
                      star <= rating
                        ? 'text-accent-500'
                        : 'text-neutral-300 dark:text-dark-text-muted'
                    }`}
                  >
                    <Star className="w-8 h-8 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                Comment (optional)
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What helped? Anything missing?"
                className="w-full px-4 py-3 border-2 border-neutral-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg-primary text-neutral-800 dark:text-dark-text-primary placeholder:text-neutral-500 focus:outline-none focus:border-primary-500 dark:focus:border-dark-green-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeedbackDialog({ open: false, resource: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              className="bg-gradient-to-r from-primary-500 to-secondary-500"
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DBMSRecommender;
