# Microservices Architecture Documentation

## Overview
This document explains what each microservice does, how they communicate, and their individual responsibilities.

---

## Service Map

```
USER REQUEST
     |
     v
┌────────────────────┐
│  FRONTEND SERVICE  │  React SPA - User Interface Layer
└────────┬───────────┘
         |
         |---(HTTP REST)---> ┌─────────────────┐
         |                   │ BACKEND SERVICE │  Main Business Logic
         |                   └────────┬────────┘
         |                            |
         |                   ┌────────┴────────┐
         |                   |                 |
         |              PostgreSQL         MongoDB
         |              (Transactions)     (Analytics)
         |
         |---(HTTP REST)---> ┌──────────────────┐
         |                   │ UPLOAD SERVICE   │  File Processing
         |                   └────────┬─────────┘
         |                            |
         |                       PostgreSQL
         |                   (Dynamic Tables)
         |
         `---(HTTP REST)---> ┌──────────────────┐
                             │ CO GENERATOR     │  AI-Powered Service
                             └────────┬─────────┘
                                      |
                             ┌────────┴────────┐
                             |                 |
                        PostgreSQL         ChromaDB
                        (Courses)      (Vector Embeddings)
```

---

## 1. Frontend Service (React SPA)

### **Location:** `edu-frontend/`
### **Port:** 5173
### **Technology:** React 19 + Vite + Material-UI

### What It Does:
- Renders the user interface (UI) for students, teachers, and admins
- Handles user interactions and form submissions
- Displays data visualizations (charts, graphs, tables)
- Manages client-side routing (pages, navigation)
- Stores JWT authentication token
- Makes HTTP requests to backend services

### Key Features:

#### Teacher Interface:
- **Dashboard:** Overview of courses, enrollments, recent activity
- **Course Management:** Create/edit courses, manage COs/POs
- **CO Generator:** Upload syllabus, generate course outcomes using AI
- **Marks Upload:** Upload student marks via CSV/Excel files
- **Attainment Dashboard:** View CO/PO attainment charts
- **Analytics:** Course-level performance metrics

#### Student Interface:
- **Dashboard:** Enrolled courses, recent grades
- **Course Enrollment:** Browse and enroll in available courses
- **Performance Analytics:** View individual CO/PO attainment
- **Grades:** View marks for all assessments

### How It Communicates:

**1. With Backend Service:**
```javascript
// Login request
axios.post('http://localhost:8080/api/auth/login', {
  email: 'teacher@example.com',
  password: 'password'
})

// Get courses
axios.get('http://localhost:8080/api/courses', {
  headers: { Authorization: 'Bearer <token>' }
})
```

**2. With Upload Service:**
```javascript
// Upload marksheet file
const formData = new FormData();
formData.append('file', file);
axios.post('http://localhost:8001/upload', formData)
```

**3. With CO Generator:**
```javascript
// Generate course outcomes
axios.post('http://localhost:8085/api/co/generate', {
  course_code: 'CS101',
  num_cos: 5
})
```

### File Structure:
```
edu-frontend/src/
├── pages/
│   ├── teacher/          # Teacher-specific pages
│   │   ├── Dashboard.jsx
│   │   ├── COGenerator.jsx
│   │   └── AttainmentDashboard.jsx
│   └── student/          # Student-specific pages
│       ├── Dashboard.jsx
│       └── CourseAnalytics.jsx
├── services/
│   └── api.js            # API service layer (all HTTP requests)
└── contexts/
    └── AuthContext.jsx   # Authentication state management
```

---

## 2. Backend Service (Main API Server)

### **Location:** `backend/`
### **Port:** 8080
### **Technology:** Node.js 20 + Express.js

### What It Does:
- **Authentication & Authorization:** Handles user login, registration, JWT token generation
- **Course Management:** CRUD operations for courses
- **Assessment Management:** Create assessments (AAT, CIE, LAB, SEE), manage questions
- **CO/PO Mapping:** Map course outcomes to program outcomes
- **Attainment Calculation:** Calculate CO/PO attainment percentages based on student scores
- **Student Enrollment:** Enroll students in courses
- **Analytics:** Generate course and student analytics
- **File Uploads:** Handle CSV/Excel file uploads for marks

### Key Responsibilities:

#### 1. Authentication (`/api/auth`)
```javascript
POST /api/auth/register  → Register new user
POST /api/auth/login     → Login and get JWT token
GET  /api/auth/profile   → Get current user info
```

#### 2. Course Management (`/api/courses`)
```javascript
POST   /api/courses           → Create course
GET    /api/courses           → Get all courses
GET    /api/courses/:id       → Get course details
PUT    /api/courses/:id       → Update course
DELETE /api/courses/:id       → Delete course
GET    /api/courses/:id/analytics → Get course analytics
```

#### 3. Assessment Management (`/api/assessments`)
```javascript
POST /api/assessments                      → Create assessment
GET  /api/assessments/:id                  → Get assessment
POST /api/assessments/:id/questions        → Add questions
POST /api/assessments/:id/calculate        → Calculate CO/PO attainment
```

#### 4. Student Operations (`/api/students`)
```javascript
GET  /api/students/:id/courses             → Get enrolled courses
POST /api/students/:id/enroll              → Enroll in course
GET  /api/students/:id/performance         → Get performance data
```

### How It Uses Databases:

**PostgreSQL (Transactional Data):**
```javascript
// Example: Get course with enrollments
const result = await pool.query(`
  SELECT c.*, COUNT(sc.student_id) as enrollment_count
  FROM courses c
  LEFT JOIN students_courses sc ON c.id = sc.course_id
  WHERE c.teacher_id = $1
  GROUP BY c.id
`, [teacherId]);
```

**MongoDB (Analytics Data):**
```javascript
// Example: Store course analytics
const mongoDb = getMongoDb();
await mongoDb.collection('attainment_by_course').insertOne({
  courseId: 101,
  courseName: 'Data Structures',
  coAttainments: [
    { coNumber: 1, percentage: 78.5 },
    { coNumber: 2, percentage: 82.3 }
  ],
  calculatedAt: new Date()
});
```

### Polyglot Database Usage:

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICE                           │
│                                                              │
│  ┌────────────────────┐         ┌────────────────────┐      │
│  │  PostgreSQL Pool   │         │  MongoDB Client    │      │
│  │  (20 connections)  │         │                    │      │
│  └─────────┬──────────┘         └──────────┬─────────┘      │
│            │                               │                │
│            │ WRITE PATH                    │                │
│            │                               │                │
│  1. Student marks inserted  ──────────────>│                │
│  2. CO attainment calculated               │                │
│  3. Store in co_attainment table           │                │
│  4. Aggregate and push analytics ──────────>│ MongoDB       │
│                                                              │
│            │ READ PATH                     │                │
│            │                               │                │
│  1. Get raw marks <─────────────────────── │                │
│  2. Get aggregated dashboard data <────────│ MongoDB        │
│  3. Combine and return to frontend         │                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Why Both Databases?**
- **PostgreSQL:** Strong consistency, ACID transactions, complex joins (users, courses, marks)
- **MongoDB:** Fast aggregations, flexible schema, analytics dashboards

### Middleware:
- **auth.js:** Verifies JWT token, attaches user to request
- **logging.js:** Logs all requests/responses using Winston

---

## 3. Upload Service (File Processing)

### **Location:** `upload-service/`
### **Port:** 8001
### **Technology:** Python + FastAPI + Pandas

### What It Does:
- Accepts CSV/Excel file uploads
- Parses and validates file data
- **Dynamically creates PostgreSQL tables** based on file columns
- Inserts data into database
- Returns table metadata to backend

### Key Features:

#### Dynamic Table Creation:
When a teacher uploads a marksheet file, this service:
1. Reads the file (CSV or Excel)
2. Analyzes column names and data types
3. Creates a new PostgreSQL table on-the-fly
4. Inserts all rows into the table
5. Stores metadata about the table

**Example:**

Upload file: `cs101_aat1_marks.xlsx`
```
USN        | Student Name | Q1 | Q2 | Q3 | Total
-----------|--------------|----|----|----|-----
1RV21CS001 | John Doe     | 8  | 9  | 7  | 24
1RV21CS002 | Jane Smith   | 9  | 10 | 8  | 27
```

Service creates table: `marksheet_cs101_aat1_1234567890`
```sql
CREATE TABLE marksheet_cs101_aat1_1234567890 (
  id SERIAL PRIMARY KEY,
  usn VARCHAR,
  student_name VARCHAR,
  q1 INTEGER,
  q2 INTEGER,
  q3 INTEGER,
  total INTEGER
);
```

### API Endpoints:

```python
POST /upload
{
  "file": <file>,
  "course_id": 101,
  "assessment_type": "AAT1"
}
Response:
{
  "table_name": "marksheet_cs101_aat1_1234567890",
  "rows_inserted": 60,
  "columns": ["usn", "student_name", "q1", "q2", "q3", "total"]
}
```

### How It Communicates:

**Frontend → Upload Service:**
```javascript
// User uploads file on frontend
const formData = new FormData();
formData.append('file', file);
formData.append('course_id', courseId);

axios.post('http://localhost:8001/upload', formData)
  .then(response => {
    // Table created successfully
    console.log(response.data.table_name);
  });
```

**Upload Service → PostgreSQL:**
```python
# Inside upload service
from sqlalchemy import create_engine
import pandas as pd

# Read uploaded file
df = pd.read_excel(file)

# Create dynamic table based on DataFrame columns
engine = create_engine('postgresql://postgres:password@postgres:5432/edu')
df.to_sql('marksheet_cs101_aat1_1234567890', engine, if_exists='replace')
```

### Why Separate Service?
- **Isolation:** Heavy file processing doesn't block main backend
- **Scalability:** Can scale independently based on upload volume
- **Technology Choice:** Python's Pandas is better for data manipulation than Node.js

---

## 4. CO Generator Service (AI-Powered)

### **Location:** `co-gen/`
### **Port:** 8085
### **Technology:** Python + FastAPI + Groq LLM + ChromaDB

### What It Does:
- Accepts syllabus document uploads (PDF, DOCX, PPTX, TXT)
- Extracts text from documents
- Chunks text into smaller pieces
- Generates vector embeddings using sentence-transformers
- Stores embeddings in ChromaDB
- Uses RAG (Retrieval-Augmented Generation) to generate Course Outcomes
- Generates COs using Groq's Llama 3.1 LLM

### RAG Pipeline:

```
┌────────────────────────────────────────────────────────────┐
│              CO GENERATION WORKFLOW (RAG)                   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. UPLOAD SYLLABUS                                         │
│     Teacher uploads: CS101_Syllabus.pdf                     │
│                                                             │
│  2. TEXT EXTRACTION                                         │
│     Extract text from PDF using pdfplumber                  │
│     Result: "This course covers data structures..."         │
│                                                             │
│  3. CHUNKING                                                │
│     Split text into 400-character chunks with 80 overlap    │
│     Chunk 1: "This course covers data structures..."        │
│     Chunk 2: "...including arrays, linked lists..."         │
│                                                             │
│  4. EMBEDDING GENERATION                                    │
│     Use sentence-transformers to create vectors             │
│     Chunk 1 → [0.234, -0.567, 0.891, ...]                  │
│                                                             │
│  5. STORE IN CHROMADB                                       │
│     collection = chroma.create_collection("syllabus_CS101") │
│     collection.add(documents=chunks, embeddings=vectors)    │
│                                                             │
│  6. GENERATE COs (when teacher clicks "Generate")           │
│     a. Query ChromaDB for relevant syllabus sections        │
│        query = "course learning outcomes"                   │
│        results = collection.query(query, n_results=6)       │
│                                                             │
│     b. Build prompt with retrieved context                  │
│        prompt = f"Syllabus: {results}\nGenerate 5 COs"     │
│                                                             │
│     c. Send to Groq LLM                                     │
│        response = groq.chat.completions.create(             │
│          model="llama-3.1-8b-instant",                      │
│          messages=[{"role": "user", "content": prompt}]     │
│        )                                                    │
│                                                             │
│     d. Parse and return generated COs                       │
│        CO1: Understand fundamental data structures          │
│        CO2: Implement algorithms for searching              │
│        ...                                                  │
│                                                             │
│  7. STORE IN POSTGRESQL                                     │
│     INSERT INTO course_outcomes (course_id, co_number, ...) │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### API Endpoints:

```python
POST /api/co/upload
{
  "file": <syllabus.pdf>,
  "course_code": "CS101"
}
Response:
{
  "message": "Syllabus uploaded and processed",
  "chunks_stored": 45
}
```

```python
POST /api/co/generate
{
  "course_code": "CS101",
  "num_cos": 5
}
Response:
{
  "cos": [
    "CO1: Understand and apply fundamental data structures",
    "CO2: Implement searching and sorting algorithms",
    ...
  ]
}
```

### How It Uses Multiple Databases:

**PostgreSQL (Course Data):**
```python
# Fetch course info
cursor.execute("SELECT id, name FROM courses WHERE code = %s", (course_code,))
course = cursor.fetchone()

# Store generated COs
for i, co in enumerate(generated_cos):
    cursor.execute(
        "INSERT INTO course_outcomes (course_id, co_number, description) VALUES (%s, %s, %s)",
        (course[0], i+1, co)
    )
```

**ChromaDB (Vector Storage):**
```python
# Store syllabus chunks
collection = chroma_client.create_collection(f"syllabus_{course_code}")
collection.add(
    documents=chunks,
    metadatas=[{"course_code": course_code}] * len(chunks),
    ids=[f"chunk_{i}" for i in range(len(chunks))]
)

# Retrieve relevant context
results = collection.query(
    query_texts=["course outcomes and learning objectives"],
    n_results=6
)
context = "\n".join(results['documents'][0])
```

### Why Separate Service?
- **AI/ML Dependencies:** Heavy libraries (PyTorch, transformers)
- **Resource Intensive:** Embedding generation and LLM inference
- **Independent Scaling:** Can scale based on AI usage
- **Technology Choice:** Python ecosystem for AI/ML

---

## Inter-Service Communication Summary

### 1. Frontend Calls All Services

```
┌──────────────┐
│   FRONTEND   │
└──────┬───────┘
       │
       ├──────> Backend (Port 8080)       [JWT Auth, Courses, Assessments]
       ├──────> Upload Service (8001)     [File Uploads]
       └──────> CO Generator (8085)       [AI CO Generation]
```

### 2. Backend Coordinates Data

```
┌──────────────┐
│   BACKEND    │
└──────┬───────┘
       │
       ├──────> PostgreSQL               [Users, Courses, Marks]
       └──────> MongoDB                  [Analytics, Dashboards]
```

### 3. Upload Service Processes Files

```
┌──────────────────┐
│ UPLOAD SERVICE   │
└─────────┬────────┘
          │
          └──────> PostgreSQL            [Dynamic Tables]
```

### 4. CO Generator Uses AI

```
┌──────────────────┐
│  CO GENERATOR    │
└─────────┬────────┘
          │
          ├──────> PostgreSQL            [Courses, Store COs]
          └──────> ChromaDB              [Vector Embeddings, RAG]
```

---

## Why Polyglot Databases?

### PostgreSQL vs MongoDB vs ChromaDB

| Database | Type | Use Case | Example Data |
|----------|------|----------|--------------|
| **PostgreSQL** | Relational | Transactional, normalized data | Users, Courses, Assessments, Marks |
| **MongoDB** | Document | Analytics, flexible schema | Teacher dashboards, aggregated reports |
| **ChromaDB** | Vector | AI/ML, semantic search | Syllabus embeddings, RAG context |

### Data Flow Example: Student Performance Dashboard

```
Teacher opens "Course Analytics" page
        |
        v
Frontend requests: GET /api/courses/101/analytics
        |
        v
Backend handles request:
        |
        ├──> PostgreSQL: Get course details, enrollments
        |    SELECT * FROM courses WHERE id = 101;
        |    SELECT COUNT(*) FROM students_courses WHERE course_id = 101;
        |
        ├──> PostgreSQL: Get latest assessment scores
        |    SELECT AVG(marks) FROM student_scores ...
        |
        └──> MongoDB: Get pre-aggregated analytics
             db.attainment_by_course.find({ courseId: 101 })

Backend combines data:
{
  courseName: "Data Structures",
  enrollments: 60,
  averageScore: 78.5,
  coAttainments: [78, 82, 75, 80, 85],  // From MongoDB
  recentAssessments: [...]               // From PostgreSQL
}
        |
        v
Frontend displays charts and tables
```

---

## MongoDB-PostgreSQL Synchronization

### Pattern: Write to PostgreSQL, Aggregate to MongoDB

**Scenario:** Teacher uploads marks and calculates CO attainment

```javascript
// Backend Controller
export const calculateAttainment = async (req, res) => {
  const { assessmentId } = req.params;

  // 1. Fetch student scores from PostgreSQL (source of truth)
  const scores = await pool.query(`
    SELECT ss.student_id, ss.marks_obtained, q.max_marks, q.co_id
    FROM student_scores ss
    JOIN questions q ON ss.question_id = q.id
    WHERE q.assessment_id = $1
  `, [assessmentId]);

  // 2. Calculate CO attainment (business logic)
  const attainment = {};
  scores.rows.forEach(row => {
    if (!attainment[row.co_id]) attainment[row.co_id] = { total: 0, obtained: 0 };
    attainment[row.co_id].total += row.max_marks;
    attainment[row.co_id].obtained += row.marks_obtained;
  });

  // 3. Store results in PostgreSQL
  for (const [coId, data] of Object.entries(attainment)) {
    const percentage = (data.obtained / data.total) * 100;
    await pool.query(`
      INSERT INTO co_attainment (assessment_id, co_id, attainment_percentage)
      VALUES ($1, $2, $3)
    `, [assessmentId, coId, percentage]);
  }

  // 4. Aggregate and store in MongoDB for fast dashboard access
  const mongoDb = getMongoDb();
  await mongoDb.collection('attainment_by_course').insertOne({
    courseId: req.body.courseId,
    courseName: req.body.courseName,
    assessmentId,
    coAttainments: Object.entries(attainment).map(([coId, data]) => ({
      coNumber: coId,
      percentage: (data.obtained / data.total) * 100
    })),
    calculatedAt: new Date(),
    studentCount: scores.rows.length
  });

  res.json({ success: true, attainment });
};
```

### Why This Pattern?

1. **PostgreSQL = Source of Truth:**
   - All writes go here first
   - ACID transactions ensure data consistency
   - Can always recalculate from raw data

2. **MongoDB = Performance Cache:**
   - Pre-aggregated data for fast dashboards
   - Flexible schema for evolving analytics
   - No complex joins needed for reads

3. **No Two-Phase Commit:**
   - MongoDB write is async, not transactional
   - If MongoDB write fails, we can replay from PostgreSQL
   - PostgreSQL is always authoritative

---

## Quick Reference

### Service URLs (Development)
```
Frontend:       http://localhost:5173
Backend:        http://localhost:8080
Upload Service: http://localhost:8001/docs
CO Generator:   http://localhost:8085/docs
PostgreSQL:     localhost:5432
MongoDB:        localhost:27018
ChromaDB:       localhost:8000
```

### Database Connections
```bash
# PostgreSQL
docker exec -it postgres psql -U postgres -d edu

# MongoDB
docker exec -it mongodb mongosh edu_analytics
```

### Start All Services
```bash
docker-compose up -d
```

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f co-generator
```
