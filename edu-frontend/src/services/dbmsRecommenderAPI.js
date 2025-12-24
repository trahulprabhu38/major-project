import axios from 'axios';

const DBMS_REC_URL = import.meta.env.VITE_DBMS_RECOMMENDER_URL || 'http://localhost:8004';

// Create axios instance for DBMS Recommender Service
const dbmsRecAPI = axios.create({
  baseURL: DBMS_REC_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// DBMS Resource Recommender APIs
export const dbmsRecommenderAPI = {
  /**
   * Get personalized resource recommendations for a student
   * @param {Object} params - Request parameters
   * @param {string} params.student_id - Student USN
   * @param {number} params.internal_no - Internal test number (1, 2, or 3)
   * @param {number} params.threshold - Marks threshold (default: 5)
   * @param {number} params.top_k_per_co - Resources per CO (default: 7)
   * @param {boolean} params.use_cf - Use collaborative filtering (default: true)
   * @param {number} params.cf_weight - CF weight (default: 0.7)
   */
  getRecommendations: (params) => 
    dbmsRecAPI.post('/api/recommendations', params),

  /**
   * Get recommendations using GET method
   * @param {string} studentId - Student USN
   * @param {Object} params - Query parameters
   */
  getRecommendationsSimple: (studentId, params) =>
    dbmsRecAPI.get(`/api/recommendations/${studentId}`, { params }),

  /**
   * Submit a vote for a resource
   * @param {Object} data - Vote data
   * @param {string} data.student_id - Student USN
   * @param {string} data.resource_id - Resource ID
   * @param {number} data.vote - Vote value (1 for upvote, -1 for downvote)
   */
  submitVote: (data) =>
    dbmsRecAPI.post('/api/vote', data),

  /**
   * Submit feedback/rating for a resource
   * @param {Object} data - Feedback data
   * @param {string} data.student_id - Student USN
   * @param {string} data.resource_id - Resource ID
   * @param {number} data.rating - Rating (1-5)
   * @param {string} data.comment - Optional comment
   */
  submitFeedback: (data) =>
    dbmsRecAPI.post('/api/feedback', data),

  /**
   * Mark a resource as completed
   * @param {Object} data - Completion data
   * @param {string} data.student_id - Student USN
   * @param {string} data.resource_id - Resource ID
   */
  markComplete: (data) =>
    dbmsRecAPI.post('/api/complete', data),

  /**
   * Generate a study plan based on recommendations
   * @param {Object} data - Study plan data
   * @param {Object} data.recommendations - Recommendations dict
   * @param {number} data.study_days - Number of days (default: 7)
   */
  generateStudyPlan: (data) =>
    dbmsRecAPI.post('/api/study-plan', data),

  /**
   * Get all available resources
   */
  getAllResources: () =>
    dbmsRecAPI.get('/api/resources'),

  /**
   * Get voting analytics (teacher/admin view)
   */
  getVoteAnalytics: () =>
    dbmsRecAPI.get('/api/analytics/votes'),

  /**
   * Get feedback analytics (teacher/admin view)
   */
  getFeedbackAnalytics: () =>
    dbmsRecAPI.get('/api/analytics/feedback'),

  /**
   * Get weak areas for a student
   * @param {string} studentId - Student USN
   * @param {Object} params - Query parameters
   * @param {number} params.internal_no - Internal test number
   * @param {number} params.threshold - Marks threshold
   */
  getWeakAreas: (studentId, params) =>
    dbmsRecAPI.get(`/api/student/${studentId}/weak-areas`, { params }),

  /**
   * Health check
   */
  healthCheck: () =>
    dbmsRecAPI.get('/health'),
};

export default dbmsRecommenderAPI;

