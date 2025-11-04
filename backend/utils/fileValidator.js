/**
 * File Validation Utility
 * Validates file types and sizes for uploads
 */

const ALLOWED_EXTENSIONS = {
  assessment: ['.xlsx', '.csv', '.pdf'],
  enrollment: ['.xlsx', '.csv']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file type
 */
export const validateFileType = (filename, category = 'assessment') => {
  const allowedExtensions = ALLOWED_EXTENSIONS[category] || ALLOWED_EXTENSIONS.assessment;
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

  return allowedExtensions.includes(extension);
};

/**
 * Validate file size
 */
export const validateFileSize = (fileSize) => {
  return fileSize <= MAX_FILE_SIZE;
};

/**
 * Get file extension
 */
export const getFileExtension = (filename) => {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
};

/**
 * Get MIME type from extension
 */
export const getMimeType = (extension) => {
  const mimeTypes = {
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.pdf': 'application/pdf'
  };
  return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * Validate file and return error if invalid
 */
export const validateFile = (file, category = 'assessment') => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!validateFileType(file.originalname, category)) {
    const allowed = ALLOWED_EXTENSIONS[category].join(', ');
    return { valid: false, error: `Invalid file type. Allowed: ${allowed}` };
  }

  if (!validateFileSize(file.size)) {
    return { valid: false, error: `File too large. Max size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }

  return { valid: true };
};

export default {
  validateFileType,
  validateFileSize,
  getFileExtension,
  getMimeType,
  validateFile,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};
