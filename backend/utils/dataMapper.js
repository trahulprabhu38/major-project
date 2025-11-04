import { getDB } from '../config/mongodb.js';
import { query } from '../config/db.js';
import { ObjectId } from 'mongodb';

/**
 * Data Mapper - Bridge between MongoDB (Teachers) and PostgreSQL (Courses/Marks)
 * Implements the Polyglot Persistence pattern
 */

class DataMapper {
  /**
   * Get PostgreSQL user ID from MongoDB teacher ID
   */
  async getPostgresTeacherId(mongoTeacherId) {
    try {
      const db = getDB();
      const teacher = await db.collection('teachers').findOne({
        _id: new ObjectId(mongoTeacherId)
      });

      if (!teacher || !teacher.postgres_user_id) {
        throw new Error('Teacher not found or not linked to PostgreSQL');
      }

      return teacher.postgres_user_id;
    } catch (error) {
      console.error('Error getting PostgreSQL teacher ID:', error);
      throw error;
    }
  }

  /**
   * Get MongoDB teacher ID from PostgreSQL user ID
   */
  async getMongoTeacherId(postgresUserId) {
    try {
      const db = getDB();
      const teacher = await db.collection('teachers').findOne({
        postgres_user_id: postgresUserId
      });

      if (!teacher) {
        throw new Error('Teacher not found in MongoDB');
      }

      return teacher._id.toString();
    } catch (error) {
      console.error('Error getting MongoDB teacher ID:', error);
      throw error;
    }
  }

  /**
   * Get teacher's courses from PostgreSQL using MongoDB ID
   */
  async getTeacherCourses(mongoTeacherId) {
    try {
      const postgresId = await this.getPostgresTeacherId(mongoTeacherId);

      const result = await query(
        `SELECT c.*,
                COUNT(DISTINCT sc.student_id) as enrolled_students,
                COUNT(DISTINCT a.id) as assessments_count
         FROM courses c
         LEFT JOIN students_courses sc ON c.id = sc.course_id
         LEFT JOIN assessments a ON c.id = a.course_id
         WHERE c.teacher_id = $1
         GROUP BY c.id
         ORDER BY c.year DESC, c.semester DESC`,
        [postgresId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting teacher courses:', error);
      throw error;
    }
  }

  /**
   * Log teacher activity in MongoDB
   */
  async logTeacherActivity(mongoTeacherId, action, entityType, entityId, metadata = {}) {
    try {
      const db = getDB();

      await db.collection('teacher_activity_log').insertOne({
        teacher_id: new ObjectId(mongoTeacherId),
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
        timestamp: new Date(),
        created_at: new Date()
      });

      // Update teacher stats
      await this.updateTeacherStats(mongoTeacherId);
    } catch (error) {
      console.error('Error logging teacher activity:', error);
      // Don't throw - logging should not break main flow
    }
  }

  /**
   * Update teacher statistics in MongoDB
   */
  async updateTeacherStats(mongoTeacherId) {
    try {
      const courses = await this.getTeacherCourses(mongoTeacherId);
      const totalStudents = courses.reduce((sum, course) =>
        sum + parseInt(course.enrolled_students || 0), 0
      );

      const db = getDB();
      await db.collection('teachers').updateOne(
        { _id: new ObjectId(mongoTeacherId) },
        {
          $set: {
            'stats.total_courses': courses.length,
            'stats.total_students': totalStudents,
            'stats.last_updated': new Date()
          }
        }
      );
    } catch (error) {
      console.error('Error updating teacher stats:', error);
    }
  }

  /**
   * Store attainment results in MongoDB (analytics)
   */
  async storeAttainmentAnalytics(courseId, teacherMongoId, attainmentData) {
    try {
      const db = getDB();

      await db.collection('attainment_by_course').insertOne({
        course_id: courseId,
        teacher_mongo_id: new ObjectId(teacherMongoId),
        timestamp: new Date(),
        co_attainments: attainmentData.coAttainments || [],
        po_attainments: attainmentData.poAttainments || [],
        assessment_id: attainmentData.assessmentId,
        threshold: attainmentData.threshold,
        created_at: new Date()
      });

      // Log activity
      await this.logTeacherActivity(
        teacherMongoId,
        'calculate_attainment',
        'course',
        courseId,
        { assessment_id: attainmentData.assessmentId }
      );
    } catch (error) {
      console.error('Error storing attainment analytics:', error);
      throw error;
    }
  }

  /**
   * Store student analytics in MongoDB
   */
  async storeStudentAnalytics(studentPostgresId, courseId, performanceData) {
    try {
      const db = getDB();

      await db.collection('student_analytics').insertOne({
        student_postgres_id: studentPostgresId,
        course_id: courseId,
        timestamp: new Date(),
        co_performance: performanceData.coPerformance || [],
        po_performance: performanceData.poPerformance || [],
        overall_percentage: performanceData.overallPercentage,
        rank: performanceData.rank,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Error storing student analytics:', error);
      throw error;
    }
  }

  /**
   * Get teacher analytics from MongoDB
   */
  async getTeacherAnalytics(mongoTeacherId, timeframe = '30d') {
    try {
      const db = getDB();
      const daysAgo = parseInt(timeframe.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Get activity logs
      const activities = await db.collection('teacher_activity_log')
        .find({
          teacher_id: new ObjectId(mongoTeacherId),
          timestamp: { $gte: startDate }
        })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();

      // Get recent attainment calculations
      const attainments = await db.collection('attainment_by_course')
        .find({
          teacher_mongo_id: new ObjectId(mongoTeacherId),
          timestamp: { $gte: startDate }
        })
        .sort({ timestamp: -1 })
        .toArray();

      // Get teacher stats
      const teacher = await db.collection('teachers').findOne({
        _id: new ObjectId(mongoTeacherId)
      });

      return {
        activities,
        attainments,
        stats: teacher?.stats || {},
        timeframe
      };
    } catch (error) {
      console.error('Error getting teacher analytics:', error);
      throw error;
    }
  }

  /**
   * Get student analytics from MongoDB
   */
  async getStudentAnalytics(studentPostgresId, courseId) {
    try {
      const db = getDB();

      const analytics = await db.collection('student_analytics')
        .find({
          student_postgres_id: studentPostgresId,
          course_id: courseId
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();

      return analytics;
    } catch (error) {
      console.error('Error getting student analytics:', error);
      throw error;
    }
  }

  /**
   * Create teacher in MongoDB with PostgreSQL link
   */
  async createTeacherMongo(teacherData, postgresUserId) {
    try {
      const db = getDB();

      const result = await db.collection('teachers').insertOne({
        email: teacherData.email,
        password_hash: teacherData.password_hash,
        name: teacherData.name,
        department: teacherData.department || null,
        role: 'teacher',
        postgres_user_id: postgresUserId,
        preferences: {
          theme: 'light',
          notifications: true
        },
        stats: {
          total_courses: 0,
          total_students: 0,
          last_updated: new Date()
        },
        created_at: new Date(),
        updated_at: new Date()
      });

      return result.insertedId;
    } catch (error) {
      console.error('Error creating teacher in MongoDB:', error);
      throw error;
    }
  }

  /**
   * Sync teacher data between MongoDB and PostgreSQL
   */
  async syncTeacherData(mongoTeacherId) {
    try {
      const db = getDB();
      const teacher = await db.collection('teachers').findOne({
        _id: new ObjectId(mongoTeacherId)
      });

      if (!teacher || !teacher.postgres_user_id) {
        throw new Error('Teacher not found or not linked');
      }

      // Update PostgreSQL with latest name/department from MongoDB
      await query(
        'UPDATE users SET name = $1, department = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [teacher.name, teacher.department, teacher.postgres_user_id]
      );

      // Update MongoDB stats
      await this.updateTeacherStats(mongoTeacherId);

      return { success: true };
    } catch (error) {
      console.error('Error syncing teacher data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new DataMapper();
