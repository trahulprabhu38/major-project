/**
 * CO Generator API Service
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
   */
  uploadSyllabus: (file, courseId, teacherId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);
    formData.append('teacher_id', teacherId);

    return coAPI.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Generate COs from uploaded syllabus
   */
  generateCOs: (courseId, teacherId, n_co = 5) => {
    return coAPI.post('/generate', {
      course_id: courseId,
      teacher_id: teacherId,
      n_co,
    });
  },

  /**
   * Generate COs with streaming (Server-Sent Events)
   */
  generateCOsStream: (courseId, teacherId, n_co = 5) => {
    return coAPI.post('/generate/stream', {
      course_id: courseId,
      teacher_id: teacherId,
      n_co,
    }, {
      responseType: 'stream',
    });
  },

  /**
   * Verify a CO
   */
  verifyCO: (coId, verified = true) => {
    return coAPI.post('/verify', {
      co_id: coId,
      verified,
    });
  },

  /**
   * Batch verify multiple COs
   */
  verifyBatch: (coIds, verified = true) => {
    return coAPI.post('/verify/batch', null, {
      params: { co_ids: coIds, verified },
    });
  },

  /**
   * List COs by filters
   */
  listCOs: (params = {}) => {
    return coAPI.get('/list', { params });
  },

  /**
   * List COs by course
   */
  listCOsByCourse: (courseId, verifiedOnly = false) => {
    return coAPI.get(`/list/${courseId}`, {
      params: { verified_only: verifiedOnly },
    });
  },

  /**
   * Get CO statistics for a course
   */
  getCOStats: (courseId) => {
    return coAPI.get(`/stats/${courseId}`);
  },

  /**
   * Health check
   */
  healthCheck: () => {
    return axios.get(`${CO_API_URL.replace('/api/co', '')}/health`);
  },
};

export default coGeneratorAPI;
