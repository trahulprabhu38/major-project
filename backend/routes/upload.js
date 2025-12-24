import express from 'express';
// import multer from "multer";

import {
  uploadAssessmentFile,
  downloadTemplate,
  bulkEnrollStudents
} from '../controllers/uploadController.js';
import {
  uploadAssessmentFileEnhanced,
  downloadTemplateEnhanced
} from '../controllers/uploadControllerEnhanced.js';
import {
  uploadMarksheet,
  getMarksheetMetadata,
  updateCOMappings,
  listCourseMarksheets
} from '../controllers/marksheetUploadController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import upload, { handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// All routes require authentication and teacher role
router.use(authenticateToken);
router.use(authorizeRoles('teacher', 'admin'));

// NEW: Marksheet upload through upload-service with auto-calculation
router.post('/marksheet', upload.single('file'), handleUploadError, uploadMarksheet);
router.get('/marksheet/:marksheetId', getMarksheetMetadata);
router.post('/marksheet/:marksheetId/co-mappings', updateCOMappings);
router.get('/course/:courseId/marksheets', listCourseMarksheets);

// Enhanced upload with attainment calculation (NEW)
router.post('/assessment-enhanced', upload.single('file'), handleUploadError, uploadAssessmentFileEnhanced);

// Download enhanced template with CO mapping
router.get('/template-enhanced', downloadTemplateEnhanced);

// Legacy routes (keep for backward compatibility)
router.post('/assessment', upload.single('file'), handleUploadError, uploadAssessmentFile);
router.post('/enroll', upload.single('file'), handleUploadError, bulkEnrollStudents);
router.get('/template', downloadTemplate);

export default router;


