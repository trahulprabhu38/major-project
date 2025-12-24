import crypto from 'crypto';
import pool from '../config/db.js';

/**
 * CSV Processing Service for Attainment Calculation
 * Handles Phase 1-5: Intake, validation, normalization, and aggregation
 */

class CSVProcessorService {
  /**
   * Parse CSV header to extract CO mappings
   * Supports formats: Q1A (CO1), Q1A_CO1, or separate CO mapping row
   */
  parseHeader(headerRow, coMappingRow = null) {
    const columns = [];

    for (let i = 0; i < headerRow.length; i++) {
      const colName = headerRow[i];

      // Skip USN and Name columns
      if (colName.toLowerCase().includes('usn') ||
          colName.toLowerCase().includes('name') ||
          colName.toLowerCase().includes('total') ||
          colName.toLowerCase().includes('grade')) {
        continue;
      }

      let coNumber = null;
      let maxMarks = null;

      // Try to extract CO from column name
      // Format 1: Q1A (CO1) or Q1A_CO1
      const coMatch = colName.match(/CO[:\s]*(\d+)/i) ||
                     colName.match(/_CO(\d+)/i) ||
                     colName.match(/\(CO(\d+)\)/i);

      if (coMatch) {
        coNumber = parseInt(coMatch[1]);
      }

      // If we have a CO mapping row, use it
      if (coMappingRow && coMappingRow[i]) {
        const mappingMatch = coMappingRow[i].toString().match(/(\d+)/);
        if (mappingMatch) {
          coNumber = parseInt(mappingMatch[0]);
        }
      }

      // Extract max marks from header if present
      const marksMatch = colName.match(/\((\d+)\s*marks?\)/i) ||
                        colName.match(/\[(\d+)\]/);
      if (marksMatch) {
        maxMarks = parseFloat(marksMatch[1]);
      }

      if (coNumber) {
        columns.push({
          originalName: colName,
          columnName: this.sanitizeColumnName(colName),
          coNumber,
          maxMarks,
          columnOrder: i
        });
      }
    }

    return columns;
  }

  /**
   * Sanitize column name for database storage
   */
  sanitizeColumnName(name) {
    return name
      .replace(/\s+/g, '_')
      .replace(/[()]/g, '')
      .substring(0, 100);
  }

  /**
   * Calculate file hash for idempotency
   */
  calculateFileHash(fileBuffer) {
    return crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');
  }

  /**
   * Phase 1: Validate CSV structure
   */
  async validateCSV(rows, courseId) {
    if (!rows || rows.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headerRow = rows[0];

    // Check for USN column
    const hasUSN = headerRow.some(col =>
      col.toLowerCase().includes('usn') || col.toLowerCase().includes('student')
    );

    if (!hasUSN) {
      throw new Error('CSV must have a USN or Student ID column');
    }

    // Try to parse CO mappings
    let columns = this.parseHeader(headerRow);

    // If no COs found in header, check if second row is CO mapping
    if (columns.length === 0 && rows.length > 2) {
      const possibleCoRow = rows[1];
      const hasCOPattern = possibleCoRow.some(cell =>
        cell && cell.toString().match(/CO\s*\d+/i)
      );

      if (hasCOPattern) {
        columns = this.parseHeader(headerRow, possibleCoRow);
      }
    }

    if (columns.length === 0) {
      throw new Error(
        'No CO mappings found in CSV. ' +
        'Headers should include CO numbers like: Q1A (CO1) or Q1A_CO1'
      );
    }

    // Validate CO numbers exist in database
    const coNumbers = [...new Set(columns.map(c => c.coNumber))];
    const result = await pool.query(
      `SELECT co_number FROM course_outcomes
       WHERE course_id = $1 AND co_number = ANY($2)`,
      [courseId, coNumbers]
    );

    const existingCOs = result.rows.map(r => r.co_number);
    const missingCOs = coNumbers.filter(co => !existingCOs.includes(co));

    if (missingCOs.length > 0) {
      throw new Error(
        `Missing Course Outcomes in database: CO${missingCOs.join(', CO')}. ` +
        `Please create these COs before uploading marks.`
      );
    }

    return { columns, hasCoMappingRow: columns.length > 0 };
  }

  /**
   * Phase 2-3: Process CSV and normalize into long format
   */
  async processCSV(client, rows, courseId, assessmentId, columns, fileHash) {
    const dataStartRow = columns.hasCoMappingRow ? 2 : 1;
    const errors = [];
    const warnings = [];
    let processedCount = 0;

    // Get course config
    const configRes = await client.query(
      'SELECT * FROM course_config WHERE course_id = $1',
      [courseId]
    );
    const config = configRes.rows[0];

    for (let rowIdx = dataStartRow; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];

      try {
        // Extract USN
        const usnCol = row.findIndex((_, i) =>
          rows[0][i].toLowerCase().includes('usn')
        );

        if (usnCol === -1) {
          errors.push({ row: rowIdx + 1, error: 'USN column not found' });
          continue;
        }

        const usn = row[usnCol]?.toString().trim();
        if (!usn) {
          warnings.push({ row: rowIdx + 1, warning: 'Empty USN, skipping row' });
          continue;
        }

        // Get or create student
        let studentId = await this.getOrCreateStudent(client, usn, row, rows[0]);

        // Process each question column
        for (const col of columns) {
          const cellValue = row[col.columnOrder];
          let marksObtained = 0;

          if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
            marksObtained = parseFloat(cellValue);

            if (isNaN(marksObtained) || marksObtained < 0) {
              warnings.push({
                row: rowIdx + 1,
                column: col.columnName,
                warning: `Invalid marks value: ${cellValue}, using 0`
              });
              marksObtained = 0;
            }
          }

          // Determine max marks for this column
          let maxMarks = col.maxMarks;
          if (!maxMarks) {
            // Try to infer from assessment or use default
            maxMarks = await this.inferMaxMarks(client, assessmentId, col.columnName);
          }

          // Insert normalized row into student_scores
          await client.query(
            `INSERT INTO student_scores
             (student_id, assessment_id, column_name, co_number, marks_obtained, max_marks)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (student_id, assessment_id, column_name)
             DO UPDATE SET
               marks_obtained = EXCLUDED.marks_obtained,
               max_marks = EXCLUDED.max_marks,
               updated_at = CURRENT_TIMESTAMP`,
            [studentId, assessmentId, col.columnName, col.coNumber, marksObtained, maxMarks]
          );
        }

        processedCount++;
      } catch (error) {
        errors.push({ row: rowIdx + 1, error: error.message });
      }
    }

    return { processedCount, errors, warnings };
  }

  /**
   * Get or create student user
   */
  async getOrCreateStudent(client, usn, row, headerRow) {
    // Check if student exists
    let result = await client.query(
      'SELECT id FROM users WHERE usn = $1',
      [usn]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Extract name from row
    const nameCol = headerRow.findIndex(h =>
      h.toLowerCase().includes('name') && !h.toLowerCase().includes('usn')
    );
    const name = nameCol !== -1 ? row[nameCol] : `Student ${usn}`;

    // Create new student
    result = await client.query(
      `INSERT INTO users (usn, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'student')
       RETURNING id`,
      [usn, name, `${usn}@temp.edu`, 'placeholder_hash']
    );

    return result.rows[0].id;
  }

  /**
   * Infer max marks for a column
   */
  async inferMaxMarks(client, assessmentId, columnName) {
    // Check if we have it stored
    const result = await client.query(
      'SELECT max_marks FROM raw_marks_columns WHERE assessment_id = $1 AND column_name = $2',
      [assessmentId, columnName]
    );

    if (result.rows.length > 0 && result.rows[0].max_marks) {
      return result.rows[0].max_marks;
    }

    // Default to 10 marks per question
    return 10.0;
  }

  /**
   * Save column metadata
   */
  async saveColumnMetadata(client, assessmentId, columns) {
    for (const col of columns) {
      await client.query(
        `INSERT INTO raw_marks_columns
         (assessment_id, column_name, co_number, max_marks, column_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (assessment_id, column_name)
         DO UPDATE SET
           co_number = EXCLUDED.co_number,
           max_marks = EXCLUDED.max_marks,
           column_order = EXCLUDED.column_order`,
        [assessmentId, col.columnName, col.coNumber, col.maxMarks || 10, col.columnOrder]
      );
    }
  }
}

export default new CSVProcessorService();
