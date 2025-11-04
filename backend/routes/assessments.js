import express from 'express';
import {
  createAssessment,
  getAssessments,
  createQuestion,
  getQuestions,
  calculateAttainment,
  getCOAttainment,
  getPOAttainment
} from '../controllers/assessmentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Assessment routes
router.post('/', authorizeRoles('teacher', 'admin'), createAssessment);
router.get('/course/:courseId', getAssessments);

// Question routes
router.post('/questions', authorizeRoles('teacher', 'admin'), createQuestion);
router.get('/:assessmentId/questions', getQuestions);

// Attainment calculation
router.post('/course/:courseId/assessment/:assessmentId/calculate', authorizeRoles('teacher', 'admin'), calculateAttainment);

// Get attainment data
router.get('/course/:courseId/co-attainment', getCOAttainment);
router.get('/course/:courseId/po-attainment', getPOAttainment);

export default router;
