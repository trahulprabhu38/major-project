/**
 * CO Generator API Service - SIMPLIFIED VERSION
 * Uses course_code (e.g., "DS1", "CS101") as the primary identifier
 */
import axios from 'axios';

const CO_API_URL = import.meta.env.VITE_CO_API_URL || 'http://localhost:8085/api/co';

// Create axios instance
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
   * Requires: course_id (UUID), course_code (string), teacher_id (UUID)
   */
  uploadSyllabus: (file, courseId, courseCode, teacherId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);
    formData.append('course_code', courseCode);
    formData.append('teacher_id', teacherId);

    return coAPI.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Generate COs from uploaded syllabus
   * Uses query parameters: course_id, course_code, num_cos
   */
  generateCOs: (courseId, courseCode, numCos = 5) => {
    return coAPI.post(`/generate?course_id=${courseId}&course_code=${courseCode}&num_cos=${numCos}`);
  },

  /**
   * Get CO statistics for a course
   * Requires: course_id and course_code as query params
   */
  getCOStats: (courseId, courseCode) => {
    return coAPI.get(`/stats/${courseId}?course_code=${courseCode}`);
  },

  /**
   * List COs by course
   * DEPRECATED - not in new backend, kept for compatibility
   */
  listCOsByCourse: (courseCode) => {
    return coAPI.get(`/list/${courseCode}`);
  },

  /**
   * Check upload/ingestion status
   * DEPRECATED - not in new backend, kept for compatibility
   */
  getIngestionStatus: (courseCode) => {
    return coAPI.get(`/status/${courseCode}`);
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
  getCourseInfo: async (courseCode) => {
    try {
      const [cosResponse, statsResponse] = await Promise.all([
        coAPI.get(`/list/${courseCode}`),
        coAPI.get(`/stats/${courseCode}`),
      ]);

      return {
        cos: cosResponse.data.co_list || [],
        stats: statsResponse.data,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching course info:', error);
      // Don't throw - return empty data
      return {
        cos: [],
        stats: {
          co_counts: { total: 0, verified: 0, unverified: 0 },
          bloom_distribution: {},
        },
        success: false,
      };
    }
  },
};

export default coGeneratorAPI;
