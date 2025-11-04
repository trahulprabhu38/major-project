import { query, getClient } from '../config/db.js';
import {
  parseAssessmentFile,
  validateAssessmentData,
  cleanupFile,
  generateSampleTemplate
} from '../utils/fileParser.js';
import { calculateCOAttainment } from '../utils/attainmentCalculator.js';
import { getDB } from '../config/mongodb.js';
import { validateFile, getFileExtension } from '../utils/fileValidator.js';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/assessments');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Upload and process assessment marks file
 * Supports .xlsx, .csv, and .pdf files
 * assessmentId is now optional - will auto-create if missing
 */
export const uploadAssessmentFile = async (req, res) => {
  let client;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file type and size
    const validation = validateFile(req.file, 'assessment');
    if (!validation.valid) {
      cleanupFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    let { assessmentId, courseId, assessmentName, assessmentType } = req.body;
    const teacherId = req.user?.id;
    const fileExtension = getFileExtension(req.file.originalname);

    // Handle PDF uploads - store file and return
    if (fileExtension === '.pdf') {
      // If no assessmentId, create a new assessment
      if (!assessmentId) {
        if (!courseId) {
          cleanupFile(req.file.path);
          return res.status(400).json({
            success: false,
            message: 'Course ID is required for PDF uploads without assessment ID'
          });
        }

        // Create new assessment
        const assessmentResult = await query(
          `INSERT INTO assessments (course_id, name, type, assessment_date, max_marks)
           VALUES ($1, $2, $3, CURRENT_DATE, 100)
           RETURNING id`,
          [
            courseId,
            assessmentName || req.file.originalname,
            assessmentType || 'Other'
          ]
        );
        assessmentId = assessmentResult.rows[0].id;
      }

      // Store PDF file
      const pdfFileName = `${assessmentId}_${Date.now()}_${req.file.originalname}`;
      const pdfPath = path.join(uploadsDir, pdfFileName);
      fs.renameSync(req.file.path, pdfPath);

      // Log activity in MongoDB
      const db = getDB();
      await db.collection('teacher_activity_log').insertOne({
        teacher_id: teacherId,
        action: 'upload_pdf',
        entity_type: 'assessment',
        entity_id: assessmentId,
        filename: pdfFileName,
        timestamp: new Date(),
      });

      return res.json({
        success: true,
        message: 'PDF uploaded successfully',
        data: {
          assessment_id: assessmentId,
          filename: pdfFileName,
          path: `/uploads/assessments/${pdfFileName}`,
          created_at: new Date().toISOString()
        }
      });
    }

    // For Excel/CSV files, proceed with marks processing

    // If no assessmentId provided, auto-create one
    if (!assessmentId) {
      if (!courseId) {
        cleanupFile(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Course ID is required when assessment ID is not provided'
        });
      }

      // Verify course exists and belongs to teacher
      const courseCheck = await query(
        'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
        [courseId, teacherId]
      );

      if (courseCheck.rows.length === 0) {
        cleanupFile(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'Course not found or access denied'
        });
      }

      // Create new assessment
      const assessmentResult = await query(
        `INSERT INTO assessments (course_id, name, type, assessment_date, max_marks)
         VALUES ($1, $2, $3, CURRENT_DATE, 100)
         RETURNING id`,
        [
          courseId,
          assessmentName || `Assessment - ${req.file.originalname}`,
          assessmentType || 'IA'
        ]
      );

      assessmentId = assessmentResult.rows[0].id;
    } else {
      // Verify assessment exists
      const assessmentCheck = await query(
        'SELECT id, course_id FROM assessments WHERE id = $1',
        [assessmentId]
      );

      if (assessmentCheck.rows.length === 0) {
        cleanupFile(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'Assessment not found'
        });
      }

      courseId = assessmentCheck.rows[0].course_id;
    }

    // Parse and validate the uploaded file
    const parseResult = await parseAssessmentFile(req.file.path);
    const dataValidation = validateAssessmentData(parseResult.data);

    if (!dataValidation.valid) {
      cleanupFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'File validation failed',
        data: {
          summary: dataValidation.summary,
          errors: dataValidation.invalidRows
        }
      });
    }

    // Begin PostgreSQL transaction
    client = await getClient();
    await client.query('BEGIN');

    let processedCount = 0;
    const errors = [];

    for (const row of dataValidation.validRows) {
      try {
        // Find student by USN
        const studentResult = await client.query(
          'SELECT id FROM users WHERE usn = $1 AND role = $2',
          [row.usn, 'student']
        );

        if (studentResult.rows.length === 0) {
          errors.push({ row, error: `Student with USN ${row.usn} not found` });
          continue;
        }

        const studentId = studentResult.rows[0].id;

        // Find question by question number
        const questionResult = await client.query(
          'SELECT id FROM questions WHERE assessment_id = $1 AND question_number = $2',
          [assessmentId, parseInt(row.questionId.replace(/\D/g, '')) || row.questionId]
        );

        if (questionResult.rows.length === 0) {
          errors.push({ row, error: `Question ${row.questionId} not found` });
          continue;
        }

        const questionId = questionResult.rows[0].id;

        // Upsert marks
        await client.query(
          `INSERT INTO student_scores (student_id, question_id, marks_obtained)
           VALUES ($1, $2, $3)
           ON CONFLICT (student_id, question_id)
           DO UPDATE SET marks_obtained = $3, updated_at = CURRENT_TIMESTAMP`,
          [studentId, questionId, row.marks]
        );

        processedCount++;
      } catch (error) {
        errors.push({ row, error: error.message });
      }
    }

    await client.query('COMMIT');
    cleanupFile(req.file.path);

    // Recalculate attainment for this course
    const attainmentResult = await calculateCOAttainment(courseId, assessmentId);

    // Log activity in MongoDB
    const db = getDB();
    await db.collection('teacher_activity_log').insertOne({
      teacher_id: teacherId,
      action: 'upload_assessment',
      entity_type: 'assessment',
      entity_id: assessmentId,
      course_id: courseId,
      processed: processedCount,
      errors: errors.length,
      timestamp: new Date(),
    });

    return res.json({
      success: true,
      message: `Processed ${processedCount} records successfully.`,
      data: {
        assessment_id: assessmentId,
        processed: processedCount,
        errors: errors.length,
        errorDetails: errors.slice(0, 10),
        summary: dataValidation.summary,
        attainment: attainmentResult,
      },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    if (req.file) cleanupFile(req.file.path);
    console.error('Upload assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process file',
      error: error.message,
    });
  } finally {
    if (client) client.release();
  }
};

/**
 * Download Excel template
 */
export const downloadTemplate = async (req, res) => {
  try {
    const workbook = generateSampleTemplate();
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=assessment_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message,
    });
  }
};

/**
 * Bulk enroll students (optional helper)
 */
export const bulkEnrollStudents = async (req, res) => {
  let client;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { courseId } = req.body;
    if (!courseId) {
      cleanupFile(req.file.path);
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    const parseResult = await parseAssessmentFile(req.file.path);
    client = await getClient();
    await client.query('BEGIN');

    let enrolledCount = 0;
    const errors = [];

    for (const row of parseResult.data) {
      try {
        const studentResult = await client.query(
          'SELECT id FROM users WHERE usn = $1 AND role = $2',
          [row.usn, 'student']
        );
        if (studentResult.rows.length === 0) {
          errors.push({ usn: row.usn, error: 'Student not found' });
          continue;
        }

        await client.query(
          'INSERT INTO students_courses (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [studentResult.rows[0].id, courseId]
        );

        enrolledCount++;
      } catch (error) {
        errors.push({ usn: row.usn, error: error.message });
      }
    }

    await client.query('COMMIT');
    cleanupFile(req.file.path);

    res.json({
      success: true,
      message: `Enrolled ${enrolledCount} students`,
      data: { enrolled: enrolledCount, errors: errors.length, errorDetails: errors },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    if (req.file) cleanupFile(req.file.path);
    console.error('Bulk enroll error:', error);
    res.status(500).json({ success: false, message: 'Failed to enroll students', error: error.message });
  } finally {
    if (client) client.release();
  }
};
