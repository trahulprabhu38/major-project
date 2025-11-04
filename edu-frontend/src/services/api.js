import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Course APIs
export const courseAPI = {
  getAll: (params) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  enrollStudents: (id, studentIds) => api.post(`/courses/${id}/enroll`, { studentIds }),
  getEnrolledStudents: (id) => api.get(`/courses/${id}/students`),
  getAnalytics: (id) => api.get(`/courses/${id}/analytics`),
  getDashboard: () => api.get('/courses/dashboard'),
  getEnrollments: () => api.get('/courses/enrollments'),
};

// Assessment APIs
export const assessmentAPI = {
  create: (data) => api.post('/assessments', data),
  getByCourse: (courseId) => api.get(`/assessments/course/${courseId}`),
  createQuestion: (data) => api.post('/assessments/questions', data),
  getQuestions: (assessmentId) => api.get(`/assessments/${assessmentId}/questions`),
  calculateAttainment: (courseId, assessmentId, threshold) =>
    api.post(`/assessments/course/${courseId}/assessment/${assessmentId}/calculate`, null, {
      params: { threshold },
    }),
  getCOAttainment: (courseId) => api.get(`/assessments/course/${courseId}/co-attainment`),
  getPOAttainment: (courseId) => api.get(`/assessments/course/${courseId}/po-attainment`),
};

// Upload APIs
export const uploadAPI = {
  uploadAssessment: (file, assessmentId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assessmentId', assessmentId);
    return api.post('/upload/assessment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  bulkEnroll: (file, courseId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);
    return api.post('/upload/enroll', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadTemplate: () => api.get('/upload/template', { responseType: 'blob' }),
};

// Student APIs
export const studentAPI = {
  getCourses: () => api.get('/students/courses'),
  enroll: (data) => api.post('/students/enroll', data),
  getScores: (courseId) => api.get(`/students/courses/${courseId}/scores`),
  getCOPerformance: (courseId) => api.get(`/students/courses/${courseId}/co-performance`),
  getPOPerformance: (courseId) => api.get(`/students/courses/${courseId}/po-performance`),
  getAnalytics: (courseId) => api.get(`/students/courses/${courseId}/analytics`),
};

export default api;
