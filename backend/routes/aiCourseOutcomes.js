import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/ai-cos/save
 * @desc    Save AI-generated COs to database
 * @access  Private (Teacher only)
 */
router.post('/save', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      courseId,
      sessionId,
      cos, // Array of CO objects
      pipelineMetrics,
      configuration,
      fileNames,
    } = req.body;

    const teacherId = req.user.userId;

    // Validate input
    if (!courseId || !sessionId || !cos || !Array.isArray(cos)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    await client.query('BEGIN');

    // 1. Save generation session
    const sessionQuery = `
      INSERT INTO ai_co_generation_sessions (
        session_id, course_id, teacher_id,
        num_apply, num_analyze, use_chromadb,
        file_names, extracted_text_length, files_processed,
        document_processing_ms, embedding_generation_ms, graph_construction_ms,
        vector_search_ms, graph_traversal_ms, llm_inference_ms,
        refinement_ms, total_pipeline_ms,
        average_quality_score, average_vtu_compliance, average_obe_alignment,
        bloom_classification_accuracy, po_coverage,
        inference_latency_ms, throughput_cos_per_sec, cache_hit_rate, model_type,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
      RETURNING id
    `;

    const sessionValues = [
      sessionId,
      courseId,
      teacherId,
      configuration?.num_apply || 2,
      configuration?.num_analyze || 2,
      configuration?.use_chromadb || false,
      fileNames || [],
      pipelineMetrics?.extracted_text_length || 0,
      pipelineMetrics?.files_processed || 0,
      pipelineMetrics?.document_processing_ms || 0,
      pipelineMetrics?.embedding_generation_ms || 0,
      pipelineMetrics?.graph_construction_ms || 0,
      pipelineMetrics?.vector_search_ms || 0,
      pipelineMetrics?.graph_traversal_ms || 0,
      pipelineMetrics?.llm_inference_ms || 0,
      pipelineMetrics?.refinement_ms || 0,
      pipelineMetrics?.total_pipeline_ms || 0,
      pipelineMetrics?.average_quality_score || 0,
      pipelineMetrics?.average_vtu_compliance || 0,
      pipelineMetrics?.average_obe_alignment || 0,
      pipelineMetrics?.bloom_classification_accuracy || 0,
      pipelineMetrics?.po_coverage || 0,
      pipelineMetrics?.ml_metrics?.inference_latency_ms || 0,
      pipelineMetrics?.ml_metrics?.throughput_cos_per_sec || 0,
      pipelineMetrics?.ml_metrics?.cache_hit_rate || 0,
      pipelineMetrics?.ml_metrics?.model_type || 'VTU CO Generator',
      'completed',
    ];

    await client.query(sessionQuery, sessionValues);

    // 2. Delete existing COs for this course (if overwriting)
    await client.query(
      'DELETE FROM course_outcomes WHERE course_id = $1 AND is_ai_generated = TRUE',
      [courseId]
    );

    // 3. Insert new COs
    const savedCOs = [];

    for (const co of cos) {
      const coQuery = `
        INSERT INTO course_outcomes (
          course_id, co_number, description, bloom_level,
          is_ai_generated, generation_session_id,
          quality_score, vtu_compliance_score, obe_alignment_score,
          bloom_accuracy, conciseness_score,
          word_count, has_action_verb, has_specific_concepts,
          topics_covered, po_mappings_raw, approved,
          generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        RETURNING *
      `;

      const coValues = [
        courseId,
        co.co_num,
        co.co_text,
        co.bloom_level,
        true, // is_ai_generated
        sessionId,
        co.reward_score || 0,
        co.individual_scores?.vtu || 0,
        co.individual_scores?.obe || 0,
        co.individual_scores?.bloom || 0,
        co.individual_scores?.conciseness || 0,
        co.word_count || 0,
        co.has_action_verb !== false,
        co.has_specific_concepts !== false,
        co.topics_covered || [],
        co.po_mappings || '',
        co.approved || false,
      ];

      const result = await client.query(coQuery, coValues);
      savedCOs.push(result.rows[0]);

      // 4. Parse and save PO mappings
      if (co.po_mappings) {
        const poNumbers = co.po_mappings.split(',').map((po) =>
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
              [coId, poId, 2]
            );
          }
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Successfully saved ${savedCOs.length} COs`,
      sessionId,
      cos: savedCOs,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving AI COs:', error);
    res.status(500).json({
      error: 'Failed to save COs',
      details: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * @route   GET /api/ai-cos/course/:courseId
 * @desc    Get AI-generated COs for a specific course
 * @access  Private
 */
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const query = `
      SELECT
        co.*,
        array_agg(DISTINCT po.po_number ORDER BY po.po_number) as po_numbers,
        session.session_id,
        session.average_quality_score as session_avg_quality,
        session.created_at as generation_date
      FROM course_outcomes co
      LEFT JOIN co_po_mapping cpm ON co.id = cpm.co_id
      LEFT JOIN program_outcomes po ON cpm.po_id = po.id
      LEFT JOIN ai_co_generation_sessions session ON co.generation_session_id = session.session_id
      WHERE co.course_id = $1 AND co.is_ai_generated = TRUE
      GROUP BY co.id, session.session_id, session.average_quality_score, session.created_at
      ORDER BY co.co_number ASC
    `;

    const result = await pool.query(query, [courseId]);

    res.json({
      success: true,
      count: result.rows.length,
      cos: result.rows,
    });
  } catch (error) {
    console.error('Error fetching AI COs:', error);
    res.status(500).json({
      error: 'Failed to fetch COs',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/ai-cos/sessions/:courseId
 * @desc    Get all AI generation sessions for a course
 * @access  Private
 */
router.get('/sessions/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const query = `
      SELECT
        s.*,
        u.name as teacher_name,
        COUNT(co.id) as cos_generated
      FROM ai_co_generation_sessions s
      LEFT JOIN users u ON s.teacher_id = u.id
      LEFT JOIN course_outcomes co ON s.session_id = co.generation_session_id
      WHERE s.course_id = $1
      GROUP BY s.id, u.name
      ORDER BY s.created_at DESC
      LIMIT 20
    `;

    const result = await pool.query(query, [courseId]);

    res.json({
      success: true,
      count: result.rows.length,
      sessions: result.rows,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      error: 'Failed to fetch sessions',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/ai-cos/feedback
 * @desc    Submit feedback for an AI-generated CO
 * @access  Private
 */
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { sessionId, coId, coNumber, approved, feedbackText, editedText } = req.body;
    const userId = req.user.userId;

    const query = `
      INSERT INTO ai_co_feedback (
        session_id, co_id, co_number, approved, feedback_text, edited_text, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [sessionId, coId, coNumber, approved, feedbackText, editedText, userId];
    const result = await pool.query(query, values);

    // Update CO approval status
    if (coId) {
      await pool.query(
        `UPDATE course_outcomes
         SET approved = $1, feedback_text = $2, approved_at = NOW(), approved_by = $3
         WHERE id = $4`,
        [approved, feedbackText, userId, coId]
      );
    }

    res.status(201).json({
      success: true,
      feedback: result.rows[0],
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      error: 'Failed to submit feedback',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/ai-cos/regenerate
 * @desc    Save regeneration history
 * @access  Private
 */
router.post('/regenerate', authenticateToken, async (req, res) => {
  try {
    const {
      coId,
      previousText,
      previousQualityScore,
      feedback,
      bloomLevel,
      newText,
      newQualityScore,
      newVtuCompliance,
      newObeAlignment,
      newBloomAccuracy,
    } = req.body;

    const userId = req.user.userId;

    const query = `
      INSERT INTO ai_co_regeneration_history (
        co_id, previous_text, previous_quality_score,
        feedback, bloom_level,
        new_text, new_quality_score, new_vtu_compliance,
        new_obe_alignment, new_bloom_accuracy,
        regenerated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      coId,
      previousText,
      previousQualityScore,
      feedback,
      bloomLevel,
      newText,
      newQualityScore,
      newVtuCompliance,
      newObeAlignment,
      newBloomAccuracy,
      userId,
    ];

    const result = await pool.query(query, values);

    // Update the CO with new text
    await pool.query(
      `UPDATE course_outcomes
       SET description = $1, quality_score = $2, vtu_compliance_score = $3,
           obe_alignment_score = $4, bloom_accuracy = $5, regeneration_count = regeneration_count + 1
       WHERE id = $6`,
      [newText, newQualityScore, newVtuCompliance, newObeAlignment, newBloomAccuracy, coId]
    );

    res.status(201).json({
      success: true,
      history: result.rows[0],
    });
  } catch (error) {
    console.error('Error saving regeneration:', error);
    res.status(500).json({
      error: 'Failed to save regeneration',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/ai-cos/statistics/:courseId
 * @desc    Get statistics for AI-generated COs
 * @access  Private
 */
router.get('/statistics/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const query = `
      SELECT
        COUNT(*) as total_cos,
        COUNT(*) FILTER (WHERE approved = TRUE) as approved_cos,
        AVG(quality_score) as avg_quality,
        AVG(vtu_compliance_score) as avg_vtu_compliance,
        AVG(obe_alignment_score) as avg_obe_alignment,
        AVG(bloom_accuracy) as avg_bloom_accuracy,
        COUNT(DISTINCT bloom_level) as bloom_levels_used,
        array_agg(DISTINCT bloom_level) as bloom_levels,
        SUM(regeneration_count) as total_regenerations
      FROM course_outcomes
      WHERE course_id = $1 AND is_ai_generated = TRUE
    `;

    const result = await pool.query(query, [courseId]);

    res.json({
      success: true,
      statistics: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message,
    });
  }
});

/**
 * @route   DELETE /api/ai-cos/:coId
 * @desc    Delete a specific AI-generated CO
 * @access  Private (Teacher only)
 */
router.delete('/:coId', authenticateToken, async (req, res) => {
  try {
    const { coId } = req.params;

    const result = await pool.query(
      'DELETE FROM course_outcomes WHERE id = $1 AND is_ai_generated = TRUE RETURNING *',
      [coId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CO not found' });
    }

    res.json({
      success: true,
      message: 'CO deleted successfully',
      co: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting CO:', error);
    res.status(500).json({
      error: 'Failed to delete CO',
      details: error.message,
    });
  }
});

export default router;
