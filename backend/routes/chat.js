import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getCourseMessages,
  sendMessage,
  deleteMessage
} from '../controllers/chatController.js';

const router = express.Router();

// ==================================================================================
// CHAT MESSAGE ROUTES
// ==================================================================================

// Get all messages for a course
// Query params: limit (default: 100), offset (default: 0)
router.get(
  '/courses/:courseId/messages',
  authenticateToken,
  getCourseMessages
);

// Send a message in a course
// Body: message (required), messageType (optional, default: 'text'), materialId (optional)
router.post(
  '/courses/:courseId/messages',
  authenticateToken,
  sendMessage
);

// Delete a message (optional - for future use)
router.delete(
  '/messages/:messageId',
  authenticateToken,
  deleteMessage
);

export default router;
