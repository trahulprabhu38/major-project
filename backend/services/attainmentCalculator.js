import pool from '../config/db.js';

/**
 * Attainment Calculation Service
 * Implements Phase 5-9: CO/PO attainment, student scores, grades
 */

class AttainmentCalculatorService {
  /**
   * Phase 5: Calculate student CO scores for an assessment
   */
  async calculateStudentCOScores(client, courseId, assessmentId) {
    // Get all students who have scores for this assessment
    const studentsRes = await client.query(
      `SELECT DISTINCT student_id FROM student_scores
       WHERE assessment_id = $1`,
      [assessmentId]
    );

    // Get all COs for this course
    const cosRes = await client.query(
      'SELECT id, co_number FROM course_outcomes WHERE course_id = $1',
      [courseId]
    );

    const coMap = {};
    cosRes.rows.forEach(co => {
      coMap[co.co_number] = co.id;
    });

    for (const { student_id } of studentsRes.rows) {
      // Aggregate scores by CO for this student in this assessment
      const coScoresRes = await client.query(
        `SELECT
           co_number,
           SUM(marks_obtained) as obtained_marks,
           SUM(max_marks) as max_marks
         FROM student_scores
         WHERE student_id = $1 AND assessment_id = $2
         GROUP BY co_number`,
        [student_id, assessmentId]
      );

      for (const coScore of coScoresRes.rows) {
        const { co_number, obtained_marks, max_marks } = coScore;
        const percentage = max_marks > 0 ? (obtained_marks / max_marks) * 100 : 0;

        const coId = coMap[co_number];
        if (!coId) continue;

        // Upsert student_co_scores
        await client.query(
          `INSERT INTO student_co_scores
           (student_id, course_id, assessment_id, co_id, co_number, obtained_marks, max_marks, percentage)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (student_id, assessment_id, co_id)
           DO UPDATE SET
             obtained_marks = EXCLUDED.obtained_marks,
             max_marks = EXCLUDED.max_marks,
             percentage = EXCLUDED.percentage,
             calculated_at = CURRENT_TIMESTAMP`,
          [student_id, courseId, assessmentId, coId, co_number, obtained_marks, max_marks, percentage]
        );
      }
    }
  }

  /**
   * Phase 6: Calculate CO Attainment for an assessment
   */
  async calculateCOAttainment(client, courseId, assessmentId) {
    const configRes = await client.query(
      'SELECT attainment_threshold FROM course_config WHERE course_id = $1',
      [courseId]
    );
    const threshold = configRes.rows[0]?.attainment_threshold || 60.0;

    // Get all COs for this course
    const cosRes = await client.query(
      'SELECT id, co_number FROM course_outcomes WHERE course_id = $1',
      [courseId]
    );

    for (const co of cosRes.rows) {
      // Aggregate across all students for this CO in this assessment
      const attainmentRes = await client.query(
        `SELECT
           SUM(obtained_marks) as total_obtained,
           SUM(max_marks) as total_max,
           COUNT(*) as total_students,
           COUNT(*) FILTER (WHERE percentage >= $1) as students_above_threshold
         FROM student_co_scores
         WHERE course_id = $2 AND assessment_id = $3 AND co_id = $4`,
        [threshold, courseId, assessmentId, co.id]
      );

      const { total_obtained, total_max, total_students, students_above_threshold } = attainmentRes.rows[0];

      const attainmentPercentage = total_max > 0 ? (total_obtained / total_max) * 100 : 0;

      // Upsert co_attainment
      await client.query(
        `INSERT INTO co_attainment
         (course_id, co_id, assessment_id, attainment_percentage, total_students,
          students_above_threshold, threshold_percentage, obtained_marks, max_marks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (course_id, co_id, assessment_id)
         DO UPDATE SET
           attainment_percentage = EXCLUDED.attainment_percentage,
           total_students = EXCLUDED.total_students,
           students_above_threshold = EXCLUDED.students_above_threshold,
           obtained_marks = EXCLUDED.obtained_marks,
           max_marks = EXCLUDED.max_marks,
           calculated_at = CURRENT_TIMESTAMP`,
        [courseId, co.id, assessmentId, attainmentPercentage, total_students || 0, students_above_threshold || 0, threshold, total_obtained || 0, total_max || 0]
      );
    }
  }

  /**
   * Phase 7: Calculate combined CIE/SEE and final CO percentages
   */
  async calculateFinalCOAttainment(client, courseId) {
    let configRes = await client.query(
      'SELECT * FROM course_config WHERE course_id = $1',
      [courseId]
    );

    // Create default config if missing
    if (configRes.rows.length === 0) {
      await client.query(
        `INSERT INTO course_config (course_id, assessment_weights, cie_weight, see_weight, ces_weight, attainment_threshold, grade_boundaries)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          courseId,
          JSON.stringify({"Test1": 20, "Test2": 20, "Test3": 20, "AAT": 10, "Quiz": 10, "SEE": 20}),
          0.70,
          0.20,
          0.10,
          60.0,
          JSON.stringify({"S": 90, "A": 80, "B": 70, "C": 60, "D": 50, "E": 40, "F": 0})
        ]
      );

      // Fetch the newly created config
      configRes = await client.query(
        'SELECT * FROM course_config WHERE course_id = $1',
        [courseId]
      );
    }

    const config = configRes.rows[0];
    const assessmentWeights = config.assessment_weights;

    // Get all COs for this course
    const cosRes = await client.query(
      'SELECT id, co_number FROM course_outcomes WHERE course_id = $1',
      [courseId]
    );

    for (const co of cosRes.rows) {
      // Get all assessment attainments for this CO
      const attainmentsRes = await client.query(
        `SELECT
           a.name,
           a.type,
           a.is_cie_component,
           a.is_see_component,
           ca.attainment_percentage
         FROM co_attainment ca
         JOIN assessments a ON ca.assessment_id = a.id
         WHERE ca.course_id = $1 AND ca.co_id = $2`,
        [courseId, co.id]
      );

      let ciePercent = 0;
      let cieWeightSum = 0;
      let seePercent = 0;
      let seeWeightSum = 0;

      for (const att of attainmentsRes.rows) {
        const weight = assessmentWeights[att.name] || 1;

        if (att.is_cie_component) {
          ciePercent += att.attainment_percentage * weight;
          cieWeightSum += weight;
        }

        if (att.is_see_component) {
          seePercent += att.attainment_percentage * weight;
          seeWeightSum += weight;
        }
      }

      ciePercent = cieWeightSum > 0 ? ciePercent / cieWeightSum : 0;
      seePercent = seeWeightSum > 0 ? seePercent / seeWeightSum : 0;

      // CES is typically from course-end survey (not implemented yet, default to 0)
      const cesPercent = 0;

      // Final percentage
      const finalPercent =
        (config.cie_weight * ciePercent) +
        (config.see_weight * seePercent) +
        (config.ces_weight * cesPercent);

      // Save snapshot
      await client.query(
        `INSERT INTO co_calculation_snapshot
         (course_id, co_id, co_number, cie_percent, see_percent, ces_percent, final_percent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [courseId, co.id, co.co_number, ciePercent, seePercent, cesPercent, finalPercent]
      );
    }
  }

  /**
   * Phase 8: Calculate PO Attainment
   */
  async calculatePOAttainment(client, courseId) {
    // Get latest CO snapshots
    const coSnapshotsRes = await client.query(
      `SELECT DISTINCT ON (co_id)
         co_id, co_number, final_percent
       FROM co_calculation_snapshot
       WHERE course_id = $1
       ORDER BY co_id, calculated_at DESC`,
      [courseId]
    );

    const coValues = {};
    coSnapshotsRes.rows.forEach(row => {
      coValues[row.co_id] = row.final_percent;
    });

    // Get all POs
    const posRes = await client.query('SELECT id, po_number FROM program_outcomes');

    for (const po of posRes.rows) {
      // Get all COs mapped to this PO
      const mappingsRes = await client.query(
        `SELECT cpm.co_id, cpm.correlation_level
         FROM co_po_mapping cpm
         JOIN course_outcomes co ON cpm.co_id = co.id
         WHERE co.course_id = $1 AND cpm.po_id = $2`,
        [courseId, po.id]
      );

      if (mappingsRes.rows.length === 0) {
        continue; // No COs map to this PO
      }

      let weightedSum = 0;
      let totalWeight = 0;

      for (const mapping of mappingsRes.rows) {
        const coValue = coValues[mapping.co_id] || 0;
        const weight = mapping.correlation_level;

        weightedSum += coValue * weight;
        totalWeight += weight;
      }

      const poPercentage = totalWeight > 0 ? weightedSum / totalWeight : 0;

      // Convert to 1-3 scale: attainment_level = 1 + (po_percentage / 100) * 2
      const attainmentLevel = Math.min(3.0, Math.max(0.0, 1 + (poPercentage / 100) * 2));

      // Upsert po_attainment
      await client.query(
        `INSERT INTO po_attainment
         (course_id, po_id, attainment_level, po_percentage, calculation_method, calculation_details)
         VALUES ($1, $2, $3, $4, 'direct', $5)
         ON CONFLICT (course_id, po_id)
         DO UPDATE SET
           attainment_level = EXCLUDED.attainment_level,
           po_percentage = EXCLUDED.po_percentage,
           calculation_details = EXCLUDED.calculation_details,
           calculated_at = CURRENT_TIMESTAMP`,
        [courseId, po.id, attainmentLevel, poPercentage, JSON.stringify({ mappings: mappingsRes.rows.length })]
      );
    }
  }

  /**
   * Phase 9: Calculate student overall scores and grades
   */
  async calculateStudentOverallScores(client, courseId) {
    const configRes = await client.query(
      'SELECT * FROM course_config WHERE course_id = $1',
      [courseId]
    );

    const config = configRes.rows[0];
    const gradeBoundaries = config.grade_boundaries;

    // Get all students in the course
    const studentsRes = await client.query(
      `SELECT DISTINCT student_id
       FROM student_co_scores
       WHERE course_id = $1`,
      [courseId]
    );

    for (const { student_id } of studentsRes.rows) {
      // Get all assessments for this student
      const assessmentsRes = await client.query(
        `SELECT DISTINCT
           a.id,
           a.name,
           a.is_cie_component,
           a.is_see_component,
           SUM(ss.marks_obtained) as obtained,
           SUM(ss.max_marks) as max
         FROM student_scores ss
         JOIN assessments a ON ss.assessment_id = a.id
         WHERE ss.student_id = $1 AND a.course_id = $2
         GROUP BY a.id, a.name, a.is_cie_component, a.is_see_component`,
        [student_id, courseId]
      );

      let cieObtained = 0;
      let cieMax = 0;
      let seeObtained = 0;
      let seeMax = 0;

      for (const ass of assessmentsRes.rows) {
        const weight = config.assessment_weights[ass.name] || 1;

        if (ass.is_cie_component) {
          cieObtained += ass.obtained * weight;
          cieMax += ass.max * weight;
        }

        if (ass.is_see_component) {
          seeObtained += ass.obtained * weight;
          seeMax += ass.max * weight;
        }
      }

      const ciePercentage = cieMax > 0 ? (cieObtained / cieMax) * 100 : 0;
      const seePercentage = seeMax > 0 ? (seeObtained / seeMax) * 100 : 0;

      const totalObtained = cieObtained + seeObtained;
      const totalMax = cieMax + seeMax;
      const totalPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

      // Assign grade
      const grade = this.assignGrade(totalPercentage, gradeBoundaries);

      // Upsert student_overall_scores
      await client.query(
        `INSERT INTO student_overall_scores
         (student_id, course_id, total_obtained, total_max, percentage, grade,
          cie_obtained, cie_max, cie_percentage, see_obtained, see_max, see_percentage)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (student_id, course_id)
         DO UPDATE SET
           total_obtained = EXCLUDED.total_obtained,
           total_max = EXCLUDED.total_max,
           percentage = EXCLUDED.percentage,
           grade = EXCLUDED.grade,
           cie_obtained = EXCLUDED.cie_obtained,
           cie_max = EXCLUDED.cie_max,
           cie_percentage = EXCLUDED.cie_percentage,
           see_obtained = EXCLUDED.see_obtained,
           see_max = EXCLUDED.see_max,
           see_percentage = EXCLUDED.see_percentage,
           calculated_at = CURRENT_TIMESTAMP`,
        [student_id, courseId, totalObtained, totalMax, totalPercentage, grade, cieObtained, cieMax, ciePercentage, seeObtained, seeMax, seePercentage]
      );
    }
  }

  /**
   * Assign grade based on percentage and boundaries
   */
  assignGrade(percentage, boundaries) {
    const grades = Object.keys(boundaries).sort((a, b) => boundaries[b] - boundaries[a]);

    for (const grade of grades) {
      if (percentage >= boundaries[grade]) {
        return grade;
      }
    }

    return 'F';
  }

  /**
   * Run full attainment calculation pipeline for a course
   */
  async runFullCalculation(courseId, assessmentId = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (assessmentId) {
        // Calculate for specific assessment
        await this.calculateStudentCOScores(client, courseId, assessmentId);
        await this.calculateCOAttainment(client, courseId, assessmentId);
      }

      // Calculate final CO and PO attainment
      await this.calculateFinalCOAttainment(client, courseId);
      await this.calculatePOAttainment(client, courseId);
      await this.calculateStudentOverallScores(client, courseId);

      await client.query('COMMIT');

      return { success: true, message: 'Attainment calculations completed successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AttainmentCalculatorService();
