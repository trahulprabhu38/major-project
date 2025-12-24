import express from 'express';
import gradeCalculationService from '../services/gradeCalculationService.js';
import cgpaCalculationService from '../services/cgpaCalculationService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Grade Calculation Routes
 * Handles final grade calculation from CIE + SEE marks
 */

/**
 * POST /api/grades/students/:studentId/courses/:courseId/calculate
 * Calculate final grade for a specific student in a course
 *
 * Access: Teacher
 */
router.post('/students/:studentId/courses/:courseId/calculate', authenticateToken, async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    const grade = await gradeCalculationService.calculateFinalGrade(studentId, courseId);

    return res.status(200).json({
      success: true,
      message: 'Final grade calculated successfully',
      data: grade
    });

  } catch (error) {
    console.error('Error in POST /students/:studentId/courses/:courseId/calculate:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate final grade'
    });
  }
});

/**
 * POST /api/grades/courses/:courseId/calculate
 * Calculate final grades for all students in a course
 * This triggers grade calculation and SGPA calculation automatically
 *
 * Access: Teacher
 */
router.post('/courses/:courseId/calculate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Calculate all grades
    const gradeResult = await gradeCalculationService.recalculateAllGrades(courseId);

    console.log(`✅ Grades calculated: ${gradeResult.calculated} students`);

    // Get course details to determine semester and year
    const pool = (await import('../config/db.js')).default;
    const courseQuery = await pool.query(
      'SELECT semester, year FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseQuery.rows.length === 0) {
      throw new Error('Course not found');
    }

    const { semester, year } = courseQuery.rows[0];

    // Auto-trigger SGPA calculation for all students in this semester
    console.log(`\n🔄 Auto-triggering SGPA calculation for semester ${semester}, year ${year}...`);

    // Get all students enrolled in this course
    const studentsQuery = await pool.query(
      'SELECT DISTINCT student_id FROM students_courses WHERE course_id = $1',
      [courseId]
    );

    const students = studentsQuery.rows;
    const sgpaResults = {
      total: students.length,
      calculated: 0,
      failed: 0,
      errors: []
    };

    for (const student of students) {
      try {
        await cgpaCalculationService.calculateSGPA(student.student_id, semester, year);
        sgpaResults.calculated++;
      } catch (err) {
        console.error(`Failed SGPA calculation for student ${student.student_id}:`, err.message);
        sgpaResults.errors.push({
          studentId: student.student_id,
          error: err.message
        });
        sgpaResults.failed++;
      }
    }

    console.log(`✅ SGPA calculated for ${sgpaResults.calculated} students`);

    // Auto-trigger CGPA calculation for all students
    console.log(`\n🔄 Auto-triggering CGPA calculation...`);

    const cgpaResults = {
      total: students.length,
      calculated: 0,
      failed: 0,
      errors: []
    };

    for (const student of students) {
      try {
        await cgpaCalculationService.calculateCGPA(student.student_id);
        cgpaResults.calculated++;
      } catch (err) {
        console.error(`Failed CGPA calculation for student ${student.student_id}:`, err.message);
        cgpaResults.errors.push({
          studentId: student.student_id,
          error: err.message
        });
        cgpaResults.failed++;
      }
    }

    console.log(`✅ CGPA calculated for ${cgpaResults.calculated} students`);

    return res.status(200).json({
      success: true,
      message: 'Grades, SGPA, and CGPA calculated successfully',
      data: {
        grades: gradeResult,
        sgpa: sgpaResults,
        cgpa: cgpaResults
      }
    });

  } catch (error) {
    console.error('Error in POST /courses/:courseId/calculate:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate grades'
    });
  }
});

/**
 * GET /api/grades/students/:studentId/courses/:courseId
 * Get final grade for a specific student in a course
 *
 * Access: Teacher/Student (own data)
 */
router.get('/students/:studentId/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    // Authorization: Students can only view their own grades
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own grades'
      });
    }

    const grade = await gradeCalculationService.getFinalGrade(studentId, courseId);

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found for this student-course combination'
      });
    }

    return res.status(200).json({
      success: true,
      data: grade
    });

  } catch (error) {
    console.error('Error in GET /students/:studentId/courses/:courseId:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve grade'
    });
  }
});

/**
 * GET /api/grades/courses/:courseId
 * Get all final grades for a course
 *
 * Access: Teacher
 */
router.get('/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const grades = await gradeCalculationService.getCourseGrades(courseId);

    return res.status(200).json({
      success: true,
      data: grades,
      count: grades.length
    });

  } catch (error) {
    console.error('Error in GET /courses/:courseId:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve grades'
    });
  }
});

/**
 * GET /api/grades/courses/:courseId/distribution
 * Get grade distribution statistics for a course
 *
 * Access: Teacher
 */
router.get('/courses/:courseId/distribution', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const distribution = await gradeCalculationService.getGradeDistribution(courseId);

    return res.status(200).json({
      success: true,
      data: distribution
    });

  } catch (error) {
    console.error('Error in GET /courses/:courseId/distribution:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get grade distribution'
    });
  }
});

/**
 * GET /api/grades/students/:studentId
 * Get all grades for a student across all courses
 *
 * Access: Teacher/Student (own data)
 */
router.get('/students/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Authorization: Students can only view their own grades
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own grades'
      });
    }

    const pool = (await import('../config/db.js')).default;

    const query = `
      SELECT
        sfg.*,
        c.code AS course_code,
        c.name AS course_name,
        c.semester,
        c.year AS academic_year
      FROM student_final_grades sfg
      JOIN courses c ON sfg.course_id = c.id
      WHERE sfg.student_id = $1
      ORDER BY c.semester ASC, c.code ASC
    `;

    const result = await pool.query(query, [studentId]);

    return res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error in GET /students/:studentId:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve student grades'
    });
  }
});

export default router;
