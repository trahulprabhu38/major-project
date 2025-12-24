import pool from '../config/db.js';

/**
 * Semester Progression Service
 * Aggregates and formats semester progression data for visualization
 * Provides comprehensive view of student's academic journey across all 8 semesters
 */
class SemesterProgressionService {
  /**
   * Get complete semester progression for a student
   * Returns comprehensive data structure for visualization
   * @param {UUID} studentId - Student ID
   * @returns {Object} Complete progression data
   */
  async getStudentProgression(studentId) {
    try {
      console.log(`\n=== FETCHING STUDENT PROGRESSION ===`);
      console.log(`Student ID: ${studentId}`);

      // Get student details
      const studentQuery = await pool.query(
        'SELECT id, usn, name, email, department, role FROM users WHERE id = $1',
        [studentId]
      );

      if (studentQuery.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentQuery.rows[0];
      console.log(`Student: ${student.usn} - ${student.name}`);

      // Get CGPA data
      const cgpaQuery = await pool.query(
        'SELECT * FROM student_cgpa WHERE student_id = $1',
        [studentId]
      );

      const cgpaData = cgpaQuery.rows[0] || {
        cgpa: 0,
        total_credits_completed: 0,
        current_semester: 1,
        cgpa_history: []
      };

      // Get semester results (all semesters 1-8)
      const semesterQuery = await pool.query(`
        SELECT
          semester,
          academic_year,
          sgpa,
          total_credits_registered,
          total_credits_earned,
          courses_registered,
          courses_passed,
          courses_failed,
          semester_status,
          result_date
        FROM semester_results
        WHERE student_id = $1
        ORDER BY semester ASC
      `, [studentId]);

      const semesterResults = semesterQuery.rows;
      console.log(`Found results for ${semesterResults.length} semester(s)`);

      // Build semesters array (1-8)
      const semesters = [];

      for (let semNum = 1; semNum <= 8; semNum++) {
        const semesterResult = semesterResults.find(s => parseInt(s.semester) === semNum);

        if (semesterResult) {
          // Get courses for this semester
          const courses = await this.getSemesterCourses(studentId, semNum, semesterResult.academic_year);

          semesters.push({
            semester: semNum,
            year: semesterResult.academic_year,
            sgpa: parseFloat(semesterResult.sgpa) || 0,
            credits: parseInt(semesterResult.total_credits_registered) || 0,
            creditsEarned: parseInt(semesterResult.total_credits_earned) || 0,
            status: semesterResult.semester_status || 'not_started',
            coursesRegistered: parseInt(semesterResult.courses_registered) || 0,
            coursesPassed: parseInt(semesterResult.courses_passed) || 0,
            coursesFailed: parseInt(semesterResult.courses_failed) || 0,
            resultDate: semesterResult.result_date,
            courses
          });
        } else {
          // Semester not started or no data
          semesters.push({
            semester: semNum,
            year: null,
            sgpa: null,
            credits: 0,
            creditsEarned: 0,
            status: 'not_started',
            coursesRegistered: 0,
            coursesPassed: 0,
            coursesFailed: 0,
            resultDate: null,
            courses: []
          });
        }
      }

      // Parse CGPA history from JSONB
      let cgpaHistory = [];
      try {
        if (cgpaData.cgpa_history) {
          cgpaHistory = typeof cgpaData.cgpa_history === 'string'
            ? JSON.parse(cgpaData.cgpa_history)
            : cgpaData.cgpa_history;
        }
      } catch (err) {
        console.error('Error parsing CGPA history:', err);
        cgpaHistory = [];
      }

      const progressionData = {
        student: {
          id: student.id,
          usn: student.usn,
          name: student.name,
          email: student.email,
          department: student.department
        },
        currentSemester: parseInt(cgpaData.current_semester) || 1,
        cgpa: parseFloat(cgpaData.cgpa) || 0,
        totalCredits: parseInt(cgpaData.total_credits_completed) || 0,
        semestersCompleted: parseInt(cgpaData.semesters_completed) || 0,
        totalCoursesCompleted: parseInt(cgpaData.total_courses_completed) || 0,
        totalCoursesFailed: parseInt(cgpaData.total_courses_failed) || 0,
        semesters,
        cgpaHistory
      };

      console.log(`✅ Progression data fetched successfully`);
      console.log(`   Current Semester: ${progressionData.currentSemester}, CGPA: ${progressionData.cgpa.toFixed(2)}`);

      return progressionData;

    } catch (error) {
      console.error('Error in getStudentProgression:', error);
      throw error;
    }
  }

  /**
   * Get courses for a specific semester
   * @param {UUID} studentId - Student ID
   * @param {Number} semester - Semester number
   * @param {Number} academicYear - Academic year
   * @returns {Array} Array of course data
   */
  async getSemesterCourses(studentId, semester, academicYear) {
    try {
      const query = `
        SELECT
          c.id AS course_id,
          c.code,
          c.name,
          c.credits,
          sfg.cie_total,
          sfg.see_total,
          sfg.final_total,
          sfg.final_percentage,
          sfg.letter_grade,
          sfg.grade_points,
          sfg.is_passed
        FROM courses c
        JOIN students_courses sc ON c.id = sc.course_id
        LEFT JOIN student_final_grades sfg ON c.id = sfg.course_id AND sc.student_id = sfg.student_id
        WHERE sc.student_id = $1
          AND c.semester = $2
          AND c.year = $3
        ORDER BY c.code ASC
      `;

      const result = await pool.query(query, [studentId, semester, academicYear]);

      return result.rows.map(row => ({
        courseId: row.course_id,
        code: row.code,
        name: row.name,
        credits: parseInt(row.credits) || 3,
        cieMarks: parseFloat(row.cie_total) || null,
        seeMarks: parseFloat(row.see_total) || null,
        finalMarks: parseFloat(row.final_total) || null,
        percentage: parseFloat(row.final_percentage) || null,
        grade: row.letter_grade || null,
        gradePoints: parseFloat(row.grade_points) || null,
        passed: row.is_passed === true
      }));

    } catch (error) {
      console.error('Error in getSemesterCourses:', error);
      throw error;
    }
  }

  /**
   * Get detailed semester information
   * @param {UUID} studentId - Student ID
   * @param {Number} semester - Semester number
   * @returns {Object} Detailed semester data
   */
  async getSemesterDetails(studentId, semester) {
    try {
      // Get semester result
      const semesterQuery = await pool.query(`
        SELECT *
        FROM semester_results
        WHERE student_id = $1 AND semester = $2
        ORDER BY academic_year DESC
        LIMIT 1
      `, [studentId, semester]);

      if (semesterQuery.rows.length === 0) {
        return null;
      }

      const semesterResult = semesterQuery.rows[0];

      // Get courses for this semester
      const courses = await this.getSemesterCourses(
        studentId,
        semester,
        semesterResult.academic_year
      );

      return {
        semester: parseInt(semesterResult.semester),
        academicYear: semesterResult.academic_year,
        sgpa: parseFloat(semesterResult.sgpa) || 0,
        totalCredits: parseInt(semesterResult.total_credits_registered) || 0,
        creditsEarned: parseInt(semesterResult.total_credits_earned) || 0,
        status: semesterResult.semester_status,
        coursesRegistered: parseInt(semesterResult.courses_registered) || 0,
        coursesPassed: parseInt(semesterResult.courses_passed) || 0,
        coursesFailed: parseInt(semesterResult.courses_failed) || 0,
        resultDate: semesterResult.result_date,
        courses
      };

    } catch (error) {
      console.error('Error in getSemesterDetails:', error);
      throw error;
    }
  }

  /**
   * Get progression summary for all students in a course
   * Used by teachers to see class performance
   * @param {UUID} courseId - Course ID
   * @returns {Array} Array of student progression summaries
   */
  async getCourseStudentsProgression(courseId) {
    try {
      console.log(`\n=== FETCHING COURSE STUDENTS PROGRESSION ===`);
      console.log(`Course ID: ${courseId}`);

      // Get course details
      const courseQuery = await pool.query(
        'SELECT code, name, semester, year FROM courses WHERE id = $1',
        [courseId]
      );

      if (courseQuery.rows.length === 0) {
        throw new Error('Course not found');
      }

      const course = courseQuery.rows[0];

      // Get all students enrolled in this course
      const studentsQuery = `
        SELECT
          u.id,
          u.usn,
          u.name,
          u.department,
          sc.cgpa,
          sc.current_semester,
          sfg.final_percentage,
          sfg.letter_grade,
          sfg.grade_points
        FROM users u
        JOIN students_courses sco ON u.id = sco.student_id
        LEFT JOIN student_cgpa sc ON u.id = sc.student_id
        LEFT JOIN student_final_grades sfg ON u.id = sfg.student_id AND sco.course_id = sfg.course_id
        WHERE sco.course_id = $1 AND u.role = 'student'
        ORDER BY u.usn ASC
      `;

      const studentsResult = await pool.query(studentsQuery, [courseId]);
      const students = studentsResult.rows;

      console.log(`Found ${students.length} students in course ${course.code}`);

      const progressionSummaries = students.map(student => ({
        studentId: student.id,
        usn: student.usn,
        name: student.name,
        department: student.department,
        cgpa: parseFloat(student.cgpa) || 0,
        currentSemester: parseInt(student.current_semester) || 1,
        coursePerformance: {
          percentage: parseFloat(student.final_percentage) || null,
          grade: student.letter_grade || null,
          gradePoints: parseFloat(student.grade_points) || null
        }
      }));

      return {
        course: {
          id: courseId,
          code: course.code,
          name: course.name,
          semester: course.semester,
          year: course.year
        },
        totalStudents: students.length,
        students: progressionSummaries
      };

    } catch (error) {
      console.error('Error in getCourseStudentsProgression:', error);
      throw error;
    }
  }

  /**
   * Get semester-wise statistics for a department
   * @param {Number} semester - Semester number
   * @param {String} department - Department name
   * @returns {Object} Aggregate statistics
   */
  async getSemesterStatistics(semester, department) {
    try {
      const query = `
        SELECT
          COUNT(*) as total_students,
          AVG(sr.sgpa) as avg_sgpa,
          MAX(sr.sgpa) as max_sgpa,
          MIN(sr.sgpa) as min_sgpa,
          SUM(sr.courses_passed) as total_courses_passed,
          SUM(sr.courses_failed) as total_courses_failed,
          AVG(sr.total_credits_earned) as avg_credits_earned
        FROM semester_results sr
        JOIN users u ON sr.student_id = u.id
        WHERE sr.semester = $1
          AND u.department = $2
          AND sr.semester_status = 'completed'
      `;

      const result = await pool.query(query, [semester, department]);
      const stats = result.rows[0];

      // Get grade distribution for this semester
      const gradeDistQuery = `
        SELECT
          sfg.letter_grade,
          COUNT(*) as count
        FROM student_final_grades sfg
        JOIN courses c ON sfg.course_id = c.id
        JOIN users u ON sfg.student_id = u.id
        WHERE c.semester = $1
          AND u.department = $2
        GROUP BY sfg.letter_grade
        ORDER BY
          CASE sfg.letter_grade
            WHEN 'A+' THEN 1 WHEN 'A' THEN 2 WHEN 'B+' THEN 3
            WHEN 'B' THEN 4 WHEN 'C+' THEN 5 WHEN 'C' THEN 6
            WHEN 'D' THEN 7 WHEN 'E' THEN 8 WHEN 'F' THEN 9
          END
      `;

      const gradeDistResult = await pool.query(gradeDistQuery, [semester, department]);

      const totalStudents = parseInt(stats.total_students) || 0;
      const passCount = totalStudents > 0
        ? totalStudents - (parseInt(stats.total_courses_failed) || 0)
        : 0;
      const passPercentage = totalStudents > 0
        ? (passCount / totalStudents) * 100
        : 0;

      return {
        semester,
        department,
        totalStudents,
        avgSGPA: parseFloat(stats.avg_sgpa) || 0,
        maxSGPA: parseFloat(stats.max_sgpa) || 0,
        minSGPA: parseFloat(stats.min_sgpa) || 0,
        totalCoursesPassed: parseInt(stats.total_courses_passed) || 0,
        totalCoursesFailed: parseInt(stats.total_courses_failed) || 0,
        avgCreditsEarned: parseFloat(stats.avg_credits_earned) || 0,
        passPercentage: Math.round(passPercentage * 100) / 100,
        gradeDistribution: gradeDistResult.rows
      };

    } catch (error) {
      console.error('Error in getSemesterStatistics:', error);
      throw error;
    }
  }

  /**
   * Get top performers by CGPA
   * @param {String} department - Department name (optional)
   * @param {Number} limit - Number of top students to return
   * @returns {Array} Top performers
   */
  async getTopPerformers(department = null, limit = 10) {
    try {
      let query = `
        SELECT
          u.id,
          u.usn,
          u.name,
          u.department,
          sc.cgpa,
          sc.current_semester,
          sc.total_credits_completed,
          sc.semesters_completed
        FROM student_cgpa sc
        JOIN users u ON sc.student_id = u.id
        WHERE sc.cgpa > 0
      `;

      const params = [];

      if (department) {
        query += ' AND u.department = $1';
        params.push(department);
      }

      query += ` ORDER BY sc.cgpa DESC, sc.total_credits_completed DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await pool.query(query, params);

      return result.rows.map((row, index) => ({
        rank: index + 1,
        studentId: row.id,
        usn: row.usn,
        name: row.name,
        department: row.department,
        cgpa: parseFloat(row.cgpa),
        currentSemester: parseInt(row.current_semester),
        totalCredits: parseInt(row.total_credits_completed),
        semestersCompleted: parseInt(row.semesters_completed)
      }));

    } catch (error) {
      console.error('Error in getTopPerformers:', error);
      throw error;
    }
  }
}

export default new SemesterProgressionService();
