import bcryptjs from 'bcryptjs';
import { query } from '../config/db.js';
import { generateToken } from '../middleware/auth.js';
import { insertOne, findOne } from '../config/mongodb.js';

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const { email, password, role, name, usn, department } = req.body;

    // === Validation ===
    if (!email || !password || !role || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, role, and name are required',
      });
    }

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be student, teacher, or admin',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // === Check if user exists (Postgres) ===
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // === Check USN uniqueness for students ===
    if (role === 'student' && usn) {
      const existingUSN = await query('SELECT id FROM users WHERE usn = $1', [usn]);
      if (existingUSN.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'USN already exists',
        });
      }
    }

    // === Hash password ===
    const hashedPassword = await bcryptjs.hash(password, 12);

    // === Insert user in Postgres ===
    const userResult = await query(
      `INSERT INTO users (email, password_hash, role, name, usn, department)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, name, usn, department, created_at`,
      [normalizedEmail, hashedPassword, role, name, usn || null, department || null]
    );

    const user = userResult.rows[0];

    // === If teacher, also create a MongoDB profile ===
    if (role === 'teacher') {
      const existingTeacher = await findOne('teachers', { email: normalizedEmail });
      if (!existingTeacher) {
        await insertOne('teachers', {
          email: normalizedEmail,
          name,
          department: department || null,
          postgres_user_id: user.id, // Store PostgreSQL UUID for cross-DB linking
          created_at: new Date(),
        });
      } else {
        // Update existing teacher with postgres_user_id if not set
        const { getDB } = await import('../config/mongodb.js');
        const db = getDB();
        await db.collection('teachers').updateOne(
          { email: normalizedEmail },
          { $set: { postgres_user_id: user.id, name, department: department || null } }
        );
      }
    }

    // === Generate JWT Token ===
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // === Fetch user ===
    const result = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcryptjs.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      data: { user, token },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

/**
 * Get user profile
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT id, email, role, name, usn, department, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message,
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, department } = req.body;

    const result = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           department = COALESCE($2, department),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, role, name, usn, department`,
      [name, department, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or update failed',
      });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};
