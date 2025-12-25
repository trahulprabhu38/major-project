import express from 'express';
import seeMarksService from '../services/seeMarksService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * SEE Marks Routes
 * Handles Semester End Examination marks upload and management
 */

/**
 * POST /api/see-marks/courses/:courseId/upload
 * Upload SEE marks for multiple students in a course
 *
 * Body: {
 *   marksData: [{ usn: "1MS22CS001", see_marks: 85 }, ...]
 * }
 *
 * Access: Teacher only
 */
router.post('/courses/:courseId/upload', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { marksData } = req.body;
    const uploadedBy = req.user.userId;

    // Validate input
    if (!marksData || !Array.isArray(marksData) || marksData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'marksData array is required and must not be empty'
      });
    }

    // Validate marks data before upload
    const validation = seeMarksService.validateSEEMarksData(marksData);

    if (validation.invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        validCount: validation.valid.length,
        invalidCount: validation.invalid.length,
        invalidEntries: validation.invalid
      });
    }

    // Upload marks
    const result = await seeMarksService.uploadSEEMarks(courseId, marksData, uploadedBy);

    // Check if there were any failures
    if (result.failed > 0 && result.uploaded === 0 && result.updated === 0) {
      // All uploads failed
      return res.status(400).json({
        success: false,
        message: `All ${result.failed} entries failed to upload. Please check the errors below.`,
        data: result
      });
    } else if (result.failed > 0) {
      // Partial success
      return res.status(200).json({
        success: true,
        message: `Partial upload: ${result.uploaded + result.updated} succeeded, ${result.failed} failed`,
        data: result
      });
    }

    // Full success
    return res.status(200).json({
      success: true,
      message: 'SEE marks uploaded successfully',
      data: result
    });

  } catch (error) {
    console.error('Error in POST /courses/:courseId/upload:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload SEE marks'
    });
  }
});

/**
 * GET /api/see-marks/courses/:courseId
 * Get all SEE marks for a course
 *
 * Access: Teacher/Student
 */
router.get('/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const marks = await seeMarksService.getSEEMarksByCourse(courseId);

    return res.status(200).json({
      success: true,
      data: marks,
      count: marks.length
    });

  } catch (error) {
    console.error('Error in GET /courses/:courseId:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve SEE marks'
    });
  }
});

/**
 * GET /api/see-marks/students/:studentId/courses/:courseId
 * Get SEE marks for a specific student in a course
 *
 * Access: Teacher/Student (own data)
 */
router.get('/students/:studentId/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    // Authorization: Students can only view their own marks
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own SEE marks'
      });
    }

    const marks = await seeMarksService.getSEEMarks(studentId, courseId);

    if (!marks) {
      return res.status(404).json({
        success: false,
        message: 'SEE marks not found for this student-course combination'
      });
    }

    return res.status(200).json({
      success: true,
      data: marks
    });

  } catch (error) {
    console.error('Error in GET /students/:studentId/courses/:courseId:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve SEE marks'
    });
  }
});

/**
 * PUT /api/see-marks/students/:studentId/courses/:courseId
 * Update SEE marks for a specific student
 *
 * Body: { see_marks: 90 }
 *
 * Access: Teacher only
 */
router.put('/students/:studentId/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const { see_marks } = req.body;
    const updatedBy = req.user.userId;

    // Validate marks
    if (see_marks === null || see_marks === undefined) {
      return res.status(400).json({
        success: false,
        message: 'see_marks is required'
      });
    }

    const marks = parseFloat(see_marks);
    if (isNaN(marks) || marks < 0 || marks > 100) {
      return res.status(400).json({
        success: false,
        message: 'SEE marks must be between 0 and 100'
      });
    }

    const result = await seeMarksService.updateSEEMarks(studentId, courseId, marks, updatedBy);

    return res.status(200).json({
      success: true,
      message: 'SEE marks updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error in PUT /students/:studentId/courses/:courseId:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update SEE marks'
    });
  }
});

/**
 * DELETE /api/see-marks/students/:studentId/courses/:courseId
 * Delete SEE marks for a specific student
 *
 * Access: Teacher only
 */
router.delete('/students/:studentId/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    await seeMarksService.deleteSEEMarks(studentId, courseId);

    return res.status(200).json({
      success: true,
      message: 'SEE marks deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /students/:studentId/courses/:courseId:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete SEE marks'
    });
  }
});

/**
 * GET /api/see-marks/courses/:courseId/status
 * Get SEE marks upload status for a course
 * Returns summary of how many students have SEE marks uploaded
 *
 * Access: Teacher
 */
router.get('/courses/:courseId/status', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const status = await seeMarksService.getSEEMarksStatus(courseId);

    return res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error in GET /courses/:courseId/status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get SEE marks status'
    });
  }
});

/**
 * POST /api/see-marks/validate
 * Validate SEE marks data before upload (dry run)
 *
 * Body: {
 *   marksData: [{ usn: "1MS22CS001", see_marks: 85 }, ...]
 * }
 *
 * Access: Teacher
 */
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { marksData } = req.body;

    if (!marksData || !Array.isArray(marksData)) {
      return res.status(400).json({
        success: false,
        message: 'marksData array is required'
      });
    }

    const validation = seeMarksService.validateSEEMarksData(marksData);

    return res.status(200).json({
      success: true,
      data: {
        validCount: validation.valid.length,
        invalidCount: validation.invalid.length,
        valid: validation.valid,
        invalid: validation.invalid
      }
    });

  } catch (error) {
    console.error('Error in POST /validate:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to validate SEE marks'
    });
  }
});

export default router;
