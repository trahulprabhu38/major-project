import { query } from '../config/db.js';
import { calculateStudentAttainment } from '../utils/attainmentCalculator.js';

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

    // Get class average
    const classAvgResult = await query(
      `SELECT AVG(
         CASE
           WHEN q.max_marks > 0
           THEN (ss.marks_obtained / q.max_marks) * 100
           ELSE 0
         END
       ) as class_average
       FROM questions q
       JOIN assessments a ON q.assessment_id = a.id
       LEFT JOIN student_scores ss ON q.id = ss.question_id
       WHERE a.course_id = $1`,
      [courseId]
    );

    // Get student average
    const studentAvgResult = await query(
      `SELECT AVG(
         CASE
           WHEN q.max_marks > 0
           THEN (ss.marks_obtained / q.max_marks) * 100
           ELSE 0
         END
       ) as student_average
       FROM questions q
       JOIN assessments a ON q.assessment_id = a.id
       LEFT JOIN student_scores ss ON q.id = ss.question_id AND ss.student_id = $1
       WHERE a.course_id = $2`,
      [studentId, courseId]
    );

    // Get student rank
    const rankResult = await query(
      `WITH student_averages AS (
         SELECT
           ss.student_id,
           AVG(
             CASE
               WHEN q.max_marks > 0
               THEN (ss.marks_obtained / q.max_marks) * 100
               ELSE 0
             END
           ) as avg_percentage
         FROM student_scores ss
         JOIN questions q ON ss.question_id = q.id
         JOIN assessments a ON q.assessment_id = a.id
         WHERE a.course_id = $2
         GROUP BY ss.student_id
       )
       SELECT
         COUNT(*) + 1 as rank
       FROM student_averages
       WHERE avg_percentage > (
         SELECT avg_percentage
         FROM student_averages
         WHERE student_id = $1
       )`,
      [studentId, courseId]
    );

    // Get total students
    const totalStudentsResult = await query(
      'SELECT COUNT(*) as total FROM students_courses WHERE course_id = $1',
      [courseId]
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
