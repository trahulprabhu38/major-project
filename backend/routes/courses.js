import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollStudents,
  getEnrolledStudents,
  getTeacherDashboard,
  getCourseAnalytics,
  getTeacherEnrollments,
  createOrGetCourse,
  getTeacherCourses,
} from '../controllers/courseController.js';

const router = express.Router();

// Teacher dashboard route - must come before /:id routes
router.get('/dashboard', authenticateToken, getTeacherDashboard);
router.get('/enrollments', authenticateToken, getTeacherEnrollments);

// CO Generator specific routes - must come before /:id routes
router.post('/create-or-get', authenticateToken, createOrGetCourse);
router.get('/teacher', authenticateToken, getTeacherCourses);

// Course CRUD routes
router.post('/', authenticateToken, createCourse);
router.get('/', authenticateToken, getCourses);
router.get('/:id', authenticateToken, getCourseById);
router.get('/:id/analytics', authenticateToken, getCourseAnalytics);
router.put('/:id', authenticateToken, updateCourse);
router.delete('/:id', authenticateToken, deleteCourse);

// Enrollment routes
router.post('/:id/enroll', authenticateToken, enrollStudents);
router.get('/:id/students', authenticateToken, getEnrolledStudents);

export default router;
