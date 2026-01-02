import { query } from '../config/db.js';
import { emitToCourse } from '../config/socket.js';

// Helper function to check if user is enrolled in course
const isEnrolledInCourse = async (userId, courseId, userRole) => {
  // Check if user is the teacher
  if (userRole === 'teacher') {
    const teacherResult = await query(
      'SELECT teacher_id FROM courses WHERE id = $1',
      [courseId]
    );
    if (teacherResult.rows.length > 0 && teacherResult.rows[0].teacher_id === userId) {
      return true;
    }
  }

  // Check student enrollment
  const result = await query(
    'SELECT * FROM students_courses WHERE student_id = $1 AND course_id = $2 AND status = $3',
    [userId, courseId, 'active']
  );

  return result.rows.length > 0;
};

// ==================================================================================
// GET COURSE MESSAGES
// ==================================================================================
export const getCourseMessages = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user has access to this course
    const hasAccess = await isEnrolledInCourse(userId, courseId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this course chat'
      });
    }

    // Get messages with user information
    const result = await query(
      `SELECT
        m.*,
        u.name as user_name,
        u.role as user_role,
        u.usn as user_usn,
        mat.original_name as material_name
       FROM course_messages m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN course_materials mat ON m.material_id = mat.id
       WHERE m.course_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [courseId, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM course_messages WHERE course_id = $1',
      [courseId]
    );

    res.json({
      success: true,
      data: {
        messages: result.rows.reverse(), // Reverse to show oldest first
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error getting course messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get course messages',
      error: error.message
    });
  }
};

// ==================================================================================
// SEND MESSAGE
// ==================================================================================
export const sendMessage = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { message, messageType = 'text', materialId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate input
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Check if user has access to this course
    const hasAccess = await isEnrolledInCourse(userId, courseId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this course chat'
      });
    }

    // Save message to database
    const result = await query(
      `INSERT INTO course_messages (course_id, user_id, message, message_type, material_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [courseId, userId, message.trim(), messageType, materialId || null]
    );

    const newMessage = result.rows[0];

    // Get user information
    const userResult = await query(
      'SELECT name, role, usn FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    // Add user info to message object
    const messageWithUser = {
      ...newMessage,
      user_name: user.name,
      user_role: user.role,
      user_usn: user.usn
    };

    // If message references a material, get material name
    if (materialId) {
      const materialResult = await query(
        'SELECT original_name FROM course_materials WHERE id = $1',
        [materialId]
      );
      if (materialResult.rows.length > 0) {
        messageWithUser.material_name = materialResult.rows[0].original_name;
      }
    }

    // Emit socket event to all users in the course room
    emitToCourse(courseId, 'new-message', messageWithUser);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: messageWithUser
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// ==================================================================================
// DELETE MESSAGE (Optional - for future enhancement)
// ==================================================================================
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get message info
    const messageResult = await query(
      'SELECT * FROM course_messages WHERE id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const message = messageResult.rows[0];

    // Only the message sender or course teacher can delete
    const isOwner = message.user_id === userId;
    let isTeacher = false;

    if (userRole === 'teacher') {
      const courseResult = await query(
        'SELECT teacher_id FROM courses WHERE id = $1',
        [message.course_id]
      );
      isTeacher = courseResult.rows.length > 0 && courseResult.rows[0].teacher_id === userId;
    }

    if (!isOwner && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this message'
      });
    }

    // Delete message
    await query('DELETE FROM course_messages WHERE id = $1', [messageId]);

    // Emit socket event
    emitToCourse(message.course_id, 'message-deleted', { messageId });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};
