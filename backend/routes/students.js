import express from 'express';
import {
  getStudentCourses,
  getStudentScores,
  getStudentCOPerformance,
  getStudentPOPerformance,
  getStudentAnalytics,
  enrollInCourse,
  getStudentMarksFromMarksheets,
  getStudentCOAttainment,
  getRecommendations,
  submitRecommendationFeedback,
  getAllStudents
} from '../controllers/studentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Routes for teachers/admins (must be before the student-only middleware)
router.get('/all', authenticateToken, authorizeRoles('teacher', 'admin'), getAllStudents);

// All routes below require authentication and student role
router.use(authenticateToken);
router.use(authorizeRoles('student'));

// Student routes
router.get('/courses', getStudentCourses);
router.post('/enroll', enrollInCourse);
router.get('/courses/:courseId/scores', getStudentScores);
router.get('/courses/:courseId/co-performance', getStudentCOPerformance);
router.get('/courses/:courseId/po-performance', getStudentPOPerformance);
router.get('/courses/:courseId/analytics', getStudentAnalytics);
router.get('/courses/:courseId/marks', getStudentMarksFromMarksheets);
router.get('/courses/:courseId/co-attainment', getStudentCOAttainment);
router.get('/courses/:courseId/recommendations', getRecommendations);
router.post('/recommendations/feedback', submitRecommendationFeedback);

export default router;
