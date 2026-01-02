import { query } from '../config/db.js';
import { emitToCourse } from '../config/socket.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Helper function to check if user is course teacher
const isCourseTeacher = async (userId, courseId) => {
  const result = await query(
    'SELECT teacher_id FROM courses WHERE id = $1',
    [courseId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  return result.rows[0].teacher_id === userId;
};

// Helper function to check if user is enrolled in course
const isEnrolledInCourse = async (userId, courseId, userRole) => {
  // Teachers who own the course are automatically enrolled
  if (userRole === 'teacher') {
    return await isCourseTeacher(userId, courseId);
  }

  // Check student enrollment
  const result = await query(
    'SELECT * FROM students_courses WHERE student_id = $1 AND course_id = $2 AND status = $3',
    [userId, courseId, 'active']
  );

  return result.rows.length > 0;
};

// ==================================================================================
// CREATE FOLDER
// ==================================================================================
export const createFolder = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { name, parentFolderId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required'
      });
    }

    // Check if user is the course teacher
    const isTeacher = await isCourseTeacher(userId, courseId);
    if (!isTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Only the course teacher can create folders'
      });
    }

    // Check if folder name already exists in the same parent
    const existingFolder = await query(
      `SELECT * FROM course_folders
       WHERE course_id = $1 AND name = $2 AND
       (parent_folder_id = $3 OR (parent_folder_id IS NULL AND $3 IS NULL))`,
      [courseId, name.trim(), parentFolderId || null]
    );

    if (existingFolder.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A folder with this name already exists in this location'
      });
    }

    // Create folder
    const result = await query(
      `INSERT INTO course_folders (course_id, name, parent_folder_id, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [courseId, name.trim(), parentFolderId || null, userId]
    );

    const folder = result.rows[0];

    // Emit socket event
    emitToCourse(courseId, 'folder-created', folder);

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: folder
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create folder',
      error: error.message
    });
  }
};

// ==================================================================================
// GET FOLDER CONTENTS (Folders + Materials)
// ==================================================================================
export const getFolderContents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { folderId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user has access to this course
    const hasAccess = await isEnrolledInCourse(userId, courseId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this course'
      });
    }

    // Get folders
    const foldersResult = await query(
      `SELECT f.*, u.name as created_by_name
       FROM course_folders f
       LEFT JOIN users u ON f.created_by = u.id
       WHERE f.course_id = $1 AND
       (f.parent_folder_id = $2 OR (f.parent_folder_id IS NULL AND $2 IS NULL))
       ORDER BY f.name ASC`,
      [courseId, folderId || null]
    );

    // Get materials
    const materialsResult = await query(
      `SELECT m.*, u.name as uploaded_by_name
       FROM course_materials m
       LEFT JOIN users u ON m.uploaded_by = u.id
       WHERE m.course_id = $1 AND
       (m.folder_id = $2 OR (m.folder_id IS NULL AND $2 IS NULL))
       ORDER BY m.upload_date DESC`,
      [courseId, folderId || null]
    );

    // Get current folder info if folderId is provided
    let currentFolder = null;
    if (folderId) {
      const folderResult = await query(
        'SELECT * FROM course_folders WHERE id = $1',
        [folderId]
      );
      currentFolder = folderResult.rows[0] || null;
    }

    res.json({
      success: true,
      data: {
        currentFolder,
        folders: foldersResult.rows,
        materials: materialsResult.rows
      }
    });
  } catch (error) {
    console.error('Error getting folder contents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get folder contents',
      error: error.message
    });
  }
};

// ==================================================================================
// UPLOAD MATERIAL
// ==================================================================================
export const uploadMaterial = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { folderId, description } = req.body;
    const userId = req.user.id;

    // Check if user is the course teacher
    const isTeacher = await isCourseTeacher(userId, courseId);
    if (!isTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Only the course teacher can upload materials'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;

    // Create destination directory
    const folderPath = folderId || 'root';
    const uploadDir = path.join(__dirname, '..', 'uploads', 'course-materials', courseId, folderPath);
    ensureDirectoryExists(uploadDir);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.originalname}`;
    const destPath = path.join(uploadDir, filename);

    // Move file from temp to final location
    fs.renameSync(file.path, destPath);

    // Save metadata to database
    const relativePath = path.join('course-materials', courseId, folderPath, filename);
    const result = await query(
      `INSERT INTO course_materials
       (course_id, folder_id, file_name, original_name, file_path, file_size, file_type, mime_type, description, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        courseId,
        folderId || null,
        filename,
        file.originalname,
        relativePath,
        file.size,
        path.extname(file.originalname),
        file.mimetype,
        description || null,
        userId
      ]
    );

    const material = result.rows[0];

    // Get uploader name
    const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
    material.uploaded_by_name = userResult.rows[0]?.name;

    // Emit socket event
    emitToCourse(courseId, 'material-uploaded', material);

    res.status(201).json({
      success: true,
      message: 'Material uploaded successfully',
      data: material
    });
  } catch (error) {
    console.error('Error uploading material:', error);

    // Clean up file if exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload material',
      error: error.message
    });
  }
};

// ==================================================================================
// DOWNLOAD MATERIAL
// ==================================================================================
export const downloadMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get material info
    const materialResult = await query(
      'SELECT * FROM course_materials WHERE id = $1',
      [materialId]
    );

    if (materialResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    const material = materialResult.rows[0];

    // Check if user has access to this course
    const hasAccess = await isEnrolledInCourse(userId, material.course_id, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this material'
      });
    }

    // Build file path
    const filePath = path.join(__dirname, '..', 'uploads', material.file_path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Stream file to response
    res.setHeader('Content-Type', material.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${material.original_name}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading material:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download material',
      error: error.message
    });
  }
};

// ==================================================================================
// DELETE MATERIAL
// ==================================================================================
export const deleteMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const userId = req.user.id;

    // Get material info
    const materialResult = await query(
      'SELECT * FROM course_materials WHERE id = $1',
      [materialId]
    );

    if (materialResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    const material = materialResult.rows[0];

    // Check if user is the course teacher
    const isTeacher = await isCourseTeacher(userId, material.course_id);
    if (!isTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Only the course teacher can delete materials'
      });
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '..', 'uploads', material.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await query('DELETE FROM course_materials WHERE id = $1', [materialId]);

    // Emit socket event
    emitToCourse(material.course_id, 'material-deleted', { materialId });

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete material',
      error: error.message
    });
  }
};

// ==================================================================================
// DELETE FOLDER
// ==================================================================================
export const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    // Get folder info
    const folderResult = await query(
      'SELECT * FROM course_folders WHERE id = $1',
      [folderId]
    );

    if (folderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    const folder = folderResult.rows[0];

    // Check if user is the course teacher
    const isTeacher = await isCourseTeacher(userId, folder.course_id);
    if (!isTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Only the course teacher can delete folders'
      });
    }

    // Check if folder is empty (no subfolders)
    const subfoldersResult = await query(
      'SELECT COUNT(*) FROM course_folders WHERE parent_folder_id = $1',
      [folderId]
    );
    const hasSubfolders = parseInt(subfoldersResult.rows[0].count) > 0;

    // Check if folder has materials
    const materialsResult = await query(
      'SELECT COUNT(*) FROM course_materials WHERE folder_id = $1',
      [folderId]
    );
    const hasMaterials = parseInt(materialsResult.rows[0].count) > 0;

    if (hasSubfolders || hasMaterials) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete folder. Please delete all contents first.'
      });
    }

    // Delete folder
    await query('DELETE FROM course_folders WHERE id = $1', [folderId]);

    // Emit socket event
    emitToCourse(folder.course_id, 'folder-deleted', { folderId });

    res.json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete folder',
      error: error.message
    });
  }
};
