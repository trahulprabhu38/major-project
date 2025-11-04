import xlsx from 'xlsx';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

/**
 * Parse Excel or CSV file containing student assessment data
 * Expected format:
 * USN, Question_ID, Marks, CO_Number, PO_Numbers
 * 1MS22CS001, Q1, 8, 1, "1,2"
 */
export const parseAssessmentFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.csv') {
      return await parseCSV(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      return parseExcel(filePath);
    } else {
      throw new Error('Unsupported file format');
    }
  } catch (error) {
    throw new Error(`File parsing error: ${error.message}`);
  }
};

/**
 * Parse Excel file
 */
const parseExcel = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Get first sheet
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet, {
      raw: false, // Get formatted strings
      defval: '' // Default value for empty cells
    });

    return {
      success: true,
      data: normalizeData(data),
      rowCount: data.length
    };
  } catch (error) {
    throw new Error(`Excel parsing error: ${error.message}`);
  }
};

/**
 * Parse CSV file
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing errors: ${JSON.stringify(results.errors)}`));
        } else {
          resolve({
            success: true,
            data: normalizeData(results.data),
            rowCount: results.data.length
          });
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

/**
 * Normalize data to consistent format
 */
const normalizeData = (data) => {
  return data.map(row => {
    // Handle different possible column name variations
    const usn = row.USN || row.usn || row.StudentID || row.student_id || '';
    const questionId = row.Question_ID || row.QuestionID || row.question_id || row.QuestionNumber || '';
    const marks = parseFloat(row.Marks || row.marks || row.MarksObtained || row.marks_obtained || 0);
    const coNumber = parseInt(row.CO_Number || row.CONumber || row.co_number || row.CO || 0);

    // Parse PO numbers (can be comma-separated string or array)
    let poNumbers = [];
    const poField = row.PO_Numbers || row.PONumbers || row.po_numbers || row.POs || '';
    if (typeof poField === 'string') {
      poNumbers = poField.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
    } else if (Array.isArray(poField)) {
      poNumbers = poField.map(p => parseInt(p)).filter(p => !isNaN(p));
    }

    return {
      usn: usn.trim(),
      questionId: questionId.toString().trim(),
      marks,
      coNumber,
      poNumbers
    };
  });
};

/**
 * Validate parsed data
 */
export const validateAssessmentData = (data) => {
  const errors = [];
  const validRows = [];

  data.forEach((row, index) => {
    const rowErrors = [];

    // Check USN
    if (!row.usn || row.usn.length === 0) {
      rowErrors.push('USN is required');
    }

    // Check Question ID
    if (!row.questionId || row.questionId.length === 0) {
      rowErrors.push('Question ID is required');
    }

    // Check marks
    if (isNaN(row.marks) || row.marks < 0) {
      rowErrors.push('Invalid marks value');
    }

    // Check CO number
    if (!row.coNumber || row.coNumber < 1) {
      rowErrors.push('Invalid CO number');
    }

    // Check PO numbers
    if (!row.poNumbers || row.poNumbers.length === 0) {
      rowErrors.push('At least one PO number is required');
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: index + 1,
        data: row,
        errors: rowErrors
      });
    } else {
      validRows.push(row);
    }
  });

  return {
    valid: errors.length === 0,
    validRows,
    invalidRows: errors,
    summary: {
      total: data.length,
      valid: validRows.length,
      invalid: errors.length
    }
  };
};

/**
 * Clean up uploaded file
 */
export const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error cleaning up file:', error);
    return false;
  }
};

/**
 * Generate sample Excel file template
 */
export const generateSampleTemplate = () => {
  const sampleData = [
    {
      USN: '1MS22CS001',
      Question_ID: 'Q1',
      Marks: 8,
      CO_Number: 1,
      PO_Numbers: '1,2'
    },
    {
      USN: '1MS22CS001',
      Question_ID: 'Q2',
      Marks: 6,
      CO_Number: 2,
      PO_Numbers: '1,2,5'
    },
    {
      USN: '1MS22CS002',
      Question_ID: 'Q1',
      Marks: 9,
      CO_Number: 1,
      PO_Numbers: '1,2'
    },
    {
      USN: '1MS22CS002',
      Question_ID: 'Q2',
      Marks: 7,
      CO_Number: 2,
      PO_Numbers: '1,2,5'
    }
  ];

  const ws = xlsx.utils.json_to_sheet(sampleData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Assessment Data');

  return wb;
};
