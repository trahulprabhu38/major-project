import pool from '../config/db.js';

/**
 * COMBINED CO ATTAINMENT CALCULATOR
 * Calculates CO attainment across multiple assessments (CIE1, CIE2, CIE3, AAT)
 * 
 * CORRECT METHODOLOGY:
 * 1. For each CO, sum max marks across all assessments
 * 2. For each student, sum their marks for that CO across all assessments
 * 3. Calculate threshold = 60% of total max marks
 * 4. Count students who achieved >= threshold
 * 5. Attainment = (students above threshold / total students) * 100
 */

class CombinedCOAttainmentService {
  /**
   * Helper: determine the actual USN column name for a marksheet table.
   * Handles variations in casing (USN/usn/Usn) and common alternatives.
   */
  async getUsnColumnName(tableName) {
    if (!tableName) return null;

    const columnsQuery = await pool.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND LOWER(table_name) = LOWER($1)
      `,
      [tableName]
    );

    if (columnsQuery.rows.length === 0) return null;

    const preferred = ['usn', 'student_usn', 'studentid', 'student_id', 'roll_no'];
    for (const target of preferred) {
      const match = columnsQuery.rows.find(
        (c) => c.column_name.toLowerCase() === target
      );
      if (match) return match.column_name;
    }

    // Fallback: any column containing "usn"
    const fuzzy = columnsQuery.rows.find((c) =>
      c.column_name.toLowerCase().includes('usn')
    );
    return fuzzy ? fuzzy.column_name : null;
  }

  /**
   * Calculate combined CO attainment across all CIE assessments
   * Uses VERTICAL ANALYSIS (question-level attainment) method
   */
  async calculateCombinedCOAttainment(courseId) {
    console.log(`\n=== CALCULATING COMBINED CO ATTAINMENT FROM VERTICAL ANALYSIS ===`);

    // Get all COs for this course
    const cosQuery = await pool.query(
      'SELECT id, co_number, description, bloom_level FROM course_outcomes WHERE course_id = $1 ORDER BY co_number',
      [courseId]
    );

    const combinedResults = [];

    for (const co of cosQuery.rows) {
      const coNumber = co.co_number;
      const coId = co.id;

      console.log(`\nProcessing CO${coNumber}...`);

      // NEW METHOD: Aggregate from question_vertical_analysis (already calculated per question)
      // This is the CORRECT way - average of question-level attainments
      const verticalAnalysisQuery = await pool.query(`
        SELECT
          SUM(qva.attempts_count) as total_attempts,
          SUM(qva.students_above_threshold) as total_above_threshold,
          SUM(qcm.max_marks) as total_max_marks,
          COUNT(qva.question_column) as num_questions
        FROM question_vertical_analysis qva
        JOIN question_co_mappings qcm ON
          qva.marksheet_id = qcm.marksheet_id AND
          LOWER(qva.question_column) = LOWER(qcm.question_column)
        JOIN marksheets m ON qva.marksheet_id = m.id
        WHERE qva.course_id = $1
          AND qva.co_number = $2
          AND m.course_id = $1
      `, [courseId, coNumber]);

      const vData = verticalAnalysisQuery.rows[0];
      const totalAttempts = parseInt(vData.total_attempts) || 0;
      const studentsAboveThreshold = parseInt(vData.total_above_threshold) || 0;
      const totalMaxMarks = parseFloat(vData.total_max_marks) || 0;
      const numQuestions = parseInt(vData.num_questions) || 0;

      if (numQuestions === 0) {
        console.log(`  ⚠️  No questions found for CO${coNumber} in vertical analysis`);
        combinedResults.push({
          courseId,
          coId,
          coNumber,
          totalMaxMarks: 0,
          totalAttempts: 0,
          studentsAboveThreshold: 0,
          attainmentPercent: 0,
          threshold: 0
        });
        continue;
      }

      // Calculate CO attainment as: (total students above threshold across all questions) / (total attempts)
      const attainmentPercent = totalAttempts > 0
        ? (studentsAboveThreshold / totalAttempts) * 100
        : 0;

      console.log(`  Total Max Marks: ${totalMaxMarks.toFixed(2)}`);
      console.log(`  Number of Questions: ${numQuestions}`);
      console.log(`  Total Attempts: ${totalAttempts}`);
      console.log(`  Students Above Threshold (60% per question): ${studentsAboveThreshold}`);
      console.log(`  CO Attainment: ${attainmentPercent.toFixed(2)}%`);

      combinedResults.push({
        courseId,
        coId,
        coNumber,
        totalMaxMarks,
        totalAttempts,
        studentsAboveThreshold,
        attainmentPercent,
        threshold: 60.0 // Standard 60% threshold
      });
    }

    // Store in database (create/update table if needed)
    await this.storeCombinedCOAttainment(courseId, combinedResults);

    return combinedResults;
  }

  /**
   * Store combined CO attainment results
   */
  async storeCombinedCOAttainment(courseId, results) {
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS combined_co_attainment_calculated (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        co_id UUID NOT NULL REFERENCES course_outcomes(id) ON DELETE CASCADE,
        co_number INTEGER NOT NULL,
        total_max_marks DECIMAL(10,2) NOT NULL,
        total_attempts INTEGER NOT NULL,
        students_above_threshold INTEGER NOT NULL,
        attainment_percent DECIMAL(5,2) NOT NULL,
        threshold DECIMAL(10,2) NOT NULL,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id, co_id)
      )
    `);

    // Delete old results
    await pool.query('DELETE FROM combined_co_attainment_calculated WHERE course_id = $1', [courseId]);

    // Insert new results
    for (const result of results) {
      await pool.query(`
        INSERT INTO combined_co_attainment_calculated
        (course_id, co_id, co_number, total_max_marks, total_attempts, 
         students_above_threshold, attainment_percent, threshold)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (course_id, co_id) DO UPDATE SET
          total_max_marks = EXCLUDED.total_max_marks,
          total_attempts = EXCLUDED.total_attempts,
          students_above_threshold = EXCLUDED.students_above_threshold,
          attainment_percent = EXCLUDED.attainment_percent,
          threshold = EXCLUDED.threshold,
          calculated_at = CURRENT_TIMESTAMP
      `, [
        result.courseId,
        result.coId,
        result.coNumber,
        result.totalMaxMarks,
        result.totalAttempts,
        result.studentsAboveThreshold,
        result.attainmentPercent,
        result.threshold
      ]);
    }

    console.log(`\n✅ Stored ${results.length} combined CO attainment results`);
  }

  /**
   * Get per-assessment CO attainment (for display)
   */
  async getPerAssessmentCOAttainment(courseId) {
    const result = await pool.query(`
      SELECT 
        cla.co_number,
        cla.co_max_marks,
        cla.co_attempts as attempts,
        cla.co_students_above_threshold as above_60,
        cla.co_attainment_percent as attainment_percent,
        m.assessment_name,
        fls.assessment_type
      FROM co_level_analysis cla
      JOIN marksheets m ON cla.marksheet_id = m.id
      LEFT JOIN file_level_summary fls ON m.id = fls.marksheet_id
      WHERE cla.course_id = $1
      ORDER BY fls.assessment_type, cla.co_number
    `, [courseId]);

    return result.rows;
  }
}

export default new CombinedCOAttainmentService();

