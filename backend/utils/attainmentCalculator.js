import { query } from '../config/db.js';
import { insertOne } from '../config/mongodb.js';

/**
 * Calculate CO attainment for a specific course and assessment
 * Direct Attainment = (Students scoring >= 60% in CO questions) / Total Students * 100
 */
export const calculateCOAttainment = async (courseId, assessmentId, threshold = 60) => {
  try {
    // Get all COs for the course
    const cosResult = await query(
      'SELECT id, co_number FROM course_outcomes WHERE course_id = $1 ORDER BY co_number',
      [courseId]
    );

    const coAttainments = [];

    for (const co of cosResult.rows) {
      // Get all questions mapped to this CO in this assessment
      const questionsResult = await query(
        `SELECT id, max_marks FROM questions
         WHERE assessment_id = $1 AND co_id = $2`,
        [assessmentId, co.id]
      );

      if (questionsResult.rows.length === 0) {
        continue; // Skip COs with no questions
      }

      const questionIds = questionsResult.rows.map(q => q.id);
      const totalMarks = questionsResult.rows.reduce((sum, q) => sum + parseFloat(q.max_marks), 0);

      // Get all enrolled students
      const studentsResult = await query(
        'SELECT student_id FROM students_courses WHERE course_id = $1',
        [courseId]
      );

      const totalStudents = studentsResult.rows.length;
      let studentsAboveThreshold = 0;

      // Calculate each student's score for this CO
      for (const student of studentsResult.rows) {
        const scoresResult = await query(
          `SELECT COALESCE(SUM(marks_obtained), 0) as total_scored
           FROM student_scores
           WHERE student_id = $1 AND question_id = ANY($2)`,
          [student.student_id, questionIds]
        );

        const totalScored = parseFloat(scoresResult.rows[0].total_scored || 0);
        const percentage = totalMarks > 0 ? (totalScored / totalMarks) * 100 : 0;

        if (percentage >= threshold) {
          studentsAboveThreshold++;
        }
      }

      const attainmentPercentage = totalStudents > 0
        ? (studentsAboveThreshold / totalStudents) * 100
        : 0;

      // Store in PostgreSQL
      await query(
        `INSERT INTO co_attainment
         (course_id, co_id, assessment_id, attainment_percentage, total_students, students_above_threshold, threshold_percentage)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (course_id, co_id, assessment_id)
         DO UPDATE SET
           attainment_percentage = $4,
           total_students = $5,
           students_above_threshold = $6,
           calculated_at = CURRENT_TIMESTAMP`,
        [courseId, co.id, assessmentId, attainmentPercentage, totalStudents, studentsAboveThreshold, threshold]
      );

      // Store in MongoDB for analytics
      await insertOne('attainment_by_course', {
        course_id: courseId,
        timestamp: new Date(),
        co_id: co.id,
        co_number: co.co_number,
        attainment_percentage: attainmentPercentage,
        total_students: totalStudents,
        students_above_threshold: studentsAboveThreshold
      });

      coAttainments.push({
        coId: co.id,
        coNumber: co.co_number,
        attainmentPercentage: parseFloat(attainmentPercentage.toFixed(2)),
        totalStudents,
        studentsAboveThreshold
      });
    }

    return {
      success: true,
      courseId,
      assessmentId,
      threshold,
      coAttainments
    };
  } catch (error) {
    console.error('Error calculating CO attainment:', error);
    throw error;
  }
};

/**
 * Calculate PO attainment for a course
 * Based on CO attainments and CO-PO mapping correlation levels
 */
export const calculatePOAttainment = async (courseId) => {
  try {
    // Get all POs
    const posResult = await query('SELECT id, po_number FROM program_outcomes ORDER BY po_number');

    const poAttainments = [];

    for (const po of posResult.rows) {
      // Get all COs mapped to this PO with their correlation levels
      const mappingResult = await query(
        `SELECT co.id as co_id, co.co_number, cpm.correlation_level
         FROM course_outcomes co
         JOIN co_po_mapping cpm ON co.id = cpm.co_id
         WHERE co.course_id = $1 AND cpm.po_id = $2`,
        [courseId, po.id]
      );

      if (mappingResult.rows.length === 0) {
        continue; // Skip POs with no CO mappings
      }

      // Get CO attainments for these COs
      let totalWeightedAttainment = 0;
      let totalWeight = 0;

      for (const mapping of mappingResult.rows) {
        const attainmentResult = await query(
          `SELECT AVG(attainment_percentage) as avg_attainment
           FROM co_attainment
           WHERE course_id = $1 AND co_id = $2`,
          [courseId, mapping.co_id]
        );

        const coAttainment = parseFloat(attainmentResult.rows[0]?.avg_attainment || 0);
        const weight = mapping.correlation_level; // 1=Low, 2=Medium, 3=High

        totalWeightedAttainment += coAttainment * weight;
        totalWeight += weight;
      }

      const poAttainmentLevel = totalWeight > 0
        ? totalWeightedAttainment / totalWeight
        : 0;

      // Store in PostgreSQL
      await query(
        `INSERT INTO po_attainment (course_id, po_id, attainment_level, calculation_method)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (course_id, po_id)
         DO UPDATE SET
           attainment_level = $3,
           calculated_at = CURRENT_TIMESTAMP`,
        [courseId, po.id, poAttainmentLevel, 'direct']
      );

      // Store in MongoDB
      const contributingCOs = mappingResult.rows.map(m => m.co_id);
      await insertOne('po_attainment', {
        course_id: courseId,
        po_id: po.id,
        timestamp: new Date(),
        attainment_level: poAttainmentLevel,
        contributing_cos: contributingCOs,
        student_count: 0
      });

      poAttainments.push({
        poId: po.id,
        poNumber: po.po_number,
        attainmentLevel: parseFloat(poAttainmentLevel.toFixed(2)),
        contributingCOs: mappingResult.rows.map(m => ({
          coNumber: m.co_number,
          correlationLevel: m.correlation_level
        }))
      });
    }

    return {
      success: true,
      courseId,
      poAttainments
    };
  } catch (error) {
    console.error('Error calculating PO attainment:', error);
    throw error;
  }
};

/**
 * Calculate student-wise CO/PO performance
 */
export const calculateStudentAttainment = async (studentId, courseId) => {
  try {
    // Get all assessments for this course
    const assessmentsResult = await query(
      'SELECT id FROM assessments WHERE course_id = $1',
      [courseId]
    );

    // Get all COs
    const cosResult = await query(
      'SELECT id, co_number FROM course_outcomes WHERE course_id = $1',
      [courseId]
    );

    const coPerformance = [];

    for (const co of cosResult.rows) {
      // Get all questions for this CO across all assessments
      const questionsResult = await query(
        `SELECT q.id, q.max_marks
         FROM questions q
         WHERE q.co_id = $1 AND q.assessment_id = ANY($2)`,
        [co.id, assessmentsResult.rows.map(a => a.id)]
      );

      if (questionsResult.rows.length === 0) continue;

      const questionIds = questionsResult.rows.map(q => q.id);
      const maxMarks = questionsResult.rows.reduce((sum, q) => sum + parseFloat(q.max_marks), 0);

      // Get student's scores
      const scoresResult = await query(
        `SELECT COALESCE(SUM(marks_obtained), 0) as total_scored
         FROM student_scores
         WHERE student_id = $1 AND question_id = ANY($2)`,
        [studentId, questionIds]
      );

      const scored = parseFloat(scoresResult.rows[0].total_scored || 0);
      const percentage = maxMarks > 0 ? (scored / maxMarks) * 100 : 0;

      coPerformance.push({
        coNumber: co.co_number,
        scored,
        maxMarks,
        percentage: parseFloat(percentage.toFixed(2))
      });

      // Store in MongoDB
      await insertOne('attainment_by_student', {
        student_id: studentId,
        course_id: courseId,
        timestamp: new Date(),
        co_id: co.id,
        po_id: null,
        score: scored,
        max_score: maxMarks,
        percentage: percentage
      });
    }

    return {
      success: true,
      studentId,
      courseId,
      coPerformance
    };
  } catch (error) {
    console.error('Error calculating student attainment:', error);
    throw error;
  }
};

/**
 * Calculate module-wise performance
 */
export const calculateModulePerformance = async (courseId) => {
  try {
    // Get distinct modules for this course
    const modulesResult = await query(
      `SELECT DISTINCT module_number
       FROM course_outcomes
       WHERE course_id = $1 AND module_number IS NOT NULL
       ORDER BY module_number`,
      [courseId]
    );

    const modulePerformances = [];

    for (const module of modulesResult.rows) {
      const moduleNumber = module.module_number;

      // Get COs for this module
      const cosResult = await query(
        `SELECT id FROM course_outcomes
         WHERE course_id = $1 AND module_number = $2`,
        [courseId, moduleNumber]
      );

      const coIds = cosResult.rows.map(co => co.id);

      // Get all questions for these COs
      const questionsResult = await query(
        `SELECT id, max_marks FROM questions WHERE co_id = ANY($1)`,
        [coIds]
      );

      if (questionsResult.rows.length === 0) continue;

      const questionIds = questionsResult.rows.map(q => q.id);
      const maxScore = questionsResult.rows.reduce((sum, q) => sum + parseFloat(q.max_marks), 0);

      // Get average score
      const avgResult = await query(
        `SELECT AVG(marks_obtained) as avg_score, COUNT(DISTINCT student_id) as student_count
         FROM student_scores
         WHERE question_id = ANY($1)`,
        [questionIds]
      );

      const avgScore = parseFloat(avgResult.rows[0].avg_score || 0);
      const studentCount = parseInt(avgResult.rows[0].student_count || 0);

      // Store in MongoDB
      await insertOne('module_performance', {
        course_id: courseId,
        module_number: moduleNumber,
        timestamp: new Date(),
        avg_score: avgScore,
        max_score: maxScore,
        student_count: studentCount,
        co_ids: coIds
      });

      modulePerformances.push({
        moduleNumber,
        avgScore: parseFloat(avgScore.toFixed(2)),
        maxScore,
        studentCount
      });
    }

    return {
      success: true,
      courseId,
      modulePerformances
    };
  } catch (error) {
    console.error('Error calculating module performance:', error);
    throw error;
  }
};
