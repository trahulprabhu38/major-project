import express from 'express';
// import multer from "multer";

import {
  uploadAssessmentFile,
  downloadTemplate,
  bulkEnrollStudents
} from '../controllers/uploadController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import upload, { handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// All routes require authentication and teacher role
router.use(authenticateToken);
router.use(authorizeRoles('teacher', 'admin'));

// Upload assessment file
router.post('/assessment', upload.single('file'), handleUploadError, uploadAssessmentFile);

// Bulk enroll students
router.post('/enroll', upload.single('file'), handleUploadError, bulkEnrollStudents);

// Download template
router.get('/template', downloadTemplate);

export default router;


