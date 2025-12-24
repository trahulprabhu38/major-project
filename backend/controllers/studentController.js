import { query } from '../config/db.js';
import { calculateStudentAttainment } from '../utils/attainmentCalculator.js';
import pool from '../config/db.js';
import axios from 'axios';

/**
 * Get student's enrolled courses
 */
export const getStudentCourses = async (req, res) => {
  try {
    const studentId = req.user.id;

    const result = await query(
      `SELECT c.*, u.name as teacher_name, sc.enrollment_date, sc.status
       FROM courses c
       JOIN students_courses sc ON c.id = sc.course_id
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE sc.student_id = $1
       ORDER BY c.year DESC, c.semester DESC`,
      [studentId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get student courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get courses',
      error: error.message
    });
  }
};

/**
 * Get student's scores for a course
 */
export const getStudentScores = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    // Verify student is enrolled
    const enrollCheck = await query(
      'SELECT id FROM students_courses WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (enrollCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Get all assessments and scores
    const result = await query(
      `SELECT
         a.id as assessment_id,
         a.name as assessment_name,
         a.type as assessment_type,
         a.assessment_date,
         a.max_marks as assessment_max_marks,
         q.id as question_id,
         q.question_number,
         q.question_text,
         q.max_marks as question_max_marks,
         co.co_number,
         co.description as co_description,
         ss.marks_obtained,
         ss.created_at as scored_at
       FROM assessments a
       JOIN questions q ON a.id = q.assessment_id
       LEFT JOIN course_outcomes co ON q.co_id = co.id
       LEFT JOIN student_scores ss ON q.id = ss.question_id AND ss.student_id = $1
       WHERE a.course_id = $2
       ORDER BY a.assessment_date DESC, q.question_number`,
      [studentId, courseId]
    );

    // Group by assessment
    const assessments = {};

    result.rows.forEach(row => {
      if (!assessments[row.assessment_id]) {
        assessments[row.assessment_id] = {
          id: row.assessment_id,
          name: row.assessment_name,
          type: row.assessment_type,
          date: row.assessment_date,
          maxMarks: parseFloat(row.assessment_max_marks),
          questions: [],
          totalScored: 0,
          totalMaxMarks: 0
        };
      }

      const marks = row.marks_obtained !== null ? parseFloat(row.marks_obtained) : null;
      const maxMarks = parseFloat(row.question_max_marks);

      assessments[row.assessment_id].questions.push({
        id: row.question_id,
        number: row.question_number,
        text: row.question_text,
        maxMarks,
        marksObtained: marks,
        coNumber: row.co_number,
        coDescription: row.co_description,
        scoredAt: row.scored_at
      });

      if (marks !== null) {
        assessments[row.assessment_id].totalScored += marks;
      }
      assessments[row.assessment_id].totalMaxMarks += maxMarks;
    });

    // Calculate percentages
    Object.values(assessments).forEach(assessment => {
      assessment.percentage = assessment.totalMaxMarks > 0
        ? (assessment.totalScored / assessment.totalMaxMarks) * 100
        : 0;
    });

    res.json({
      success: true,
      data: Object.values(assessments)
    });
  } catch (error) {
    console.error('Get student scores error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scores',
      error: error.message
    });
  }
};

/**
 * Get student's CO-wise performance for a course
 */
export const getStudentCOPerformance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    // Calculate attainment
    const result = await calculateStudentAttainment(studentId, courseId);

    res.json({
      success: true,
      data: result.coPerformance
    });
  } catch (error) {
    console.error('Get CO performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CO performance',
      error: error.message
    });
  }
};

/**
 * Get student's PO-wise performance for a course
 */
export const getStudentPOPerformance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    const result = await query(
      `SELECT
         po.po_number,
         po.description,
         AVG(
           CASE
             WHEN q.max_marks > 0
             THEN (ss.marks_obtained / q.max_marks) * 100
             ELSE 0
           END
         ) as performance_percentage
       FROM program_outcomes po
       JOIN question_po_mapping qpm ON po.id = qpm.po_id
       JOIN questions q ON qpm.question_id = q.id
       JOIN assessments a ON q.assessment_id = a.id
       LEFT JOIN student_scores ss ON q.id = ss.question_id AND ss.student_id = $1
       WHERE a.course_id = $2
       GROUP BY po.id, po.po_number, po.description
       ORDER BY po.po_number`,
      [studentId, courseId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        poNumber: row.po_number,
        description: row.description,
        percentage: parseFloat(row.performance_percentage || 0).toFixed(2)
      }))
    });
  } catch (error) {
    console.error('Get PO performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get PO performance',
      error: error.message
    });
  }
};

/**
 * Get student's overall analytics for a course
 */
export const getStudentAnalytics = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    // Get class average from student_horizontal_analysis
    const classAvgResult = await pool.query(
      `SELECT AVG(percentage) as class_average
       FROM student_horizontal_analysis sha
       JOIN marksheets m ON sha.marksheet_id = m.id
       WHERE m.course_id = $1`,
      [courseId]
    );

    // Get student average from student_horizontal_analysis
    const studentAvgResult = await pool.query(
      `SELECT AVG(percentage) as student_average
       FROM student_horizontal_analysis sha
       JOIN marksheets m ON sha.marksheet_id = m.id
       WHERE m.course_id = $1 AND sha.student_id = $2`,
      [courseId, studentId]
    );

    // Get student rank based on average percentage
    const rankResult = await pool.query(
      `WITH student_averages AS (
         SELECT
           sha.student_id,
           AVG(sha.percentage) as avg_percentage
         FROM student_horizontal_analysis sha
         JOIN marksheets m ON sha.marksheet_id = m.id
         WHERE m.course_id = $1
         GROUP BY sha.student_id
       )
       SELECT
         COUNT(*) + 1 as rank
       FROM student_averages
       WHERE avg_percentage > (
         SELECT avg_percentage
         FROM student_averages
         WHERE student_id = $2
       )`,
      [courseId, studentId]
    );

    // Get total students
    const totalStudentsResult = await pool.query(
      'SELECT COUNT(*) as total FROM students_courses WHERE course_id = $1',
      [courseId]
    );

    console.log(
      `\n=== STUDENT ANALYTICS for course ${courseId}, student ${studentId} ===\n` +
      `classAverage=${classAvgResult.rows[0]?.class_average || 0}, ` +
      `studentAverage=${studentAvgResult.rows[0]?.student_average || 0}, ` +
      `rank=${rankResult.rows[0]?.rank || 0}, ` +
      `totalStudents=${totalStudentsResult.rows[0]?.total || 0}`
    );

    res.json({
      success: true,
      data: {
        classAverage: parseFloat(classAvgResult.rows[0]?.class_average || 0).toFixed(2),
        studentAverage: parseFloat(studentAvgResult.rows[0]?.student_average || 0).toFixed(2),
        rank: parseInt(rankResult.rows[0]?.rank || 0),
        totalStudents: parseInt(totalStudentsResult.rows[0]?.total || 0)
      }
    });
  } catch (error) {
    console.error('Get student analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
};

/**
 * Get student's marks from marksheets (using detailed calculations)
 */
export const getStudentMarksFromMarksheets = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    // Verify enrollment
    const enrollCheck = await query(
      'SELECT id FROM students_courses WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (enrollCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Get student USN
    const studentResult = await query(
      'SELECT usn FROM users WHERE id = $1',
      [studentId]
    );
    let studentUSN = studentResult.rows[0]?.usn;
    
    // Also get from MongoDB if not in PostgreSQL
    if (!studentUSN) {
      try {
        const { getDB } = await import('../config/mongodb.js');
        const db = getDB();
        const studentDoc = await db.collection('students').findOne({ postgres_user_id: studentId });
        if (studentDoc && studentDoc.usn) {
          studentUSN = studentDoc.usn;
        }
      } catch (err) {
        console.warn('Could not fetch USN from MongoDB:', err);
      }
    }

    if (!studentUSN) {
      return res.status(400).json({
        success: false,
        message: 'Student USN not found'
      });
    }

    // Helper to determine actual USN column per marksheet table
    const usnColumnCache = new Map();
    const getUsnColumnForTable = async (tableName) => {
      if (!tableName) return null;
      if (usnColumnCache.has(tableName)) return usnColumnCache.get(tableName);

      const columnsResult = await pool.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_name = $1 AND table_schema = 'public'`,
        [tableName]
      );

      let usnCol = null;
      for (const col of columnsResult.rows) {
        if (col.column_name.toLowerCase() === 'usn') {
          usnCol = col.column_name;
          break;
        }
      }
      if (!usnCol) {
        for (const col of columnsResult.rows) {
          if (col.column_name.toLowerCase().includes('usn')) {
            usnCol = col.column_name;
            break;
          }
        }
      }

      usnColumnCache.set(tableName, usnCol);
      return usnCol;
    };

    console.log(`\n=== STUDENT MARKS (horizontal) for course ${courseId}, student ${studentUSN} ===`);

    // Get all marksheets for this course
    const marksheetsResult = await pool.query(
      `SELECT m.id, m.table_name, m.assessment_name, m.created_at,
              fls.assessment_type, fls.max_marks_possible
       FROM marksheets m
       LEFT JOIN file_level_summary fls ON m.id = fls.marksheet_id
       WHERE m.course_id = $1
       ORDER BY m.created_at`,
      [courseId]
    );

    const marksheets = marksheetsResult.rows;
    const studentMarks = [];

    // For each marksheet, get student's marks
    for (const marksheet of marksheets) {
      try {
        // Get student's horizontal analysis (total marks per assessment)
        const horizontalResult = await pool.query(
          `SELECT total_marks_raw, percentage, scaled_marks
           FROM student_horizontal_analysis
           WHERE marksheet_id = $1 AND student_id = $2`,
          [marksheet.id, studentId]
        );

        let totalMarks = 0;
        let percentage = 0;
        let scaledMarks = 0;

        if (horizontalResult.rows.length > 0) {
          totalMarks = parseFloat(horizontalResult.rows[0].total_marks_raw || 0);
          percentage = parseFloat(horizontalResult.rows[0].percentage || 0);
          scaledMarks = parseFloat(horizontalResult.rows[0].scaled_marks || 0);
        } else {
          // Fallback: try to get from marksheet table directly
          const usnColName = await getUsnColumnForTable(marksheet.table_name);
          if (!usnColName) {
            console.warn(`Marksheet ${marksheet.id} table ${marksheet.table_name} has no recognizable USN column.`);
            continue;
          }

          const directResult = await pool.query(
            `SELECT * FROM "${marksheet.table_name}"
             WHERE UPPER("${usnColName}") = UPPER($1)
             LIMIT 1`,
            [studentUSN]
          );

          if (directResult.rows.length > 0) {
            const row = directResult.rows[0];
            // Sum all numeric columns (excluding metadata)
            const metadataCols = ['usn', 'name', 'id', 'created_at', 'updated_at'];
            let sum = 0;
            let maxSum = 0;

            // Get CO mappings to know which columns are valid questions
            const coMappingsResult = await pool.query(
              `SELECT question_column, max_marks
               FROM question_co_mappings
               WHERE marksheet_id = $1 AND (max_marks IS NULL OR max_marks > 0)`,
              [marksheet.id]
            );

            const validColumns = new Set(coMappingsResult.rows.map(r => r.question_column.toLowerCase()));

            for (const [key, value] of Object.entries(row)) {
              const colLower = key.toLowerCase();
              if (!metadataCols.includes(colLower) && validColumns.has(colLower)) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue >= 0) {
                  sum += numValue;
                  const mapping = coMappingsResult.rows.find(r => r.question_column.toLowerCase() === colLower);
                  maxSum += parseFloat(mapping?.max_marks || 0);
                }
              }
            }

            totalMarks = sum;
            percentage = maxSum > 0 ? (sum / maxSum) * 100 : 0;
          }
        }

        // Derive display max / totals for student dashboard
        const rawMaxMarksPossible = parseFloat(marksheet.max_marks_possible || 0);
        let displayMaxMarks = rawMaxMarksPossible;
        let displayTotalMarks = totalMarks;
        let displayPercentage = percentage;

        const isCIE =
          (marksheet.assessment_type || '').toUpperCase().includes('CIE') ||
          (marksheet.assessment_name || '').toUpperCase().includes('CIE');

        if (isCIE) {
          // Strictly show each CIE out of 50 for students, but DO NOT change obtained marks.
          // We only change the denominator and recompute percentage.
          displayMaxMarks = 50;
          displayPercentage = displayMaxMarks > 0
            ? (displayTotalMarks / displayMaxMarks) * 100
            : 0;
        }

        console.log(
          `[StudentMarks] ${marksheet.assessment_name} (${marksheet.assessment_type}) ` +
          `rawTotal=${totalMarks}, rawMax=${rawMaxMarksPossible}, ` +
          `dispTotal=${displayTotalMarks.toFixed(2)}, dispMax=${displayMaxMarks}, ` +
          `dispPct=${displayPercentage.toFixed(2)}, scaled=${scaledMarks}`
        );

        // Get CO-wise breakdown
        const coBreakdownResult = await pool.query(
          `SELECT cla.co_number, cla.co_max_marks,
                  COALESCE((
                    SELECT SUM(CAST(qva.vertical_sum AS DECIMAL) / NULLIF(qva.attempts_count, 0))
                    FROM question_vertical_analysis qva
                    WHERE qva.marksheet_id = $1 AND qva.co_number = cla.co_number
                  ), 0) as avg_marks
           FROM co_level_analysis cla
           WHERE cla.marksheet_id = $1
           GROUP BY cla.co_number, cla.co_max_marks
           ORDER BY cla.co_number`,
          [marksheet.id]
        );

        // Get student's actual CO marks from marksheet table
        const coMarks = [];
        if (marksheet.table_name) {
          const usnColName = await getUsnColumnForTable(marksheet.table_name);
          if (!usnColName) {
            console.warn(`Marksheet ${marksheet.id} table ${marksheet.table_name} has no recognizable USN column for CO marks.`);
          } else {
            const studentRowResult = await pool.query(
              `SELECT * FROM "${marksheet.table_name}"
               WHERE UPPER("${usnColName}") = UPPER($1)
               LIMIT 1`,
              [studentUSN]
            );

            if (studentRowResult.rows.length > 0) {
              const studentRow = studentRowResult.rows[0];
              const coMappingsResult = await pool.query(
                `SELECT qcm.question_column, qcm.co_number, qcm.max_marks
                 FROM question_co_mappings qcm
                 WHERE qcm.marksheet_id = $1 AND (qcm.max_marks IS NULL OR qcm.max_marks > 0)`,
                [marksheet.id]
              );

              // Group by CO
              const coTotals = {};
              for (const mapping of coMappingsResult.rows) {
                const colName = mapping.question_column;
                const coNum = mapping.co_number;
                const maxMarks = parseFloat(mapping.max_marks || 0);

                if (!coTotals[coNum]) {
                  coTotals[coNum] = { obtained: 0, max: 0 };
                }

                const markValue = studentRow[colName] || studentRow[colName.toLowerCase()] || studentRow[colName.toUpperCase()];
                if (markValue !== null && markValue !== undefined && markValue !== '' && markValue !== 'NaN') {
                  const mark = parseFloat(markValue);
                  if (!isNaN(mark) && mark >= 0) {
                    coTotals[coNum].obtained += mark;
                    coTotals[coNum].max += maxMarks;
                  }
                }
              }

              for (const [coNum, totals] of Object.entries(coTotals)) {
                coMarks.push({
                  coNumber: parseInt(coNum),
                  obtained: totals.obtained,
                  max: totals.max,
                  percentage: totals.max > 0 ? (totals.obtained / totals.max) * 100 : 0
                });
              }
            }
          }
        }

        studentMarks.push({
          marksheetId: marksheet.id,
          assessmentName: marksheet.assessment_name,
          assessmentType: marksheet.assessment_type,
          totalMarks: displayTotalMarks,
          maxMarks: displayMaxMarks,
          percentage: parseFloat(displayPercentage.toFixed(2)),
          scaledMarks,
          coBreakdown: coMarks,
          date: marksheet.created_at
        });
      } catch (err) {
        console.error(`Error processing marksheet ${marksheet.id}:`, err);
        // Continue with other marksheets
      }
    }

    res.json({
      success: true,
      data: studentMarks
    });
  } catch (error) {
    console.error('Get student marks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get student marks',
      error: error.message
    });
  }
};

/**
 * Get student's CO attainment for a course (from detailed calculations)
 */
export const getStudentCOAttainment = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    // Verify enrollment
    const { query } = await import('../config/db.js');
    const enrollCheck = await query(
      'SELECT id FROM students_courses WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (enrollCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Get student's USN
    const studentResult = await pool.query(
      'SELECT usn FROM users WHERE id = $1',
      [studentId]
    );
    const studentUSN = studentResult.rows[0]?.usn;

    if (!studentUSN) {
      return res.status(400).json({
        success: false,
        message: 'Student USN not found'
      });
    }

    // Get all course outcomes for this course
    const courseOutcomesResult = await pool.query(
      `SELECT id, co_number, description, bloom_level
       FROM course_outcomes
       WHERE course_id = $1
       ORDER BY co_number`,
      [courseId]
    );

    // Get all marksheets for this course
    const marksheetsResult = await pool.query(
      `SELECT id, assessment_name, table_name
       FROM marksheets
       WHERE course_id = $1 AND processing_status = 'completed'
       ORDER BY created_at`,
      [courseId]
    );

    if (marksheetsResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          combined: courseOutcomesResult.rows.map(co => ({
            co_number: co.co_number,
            description: co.description,
            bloom_level: co.bloom_level,
            total_max_marks: 0,
            attainment_percent: 0
          })),
          perAssessment: []
        }
      });
    }

    // Initialize CO attainment tracking
    const coAttainment = {};
    courseOutcomesResult.rows.forEach(co => {
      coAttainment[co.co_number] = {
        co_number: co.co_number,
        description: co.description,
        bloom_level: co.bloom_level,
        total_obtained: 0,
        total_max: 0,
        assessments: []
      };
    });

    console.log(`\n=== CO ATTAINMENT for student ${studentUSN}, course ${courseId} ===`);

    // Process each marksheet
    for (const marksheet of marksheetsResult.rows) {
      console.log(`\nProcessing marksheet: ${marksheet.assessment_name} (${marksheet.table_name})`);

      // Get CO mappings for this marksheet
      const mappingsResult = await pool.query(
        `SELECT question_column, co_number, max_marks
         FROM question_co_mappings
         WHERE marksheet_id = $1`,
        [marksheet.id]
      );

      if (mappingsResult.rows.length === 0) {
        console.log(`  No CO mappings found for ${marksheet.assessment_name}`);
        continue;
      }

      console.log(`  Found ${mappingsResult.rows.length} CO mappings`);

      // Get student's marks from the dynamic table
      const marksQuery = `
        SELECT ${mappingsResult.rows.map(m => `"${m.question_column.toUpperCase()}"`).join(', ')}
        FROM "${marksheet.table_name}"
        WHERE "USN" = $1
      `;

      let studentMarks;
      try {
        studentMarks = await pool.query(marksQuery, [studentUSN]);
      } catch (err) {
        console.error(`Error querying marks from ${marksheet.table_name}:`, err);
        console.error(`Query was: ${marksQuery}`);
        console.error(`USN: ${studentUSN}`);
        continue;
      }

      if (studentMarks.rows.length === 0) {
        console.log(`No marks found for USN ${studentUSN} in ${marksheet.table_name}`);
        continue;
      }

      const marksRow = studentMarks.rows[0];
      const assessmentCO = {};

      // Calculate CO-wise marks for this assessment
      mappingsResult.rows.forEach(mapping => {
        const questionCol = mapping.question_column.toUpperCase();
        // PostgreSQL returns column names in the case they were queried
        // We queried with uppercase, so keys will be uppercase
        const rawMarks = marksRow[questionCol];
        let obtainedMarks = 0;

        // Handle NaN, null, undefined, or invalid values
        if (rawMarks !== null && rawMarks !== undefined && rawMarks !== '' && rawMarks !== 'NaN') {
          const parsed = parseFloat(rawMarks);
          if (!isNaN(parsed) && isFinite(parsed)) {
            obtainedMarks = parsed;
          }
        }

        const maxMarks = parseFloat(mapping.max_marks || 0);
        const coNum = mapping.co_number;

        console.log(`    ${questionCol}: CO${coNum}, marks=${obtainedMarks}/${maxMarks}`);

        if (!assessmentCO[coNum]) {
          assessmentCO[coNum] = { obtained: 0, max: 0 };
        }
        assessmentCO[coNum].obtained += obtainedMarks;
        assessmentCO[coNum].max += maxMarks;

        // Add to combined totals
        if (coAttainment[coNum]) {
          coAttainment[coNum].total_obtained += obtainedMarks;
          coAttainment[coNum].total_max += maxMarks;
        }
      });

      console.log(`  Assessment CO totals:`, Object.entries(assessmentCO).map(([co, data]) =>
        `CO${co}=${data.obtained}/${data.max}`
      ).join(', '));

      // Add assessment-level data
      Object.keys(assessmentCO).forEach(coNum => {
        const coNum_int = parseInt(coNum);
        if (coAttainment[coNum_int]) {
          const percentage = assessmentCO[coNum].max > 0
            ? (assessmentCO[coNum].obtained / assessmentCO[coNum].max) * 100
            : 0;

          coAttainment[coNum_int].assessments.push({
            assessment_name: marksheet.assessment_name,
            obtained: assessmentCO[coNum].obtained,
            max: assessmentCO[coNum].max,
            percentage: percentage
          });
        }
      });
    }

    // Calculate combined attainment percentages
    console.log(`\n=== FINAL CO ATTAINMENT SUMMARY ===`);
    const combined = Object.values(coAttainment).map(co => {
      const percentage = co.total_max > 0 ? (co.total_obtained / co.total_max) * 100 : 0;
      console.log(`CO${co.co_number}: ${co.total_obtained.toFixed(2)}/${co.total_max.toFixed(2)} = ${percentage.toFixed(2)}%`);
      return {
        co_number: co.co_number,
        description: co.description,
        bloom_level: co.bloom_level,
        total_max_marks: co.total_max,
        attainment_percent: percentage
      };
    });

    // Flatten per-assessment data
    const perAssessment = [];
    Object.values(coAttainment).forEach(co => {
      co.assessments.forEach(assessment => {
        perAssessment.push({
          co_number: co.co_number,
          assessment_name: assessment.assessment_name,
          co_max_marks: assessment.max,
          co_attainment_percent: assessment.percentage
        });
      });
    });

    res.json({
      success: true,
      data: {
        combined,
        perAssessment
      }
    });
  } catch (error) {
    console.error('Get student CO attainment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CO attainment',
      error: error.message
    });
  }
};

/**
 * Get recommendations from recommendation system
 */
export const getRecommendations = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;
    const {
      internal_no = 1,
      threshold_questions = 5,
      use_collaborative_filtering = true,
      cf_weight = 0.7,
      top_k_per_co = 7
    } = req.query;

    // Get student USN
    const studentResult = await query('SELECT usn FROM users WHERE id = $1', [studentId]);
    let studentUSN = studentResult.rows[0]?.usn;

    if (!studentUSN) {
      try {
        const { getDB } = await import('../config/mongodb.js');
        const db = getDB();
        const studentDoc = await db.collection('students').findOne({ postgres_user_id: studentId });
        if (studentDoc?.usn) {
          studentUSN = studentDoc.usn;
        }
      } catch (err) {
        console.warn('Could not fetch USN from MongoDB:', err);
      }
    }

    if (!studentUSN) {
      return res.status(400).json({
        success: false,
        message: 'Student USN not found'
      });
    }

    const REC_SYS_URL = process.env.REC_SYS_URL || 'http://rec-sys:8000';

    try {
      const recResponse = await axios.post(
        `${REC_SYS_URL}/api/recommend`,
        {
          student_id: studentUSN,
          course_id: courseId,
          internal_no: parseInt(internal_no),
          threshold_questions: parseInt(threshold_questions),
          use_collaborative_filtering:
            use_collaborative_filtering === 'true' || use_collaborative_filtering === true,
          cf_weight: parseFloat(cf_weight),
          top_k_per_co: parseInt(top_k_per_co)
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      res.json({
        success: true,
        data: recResponse.data
      });
    } catch (recError) {
      console.error('Recommendation system error:', recError.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get recommendations',
        error: recError.response?.data?.detail || recError.message
      });
    }
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
};

/**
 * Submit feedback / actions to recommendation system
 */
export const submitRecommendationFeedback = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { resource_id, rating, comment, vote, action } = req.body;

    const studentResult = await query('SELECT usn FROM users WHERE id = $1', [studentId]);
    let studentUSN = studentResult.rows[0]?.usn;

    if (!studentUSN) {
      try {
        const { getDB } = await import('../config/mongodb.js');
        const db = getDB();
        const studentDoc = await db.collection('students').findOne({ postgres_user_id: studentId });
        if (studentDoc?.usn) {
          studentUSN = studentDoc.usn;
        }
      } catch (err) {
        console.warn('Could not fetch USN from MongoDB:', err);
      }
    }

    if (!studentUSN) {
      return res.status(400).json({
        success: false,
        message: 'Student USN not found'
      });
    }

    const REC_SYS_URL = process.env.REC_SYS_URL || 'http://rec-sys:8000';

    try {
      let endpoint = '';
      const payload = { student_id: studentUSN, resource_id };

      if (action === 'vote' && typeof vote !== 'undefined') {
        endpoint = '/api/vote';
        payload.vote = vote;
      } else if (action === 'feedback' && typeof rating !== 'undefined') {
        endpoint = '/api/feedback';
        payload.rating = rating;
        if (comment) payload.comment = comment;
      } else if (action === 'complete') {
        endpoint = '/api/complete';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid action or missing required fields'
        });
      }

      const recResponse = await axios.post(`${REC_SYS_URL}${endpoint}`, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      res.json({
        success: true,
        data: recResponse.data
      });
    } catch (recError) {
      console.error('Recommendation system error:', recError.message);
      res.status(500).json({
        success: false,
        message: 'Failed to submit feedback',
        error: recError.response?.data?.detail || recError.message
      });
    }
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
};

/**
 * Student self-enrollment in a course
 * Accepts human-readable course_code and teacher_name instead of UUIDs
 * Automatically creates course if it doesn't exist
 */
export const enrollInCourse = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { course_code, course_name, teacher_name, semester, branch } = req.body;

    // Validate required fields
    if (!course_code || !teacher_name || !semester || !branch) {
      return res.status(400).json({
        success: false,
        message: 'Course code, teacher name, semester, and branch are required'
      });
    }

    // Look up teacher by name in MongoDB to get postgres_user_id
    const { getDB } = await import('../config/mongodb.js');
    const db = getDB();

    const teacherDoc = await db.collection('teachers').findOne({
      name: { $regex: new RegExp(`^${teacher_name}$`, 'i') }
    });

    if (!teacherDoc || !teacherDoc.postgres_user_id) {
      return res.status(404).json({
        success: false,
        message: `Teacher "${teacher_name}" not found. Please verify the teacher's name.`
      });
    }

    const teacherId = teacherDoc.postgres_user_id;

    // Look up or create course by course_code
    let courseResult = await query(
      'SELECT id, name, code, teacher_id FROM courses WHERE code = $1',
      [course_code]
    );

    let course;
    let courseId;

    if (courseResult.rows.length === 0) {
      // Course doesn't exist - create it automatically
      const createCourseResult = await query(
        `INSERT INTO courses (code, name, teacher_id, semester, year, department, credits)
         VALUES ($1, $2, $3, $4, EXTRACT(YEAR FROM CURRENT_DATE), $5, 3)
         RETURNING id, name, code, teacher_id`,
        [course_code, course_name || course_code, teacherId, parseInt(semester), branch]
      );
      course = createCourseResult.rows[0];
      courseId = course.id;

      console.log(`✅ Auto-created course: ${course_code} - ${course.name}`);
    } else {
      course = courseResult.rows[0];
      courseId = course.id;
    }

    // Check if already enrolled
    const enrollmentCheck = await query(
      'SELECT id FROM students_courses WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (enrollmentCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

    // Get student details for response
    const studentResult = await query(
      'SELECT name FROM users WHERE id = $1',
      [studentId]
    );
    const studentName = studentResult.rows[0]?.name || 'Student';

    // Enroll student
    await query(
      `INSERT INTO students_courses (student_id, course_id, enrollment_date, status)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 'active')`,
      [studentId, courseId]
    );

    // Log activity in MongoDB
    await db.collection('teacher_activity_log').insertOne({
      action: 'student_enroll',
      entity_type: 'course',
      entity_id: courseId,
      course_code: course_code,
      course_name: course.name,
      student_id: studentId,
      student_name: studentName,
      teacher_id: teacherId,
      teacher_name: teacher_name,
      semester: parseInt(semester),
      branch: branch,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully.',
      data: {
        student_name: studentName,
        course_name: course.name,
        teacher_name: teacher_name,
        semester: parseInt(semester),
        branch: branch
      }
    });
  } catch (error) {
    console.error('Student enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in course',
      error: error.message
    });
  }
};
