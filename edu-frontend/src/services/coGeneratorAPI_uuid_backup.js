/**
 * CO Generator API Service - REFACTORED
 * Now uses course_id (UUID) instead of course_code everywhere
 */
import axios from 'axios';

const CO_API_URL = import.meta.env.VITE_CO_API_URL || 'http://localhost:8085/api/co';

// Create axios instance with auth
const coAPI = axios.create({
  baseURL: CO_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
coAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const coGeneratorAPI = {
  /**
   * Upload syllabus file
   * NOW USES: course_id (UUID) instead of course_code
   */
  uploadSyllabus: (file, courseId, teacherId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);  // Changed from course_code
    formData.append('teacher_id', teacherId);

    return coAPI.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Check upload/ingestion status
   * NOW USES: /status/{course_id} instead of /status?course_code
   */
  getIngestionStatus: (courseId) => {
    return coAPI.get(`/status/${courseId}`);
  },

  /**
   * Generate COs from uploaded syllabus
   * NOW USES: course_id and teacher_id in body
   */
  generateCOs: (courseId, teacherId, numCos = 5) => {
    return coAPI.post('/generate', {
      course_id: courseId,  // Changed from course_code
      teacher_id: teacherId,
      num_cos: numCos,
    });
  },

  /**
   * Generate COs with constraints
   */
  generateCOsWithConstraints: (courseId, teacherId, numCos = 5, constraints = {}) => {
    return coAPI.post('/generate', {
      course_id: courseId,
      teacher_id: teacherId,
      num_cos: numCos,
      constraints: {
        min_len: constraints.min_len || 12,
        max_len: constraints.max_len || 30,
        must_include_verbs: constraints.must_include_verbs !== false,
      },
      temperature: constraints.temperature || 0.2,
      seed: constraints.seed || 42,
    });
  },

  /**
   * List COs by course
   * NOW USES: /list/{course_id} instead of /list?course_code
   */
  listCOsByCourse: (courseId, verifiedOnly = false) => {
    return coAPI.get(`/list/${courseId}`, {
      params: { verified_only: verifiedOnly },
    });
  },

  /**
   * Get CO statistics for a course
   * NOW USES: /stats/{course_id} instead of /stats?course_code
   */
  getCOStats: (courseId) => {
    return coAPI.get(`/stats/${courseId}`);
  },

  /**
   * Reset course data (dev only)
   * NOW USES: /reset/{course_id} instead of /reset?course_code
   */
  resetCourseData: (courseId) => {
    return coAPI.delete(`/reset/${courseId}`);
  },

  /**
   * Health check
   */
  healthCheck: () => {
    return axios.get(`${CO_API_URL.replace('/api/co', '')}/health`);
  },

  /**
   * Get full course info with COs and stats (convenience method)
   */
  getCourseInfo: async (courseId) => {
    try {
      const [cosResponse, statsResponse] = await Promise.all([
        coAPI.get(`/list/${courseId}`),
        coAPI.get(`/stats/${courseId}`),
      ]);

      return {
        cos: cosResponse.data.co_list || [],
        stats: statsResponse.data,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching course info:', error);
      throw error;
    }
  },
};

export default coGeneratorAPI;
