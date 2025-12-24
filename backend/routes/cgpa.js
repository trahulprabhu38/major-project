import express from 'express';
import cgpaCalculationService from '../services/cgpaCalculationService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * CGPA/SGPA Routes
 * Handles Semester GPA and Cumulative GPA calculations and retrieval
 */

/**
 * POST /api/cgpa/students/:studentId/calculate
 * Calculate cumulative CGPA for a student
 *
 * Access: Teacher/Student (own data)
 */
router.post('/students/:studentId/calculate', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Authorization: Students can only calculate their own CGPA
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only calculate your own CGPA'
      });
    }

    const cgpa = await cgpaCalculationService.calculateCGPA(studentId);

    if (!cgpa) {
      return res.status(404).json({
        success: false,
        message: 'No semester results found for this student'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'CGPA calculated successfully',
      data: cgpa
    });

  } catch (error) {
    console.error('Error in POST /students/:studentId/calculate:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate CGPA'
    });
  }
});

/**
 * POST /api/cgpa/students/:studentId/semester/:semester/calculate
 * Calculate SGPA for a specific semester
 *
 * Body: { academic_year: 2024 }
 *
 * Access: Teacher
 */
router.post('/students/:studentId/semester/:semester/calculate', authenticateToken, async (req, res) => {
  try {
    const { studentId, semester } = req.params;
    const { academic_year } = req.body;

    if (!academic_year) {
      return res.status(400).json({
        success: false,
        message: 'academic_year is required'
      });
    }

    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return res.status(400).json({
        success: false,
        message: 'Semester must be between 1 and 8'
      });
    }

    const sgpa = await cgpaCalculationService.calculateSGPA(studentId, semesterNum, academic_year);

    return res.status(200).json({
      success: true,
      message: 'SGPA calculated successfully',
      data: sgpa
    });

  } catch (error) {
    console.error('Error in POST /students/:studentId/semester/:semester/calculate:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate SGPA'
    });
  }
});

/**
 * GET /api/cgpa/students/:studentId
 * Get CGPA data for a student
 *
 * Access: Teacher/Student (own data)
 */
router.get('/students/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Authorization: Students can only view their own CGPA
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own CGPA'
      });
    }

    const cgpa = await cgpaCalculationService.getStudentCGPA(studentId);

    if (!cgpa) {
      return res.status(404).json({
        success: false,
        message: 'CGPA data not found for this student'
      });
    }

    return res.status(200).json({
      success: true,
      data: cgpa
    });

  } catch (error) {
    console.error('Error in GET /students/:studentId:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve CGPA'
    });
  }
});

/**
 * GET /api/cgpa/students/:studentId/semester/:semester
 * Get SGPA for a specific semester
 *
 * Access: Teacher/Student (own data)
 */
router.get('/students/:studentId/semester/:semester', authenticateToken, async (req, res) => {
  try {
    const { studentId, semester } = req.params;

    // Authorization: Students can only view their own SGPA
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own SGPA'
      });
    }

    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return res.status(400).json({
        success: false,
        message: 'Semester must be between 1 and 8'
      });
    }

    const sgpa = await cgpaCalculationService.getSemesterSGPA(studentId, semesterNum);

    if (!sgpa) {
      return res.status(404).json({
        success: false,
        message: 'SGPA data not found for this semester'
      });
    }

    return res.status(200).json({
      success: true,
      data: sgpa
    });

  } catch (error) {
    console.error('Error in GET /students/:studentId/semester/:semester:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve SGPA'
    });
  }
});

/**
 * GET /api/cgpa/students/:studentId/rank
 * Get student's rank based on CGPA
 *
 * Query params:
 *   - department (optional): Filter by department
 *
 * Access: Teacher/Student (own data)
 */
router.get('/students/:studentId/rank', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { department } = req.query;

    // Authorization: Students can only view their own rank
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own rank'
      });
    }

    const rank = await cgpaCalculationService.calculateRank(studentId, department || null);

    if (!rank) {
      return res.status(404).json({
        success: false,
        message: 'Rank data not found for this student'
      });
    }

    return res.status(200).json({
      success: true,
      data: rank
    });

  } catch (error) {
    console.error('Error in GET /students/:studentId/rank:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate rank'
    });
  }
});

/**
 * POST /api/cgpa/recalculate-all
 * Recalculate CGPA for all students (batch operation)
 * Use with caution - this is a heavy operation
 *
 * Access: Admin/Teacher
 */
router.post('/recalculate-all', authenticateToken, async (req, res) => {
  try {
    console.log(`\n🔄 Starting batch CGPA recalculation...`);

    const result = await cgpaCalculationService.recalculateAllCGPA();

    return res.status(200).json({
      success: true,
      message: 'Batch CGPA recalculation completed',
      data: result
    });

  } catch (error) {
    console.error('Error in POST /recalculate-all:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to recalculate all CGPAs'
    });
  }
});

/**
 * GET /api/cgpa/top-performers
 * Get top performers by CGPA
 *
 * Query params:
 *   - department (optional): Filter by department
 *   - limit (optional, default 10): Number of top students
 *
 * Access: Teacher
 */
router.get('/top-performers', authenticateToken, async (req, res) => {
  try {
    const { department, limit } = req.query;

    const limitNum = limit ? parseInt(limit) : 10;

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100'
      });
    }

    const pool = (await import('../config/db.js')).default;
    const service = (await import('../services/semesterProgressionService.js')).default;

    const topPerformers = await service.getTopPerformers(department || null, limitNum);

    return res.status(200).json({
      success: true,
      data: topPerformers,
      count: topPerformers.length
    });

  } catch (error) {
    console.error('Error in GET /top-performers:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get top performers'
    });
  }
});

export default router;
