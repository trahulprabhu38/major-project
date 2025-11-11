import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createMarksheet,
  getMarksheetsByCourse,
  getMarksheetById,
  updateMarksheet,
  deleteMarksheet,
  getMyMarksheets,
  getMarksheetData,
} from '../controllers/marksheetController.js';

const router = express.Router();

// Get all marksheets uploaded by current user
router.get('/my-uploads', authenticateToken, getMyMarksheets);

// Get all marksheets for a specific course
router.get('/course/:courseId', authenticateToken, getMarksheetsByCourse);

// Get the actual data from a marksheet table
router.get('/:id/data', authenticateToken, getMarksheetData);

// Get a specific marksheet by ID
router.get('/:id', authenticateToken, getMarksheetById);

// Create a new marksheet
router.post('/', authenticateToken, createMarksheet);

// Update a marksheet
router.put('/:id', authenticateToken, updateMarksheet);

// Delete a marksheet
router.delete('/:id', authenticateToken, deleteMarksheet);

export default router;
