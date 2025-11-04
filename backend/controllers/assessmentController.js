import { query } from '../config/db.js';
import {
  calculateCOAttainment,
  calculatePOAttainment,
  calculateModulePerformance
} from '../utils/attainmentCalculator.js';

/**
 * Create assessment
 */
export const createAssessment = async (req, res) => {
  try {
    const { courseId, type, name, description, assessmentDate, maxMarks, weightage } = req.body;
    const teacherId = req.user.id;

    // Verify course belongs to teacher
    const courseCheck = await query(
      'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
      [courseId, teacherId]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or access denied'
      });
    }

    const result = await query(
      `INSERT INTO assessments (course_id, type, name, description, assessment_date, max_marks, weightage)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [courseId, type, name, description, assessmentDate, maxMarks, weightage || 1.0]
    );

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assessment',
      error: error.message
    });
  }
};

/**
 * Get assessments for a course
 */
export const getAssessments = async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await query(
      'SELECT * FROM assessments WHERE course_id = $1 ORDER BY assessment_date DESC',
      [courseId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get assessments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assessments',
      error: error.message
    });
  }
};

/**
 * Create question for assessment
 */
export const createQuestion = async (req, res) => {
  try {
    const { assessmentId, questionNumber, questionText, maxMarks, coId, poIds } = req.body;

    const result = await query(
      `INSERT INTO questions (assessment_id, question_number, question_text, max_marks, co_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [assessmentId, questionNumber, questionText, maxMarks, coId]
    );

    const questionId = result.rows[0].id;

    // Map question to POs
    if (poIds && Array.isArray(poIds)) {
      for (const poId of poIds) {
        await query(
          'INSERT INTO question_po_mapping (question_id, po_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [questionId, poId]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create question',
      error: error.message
    });
  }
};

/**
 * Get questions for an assessment
 */
export const getQuestions = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const result = await query(
      `SELECT q.*, co.co_number, co.description as co_description
       FROM questions q
       LEFT JOIN course_outcomes co ON q.co_id = co.id
       WHERE q.assessment_id = $1
       ORDER BY q.question_number`,
      [assessmentId]
    );

    // Get PO mappings for each question
    for (const question of result.rows) {
      const poResult = await query(
        `SELECT po.id, po.po_number
         FROM program_outcomes po
         JOIN question_po_mapping qpm ON po.id = qpm.po_id
         WHERE qpm.question_id = $1`,
        [question.id]
      );
      question.pos = poResult.rows;
    }

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questions',
      error: error.message
    });
  }
};

/**
 * Calculate attainment for a course
 */
export const calculateAttainment = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const { threshold } = req.query;

    // Calculate CO attainment
    const coAttainment = await calculateCOAttainment(
      courseId,
      assessmentId,
      threshold ? parseFloat(threshold) : 60
    );

    // Calculate PO attainment
    const poAttainment = await calculatePOAttainment(courseId);

    // Calculate module performance
    const modulePerformance = await calculateModulePerformance(courseId);

    res.json({
      success: true,
      message: 'Attainment calculated successfully',
      data: {
        coAttainment,
        poAttainment,
        modulePerformance
      }
    });
  } catch (error) {
    console.error('Calculate attainment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate attainment',
      error: error.message
    });
  }
};

/**
 * Get CO attainment for a course
 */
export const getCOAttainment = async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await query(
      `SELECT ca.*, co.co_number, co.description, a.name as assessment_name
       FROM co_attainment ca
       JOIN course_outcomes co ON ca.co_id = co.id
       JOIN assessments a ON ca.assessment_id = a.id
       WHERE ca.course_id = $1
       ORDER BY co.co_number, a.assessment_date`,
      [courseId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get CO attainment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CO attainment',
      error: error.message
    });
  }
};

/**
 * Get PO attainment for a course
 */
export const getPOAttainment = async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await query(
      `SELECT pa.*, po.po_number, po.description
       FROM po_attainment pa
       JOIN program_outcomes po ON pa.po_id = po.id
       WHERE pa.course_id = $1
       ORDER BY po.po_number`,
      [courseId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get PO attainment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get PO attainment',
      error: error.message
    });
  }
};
