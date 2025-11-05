# Database Refactoring Plan

## Current Issues

### 1. ID vs Code Mismatch
- **Frontend** sends `course_id` (UUID) to CO Generator
- **CO Generator** expects `course_code` (string like "CS101")
- Result: 404 errors when trying to list/stats endpoints

### 2. Database Inconsistency
- PostgreSQL and MongoDB store overlapping data
- No clear separation of concerns
- Multiple sources of truth for same data

### 3. Missing Endpoints
- Frontend calls `/api/co/list/{course_id}` → Doesn't exist
- Frontend calls `/api/co/stats/{course_id}` → Doesn't exist
- Actual endpoints use `course_code` as query param

### 4. Insufficient Logging
- Hard to debug issues
- No request/response tracking
- No database query logging

---

## Refactored Architecture

### Data Distribution Strategy

#### PostgreSQL (Source of Truth for Structured Data)
**Purpose**: Relational data, authentication, course management, assessments

**Tables**:
1. **users** - All users (students, teachers, admin)
   - id (UUID)
   - email, password_hash, role
   - name, usn (for students), department

2. **courses** - Course master data
   - id (UUID)
   - code (VARCHAR - course code like "CS101")
   - name, description, semester, year, credits, department
   - teacher_id (FK to users)

3. **course_outcomes** - Generated/Manual COs
   - id (UUID)
   - course_id (FK to courses)
   - co_number (1, 2, 3...)
   - co_text (description)
   - bloom_level (Remember, Understand, Apply, etc.)
   - verified (boolean)
   - teacher_id (who created it)

4. **assessments** - Exams, assignments, labs
   - id (UUID)
   - course_id (FK to courses)
   - type (AAT, CIE, LAB, etc.)
   - name, max_marks, assessment_date

5. **questions** - Questions in assessments
   - id (UUID)
   - assessment_id (FK to assessments)
   - question_number
   - max_marks
   - co_id (FK to course_outcomes)

6. **student_scores** - Marks obtained by students
   - id (UUID)
   - student_id (FK to users)
   - question_id (FK to questions)
   - marks_obtained

7. **students_courses** - Enrollment mapping
   - student_id (FK to users)
   - course_id (FK to courses)
   - status (active/completed/dropped)

8. **program_outcomes** - PO master data
9. **co_po_mapping** - CO to PO correlation
10. **co_attainment** - Calculated CO attainment (cached)
11. **po_attainment** - Calculated PO attainment (cached)

#### MongoDB (Analytics & Cache Layer)
**Purpose**: Fast aggregated analytics, time-series data, caching computed results

**Collections**:
1. **attainment_by_course** - Course-level attainment trends
   ```json
   {
     "_id": ObjectId,
     "course_id": "uuid-string",
     "course_code": "CS101",
     "course_name": "Data Structures",
     "timestamp": ISODate,
     "co_attainments": [
       {"co_number": 1, "attainment": 78.5, "students_above_threshold": 45},
       {"co_number": 2, "attainment": 82.1, "students_above_threshold": 48}
     ],
     "overall_attainment": 80.3,
     "bloom_distribution": {
       "Remember": 2,
       "Understand": 1,
       "Apply": 2,
       "Analyze": 1,
       "Evaluate": 0,
       "Create": 0
     }
   }
   ```

2. **attainment_by_student** - Individual student performance
   ```json
   {
     "_id": ObjectId,
     "student_id": "uuid-string",
     "course_id": "uuid-string",
     "usn": "1CR21CS001",
     "timestamp": ISODate,
     "co_scores": [
       {"co_number": 1, "marks": 18, "max_marks": 20, "percentage": 90},
       {"co_number": 2, "marks": 15, "max_marks": 20, "percentage": 75}
     ],
     "overall_percentage": 82.5
   }
   ```

3. **module_performance** - Module-wise analytics
   ```json
   {
     "_id": ObjectId,
     "course_id": "uuid-string",
     "module_number": 1,
     "timestamp": ISODate,
     "avg_marks": 75.5,
     "max_marks": 100,
     "student_count": 60,
     "co_coverage": [1, 2, 3]
   }
   ```

4. **student_progress** - Longitudinal tracking
   ```json
   {
     "_id": ObjectId,
     "student_id": "uuid-string",
     "course_id": "uuid-string",
     "assessment_date": ISODate,
     "assessment_type": "AAT1",
     "marks_obtained": 45,
     "max_marks": 50,
     "cumulative_percentage": 78.2
   }
   ```

5. **teacher_activity_log** - Teacher actions audit log
   ```json
   {
     "_id": ObjectId,
     "teacher_id": "uuid-string",
     "action": "generated_cos",
     "course_id": "uuid-string",
     "course_code": "CS101",
     "details": {"num_cos": 5, "method": "ai_generated"},
     "timestamp": ISODate
   }
   ```

---

## API Changes

### Backend (Node.js - Port 8080)
**No Changes Needed** - Already working correctly
- All CRUD operations use course `id` (UUID)
- Authentication, course management, upload, student management

### CO Generator (FastAPI - Port 8085)
**Major Changes Required**

#### OLD (Current - Uses course_code)
```python
@router.post("/upload")
async def upload_syllabus(
    file: UploadFile,
    course_code: str = Form(...),
    course_name: str = Form(None)
):
    # Uses course_code string
    await rag.ingest_syllabus_async(
        file_path=temp_path,
        course_code=course_code,
        course_name=course_name
    )
```

#### NEW (Fixed - Uses course_id + fetches course_code from DB)
```python
@router.post("/upload")
async def upload_syllabus(
    file: UploadFile,
    course_id: str = Form(...),  # UUID from frontend
    teacher_id: str = Form(...)
):
    # 1. Fetch course from PostgreSQL
    course = await get_course_by_id(course_id)
    if not course:
        raise HTTPException(404, "Course not found")

    course_code = course['code']
    course_name = course['name']

    # 2. Log to database
    logger.info(f"[UPLOAD] Course: {course_code} ({course_id}) | Teacher: {teacher_id}")

    # 3. Ingest using course_code for ChromaDB
    await rag.ingest_syllabus_async(
        file_path=temp_path,
        course_code=course_code,
        course_name=course_name
    )

    # 4. Store metadata in MongoDB
    await store_upload_metadata(course_id, teacher_id, file.filename)
```

#### NEW Endpoints (Match Frontend Expectations)
```python
# Add these endpoints that use course_id as path param
@router.get("/list/{course_id}")
async def list_cos_by_course_id(course_id: str):
    """List COs for a course using course_id (UUID)"""
    # 1. Fetch course from PostgreSQL
    course = await get_course_by_id(course_id)
    # 2. Fetch COs from course_outcomes table
    cos = await get_cos_from_db(course_id)
    # 3. Return formatted list
    return {"course_id": course_id, "co_list": cos}

@router.get("/stats/{course_id}")
async def get_course_stats_by_id(course_id: str):
    """Get stats for a course using course_id (UUID)"""
    # 1. Fetch course from PostgreSQL
    course = await get_course_by_id(course_id)
    # 2. Get ingestion stats from ChromaDB
    rag_stats = get_rag_stats(course['code'])
    # 3. Get CO count from PostgreSQL
    co_count = await count_cos(course_id)
    # 4. Return combined stats
    return {
        "course_id": course_id,
        "course_code": course['code'],
        "co_count": co_count,
        "chunks": rag_stats['chunks'],
        "last_updated": course['updated_at']
    }
```

---

## Logging Strategy

### 1. Request/Response Logging
Every API call should log:
- Timestamp
- Endpoint
- User ID / Teacher ID / Student ID
- Request params/body (sanitized)
- Response status
- Execution time

### 2. Database Query Logging
- Every PostgreSQL query logged with duration
- Every MongoDB operation logged
- Errors logged with full stack trace

### 3. Business Logic Logging
- Course creation: "Created course CS101 (uuid) by teacher xyz"
- CO generation: "Generated 5 COs for course CS101 in 2.3s"
- Upload: "Uploaded syllabus.pdf (2.5MB) for course CS101"
- Assessment upload: "Uploaded AAT1 marks for 60 students in course CS101"

### 4. Log Format (Structured JSON)
```json
{
  "timestamp": "2025-01-05T10:30:45.123Z",
  "level": "INFO",
  "service": "co-generator",
  "endpoint": "POST /api/co/upload",
  "user_id": "uuid-string",
  "course_id": "uuid-string",
  "course_code": "CS101",
  "action": "upload_syllabus",
  "duration_ms": 1234,
  "status": "success",
  "message": "Uploaded syllabus.pdf (2.5MB)",
  "metadata": {
    "file_size": 2621440,
    "file_name": "syllabus.pdf"
  }
}
```

---

## Implementation Steps

### Phase 1: Database Schema Updates ✓
1. ✅ Review existing PostgreSQL schema
2. Create migration 003 for any missing fields
3. Update MongoDB collection schemas

### Phase 2: Backend (Node.js) Logging
1. Add request logging middleware
2. Add PostgreSQL query logger
3. Add MongoDB operation logger
4. Add business logic logging in controllers

### Phase 3: CO Generator (FastAPI) Refactoring
1. Add PostgreSQL database service
2. Update `/upload` to accept course_id
3. Add `/list/{course_id}` endpoint
4. Add `/stats/{course_id}` endpoint
5. Add comprehensive logging
6. Update `/generate` to use course_id

### Phase 4: Frontend Updates
1. Update coGeneratorAPI.js to match new endpoints
2. Test upload flow
3. Test generate flow
4. Test list/stats flow

### Phase 5: Testing
1. End-to-end upload test
2. End-to-end generation test
3. Verify all logs are working
4. Load test with multiple concurrent users

---

## Migration Guide

### For Existing Data
If you have existing data in ChromaDB using course_code:
1. Keep course_code as metadata in ChromaDB (no change needed)
2. Map course_id → course_code via PostgreSQL lookup
3. All new operations use course_id externally, course_code internally

### Backward Compatibility
- Keep old `/list?course_code=X` endpoint (deprecated)
- Keep old `/stats?course_code=X` endpoint (deprecated)
- Add warnings in logs: "Deprecated endpoint used, migrate to /list/{course_id}"

---

## Success Criteria
- ✅ Upload button works without errors
- ✅ COs can be generated successfully
- ✅ Frontend can list COs for a course
- ✅ Frontend can view stats for a course
- ✅ All database operations are logged
- ✅ All API calls are logged
- ✅ No 404 errors on legitimate requests
- ✅ Clear error messages for all failures
