import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import upload, { handleUploadError } from '../middleware/upload.js';
import {
  createFolder,
  getFolderContents,
  uploadMaterial,
  downloadMaterial,
  deleteMaterial,
  deleteFolder
} from '../controllers/materialsController.js';

const router = express.Router();

// ==================================================================================
// FOLDER ROUTES
// ==================================================================================

// Create folder in a course
router.post(
  '/courses/:courseId/folders',
  authenticateToken,
  createFolder
);

// Delete folder (must be empty)
router.delete(
  '/folders/:folderId',
  authenticateToken,
  deleteFolder
);

// ==================================================================================
// MATERIAL ROUTES
// ==================================================================================

// Get all materials and folders in a course (or specific folder)
// Query param: folderId (optional)
router.get(
  '/courses/:courseId/materials',
  authenticateToken,
  getFolderContents
);

// Upload material to a course (with optional folder)
// Body: folderId (optional), description (optional)
// File: multipart/form-data with field name 'file'
router.post(
  '/courses/:courseId/materials/upload',
  authenticateToken,
  upload.single('file'),
  handleUploadError,
  uploadMaterial
);

// Download material
router.get(
  '/materials/:materialId/download',
  authenticateToken,
  downloadMaterial
);

// Delete material
router.delete(
  '/materials/:materialId',
  authenticateToken,
  deleteMaterial
);

export default router;
