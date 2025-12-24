import { query, getClient } from '../config/db.js';
import csvProcessor from '../services/csvProcessor.js';
import attainmentCalculator from '../services/attainmentCalculator.js';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../../uploads/assessments');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Enhanced CSV Upload with CO Mapping and Attainment Calculation
 * Implements full pipeline: validation → normalization → aggregation → calculation
 */
export const uploadAssessmentFileEnhanced = async (req, res) => {
  let client;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { courseId, assessmentName, assessmentType, isCIE, isSEE, weight } = req.body;
    const teacherId = req.user?.id;

    if (!courseId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    // Get database client for transaction
    client = await getClient();
    await client.query('BEGIN');

    // Verify course access
    const courseCheck = await client.query(
      'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
      [courseId, teacherId]
    );

    if (courseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Course not found or access denied' });
    }

    // Phase 0: Calculate file hash for idempotency
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = csvProcessor.calculateFileHash(fileBuffer);

    // Check if file already processed
    const existingFile = await client.query(
      'SELECT id, processing_status FROM marksheets WHERE file_hash = $1',
      [fileHash]
    );

    if (existingFile.rows.length > 0 && existingFile.rows[0].processing_status === 'completed') {
      await client.query('ROLLBACK');
      client.release();
      fs.unlinkSync(req.file.path);
      return res.status(409).json({
        success: false,
        message: 'This file has already been processed',
        existingMarksheet: existingFile.rows[0]
      });
    }

    // Read CSV/Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    // Phase 1: Validate CSV
    let validation;
    try {
      validation = await csvProcessor.validateCSV(rows, courseId);
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'CSV validation failed',
        error: error.message
      });
    }

    const { columns } = validation;

    // Create or get assessment
    const assessmentResult = await client.query(
      `INSERT INTO assessments
       (course_id, name, type, assessment_date, max_marks, weightage, is_cie_component, is_see_component)
       VALUES ($1, $2, $3, CURRENT_DATE, 100, $4, $5, $6)
       RETURNING id`,
      [
        courseId,
        assessmentName || `Assessment - ${req.file.originalname}`,
        assessmentType || 'IA',
        weight || 1.0,
        isCIE !== 'false',
        isSEE === 'true'
      ]
    );

    const assessmentId = assessmentResult.rows[0].id;

    // Create marksheet record
    const marksheetResult = await client.query(
      `INSERT INTO marksheets
       (course_id, assessment_name, file_name, table_name, columns, row_count,
        uploaded_by, file_hash, processing_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processing')
       RETURNING id`,
      [
        courseId,
        assessmentName || req.file.originalname,
        req.file.originalname,
        `marks_${assessmentId}`,
        JSON.stringify(columns.map(c => c.columnName)),
        rows.length - 1,
        teacherId,
        fileHash
      ]
    );

    const marksheetId = marksheetResult.rows[0].id;

    // Phase 2: Save column metadata
    await csvProcessor.saveColumnMetadata(client, assessmentId, columns);

    // Phase 3-4: Process and normalize CSV
    const { processedCount, errors, warnings } = await csvProcessor.processCSV(
      client,
      rows,
      courseId,
      assessmentId,
      columns,
      fileHash
    );

    // Phase 5: Calculate student CO scores
    await attainmentCalculator.calculateStudentCOScores(client, courseId, assessmentId);

    // Phase 6: Calculate CO attainment for this assessment
    await attainmentCalculator.calculateCOAttainment(client, courseId, assessmentId);

    // Phase 7-9: Calculate final CO, PO, and student scores
    await attainmentCalculator.calculateFinalCOAttainment(client, courseId);
    await attainmentCalculator.calculatePOAttainment(client, courseId);
    await attainmentCalculator.calculateStudentOverallScores(client, courseId);

    // Update marksheet status
    await client.query(
      `UPDATE marksheets
       SET processing_status = 'completed',
           processed_at = CURRENT_TIMESTAMP,
           warnings = $1,
           error_details = $2
       WHERE id = $3`,
      [JSON.stringify(warnings), errors.length > 0 ? JSON.stringify(errors) : null, marksheetId]
    );

    await client.query('COMMIT');
    client.release();

    // Cleanup file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Assessment file uploaded and processed successfully',
      data: {
        marksheetId,
        assessmentId,
        processedCount,
        totalRows: rows.length - 1,
        errors: errors.length,
        warnings: warnings.length,
        columnsProcessed: columns.length
      },
      warnings: warnings.length > 0 ? warnings.slice(0, 10) : [],
      errors: errors.length > 0 ? errors.slice(0, 10) : []
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Error uploading assessment file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload and process assessment file',
      error: error.message
    });
  }
};

/**
 * Download CSV template with CO mapping format
 */
export const downloadTemplateEnhanced = async (req, res) => {
  try {
    const { courseId } = req.query;

    let cos = [];
    if (courseId) {
      const result = await query(
        'SELECT co_number, description FROM course_outcomes WHERE course_id = $1 ORDER BY co_number',
        [courseId]
      );
      cos = result.rows;
    }

    // Create template with CO mapping
    const headers = [
      'USN',
      'Student Name',
      ...cos.flatMap(co => [`Q${co.co_number}A_CO${co.co_number}`, `Q${co.co_number}B_CO${co.co_number}`])
    ];

    const sampleRow = [
      '1XX21CS001',
      'Sample Student',
      ...Array(cos.length * 2).fill(8)
    ];

    const worksheet = xlsx.utils.aoa_to_sheet([headers, sampleRow]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Marks');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=marks_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ success: false, message: 'Failed to generate template', error: error.message });
  }
};
