import pool from '../config/db.js';
import crypto from 'crypto';

/**
 * CO MAPPING SERVICE
 * Handles upload and parsing of CO mapping CSV files
 */

class COMappingService {
  /**
   * Normalize column name to standard format (e.g., Q1A → q1a, Q2B → q2b)
   */
  normalizeColumnName(name) {
    if (!name) return '';
    return name.trim().toLowerCase();
  }

  /**
   * Parse CO mapping CSV content
   * Expected format (NEW):
   *   Column,Max Marks,CO
   *   q1a,10,co1
   *   q1b,0,co1
   *   q2a,10,co3
   *   q2b,0,co3
   *
   * Questions with max_marks = 0 are ignored (treated as non-existent)
   */
  parseCoMappingCSV(csvContent) {
    const lines = csvContent.trim().split('\n');

    if (lines.length < 2) {
      throw new Error('CO mapping CSV must have at least a header row and one data row');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    
    // Find column indices - flexible header matching
    const columnColIndex = header.findIndex(h => 
      h === 'column' || h === 'question' || h === 'question_name' || h === 'q' || h.includes('column')
    );
    const maxMarksColIndex = header.findIndex(h => 
      h === 'max marks' || h === 'max_marks' || h === 'maxmarks' || h === 'max' || h.includes('max')
    );
    const coColIndex = header.findIndex(h => 
      h === 'co' || h === 'cos' || h.includes('co')
    );

    if (columnColIndex === -1) {
      throw new Error('CO mapping CSV must have a "Column" or "Question" column');
    }

    if (coColIndex === -1) {
      throw new Error('CO mapping CSV must have a "CO" column');
    }

    // Max marks is optional for backward compatibility, but recommended
    if (maxMarksColIndex === -1) {
      console.warn('⚠️  Warning: "Max Marks" column not found. Using default value of 10 for all questions.');
    }

    console.log(`📋 Parsing CO mapping CSV: ${lines.length - 1} rows`);
    console.log(`   Format: Column, Max Marks, CO`);

    const mappings = [];
    let skippedCount = 0;

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = this.parseCSVLine(line);
      if (cells.length < 2) continue;

      const questionName = cells[columnColIndex]?.trim();
      const maxMarksStr = maxMarksColIndex !== -1 ? cells[maxMarksColIndex]?.trim() : '10';
      const coValue = cells[coColIndex]?.trim();

      if (!questionName || !coValue) continue;

      // Normalize column name (Q1A → q1a)
      const normalizedColumnName = this.normalizeColumnName(questionName);

      // Parse max marks
      const maxMarks = parseFloat(maxMarksStr) || 0;

      // PHASE 2-3: Filter out questions with max_marks = 0
      if (maxMarks <= 0) {
        skippedCount++;
        console.log(`  ⏭️  Skipping ${questionName} (max_marks = 0, treated as non-existent)`);
        continue;
      }

      // Extract CO numbers from coValue (e.g., "CO1" → 1, "CO1,CO2" → [1, 2])
      const coNumbers = this.extractCONumbers(coValue);

      if (coNumbers.length === 0) {
        console.warn(`  ⚠️  No valid CO number found for ${questionName}, skipping`);
        continue;
      }

      for (const coNumber of coNumbers) {
        mappings.push({
          questionColumn: normalizedColumnName,
          originalColumnName: questionName, // Keep original for reference
          maxMarks,
          coNumber
        });
      }

      console.log(`  ✅ ${normalizedColumnName} (${questionName}) → CO${coNumbers.join(',CO')} (Max: ${maxMarks})`);
    }

    console.log(`\n✅ Parsed ${mappings.length} valid CO mappings`);
    if (skippedCount > 0) {
      console.log(`   ⏭️  Skipped ${skippedCount} questions with max_marks = 0`);
    }
    return mappings;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Extract CO numbers from string (e.g., "CO1" → [1], "CO1,CO2" → [1, 2])
   */
  extractCONumbers(coString) {
    const matches = coString.match(/CO[\s_-]*(\d+)/gi);
    if (!matches) return [];

    return matches.map(match => {
      const num = match.match(/\d+/);
      return num ? parseInt(num[0]) : null;
    }).filter(n => n !== null);
  }

  /**
   * Upload and store CO mappings for a marksheet
   */
  async uploadCOMappings(courseId, marksheetId, fileName, csvContent, uploadedBy) {
    console.log(`\n========================================`);
    console.log(`UPLOADING CO MAPPINGS FOR MARKSHEET: ${marksheetId}`);
    console.log(`========================================\n`);

    // Parse the CSV
    const mappings = this.parseCoMappingCSV(csvContent);

    if (mappings.length === 0) {
      throw new Error('No valid CO mappings found in CSV');
    }

    // Calculate file hash
    const fileHash = crypto.createHash('sha256').update(csvContent).digest('hex');

    // Get course outcomes for this course
    const cosQuery = await pool.query(
      'SELECT id, co_number FROM course_outcomes WHERE course_id = $1',
      [courseId]
    );

    const coMap = {};
    for (const co of cosQuery.rows) {
      coMap[co.co_number] = co.id;
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing mappings for this marksheet
      await client.query('DELETE FROM question_co_mappings WHERE marksheet_id = $1', [marksheetId]);

      // Insert new mappings (only valid ones with max_marks > 0 are in the array)
      for (const mapping of mappings) {
        const coId = coMap[mapping.coNumber];

        if (!coId) {
          console.warn(`⚠️  CO${mapping.coNumber} not found in course, skipping mapping for ${mapping.questionColumn}`);
          continue;
        }

        // Check if max_marks column exists, if not use default value
        try {
          await client.query(`
            INSERT INTO question_co_mappings (
              course_id, marksheet_id, question_column, co_number, co_id, max_marks, uploaded_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (marksheet_id, question_column) DO UPDATE SET
              co_number = EXCLUDED.co_number,
              co_id = EXCLUDED.co_id,
              max_marks = EXCLUDED.max_marks,
              uploaded_by = EXCLUDED.uploaded_by,
              updated_at = CURRENT_TIMESTAMP
          `, [courseId, marksheetId, mapping.questionColumn, mapping.coNumber, coId, mapping.maxMarks, uploadedBy]);
        } catch (insertError) {
          // If max_marks column doesn't exist, try without it (backward compatibility)
          if (insertError.message && insertError.message.includes('max_marks')) {
            console.warn(`⚠️  max_marks column not found, using default value. Please run migration 002_add_max_marks_to_co_mappings.sql`);
        await client.query(`
          INSERT INTO question_co_mappings (
            course_id, marksheet_id, question_column, co_number, co_id, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (marksheet_id, question_column) DO UPDATE SET
            co_number = EXCLUDED.co_number,
            co_id = EXCLUDED.co_id,
            uploaded_by = EXCLUDED.uploaded_by,
            updated_at = CURRENT_TIMESTAMP
        `, [courseId, marksheetId, mapping.questionColumn, mapping.coNumber, coId, uploadedBy]);
          } else {
            throw insertError;
          }
        }
      }

      // Store file metadata
      await client.query(`
        INSERT INTO co_mapping_files (
          course_id, marksheet_id, file_name, file_hash, mappings_count, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (marksheet_id) DO UPDATE SET
          file_name = EXCLUDED.file_name,
          file_hash = EXCLUDED.file_hash,
          mappings_count = EXCLUDED.mappings_count,
          uploaded_by = EXCLUDED.uploaded_by,
          created_at = CURRENT_TIMESTAMP
      `, [courseId, marksheetId, fileName, fileHash, mappings.length, uploadedBy]);

      await client.query('COMMIT');

      console.log(`\n✅ Successfully stored ${mappings.length} CO mappings`);

      return {
        success: true,
        mappingsCount: mappings.length,
        fileHash
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error storing CO mappings:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get CO mappings for a marksheet
   * Returns only valid questions (max_marks > 0)
   */
  async getCOMappings(marksheetId) {
    const result = await pool.query(`
      SELECT question_column, co_number, co_id, max_marks
      FROM question_co_mappings
      WHERE marksheet_id = $1 AND (max_marks IS NULL OR max_marks > 0)
      ORDER BY question_column
    `, [marksheetId]);

    return result.rows;
  }

  /**
   * Get valid question columns for a marksheet (only questions with max_marks > 0)
   * This is the FINAL QUESTION LIST used in all calculations
   */
  async getValidQuestionColumns(marksheetId) {
    const result = await pool.query(`
      SELECT question_column, co_number, co_id, max_marks
      FROM question_co_mappings
      WHERE marksheet_id = $1 AND (max_marks IS NULL OR max_marks > 0)
      ORDER BY question_column
    `, [marksheetId]);

    return result.rows;
  }

  /**
   * Get CO mappings for all marksheets in a course
   * Returns only valid questions (max_marks > 0)
   */
  async getCourseCOMappings(courseId) {
    const result = await pool.query(`
      SELECT m.assessment_name, qcm.question_column, qcm.co_number, qcm.max_marks
      FROM question_co_mappings qcm
      JOIN marksheets m ON qcm.marksheet_id = m.id
      WHERE qcm.course_id = $1 AND (qcm.max_marks IS NULL OR qcm.max_marks > 0)
      ORDER BY m.assessment_name, qcm.question_column
    `, [courseId]);

    return result.rows;
  }

  /**
   * Delete CO mappings for a marksheet
   */
  async deleteCOMappings(marksheetId) {
    await pool.query('DELETE FROM question_co_mappings WHERE marksheet_id = $1', [marksheetId]);
    await pool.query('DELETE FROM co_mapping_files WHERE marksheet_id = $1', [marksheetId]);

    return { success: true, message: 'CO mappings deleted' };
  }
}

export default new COMappingService();
