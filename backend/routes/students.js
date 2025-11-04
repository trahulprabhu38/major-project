import express from 'express';
import {
  getStudentCourses,
  getStudentScores,
  getStudentCOPerformance,
  getStudentPOPerformance,
  getStudentAnalytics,
  enrollInCourse
} from '../controllers/studentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and student role
router.use(authenticateToken);
router.use(authorizeRoles('student'));

// Student routes
router.get('/courses', getStudentCourses);
router.post('/enroll', enrollInCourse);
router.get('/courses/:courseId/scores', getStudentScores);
router.get('/courses/:courseId/co-performance', getStudentCOPerformance);
router.get('/courses/:courseId/po-performance', getStudentPOPerformance);
router.get('/courses/:courseId/analytics', getStudentAnalytics);

export default router;
