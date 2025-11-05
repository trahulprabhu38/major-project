# 🚀 Complete Database Refactoring & Deployment Guide

## OBE CO/PO Attainment System - Version 2.0

**Date:** 2025-11-05
**Author:** Claude AI (Sonnet 4.5)
**Status:** Ready for Production

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What Has Changed](#what-has-changed)
3. [Prerequisites](#prerequisites)
4. [Installation Steps](#installation-steps)
5. [Data Migration](#data-migration)
6. [Using the New System](#using-the-new-system)
7. [CSV Upload Guide](#csv-upload-guide)
8. [Analytics & Attainment](#analytics--attainment)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This document describes the **complete database refactoring** of the OBE CO/PO Attainment System. The refactoring addresses critical issues in the original design:

### Problems Fixed ✅

1. **✅ Combined users table** → Separated into `teachers` and `students`
2. **✅ Column-based marks** → Row-based normalized `student_marks`
3. **✅ Raw SQL queries** → SQLAlchemy ORM with type safety
4. **✅ Missing validation** → Pydantic schemas for all endpoints
5. **✅ No CSV ingestion** → Complete bulk upload pipeline
6. **✅ Manual attainment calculation** → Automated analytics service
7. **✅ Weak relationships** → Strong FK constraints with ON DELETE CASCADE

---

## 🔄 What Has Changed

### 1. **Database Schema Changes**

#### Old Schema:
```
users (role: teacher/student/admin - combined table)
  ↓
courses → course_outcomes → assessments → questions → student_scores
```

#### New Schema:
```
teachers (separate)     students (separate)     admins (separate)
    ↓                        ↓
courses → course_outcomes → assessments → questions → student_marks (row-based)
    ↓                        ↓
enrollments            student_marks
    ↓
co_attainment, po_attainment (cache tables)
```

### 2. **New Tables**

| Table | Purpose |
|-------|---------|
| `teachers` | Faculty/teachers (separated from users) |
| `students` | Students (separated from users) |
| `admins` | System administrators |
| `enrollments` | Student-course enrollment tracking |
| `student_marks` | **Row-based marks storage** (student_id, question_id, marks) |
| `co_attainment` | CO attainment calculation cache |
| `po_attainment` | PO attainment calculation cache |
| `co_po_mapping` | CO-PO correlation mapping |
| `question_po_mapping` | Direct question-PO mapping |

### 3. **New Files Created**

```
co-generator/
├── schema/
│   ├── 01_create_schema.sql          # Complete PostgreSQL DDL
│   └── mongodb_collections.json      # MongoDB collections schema
├── app/
│   ├── models/
│   │   ├── db_models.py               # SQLAlchemy ORM models
│   │   └── pydantic_schemas.py        # Pydantic validation schemas
│   ├── db/
│   │   └── database.py                # Session management
│   └── services/
│       ├── csv_ingest.py              # CSV upload service
│       └── analytics.py               # CO/PO attainment calculations
└── migrations/
    └── migrate_data.py                # Data migration script
```

---

## 📦 Prerequisites

### 1. Software Requirements
```bash
# Python 3.10+
python --version

# PostgreSQL 16
psql --version

# Required Python packages (add to requirements.txt)
sqlalchemy>=2.0.0
asyncpg>=0.29.0
psycopg2-binary>=2.9.9
alembic>=1.13.0
pydantic>=2.5.0
pandas>=2.1.0
```

### 2. Install Dependencies
```bash
cd co-generator
pip install -r requirements.txt
```

Update `requirements.txt`:
```txt
# Add these lines
sqlalchemy>=2.0.0
asyncpg>=0.29.0
alembic>=1.13.0
pydantic>=2.5.0
pandas>=2.1.0
```

---

## 🛠️ Installation Steps

### Step 1: Backup Current Database ⚠️

**CRITICAL: Always backup before migration!**

```bash
# Backup PostgreSQL
docker exec postgres pg_dump -U admin edu > backup_$(date +%Y%m%d).sql

# Backup MongoDB
docker exec mongodb mongodump --db edu_analytics --out /backup

# Backup ChromaDB
docker cp chromadb:/chroma/chroma ./chroma_backup_$(date +%Y%m%d)
```

### Step 2: Create New Schema

```bash
# Connect to PostgreSQL
docker exec -it postgres psql -U admin -d edu

# Run DDL script
\i /path/to/schema/01_create_schema.sql

# Or from host:
docker exec -i postgres psql -U admin -d edu < co-generator/schema/01_create_schema.sql
```

**Verify tables created:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- `teachers`
- `students`
- `admins`
- `courses` (already exists)
- `course_outcomes` (already exists)
- `enrollments`
- `assessments`
- `questions`
- `student_marks`
- `co_attainment`
- `po_attainment`
- `co_po_mapping`
- `question_po_mapping`
- `program_outcomes`

---

## 🔄 Data Migration

### Step 3: Run Data Migration

The migration script will:
1. ✅ Split `users` → `teachers` + `students`
2. ✅ Verify foreign key integrity
3. ✅ Handle existing data safely

#### Dry Run (Test First)
```bash
cd co-generator
python migrations/migrate_data.py --dry-run --verbose
```

**Expected Output:**
```
🚀 Starting database migration...
⚠️  DRY RUN MODE - No changes will be made
✅ Connected to PostgreSQL: postgres:5432/edu
📊 [STEP 1] Migrating users → teachers & students
[1.1] Found 15 teachers
[1.1] [DRY RUN] Would migrate 15 teachers
[1.2] Found 120 students
[1.2] [DRY RUN] Would migrate 120 students
...
✅ Dry run completed - no changes made
```

#### Run Actual Migration
```bash
python migrations/migrate_data.py --verbose
```

**Expected Output:**
```
📊 MIGRATION SUMMARY
Teachers migrated:     15
Students migrated:     120
Errors encountered:    0
✅ Migration completed successfully
```

### Step 4: Verify Migration

```sql
-- Check teacher count
SELECT COUNT(*) FROM teachers;

-- Check student count
SELECT COUNT(*) FROM students;

-- Check courses still linked
SELECT c.code, c.name, t.name as teacher_name
FROM courses c
LEFT JOIN teachers t ON c.teacher_id = t.id
LIMIT 5;

-- Check COs still linked
SELECT co.co_number, co.co_text, c.code
FROM course_outcomes co
JOIN courses c ON co.course_id = c.id
LIMIT 5;
```

---

## 🎯 Using the New System

### 1. Database Session Management

```python
from app.db.database import get_db_context, AsyncSessionLocal
from sqlalchemy import select
from app.models.db_models import Teacher, Student, Course

# Method 1: Context manager
async def example_query():
    async with get_db_context() as db:
        result = await db.execute(select(Teacher))
        teachers = result.scalars().all()
        return teachers

# Method 2: FastAPI dependency
from fastapi import Depends
from app.db.database import get_db

@app.get("/teachers")
async def list_teachers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Teacher))
    return result.scalars().all()
```

### 2. Query Examples

#### Get all COs for a course
```python
from app.models.db_models import CourseOutcome, Course

async def get_course_cos(course_code: str):
    async with get_db_context() as db:
        result = await db.execute(
            select(CourseOutcome)
            .join(Course)
            .where(Course.code == course_code)
            .order_by(CourseOutcome.co_number)
        )
        return result.scalars().all()
```

#### Get student marks for a course
```python
from sqlalchemy import and_

async def get_student_marks(student_id: UUID, course_id: UUID):
    async with get_db_context() as db:
        result = await db.execute(
            select(StudentMark, Question, Assessment)
            .join(Question, StudentMark.question_id == Question.id)
            .join(Assessment, Question.assessment_id == Assessment.id)
            .where(
                and_(
                    StudentMark.student_id == student_id,
                    Assessment.course_id == course_id
                )
            )
        )
        return result.all()
```

---

## 📊 CSV Upload Guide

### CSV Format

Your CSV must follow this structure:

```csv
USN,STUDENT NAME,Q1A,Q1B,Q2A,Q2B,Q3A,Q3B
1CR21CS001,John Doe,4.5,3.0,5.0,4.0,3.5,4.5
1CR21CS002,Jane Smith,5.0,4.5,4.5,5.0,4.0,5.0
1CR21CS003,Bob Johnson,3.5,4.0,4.5,3.5,5.0,4.0
```

**Requirements:**
- ✅ Must have `USN` column (case-insensitive)
- ✅ Optional: `STUDENT NAME` or `Name` column
- ✅ All other columns are treated as question codes (Q1A, Q1B, etc.)
- ✅ Marks should be numeric (0.0 to max_marks)

### Upload Using Service

```python
from app.services.csv_ingest import ingest_csv_file
from app.db.database import get_db_context
from uuid import UUID
from datetime import date

async def upload_marks():
    async with get_db_context() as db:
        result = await ingest_csv_file(
            db=db,
            csv_path="/path/to/marks.csv",
            course_code="DS1",
            assessment_name="AAT 1",
            assessment_type="AAT",
            teacher_id=UUID("teacher-uuid-here"),
            assessment_date=date(2025, 11, 5)
        )

        print(f"Success: {result.success}")
        print(f"Total rows: {result.total_rows}")
        print(f"Successful: {result.successful_inserts}")
        print(f"Failed: {result.failed_inserts}")

        if result.errors:
            print("Errors:")
            for error in result.errors:
                print(f"  - {error}")
```

### What Happens During CSV Upload:

1. **Validation:** Course code is validated
2. **Student Mapping:** USNs are mapped to student IDs (bulk fetch)
3. **Assessment Creation:** Assessment is created or fetched
4. **Question Creation:** One question per column (Q1A, Q1B, etc.)
5. **Marks Insertion:** Bulk insert into `student_marks` table
6. **Linking:** Each mark is linked to (student_id, question_id)

---

## 📈 Analytics & Attainment

### Calculate CO Attainment

```python
from app.services.analytics import AnalyticsService
from app.db.database import get_db_context

async def calculate_attainment():
    async with get_db_context() as db:
        analytics = AnalyticsService(db)

        # Calculate CO attainment
        result = await analytics.calculate_and_store_co_attainment(
            course_id=course_uuid,
            co_id=co_uuid,
            assessment_id=assessment_uuid,
            threshold_percentage=60.0
        )

        print(f"CO Attainment: {result.attainment_percentage}%")
        print(f"Students above threshold: {result.students_above_threshold}/{result.total_students}")
```

### Calculate PO Attainment

```python
async def calculate_po_attainment():
    async with get_db_context() as db:
        analytics = AnalyticsService(db)

        result = await analytics.calculate_and_store_po_attainment(
            course_id=course_uuid,
            po_id=po_uuid,
            method='direct'
        )

        print(f"PO Attainment Level: {result.attainment_level}/3.0")
```

### Get Course Summary

```python
async def get_course_summary():
    async with get_db_context() as db:
        analytics = AnalyticsService(db)

        # CO summary
        co_summary = await analytics.get_course_co_attainment_summary(course_id=course_uuid)

        for co_data in co_summary:
            print(f"CO{co_data['co_number']}: {co_data['average_attainment']}%")
            print(f"  Bloom: {co_data['bloom_level']}")
            print(f"  Assessments: {co_data['assessment_count']}")
```

---

## 🧪 Testing

### 1. Test Database Connection

```python
from app.db.database import test_connection

async def test_db():
    success = await test_connection()
    assert success, "Database connection failed"
```

### 2. Test CSV Upload

```bash
# Create test CSV
cat > test_marks.csv <<EOF
USN,STUDENT NAME,Q1A,Q1B,Q2A
1CR21CS001,Test Student 1,4.5,3.0,5.0
1CR21CS002,Test Student 2,5.0,4.5,4.5
EOF

# Upload
python -c "
import asyncio
from app.services.csv_ingest import ingest_csv_file
from app.db.database import get_db_context
from uuid import UUID

async def main():
    async with get_db_context() as db:
        result = await ingest_csv_file(
            db=db,
            csv_path='test_marks.csv',
            course_code='DS1',
            assessment_name='Test AAT',
            assessment_type='AAT',
            teacher_id=UUID('your-teacher-uuid')
        )
        print(result)

asyncio.run(main())
"
```

### 3. Test Attainment Calculation

```python
import pytest
from app.services.analytics import AnalyticsService

@pytest.mark.asyncio
async def test_co_attainment(db_session):
    analytics = AnalyticsService(db_session)

    result = await analytics.calculate_co_attainment(
        course_id=test_course_id,
        co_id=test_co_id,
        assessment_id=test_assessment_id
    )

    assert result['attainment_percentage'] >= 0
    assert result['attainment_percentage'] <= 100
    assert result['total_students'] > 0
```

---

## 🐛 Troubleshooting

### Issue 1: Migration fails with "users table not found"

**Solution:** You're in the wrong database or users table doesn't exist yet.

```sql
-- Check current database
SELECT current_database();

-- List all tables
\dt
```

### Issue 2: Foreign key violations during migration

**Solution:** Old data has orphaned references.

```sql
-- Find orphaned courses
SELECT c.* FROM courses c
WHERE c.teacher_id IS NOT NULL
AND c.teacher_id NOT IN (SELECT id FROM users WHERE role = 'teacher');

-- Option 1: Set teacher_id to NULL
UPDATE courses SET teacher_id = NULL WHERE teacher_id NOT IN (SELECT id FROM teachers);

-- Option 2: Delete orphaned courses (⚠️ CAREFUL!)
DELETE FROM courses WHERE teacher_id NOT IN (SELECT id FROM teachers);
```

### Issue 3: CSV upload fails with "Student not found"

**Solution:** Students haven't been enrolled yet or USNs don't match.

```sql
-- Check if students exist
SELECT * FROM students WHERE usn IN ('1CR21CS001', '1CR21CS002');

-- Check USN format (case-sensitive)
SELECT usn FROM students LIMIT 5;

-- Add missing student
INSERT INTO students (name, email, usn, password_hash)
VALUES ('Test Student', 'test@example.com', '1CR21CS999', 'hashed_password');
```

### Issue 4: asyncpg/psycopg2 import errors

**Solution:** Install missing dependencies

```bash
pip install asyncpg psycopg2-binary sqlalchemy[asyncio]
```

---

## 📌 Important Notes

### ⚠️ Before Going to Production:

1. **Test migration on staging first** - NEVER directly on production
2. **Verify all data integrity checks pass**
3. **Update frontend to use new endpoints** (if API changes)
4. **Update API documentation** (Swagger/OpenAPI)
5. **Create Alembic migrations** for future schema changes
6. **Set up monitoring** for attainment calculations
7. **Configure backups** (daily PostgreSQL dumps)

### 🔐 Security Considerations:

1. **Password hashing:** Use bcrypt for all passwords
2. **SQL injection:** Always use parameterized queries (ORM handles this)
3. **Access control:** Enforce role-based access at API level
4. **Data encryption:** Consider encrypting sensitive student data at rest

---

## 📚 Additional Resources

- **SQLAlchemy 2.0 Docs:** https://docs.sqlalchemy.org/
- **Pydantic V2 Docs:** https://docs.pydantic.dev/
- **PostgreSQL 16 Docs:** https://www.postgresql.org/docs/16/
- **FastAPI Docs:** https://fastapi.tiangolo.com/

---

## ✅ Deployment Checklist

- [ ] Backup current database
- [ ] Install new dependencies
- [ ] Run DDL to create new tables
- [ ] Test migration with --dry-run
- [ ] Run actual data migration
- [ ] Verify all foreign keys intact
- [ ] Test CSV upload with sample data
- [ ] Test CO/PO attainment calculations
- [ ] Update frontend if needed
- [ ] Update API documentation
- [ ] Deploy to staging
- [ ] Load test
- [ ] Deploy to production
- [ ] Monitor for 24 hours

---

**End of Deployment Guide**

For support or questions, refer to the project documentation or contact the development team.

---

Generated by: **Claude AI (Sonnet 4.5)**
Date: **2025-11-05**
