import { query } from '../config/db.js';
import logger from '../middleware/logging.js';

/**
 * Create a new marksheet entry
 * POST /api/marksheets
 */
export const createMarksheet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, assessmentName, fileName, tableName, columns, rowCount } = req.body;

    // Validate required fields
    if (!courseId || !assessmentName || !fileName || !tableName) {
      return res.status(400).json({
        success: false,
        message: 'courseId, assessmentName, fileName, and tableName are required'
      });
    }

    // Check if course exists and user has access
    const courseCheck = await query(
      'SELECT id, teacher_id FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the teacher of the course (or admin)
    if (req.user.role !== 'admin' && courseCheck.rows[0].teacher_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to upload marks for this course'
      });
    }

    // Insert marksheet record
    const result = await query(
      `INSERT INTO marksheets (course_id, assessment_name, file_name, table_name, columns, row_count, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [courseId, assessmentName, fileName, tableName, JSON.stringify(columns), rowCount || 0, userId]
    );

    logger.info('Marksheet created', {
      marksheet_id: result.rows[0].id,
      course_id: courseId,
      assessment_name: assessmentName,
      uploaded_by: userId
    });

    res.status(201).json({
      success: true,
      message: 'Marksheet uploaded successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Create marksheet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create marksheet',
      error: error.message
    });
  }
};

/**
 * Get all marksheets for a specific course
 * GET /api/marksheets/course/:courseId
 */
export const getMarksheetsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const courseCheck = await query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const result = await query(
      `SELECT m.*, u.name as uploaded_by_name, u.email as uploaded_by_email
       FROM marksheets m
       LEFT JOIN users u ON m.uploaded_by = u.id
       WHERE m.course_id = $1
       ORDER BY m.created_at DESC`,
      [courseId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Get marksheets by course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marksheets',
      error: error.message
    });
  }
};

/**
 * Get a specific marksheet by ID
 * GET /api/marksheets/:id
 */
export const getMarksheetById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT m.*, u.name as uploaded_by_name, u.email as uploaded_by_email,
              c.code as course_code, c.name as course_name
       FROM marksheets m
       LEFT JOIN users u ON m.uploaded_by = u.id
       LEFT JOIN courses c ON m.course_id = c.id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marksheet not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Get marksheet by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marksheet',
      error: error.message
    });
  }
};

/**
 * Update a marksheet
 * PUT /api/marksheets/:id
 */
export const updateMarksheet = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { assessmentName, fileName } = req.body;

    // Check if marksheet exists
    const marksheetCheck = await query(
      'SELECT m.*, c.teacher_id FROM marksheets m JOIN courses c ON m.course_id = c.id WHERE m.id = $1',
      [id]
    );

    if (marksheetCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marksheet not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && marksheetCheck.rows[0].teacher_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this marksheet'
      });
    }

    // Update marksheet
    const result = await query(
      `UPDATE marksheets
       SET assessment_name = COALESCE($1, assessment_name),
           file_name = COALESCE($2, file_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [assessmentName, fileName, id]
    );

    logger.info('Marksheet updated', {
      marksheet_id: id,
      updated_by: userId
    });

    res.json({
      success: true,
      message: 'Marksheet updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Update marksheet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update marksheet',
      error: error.message
    });
  }
};

/**
 * Delete a marksheet
 * DELETE /api/marksheets/:id
 */
export const deleteMarksheet = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if marksheet exists and get course info
    const marksheetCheck = await query(
      'SELECT m.*, c.teacher_id FROM marksheets m JOIN courses c ON m.course_id = c.id WHERE m.id = $1',
      [id]
    );

    if (marksheetCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marksheet not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && marksheetCheck.rows[0].teacher_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this marksheet'
      });
    }

    // Delete marksheet
    await query('DELETE FROM marksheets WHERE id = $1', [id]);

    logger.info('Marksheet deleted', {
      marksheet_id: id,
      deleted_by: userId
    });

    res.json({
      success: true,
      message: 'Marksheet deleted successfully'
    });
  } catch (error) {
    logger.error('Delete marksheet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete marksheet',
      error: error.message
    });
  }
};

/**
 * Get all marksheets uploaded by the current user
 * GET /api/marksheets/my-uploads
 */
export const getMyMarksheets = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT m.*, c.code as course_code, c.name as course_name
       FROM marksheets m
       JOIN courses c ON m.course_id = c.id
       WHERE m.uploaded_by = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Get my marksheets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marksheets',
      error: error.message
    });
  }
};

/**
 * Get the actual data from a marksheet table
 * GET /api/marksheets/:id/data
 */
export const getMarksheetData = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // First get the marksheet metadata
    const marksheetResult = await query(
      `SELECT m.*, c.teacher_id
       FROM marksheets m
       JOIN courses c ON m.course_id = c.id
       WHERE m.id = $1`,
      [id]
    );

    if (marksheetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marksheet not found'
      });
    }

    const marksheet = marksheetResult.rows[0];
    const tableName = marksheet.table_name;

    // Verify user has access (teacher of the course or admin)
    if (req.user.role !== 'admin' && marksheet.teacher_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this marksheet data'
      });
    }

    // Get total count
    const countResult = await query(`SELECT COUNT(*) as total FROM "${tableName}"`);
    const total = parseInt(countResult.rows[0].total);

    // Get the actual data from the table
    const dataResult = await query(
      `SELECT * FROM "${tableName}" LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: {
        rows: dataResult.rows,
        total: total,
        limit: limit,
        offset: offset,
        columns: marksheet.columns
      }
    });
  } catch (error) {
    logger.error('Get marksheet data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marksheet data',
      error: error.message
    });
  }
};
