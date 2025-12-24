import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/course-outcomes/manual
 * @desc    Manually add course outcomes
 * @access  Private (Teacher only)
 */
router.post('/manual', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { courseId, cos } = req.body;
    const teacherId = req.user.userId;

    // Validate input
    if (!courseId || !cos || !Array.isArray(cos) || cos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data. courseId and cos array are required'
      });
    }

    // Validate each CO
    for (const co of cos) {
      if (!co.co_number || !co.description || !co.bloom_level) {
        return res.status(400).json({
          success: false,
          error: 'Each CO must have co_number, description, and bloom_level'
        });
      }
    }

    await client.query('BEGIN');

    // Delete existing manually-created COs for this course (if overwriting)
    await client.query(
      'DELETE FROM course_outcomes WHERE course_id = $1 AND (is_ai_generated = FALSE OR is_ai_generated IS NULL)',
      [courseId]
    );

    // Insert new COs
    const savedCOs = [];

    for (const co of cos) {
      const coQuery = `
        INSERT INTO course_outcomes (
          course_id, co_number, description, bloom_level,
          is_ai_generated, approved
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const coValues = [
        courseId,
        co.co_number,
        co.description,
        co.bloom_level,
        false, // is_ai_generated
        true,  // manually created COs are auto-approved
      ];

      const result = await client.query(coQuery, coValues);
      savedCOs.push(result.rows[0]);

      // Parse and save PO mappings if provided
      if (co.po_mappings) {
        // Handle both array and comma-separated string formats
        const poNumbers = Array.isArray(co.po_mappings)
          ? co.po_mappings
          : co.po_mappings.split(',').map((po) =>
              parseInt(po.trim().replace(/[^0-9]/g, ''))
            ).filter((num) => !isNaN(num));

        for (const poNum of poNumbers) {
          // Get PO ID
          const poResult = await client.query(
            'SELECT id FROM program_outcomes WHERE po_number = $1',
            [poNum]
          );

          if (poResult.rows.length > 0) {
            const poId = poResult.rows[0].id;
            const coId = result.rows[0].id;

            // Insert CO-PO mapping (default correlation level 2 - Medium)
            await client.query(
              `INSERT INTO co_po_mapping (co_id, po_id, correlation_level)
               VALUES ($1, $2, $3)
               ON CONFLICT (co_id, po_id) DO NOTHING`,
              [coId, poId, co.correlation_level || 2]
            );
          }
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Successfully saved ${savedCOs.length} course outcomes`,
      cos: savedCOs,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving manual COs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save course outcomes',
      details: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * @route   GET /api/course-outcomes/course/:courseId
 * @desc    Get all course outcomes for a specific course (both manual and AI-generated)
 * @access  Private
 */
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const query = `
      SELECT
        co.*,
        array_agg(DISTINCT po.po_number ORDER BY po.po_number) FILTER (WHERE po.po_number IS NOT NULL) as po_numbers,
        array_agg(DISTINCT cpm.correlation_level) FILTER (WHERE cpm.correlation_level IS NOT NULL) as correlation_levels
      FROM course_outcomes co
      LEFT JOIN co_po_mapping cpm ON co.id = cpm.co_id
      LEFT JOIN program_outcomes po ON cpm.po_id = po.id
      WHERE co.course_id = $1
      GROUP BY co.id
      ORDER BY co.co_number ASC
    `;

    const result = await pool.query(query, [courseId]);

    res.json({
      success: true,
      count: result.rows.length,
      cos: result.rows,
    });
  } catch (error) {
    console.error('Error fetching course outcomes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course outcomes',
      details: error.message,
    });
  }
});

/**
 * @route   PUT /api/course-outcomes/:coId
 * @desc    Update a specific course outcome
 * @access  Private (Teacher only)
 */
router.put('/:coId', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { coId } = req.params;
    const { description, bloom_level, po_mappings } = req.body;

    if (!description && !bloom_level && !po_mappings) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (description, bloom_level, or po_mappings) must be provided'
      });
    }

    await client.query('BEGIN');

    // Update CO
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;

    if (description) {
      updateFields.push(`description = $${valueIndex++}`);
      updateValues.push(description);
    }
    if (bloom_level) {
      updateFields.push(`bloom_level = $${valueIndex++}`);
      updateValues.push(bloom_level);
    }
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(coId);

    const updateQuery = `
      UPDATE course_outcomes
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await client.query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Course outcome not found'
      });
    }

    // Update PO mappings if provided
    if (po_mappings) {
      // Delete existing PO mappings
      await client.query('DELETE FROM co_po_mapping WHERE co_id = $1', [coId]);

      // Add new PO mappings
      const poNumbers = Array.isArray(po_mappings)
        ? po_mappings
        : po_mappings.split(',').map((po) =>
            parseInt(po.trim().replace(/[^0-9]/g, ''))
          ).filter((num) => !isNaN(num));

      for (const poNum of poNumbers) {
        const poResult = await client.query(
          'SELECT id FROM program_outcomes WHERE po_number = $1',
          [poNum]
        );

        if (poResult.rows.length > 0) {
          await client.query(
            `INSERT INTO co_po_mapping (co_id, po_id, correlation_level)
             VALUES ($1, $2, $3)
             ON CONFLICT (co_id, po_id) DO NOTHING`,
            [coId, poResult.rows[0].id, 2]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Course outcome updated successfully',
      co: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating CO:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update course outcome',
      details: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * @route   DELETE /api/course-outcomes/:coId
 * @desc    Delete a specific course outcome
 * @access  Private (Teacher only)
 */
router.delete('/:coId', authenticateToken, async (req, res) => {
  try {
    const { coId } = req.params;

    const result = await pool.query(
      'DELETE FROM course_outcomes WHERE id = $1 RETURNING *',
      [coId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Course outcome not found'
      });
    }

    res.json({
      success: true,
      message: 'Course outcome deleted successfully',
      co: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting CO:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course outcome',
      details: error.message,
    });
  }
});

/**
 * @route   DELETE /api/course-outcomes/course/:courseId/all
 * @desc    Delete all course outcomes for a course
 * @access  Private (Teacher only)
 */
router.delete('/course/:courseId/all', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await pool.query(
      'DELETE FROM course_outcomes WHERE course_id = $1 RETURNING *',
      [courseId]
    );

    res.json({
      success: true,
      message: `Deleted ${result.rows.length} course outcomes`,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error deleting COs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course outcomes',
      details: error.message,
    });
  }
});

export default router;
