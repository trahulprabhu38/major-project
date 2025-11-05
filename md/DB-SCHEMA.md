# Database Schema Documentation

## Overview

The OBE CO/PO Attainment System uses a **hybrid database architecture**:

- **PostgreSQL** - Relational data (users, courses, COs, assessments, marks)
- **MongoDB** - Analytics, activity logs, cached aggregations
- **ChromaDB** - Vector embeddings for RAG-based CO generation

---

## PostgreSQL Schema

### Database: `edu`

Total Tables: **13**

---

## 1. Core Tables

### 1.1 `users` - User Management

Stores all users (students, teachers, admins) in the system.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    name VARCHAR(255) NOT NULL,
    usn VARCHAR(50) UNIQUE,              -- University Serial Number (for students)
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `users_pkey` (PRIMARY KEY on `id`)
- `users_email_key` (UNIQUE on `email`)
- `users_usn_key` (UNIQUE on `usn`)
- `idx_users_email` (on `email`)
- `idx_users_role` (on `role`)
- `idx_users_usn` (on `usn`)

**Constraints**:
- `users_role_check`: Role must be 'student', 'teacher', or 'admin'

**Referenced By**:
- `courses.teacher_id`
- `course_outcomes.teacher_id`
- `student_scores.student_id`
- `students_courses.student_id`

**Example Data**:
```json
{
  "id": "70ee5a52-7b64-4cc9-8920-1d8830f04838",
  "email": "teacher@example.com",
  "role": "teacher",
  "name": "Rahul Prabhu",
  "department": "Computer Science"
}
```

---

### 1.2 `courses` - Course Master

Stores all courses offered in the institution.

```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,    -- Course code (e.g., "DS1", "CS101")
    name VARCHAR(255) NOT NULL,
    description TEXT,
    semester INTEGER NOT NULL,
    year INTEGER NOT NULL,
    credits INTEGER DEFAULT 3,
    department VARCHAR(100),
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `courses_pkey` (PRIMARY KEY on `id`)
- `courses_code_key` (UNIQUE on `code`)
- `idx_courses_teacher` (on `teacher_id`)
- `idx_courses_semester_year` (on `semester`, `year`)

**Foreign Keys**:
- `teacher_id` → `users(id)` ON DELETE SET NULL

**Referenced By**:
- `course_outcomes.course_id`
- `assessments.course_id`
- `students_courses.course_id`
- `co_attainment.course_id`
- `po_attainment.course_id`

**Example Data**:
```json
{
  "id": "9949c1ca-47db-4c8f-af42-be763f0ad84a",
  "code": "DS1",
  "name": "Data Structures and Algorithms",
  "semester": 5,
  "year": 2025,
  "credits": 4,
  "department": "Computer Science",
  "teacher_id": "70ee5a52-7b64-4cc9-8920-1d8830f04838"
}
```

---

### 1.3 `course_outcomes` - Course Outcomes (COs)

Stores Course Outcomes - both manually created and AI-generated.

```sql
CREATE TABLE course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,          -- CO1, CO2, CO3, etc.
    description TEXT NOT NULL,           -- Legacy field
    co_text TEXT,                        -- AI-generated CO text (preferred)
    bloom_level VARCHAR(50),             -- Remember, Understand, Apply, Analyze, Evaluate, Create
    module_number INTEGER,               -- Which module this CO belongs to
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified BOOLEAN DEFAULT FALSE,      -- Teacher verification flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_id, co_number)
);
```

**Indexes**:
- `course_outcomes_pkey` (PRIMARY KEY on `id`)
- `course_outcomes_course_id_co_number_key` (UNIQUE on `course_id`, `co_number`)
- `idx_cos_course` (on `course_id`)

**Foreign Keys**:
- `course_id` → `courses(id)` ON DELETE CASCADE
- `teacher_id` → `users(id)` ON DELETE SET NULL

**Referenced By**:
- `questions.co_id`
- `co_po_mapping.co_id`
- `co_attainment.co_id`

**Bloom Levels**:
1. **Remember** - Recall facts and basic concepts
2. **Understand** - Explain ideas or concepts
3. **Apply** - Use information in new situations
4. **Analyze** - Draw connections among ideas
5. **Evaluate** - Justify a decision or course of action
6. **Create** - Produce new or original work

**Example Data**:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "course_id": "9949c1ca-47db-4c8f-af42-be763f0ad84a",
  "co_number": 1,
  "co_text": "Analyze the time and space complexity of algorithms using Big-O notation",
  "bloom_level": "Analyze",
  "module_number": 1,
  "teacher_id": "70ee5a52-7b64-4cc9-8920-1d8830f04838",
  "verified": false
}
```

---

### 1.4 `program_outcomes` - Program Outcomes (POs)

Stores institution-wide Program Outcomes.

```sql
CREATE TABLE program_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number INTEGER UNIQUE NOT NULL,   -- PO1, PO2, PO3, etc.
    description TEXT NOT NULL,
    category VARCHAR(100),               -- 'technical', 'professional', 'communication'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `program_outcomes_pkey` (PRIMARY KEY on `id`)

**Referenced By**:
- `co_po_mapping.po_id`
- `question_po_mapping.po_id`
- `po_attainment.po_id`

**Example Data**:
```json
{
  "id": "po-uuid-1",
  "po_number": 1,
  "description": "Engineering knowledge: Apply knowledge of mathematics, science, engineering fundamentals...",
  "category": "technical"
}
```

---

### 1.5 `co_po_mapping` - CO-PO Mapping

Maps Course Outcomes to Program Outcomes with correlation levels.

```sql
CREATE TABLE co_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    correlation_level INTEGER CHECK (correlation_level BETWEEN 1 AND 3),
    -- 1 = Low, 2 = Medium, 3 = High correlation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(co_id, po_id)
);
```

**Indexes**:
- `co_po_mapping_pkey` (PRIMARY KEY on `id`)
- `idx_co_po_mapping_co` (on `co_id`)
- `idx_co_po_mapping_po` (on `po_id`)

**Foreign Keys**:
- `co_id` → `course_outcomes(id)` ON DELETE CASCADE
- `po_id` → `program_outcomes(id)` ON DELETE CASCADE

---

### 1.6 `students_courses` - Student Enrollment

Tracks which students are enrolled in which courses.

```sql
CREATE TABLE students_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),

    UNIQUE(student_id, course_id)
);
```

**Indexes**:
- `students_courses_pkey` (PRIMARY KEY on `id`)
- `idx_enrollment_student` (on `student_id`)
- `idx_enrollment_course` (on `course_id`)

**Foreign Keys**:
- `student_id` → `users(id)` ON DELETE CASCADE
- `course_id` → `courses(id)` ON DELETE CASCADE

---

## 2. Assessment Tables

### 2.1 `assessments` - Assessment Master

Stores all assessments (exams, assignments, labs, projects).

```sql
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,           -- 'AAT', 'CIE', 'LAB', 'ASSIGNMENT', 'PROJECT'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_date DATE NOT NULL,
    max_marks NUMERIC(5,2) NOT NULL,
    weightage NUMERIC(5,2) DEFAULT 1.0,  -- Weight in final calculation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `assessments_pkey` (PRIMARY KEY on `id`)
- `idx_assessments_course` (on `course_id`)
- `idx_assessments_type` (on `type`)

**Foreign Keys**:
- `course_id` → `courses(id)` ON DELETE CASCADE

**Referenced By**:
- `questions.assessment_id`
- `co_attainment.assessment_id`

**Assessment Types**:
- **AAT** - Alternative Assessment Test (Internal exam)
- **CIE** - Continuous Internal Evaluation
- **LAB** - Laboratory practical
- **ASSIGNMENT** - Home assignment
- **PROJECT** - Course project

**Example Data**:
```json
{
  "id": "assessment-uuid-1",
  "course_id": "9949c1ca-47db-4c8f-af42-be763f0ad84a",
  "type": "AAT",
  "name": "AAT 1 - Data Structures",
  "assessment_date": "2025-02-15",
  "max_marks": 50.00,
  "weightage": 1.0
}
```

---

### 2.2 `questions` - Assessment Questions

Stores individual questions in each assessment.

```sql
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT,
    max_marks NUMERIC(5,2) NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(assessment_id, question_number)
);
```

**Indexes**:
- `questions_pkey` (PRIMARY KEY on `id`)
- `questions_assessment_id_question_number_key` (UNIQUE)
- `idx_questions_assessment` (on `assessment_id`)
- `idx_questions_co` (on `co_id`)

**Foreign Keys**:
- `assessment_id` → `assessments(id)` ON DELETE CASCADE
- `co_id` → `course_outcomes(id)` ON DELETE SET NULL

**Referenced By**:
- `student_scores.question_id`
- `question_po_mapping.question_id`

**Example Data**:
```json
{
  "id": "question-uuid-1",
  "assessment_id": "assessment-uuid-1",
  "question_number": 1,
  "question_text": "Explain the time complexity of binary search",
  "max_marks": 5.00,
  "co_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

### 2.3 `student_scores` - Student Marks

Stores marks obtained by students for each question.

```sql
CREATE TABLE student_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, question_id)
);
```

**Indexes**:
- `student_scores_pkey` (PRIMARY KEY on `id`)
- `student_scores_student_id_question_id_key` (UNIQUE)
- `idx_scores_student` (on `student_id`)
- `idx_scores_question` (on `question_id`)

**Foreign Keys**:
- `student_id` → `users(id)` ON DELETE CASCADE
- `question_id` → `questions(id)` ON DELETE CASCADE

**Example Data**:
```json
{
  "id": "score-uuid-1",
  "student_id": "d3780d16-3ad8-46c3-ad61-acc8f3e69c4c",
  "question_id": "question-uuid-1",
  "marks_obtained": 4.50
}
```

---

### 2.4 `question_po_mapping` - Question-PO Mapping

Maps questions to Program Outcomes.

```sql
CREATE TABLE question_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,

    UNIQUE(question_id, po_id)
);
```

**Indexes**:
- `question_po_mapping_pkey` (PRIMARY KEY on `id`)
- `idx_question_po_question` (on `question_id`)
- `idx_question_po_po` (on `po_id`)

**Foreign Keys**:
- `question_id` → `questions(id)` ON DELETE CASCADE
- `po_id` → `program_outcomes(id)` ON DELETE CASCADE

---

## 3. Attainment Tables (Cached Results)

### 3.1 `co_attainment` - CO Attainment Cache

Stores calculated CO attainment percentages (cached for performance).

```sql
CREATE TABLE co_attainment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    attainment_percentage NUMERIC(5,2) NOT NULL,
    total_students INTEGER NOT NULL,
    students_above_threshold INTEGER NOT NULL,
    threshold_percentage NUMERIC(5,2) DEFAULT 60.0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_id, co_id, assessment_id)
);
```

**Indexes**:
- `co_attainment_pkey` (PRIMARY KEY on `id`)
- `idx_co_attainment_course` (on `course_id`)
- `idx_co_attainment_co` (on `co_id`)

**Foreign Keys**:
- `course_id` → `courses(id)` ON DELETE CASCADE
- `co_id` → `course_outcomes(id)` ON DELETE CASCADE
- `assessment_id` → `assessments(id)` ON DELETE CASCADE

---

### 3.2 `po_attainment` - PO Attainment Cache

Stores calculated PO attainment levels (cached for performance).

```sql
CREATE TABLE po_attainment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    attainment_level NUMERIC(5,2) NOT NULL,
    calculation_method VARCHAR(50),      -- 'direct', 'indirect', 'combined'
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_id, po_id)
);
```

**Indexes**:
- `po_attainment_pkey` (PRIMARY KEY on `id`)
- `idx_po_attainment_course` (on `course_id`)
- `idx_po_attainment_po` (on `po_id`)

**Foreign Keys**:
- `course_id` → `courses(id)` ON DELETE CASCADE
- `po_id` → `program_outcomes(id)` ON DELETE CASCADE

---

## 4. Additional Tables

### 4.1 `marks_test1` - Test Data Table

Temporary table for testing mark uploads (should be removed in production).

---

## PostgreSQL Relationships Diagram

```
users (teachers/students)
  ↓
  ├─→ courses (teaches)
  │     ↓
  │     ├─→ course_outcomes (has COs)
  │     │     ↓
  │     │     ├─→ co_po_mapping (maps to POs)
  │     │     └─→ co_attainment (attainment results)
  │     │
  │     ├─→ assessments (has assessments)
  │     │     ↓
  │     │     └─→ questions (has questions)
  │     │           ↓
  │     │           ├─→ student_scores (student answers)
  │     │           └─→ question_po_mapping (maps to POs)
  │     │
  │     └─→ students_courses (enrollment)
  │
  └─→ program_outcomes (institution-wide POs)
        ↓
        └─→ po_attainment (attainment results)
```

---

## MongoDB Schema

### Database: `edu_analytics`

Total Collections: **10**

---

## 1. Activity & Audit Collections

### 1.1 `teacher_activity_log` - Teacher Activity Audit

Logs all teacher actions in the system.

**Schema**:
```javascript
{
  _id: ObjectId,
  teacher_id: String,        // UUID of teacher
  teacher_name: String,
  action: String,            // Action type
  entity_type: String,       // 'course', 'student', 'assessment', 'co'
  entity_id: String,         // UUID of entity
  course_code: String,       // Course code (if applicable)
  course_name: String,       // Course name (if applicable)
  details: Object,           // Additional action details
  timestamp: ISODate
}
```

**Actions**:
- `uploaded_syllabus` - Teacher uploaded a syllabus
- `generated_cos` - Teacher generated COs
- `student_enroll` - Teacher enrolled students
- `created_assessment` - Teacher created assessment
- `uploaded_marks` - Teacher uploaded marks

**Indexes**:
- `teacher_id_1_timestamp_-1`
- `course_id_1`

**Example Document**:
```json
{
  "_id": ObjectId("6909fff59909e89e5a22bd6d"),
  "teacher_id": "70ee5a52-7b64-4cc9-8920-1d8830f04838",
  "teacher_name": "Rahul Prabhu",
  "action": "uploaded_syllabus",
  "course_id": "9949c1ca-47db-4c8f-af42-be763f0ad84a",
  "course_code": "DS1",
  "course_name": "Data Structures",
  "details": {
    "filename": "syllabus.pdf",
    "file_size": 245632,
    "file_type": ".pdf"
  },
  "timestamp": ISODate("2025-11-04T19:10:45.123Z")
}
```

---

### 1.2 `upload_metadata` - File Upload Tracking

Tracks all syllabus file uploads.

**Schema**:
```javascript
{
  _id: ObjectId,
  course_id: String,         // UUID of course
  course_code: String,       // Course code (e.g., "DS1")
  teacher_id: String,        // UUID of teacher
  filename: String,          // Original filename
  file_size: Number,         // File size in bytes
  file_type: String,         // File extension (.pdf, .docx, etc.)
  timestamp: ISODate,
  status: String             // 'uploaded', 'processing', 'completed', 'failed'
}
```

**Example Document**:
```json
{
  "_id": ObjectId("690a001234567890abcdef12"),
  "course_id": "9949c1ca-47db-4c8f-af42-be763f0ad84a",
  "course_code": "DS1",
  "teacher_id": "70ee5a52-7b64-4cc9-8920-1d8830f04838",
  "filename": "ds1_syllabus.pdf",
  "file_size": 245632,
  "file_type": ".pdf",
  "timestamp": ISODate("2025-11-04T19:10:45.123Z"),
  "status": "completed"
}
```

---

## 2. CO Generation Collections

### 2.1 `co_generation_metadata` - CO Generation History

Stores metadata about CO generation sessions.

**Schema**:
```javascript
{
  _id: ObjectId,
  course_id: String,         // UUID of course
  course_code: String,       // Course code
  teacher_id: String,        // UUID of teacher
  num_cos: Number,           // Number of COs generated
  bloom_distribution: Object, // Count by Bloom level
  generation_time_ms: Number,
  prompt_tokens: Number,     // LLM token usage
  gen_tokens: Number,
  total_tokens: Number,
  temperature: Number,       // LLM temperature used
  timestamp: ISODate,
  cos: Array                 // Full CO list with details
}
```

**Example Document**:
```json
{
  "_id": ObjectId("690a123456789abcdef01234"),
  "course_id": "9949c1ca-47db-4c8f-af42-be763f0ad84a",
  "course_code": "DS1",
  "teacher_id": "70ee5a52-7b64-4cc9-8920-1d8830f04838",
  "num_cos": 6,
  "bloom_distribution": {
    "Analyze": 2,
    "Apply": 2,
    "Evaluate": 1,
    "Create": 1
  },
  "generation_time_ms": 2345.67,
  "prompt_tokens": 1234,
  "gen_tokens": 567,
  "total_tokens": 1801,
  "temperature": 0.3,
  "timestamp": ISODate("2025-11-04T19:15:30.456Z"),
  "cos": [
    {
      "number": 1,
      "text": "Analyze the time and space complexity of algorithms",
      "bloom_level": { "level": 4, "name": "Analyze" }
    },
    // ... more COs
  ]
}
```

---

## 3. Analytics Collections

### 3.1 `attainment_by_course` - Course-Level Analytics

Aggregated attainment data for courses (time-series).

**Schema**:
```javascript
{
  _id: ObjectId,
  course_id: String,         // UUID of course
  course_code: String,
  course_name: String,
  timestamp: ISODate,
  co_attainments: [
    {
      co_number: Number,
      attainment: Number,    // Percentage
      students_above_threshold: Number
    }
  ],
  overall_attainment: Number,
  bloom_distribution: Object
}
```

**Indexes**:
- `course_id_1_timestamp_-1_co_id_1`

---

### 3.2 `attainment_by_student` - Student-Level Analytics

Individual student performance tracking.

**Schema**:
```javascript
{
  _id: ObjectId,
  student_id: String,        // UUID of student
  course_id: String,
  usn: String,               // Student USN
  timestamp: ISODate,
  co_scores: [
    {
      co_number: Number,
      marks: Number,
      max_marks: Number,
      percentage: Number
    }
  ],
  overall_percentage: Number
}
```

**Indexes**:
- `student_id_1_course_id_1_timestamp_-1`

---

### 3.3 `module_performance` - Module-Wise Analytics

Performance tracking by course modules.

**Schema**:
```javascript
{
  _id: ObjectId,
  course_id: String,
  module_number: Number,
  timestamp: ISODate,
  avg_marks: Number,
  max_marks: Number,
  student_count: Number,
  co_coverage: [Number]      // Which COs are covered in this module
}
```

**Indexes**:
- `course_id_1_module_number_1_timestamp_-1`

---

### 3.4 `student_progress` - Longitudinal Student Tracking

Tracks student progress over time across assessments.

**Schema**:
```javascript
{
  _id: ObjectId,
  student_id: String,
  course_id: String,
  assessment_date: ISODate,
  assessment_type: String,   // 'AAT1', 'AAT2', 'CIE', etc.
  marks_obtained: Number,
  max_marks: Number,
  cumulative_percentage: Number
}
```

**Indexes**:
- `student_id_1_course_id_1_assessment_date_-1`

---

### 3.5 `po_attainment` - PO Attainment Analytics

PO-level attainment tracking (separate from PostgreSQL cache).

**Schema**:
```javascript
{
  _id: ObjectId,
  course_id: String,
  po_id: String,
  po_number: Number,
  timestamp: ISODate,
  attainment_level: Number,
  contributing_cos: [        // Which COs contributed to this PO
    {
      co_id: String,
      co_number: Number,
      correlation_level: Number
    }
  ]
}
```

**Indexes**:
- `course_id_1_po_id_1_timestamp_-1`

---

## 4. User Metadata Collections

### 4.1 `teachers` - Teacher Metadata

Additional metadata for teachers (extends PostgreSQL users table).

**Schema**:
```javascript
{
  _id: ObjectId,
  teacher_id: String,        // UUID from PostgreSQL
  email: String,
  name: String,
  department: String,
  specialization: String,
  courses_taught: [String],  // Array of course codes
  total_students: Number,
  created_at: ISODate
}
```

**Indexes**:
- `teacher_id_1`

---

### 4.2 `teacher_metadata` - Extended Teacher Info

Additional teacher information and preferences.

**Schema**:
```javascript
{
  _id: ObjectId,
  teacher_id: String,
  preferences: {
    default_co_count: Number,
    default_bloom_distribution: Object,
    notification_settings: Object
  },
  statistics: {
    total_cos_generated: Number,
    total_syllabi_uploaded: Number,
    last_active: ISODate
  }
}
```

**Indexes**:
- `teacher_id_1`

---

## ChromaDB Schema

### Database: `chroma` (Docker volume)

### Collection: `syllabus_contexts`

Stores document embeddings for RAG-based CO generation.

**Document Structure**:
```javascript
{
  id: "DS1_chunk_1762283511583_0",      // Unique document ID
  embedding: [0.123, -0.456, ...],       // 384-dim vector (all-MiniLM-L6-v2)
  document: "String of text content",    // Original text chunk
  metadata: {
    course_id: "DS1",                    // Course code (used for filtering)
    source_file: "ds1_syllabus.pdf",
    chunk_index: 0,
    page: 1                              // Optional (only if available)
  }
}
```

**Key Points**:
- Uses `course_code` (not UUID) for filtering
- Embeddings are L2-normalized for cosine similarity
- Metadata must not contain `null` values

---

## Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │
       ├───────→ POST /api/auth/login ────→ PostgreSQL (users)
       │
       ├───────→ POST /api/courses ───────→ PostgreSQL (courses)
       │
       ├───────→ POST /api/co/upload ─────→ FastAPI (CO Generator)
       │                                        │
       │                                        ├─→ PostgreSQL (validate course)
       │                                        ├─→ MongoDB (store metadata)
       │                                        └─→ ChromaDB (ingest embeddings)
       │
       ├───────→ POST /api/co/generate ───→ FastAPI (CO Generator)
       │                                        │
       │                                        ├─→ ChromaDB (query embeddings)
       │                                        ├─→ Groq API (generate COs)
       │                                        ├─→ PostgreSQL (save COs)
       │                                        └─→ MongoDB (log activity)
       │
       └───────→ GET /api/co/list/{code} ─→ PostgreSQL (fetch COs)
```

---

## Database Size Estimates

### PostgreSQL Tables (Production Estimates)

| Table | Rows (Year 1) | Size |
|-------|--------------|------|
| users | ~1,000 | 500 KB |
| courses | ~200 | 100 KB |
| course_outcomes | ~1,200 | 500 KB |
| assessments | ~800 | 400 KB |
| questions | ~8,000 | 4 MB |
| student_scores | ~240,000 | 50 MB |
| students_courses | ~10,000 | 2 MB |
| co_attainment | ~4,800 | 2 MB |
| **Total** | **~265,000** | **~60 MB** |

### MongoDB Collections

| Collection | Documents | Size |
|-----------|-----------|------|
| teacher_activity_log | ~5,000 | 2 MB |
| co_generation_metadata | ~500 | 1 MB |
| upload_metadata | ~500 | 200 KB |
| attainment_by_course | ~1,000 | 500 KB |
| **Total** | **~7,000** | **~4 MB** |

### ChromaDB

| Collection | Documents | Size |
|-----------|-----------|------|
| syllabus_contexts | ~3,000 chunks | ~15 MB |

---

## Backup Strategy

### PostgreSQL Backup
```bash
# Daily backup
docker exec postgres pg_dump -U admin edu > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i postgres psql -U admin edu < backup_20251104.sql
```

### MongoDB Backup
```bash
# Backup
docker exec mongodb mongodump --db edu_analytics --out /backup

# Restore
docker exec mongodb mongorestore --db edu_analytics /backup/edu_analytics
```

### ChromaDB Backup
```bash
# Backup (copy volume)
docker cp chromadb:/chroma/chroma ./chroma_backup

# Restore
docker cp ./chroma_backup chromadb:/chroma/chroma
```

---

## Maintenance

### Indexes to Monitor
- `idx_scores_student` - Heavy usage during analytics
- `idx_questions_co` - Used for CO attainment calculation
- `teacher_activity_log` indexes - High insert rate

### Tables to Vacuum (PostgreSQL)
- `student_scores` - Frequent updates
- `co_attainment` - Cache table, recalculated often
- `po_attainment` - Cache table

### Collections to Monitor (MongoDB)
- `teacher_activity_log` - Consider TTL index for old logs
- `co_generation_metadata` - Archive old generations

---

## Security Considerations

1. **Password Storage**: Use bcrypt hashing (already implemented)
2. **SQL Injection**: Use parameterized queries (already implemented)
3. **Access Control**: Enforce role-based access
4. **Data Encryption**: Consider encrypting student scores at rest
5. **Audit Logs**: Keep `teacher_activity_log` for compliance

---

## Summary

**PostgreSQL (edu)**:
- 13 tables
- Stores: Users, Courses, COs, Assessments, Marks, Attainment
- Total size: ~60 MB (Year 1)

**MongoDB (edu_analytics)**:
- 10 collections
- Stores: Activity logs, analytics, cached aggregations
- Total size: ~4 MB (Year 1)

**ChromaDB (chroma)**:
- 1 collection: `syllabus_contexts`
- Stores: Document embeddings for RAG
- Total size: ~15 MB (200 syllabi)

---

## Quick Reference

### Get Course by Code
```sql
SELECT * FROM courses WHERE code = 'DS1';
```

### Get All COs for a Course
```sql
SELECT co_number, co_text, bloom_level, verified
FROM course_outcomes
WHERE course_id = (SELECT id FROM courses WHERE code = 'DS1')
ORDER BY co_number;
```

### Get Student's Scores for a Course
```sql
SELECT
  u.name,
  u.usn,
  q.question_number,
  ss.marks_obtained,
  q.max_marks
FROM student_scores ss
JOIN users u ON ss.student_id = u.id
JOIN questions q ON ss.question_id = q.id
JOIN assessments a ON q.assessment_id = a.id
WHERE a.course_id = (SELECT id FROM courses WHERE code = 'DS1')
  AND u.usn = '1CR21CS001';
```

### Get Teacher Activity (MongoDB)
```javascript
db.teacher_activity_log.find({
  teacher_id: "70ee5a52-7b64-4cc9-8920-1d8830f04838"
}).sort({ timestamp: -1 }).limit(10)
```

### Get CO Generation History (MongoDB)
```javascript
db.co_generation_metadata.find({
  course_code: "DS1"
}).sort({ timestamp: -1 }).limit(5)
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Database Version**: PostgreSQL 16, MongoDB 7.0, ChromaDB 0.4.24
