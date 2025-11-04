"""
Database service for CO storage and retrieval
"""
import os
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv(
    "POSTGRES_URL",
    "postgresql://admin:password@postgres:5432/edu"
)

# Create engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5)
metadata = MetaData()


def init_database():
    """
    Test database connection and verify table exists

    Note: Table schema is managed via PostgreSQL migrations in backend/migrations/
    This function only validates the connection and table existence.
    """
    try:
        with engine.connect() as conn:
            # Test connection
            conn.execute(text("SELECT 1"))

            # Verify course_outcomes table exists
            check_table_sql = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'course_outcomes'
                )
            """)

            result = conn.execute(check_table_sql)
            table_exists = result.scalar()

            if table_exists:
                logger.info("✅ Database connection successful, course_outcomes table exists")
                return True
            else:
                logger.warning("⚠️ Database connected but course_outcomes table not found. Run migrations first!")
                return False

    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
        return False


def save_cos(
    teacher_id: UUID,
    course_id: UUID,
    cos: List[dict]
) -> List[int]:
    """
    Save generated COs to database

    Args:
        teacher_id: UUID of the teacher
        course_id: UUID of the course
        cos: List of CO dictionaries with 'co_text' and 'bloom_level'

    Returns:
        List of inserted CO IDs
    """
    try:
        with engine.connect() as conn:
            co_ids = []

            for idx, co_data in enumerate(cos, start=1):
                insert_sql = text("""
                    INSERT INTO course_outcomes
                    (teacher_id, course_id, co_number, co_text, bloom_level, verified)
                    VALUES (:teacher_id, :course_id, :co_number, :co_text, :bloom_level, FALSE)
                    RETURNING id
                """)

                result = conn.execute(
                    insert_sql,
                    {
                        "teacher_id": str(teacher_id),
                        "course_id": str(course_id),
                        "co_number": idx,
                        "co_text": co_data["co_text"],
                        "bloom_level": co_data["bloom_level"]
                    }
                )

                co_id = result.fetchone()[0]
                co_ids.append(co_id)

            conn.commit()
            logger.info(f"Saved {len(co_ids)} COs for course {course_id}")
            return co_ids

    except SQLAlchemyError as e:
        logger.error(f"Database error while saving COs: {str(e)}")
        raise


def get_cos_by_course(
    course_id: UUID,
    teacher_id: Optional[UUID] = None
) -> List[dict]:
    """
    Get all COs for a specific course

    Args:
        course_id: UUID of the course
        teacher_id: Optional teacher ID filter

    Returns:
        List of CO dictionaries
    """
    try:
        with engine.connect() as conn:
            if teacher_id:
                query = text("""
                    SELECT id, teacher_id, course_id, co_number, co_text, bloom_level, verified, created_at
                    FROM course_outcomes
                    WHERE course_id = :course_id AND teacher_id = :teacher_id
                    ORDER BY co_number ASC
                """)
                result = conn.execute(query, {"course_id": str(course_id), "teacher_id": str(teacher_id)})
            else:
                query = text("""
                    SELECT id, teacher_id, course_id, co_number, co_text, bloom_level, verified, created_at
                    FROM course_outcomes
                    WHERE course_id = :course_id
                    ORDER BY co_number ASC
                """)
                result = conn.execute(query, {"course_id": str(course_id)})

            rows = result.fetchall()

            cos = []
            for row in rows:
                cos.append({
                    "id": row[0],
                    "teacher_id": row[1],
                    "course_id": row[2],
                    "co_number": row[3],
                    "co_text": row[4],
                    "bloom_level": row[5],
                    "verified": row[6],
                    "created_at": row[7]
                })

            return cos

    except SQLAlchemyError as e:
        logger.error(f"Database error while fetching COs: {str(e)}")
        raise


def get_cos_by_teacher(teacher_id: UUID) -> List[dict]:
    """
    Get all COs created by a teacher

    Args:
        teacher_id: UUID of the teacher

    Returns:
        List of CO dictionaries
    """
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT
                    co.id, co.teacher_id, co.course_id, co.co_number,
                    co.co_text, co.bloom_level, co.verified, co.created_at,
                    c.code as course_code, c.name as course_name
                FROM course_outcomes co
                LEFT JOIN courses c ON co.course_id = c.id
                WHERE co.teacher_id = :teacher_id
                ORDER BY co.created_at DESC, co.co_number ASC
            """)
            result = conn.execute(query, {"teacher_id": str(teacher_id)})
            rows = result.fetchall()

            cos = []
            for row in rows:
                cos.append({
                    "id": row[0],
                    "teacher_id": row[1],
                    "course_id": row[2],
                    "co_number": row[3],
                    "co_text": row[4],
                    "bloom_level": row[5],
                    "verified": row[6],
                    "created_at": row[7],
                    "course_code": row[8],
                    "course_name": row[9]
                })

            return cos

    except SQLAlchemyError as e:
        logger.error(f"Database error while fetching teacher COs: {str(e)}")
        raise


def verify_co(co_id: int, verified: bool = True) -> bool:
    """
    Mark a CO as verified or unverified

    Args:
        co_id: ID of the CO to verify
        verified: Boolean verification status

    Returns:
        True if successful
    """
    try:
        with engine.connect() as conn:
            update_sql = text("""
                UPDATE course_outcomes
                SET verified = :verified, updated_at = CURRENT_TIMESTAMP
                WHERE id = :co_id
            """)

            conn.execute(update_sql, {"co_id": co_id, "verified": verified})
            conn.commit()

            logger.info(f"CO {co_id} verification status updated to {verified}")
            return True

    except SQLAlchemyError as e:
        logger.error(f"Database error while verifying CO: {str(e)}")
        raise


def delete_cos_by_course(course_id: UUID) -> int:
    """
    Delete all COs for a course (useful for regeneration)

    Args:
        course_id: UUID of the course

    Returns:
        Number of deleted COs
    """
    try:
        with engine.connect() as conn:
            delete_sql = text("""
                DELETE FROM course_outcomes
                WHERE course_id = :course_id
            """)

            result = conn.execute(delete_sql, {"course_id": str(course_id)})
            conn.commit()

            deleted_count = result.rowcount
            logger.info(f"Deleted {deleted_count} COs for course {course_id}")
            return deleted_count

    except SQLAlchemyError as e:
        logger.error(f"Database error while deleting COs: {str(e)}")
        raise


def test_connection() -> bool:
    """Test database connection"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {str(e)}")
        return False
