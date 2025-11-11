# OBE Educational Platform - Technical Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Port 5173)                          │
│                    React 19 + Vite + Material-UI                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP/REST
                    ┌────────────┼────────────┐
                    │            │            │
         ┌──────────▼────┐  ┌────▼─────┐  ┌──▼────────────┐
         │   BACKEND     │  │  UPLOAD  │  │ CO GENERATOR  │
         │   Node.js     │  │  FastAPI │  │   FastAPI     │
         │   Port 8080   │  │ Port 8001│  │  Port 8085    │
         └───┬───────┬───┘  └────┬─────┘  └───┬──────┬────┘
             │       │           │            │      │
             │       │           │            │      │
        ┌────▼──┐ ┌──▼────────┐ │       ┌────▼──┐   │
        │ PG    │ │  MongoDB  │ │       │  PG   │   │
        │ 5432  │ │  27018    │ │       │ 5432  │   │
        └───────┘ └───────────┘ └────────┴───────┘   │
                                               ┌──────▼──────┐
                                               │  ChromaDB   │
                                               │  Port 8000  │
                                               └─────────────┘
```

## POSTGRES DATABASE

users (teachers/students)
│
├── teaches --> courses
│              │
│              ├── has --> course_outcomes (COs)
│              │           │
│              │           ├── mapped_to --> program_outcomes (POs)
│              │
│              ├── has --> assessments (AAT, CIE, etc.)
│              │           │
│              │           ├── has --> questions
│              │                        │
│              │                        ├── mapped_to --> COs, POs
│              │
│              ├── enrolled_by --> students (via students_courses)
│              │
│              ├── generates --> student_scores (for each question)
│
└── calculated into --> co_attainment, po_attainment (aggregated results)

## Tech Stack Summary

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | React 19.1 + Vite 7.1 | 5173 | User Interface |
| **Backend** | Node.js 20 + Express 4.18 | 8080 | Main API Server |
| **Upload Service** | Python + FastAPI 0.109 | 8001 | File Processing |
| **CO Generator** | Python + FastAPI + Groq AI | 8085 | AI CO Generation |
| **PostgreSQL** | PostgreSQL 16 | 5432 | Primary Database |
| **MongoDB** | MongoDB 7.0 | 27018 | Analytics Database |
| **ChromaDB** | ChromaDB 0.4.24 | 8000 | Vector Database |

## Frontend Dependencies
```json
{
  "react": "19.1.1",
  "@mui/material": "5.15.0",
  "tailwindcss": "3.4.0",
  "react-router-dom": "7.9.3",
  "axios": "1.6.2",
  "zustand": "4.5.0",
  "recharts": "2.10.3",
  "framer-motion": "11.0.0"
}
```

## Backend Dependencies
```json
{
  "express": "4.18.2",
  "pg": "8.11.3",
  "mongodb": "6.20.0",
  "jsonwebtoken": "9.0.2",
  "bcryptjs": "2.4.3",
  "winston": "3.11.0",
  "helmet": "7.1.0",
  "cors": "2.8.5",
  "multer": "1.4.5-lts.1",
  "xlsx": "0.18.5"
}
```

## Upload Service Dependencies
```txt
fastapi==0.109.0
uvicorn==0.27.0
pandas==2.2.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
openpyxl==3.1.2
```

## CO Generator Dependencies
```txt
fastapi==0.109.0
chromadb==0.4.24
groq==0.9.0
sentence-transformers==2.3.1
torch==2.2.0
pdfplumber==0.10.3
python-docx==1.1.0
```

## Polyglot Database Architecture

### Why 3 Different Databases?

```
┌─────────────────────────────────────────────────────────────────┐
│                    POLYGLOT PERSISTENCE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PostgreSQL (RELATIONAL)          MongoDB (DOCUMENT)             │
│  ├─ Users & Authentication        ├─ Analytics Data             │
│  ├─ Courses & Enrollments         ├─ Performance Metrics        │
│  ├─ Assessments & Questions       ├─ Time-Series Data           │
│  ├─ CO/PO Mappings                ├─ Student Progress           │
│  ├─ Student Scores                ├─ Aggregated Reports         │
│  └─ Dynamic Marksheet Tables      └─ Teacher Metadata           │
│                                                                  │
│  ChromaDB (VECTOR)                                               │
│  ├─ Syllabus Embeddings                                         │
│  ├─ Semantic Search                                             │
│  └─ RAG Context Retrieval                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### PostgreSQL - Transactional Data
**Why:** ACID compliance, referential integrity, complex joins
- Users, courses, assessments
- Foreign key relationships
- Atomic transactions for marks entry
- Complex CO/PO attainment calculations

### MongoDB - Analytics & Flexible Schema
**Why:** High write throughput, flexible schema, aggregation pipelines
- Teacher dashboards
- Course-level analytics
- Student performance trends
- No rigid schema for evolving metrics

### ChromaDB - Vector Similarity
**Why:** Semantic search, AI/ML integration
- Syllabus document embeddings
- Context retrieval for AI
- Similarity-based search

## How MongoDB Connects to PostgreSQL

### Data Synchronization Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICE (Node.js)                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐      │
│  │           Dual Database Connection Manager             │      │
│  │                                                         │      │
│  │  pgPool = new Pool({                                   │      │
│  │    host: 'postgres', port: 5432, database: 'edu'       │      │
│  │  })                                                     │      │
│  │                                                         │      │
│  │  mongoClient = new MongoClient(                        │      │
│  │    'mongodb://mongodb:27017/edu_analytics'             │      │
│  │  )                                                      │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐      │
│  │         Write Operation Flow Example                   │      │
│  │                                                         │      │
│  │  1. Student submits marks                              │      │
│  │  2. Backend writes to PostgreSQL (source of truth)     │      │
│  │  3. Calculate CO attainment                            │      │
│  │  4. Write analytics to MongoDB                         │      │
│  │  5. Respond to client                                  │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

READ PATH:
Frontend → Backend API → Query PostgreSQL for raw data
                      → Query MongoDB for aggregated analytics
                      → Combine & return
```

### Connection Implementation

**PostgreSQL Connection** (`backend/config/db.js`):
```javascript
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'edu',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**MongoDB Connection** (`backend/config/mongodb.js`):
```javascript
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://mongodb:27017/edu_analytics';
const client = new MongoClient(uri);

let db;
async function connectMongoDB() {
  await client.connect();
  db = client.db('edu_analytics');
  return db;
}
```

### Data Flow Example: CO Attainment Calculation

```javascript
// 1. Fetch student scores from PostgreSQL
const scores = await pool.query(`
  SELECT ss.marks_obtained, q.max_marks, q.co_id
  FROM student_scores ss
  JOIN questions q ON ss.question_id = q.id
  WHERE q.assessment_id = $1
`, [assessmentId]);

// 2. Calculate attainment (business logic)
const attainment = calculateCOAttainment(scores);

// 3. Store in PostgreSQL (transactional)
await pool.query(`
  INSERT INTO co_attainment (course_id, co_id, assessment_id, attainment_percentage)
  VALUES ($1, $2, $3, $4)
`, [courseId, coId, assessmentId, attainment]);

// 4. Store aggregated data in MongoDB (analytics)
await mongoDb.collection('attainment_by_course').insertOne({
  courseId,
  courseName,
  coNumber,
  attainmentPercentage: attainment,
  assessmentType,
  calculatedAt: new Date(),
  studentCount: scores.length
});
```

### Why Both Databases?

| Aspect | PostgreSQL | MongoDB |
|--------|-----------|---------|
| **Data Type** | Normalized, structured | Denormalized, flexible |
| **Use Case** | Transactional operations | Read-heavy analytics |
| **Queries** | Complex JOINs | Aggregation pipelines |
| **Consistency** | ACID (Strong) | Eventual (Fast reads) |
| **Schema** | Strict, enforced | Flexible, evolving |

**Example:**
- PostgreSQL stores individual student marks (1000s of rows)
- MongoDB stores pre-aggregated course analytics (fast dashboard loads)

## Microservice Communication

### 1. Frontend → Backend

```javascript
// edu-frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' }
});

// Intercept all requests to add JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Example: Create course
export const courseAPI = {
  create: (data) => api.post('/courses', data),
  getAll: () => api.get('/courses'),
  getById: (id) => api.get(`/courses/${id}`)
};
```

### 2. Frontend → Upload Service

```javascript
// edu-frontend/src/services/api.js
const uploadServiceAPI = axios.create({
  baseURL: 'http://localhost:8001'
});

export const uploadAPI = {
  uploadMarksheet: async (file, courseId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);

    return uploadServiceAPI.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
```

### 3. Frontend → CO Generator

```javascript
// edu-frontend/src/services/api.js
const coGeneratorAPI = axios.create({
  baseURL: 'http://localhost:8085/api/co'
});

export const coAPI = {
  uploadSyllabus: (file, courseCode) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_code', courseCode);
    return coGeneratorAPI.post('/upload', formData);
  },

  generateCOs: (courseCode, numCOs) => {
    return coGeneratorAPI.post('/generate', {
      course_code: courseCode,
      num_cos: numCOs
    });
  }
};
```

### 4. Backend Internal Database Calls

```javascript
// backend/controllers/courseController.js
import pool from '../config/db.js';
import { getMongoDb } from '../config/mongodb.js';

export const createCourse = async (req, res) => {
  const { code, name, semester } = req.body;

  try {
    // 1. Insert into PostgreSQL
    const result = await pool.query(
      'INSERT INTO courses (code, name, semester, teacher_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [code, name, semester, req.user.id]
    );

    const course = result.rows[0];

    // 2. Create metadata in MongoDB
    const mongoDb = getMongoDb();
    await mongoDb.collection('teacher_metadata').insertOne({
      teacherId: req.user.id,
      courseId: course.id,
      courseCode: code,
      createdAt: new Date(),
      initialStats: { enrollments: 0, assessments: 0 }
    });

    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 5. Upload Service → PostgreSQL

```python
# upload-service/app/main.py
from fastapi import FastAPI, UploadFile
import pandas as pd
from sqlalchemy import create_engine, Table, Column, Integer, Float, String, MetaData

DATABASE_URL = "postgresql://postgres:password@postgres:5432/edu"
engine = create_engine(DATABASE_URL)

@app.post("/upload")
async def upload_marksheet(file: UploadFile, course_id: int):
    # 1. Read file
    df = pd.read_excel(file.file) if file.filename.endswith('.xlsx') else pd.read_csv(file.file)

    # 2. Create dynamic table
    table_name = f"marksheet_{course_id}_{timestamp}"
    metadata = MetaData()

    # 3. Infer schema from DataFrame
    columns = [Column('id', Integer, primary_key=True)]
    for col in df.columns:
        if df[col].dtype == 'int64':
            columns.append(Column(col, Integer))
        elif df[col].dtype == 'float64':
            columns.append(Column(col, Float))
        else:
            columns.append(Column(col, String))

    # 4. Create table and insert data
    table = Table(table_name, metadata, *columns)
    metadata.create_all(engine)
    df.to_sql(table_name, engine, if_exists='append', index=False)

    return {"table_name": table_name, "rows": len(df)}
```

### 6. CO Generator → PostgreSQL + ChromaDB

```python
# co-gen/main.py
from fastapi import FastAPI
import chromadb
import psycopg2
from groq import Groq

# Connect to both databases
pg_conn = psycopg2.connect("postgresql://postgres:password@postgres:5432/edu")
chroma_client = chromadb.HttpClient(host='chromadb', port=8000)
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

@app.post("/api/co/generate")
async def generate_cos(course_code: str, num_cos: int):
    # 1. Get course info from PostgreSQL
    cursor = pg_conn.cursor()
    cursor.execute("SELECT id, name FROM courses WHERE code = %s", (course_code,))
    course = cursor.fetchone()

    # 2. Query ChromaDB for relevant syllabus content
    collection = chroma_client.get_collection(f"syllabus_{course_code}")
    results = collection.query(
        query_texts=[f"course outcomes for {course[1]}"],
        n_results=6
    )
    context = "\n".join(results['documents'][0])

    # 3. Generate COs using Groq LLM
    prompt = f"Based on this syllabus:\n{context}\n\nGenerate {num_cos} course outcomes."
    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    cos = response.choices[0].message.content

    # 4. Store in PostgreSQL
    cursor.execute(
        "INSERT INTO course_outcomes (course_id, co_number, description) VALUES (%s, %s, %s)",
        (course[0], 1, cos)
    )
    pg_conn.commit()

    return {"cos": cos}
```

## Environment Configuration

### Backend .env
```env
# PostgreSQL
DB_HOST=postgres
DB_PORT=5432
DB_NAME=edu
DB_USER=postgres
DB_PASSWORD=password

# MongoDB
MONGO_URI=mongodb://mongodb:27017/edu_analytics

# JWT
JWT_SECRET=secret_key_here
JWT_EXPIRES_IN=7d
```

### Frontend .env
```env
VITE_API_URL=http://localhost:8080/api
VITE_UPLOAD_SERVICE_URL=http://localhost:8001
VITE_CO_API_URL=http://localhost:8085/api/co
```

### Upload Service .env
```env
DATABASE_URL=postgresql://postgres:password@postgres:5432/edu
```

### CO Generator .env
```env
DATABASE_URL=postgresql://postgres:password@postgres:5432/edu
CHROMA_HOST=chromadb
CHROMA_PORT=8000
GROQ_API_KEY=your_key_here
```

## Docker Network Communication

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    networks: [edu-network]

  mongodb:
    image: mongo:7.0
    networks: [edu-network]

  chromadb:
    image: ghcr.io/chroma-core/chroma:0.4.24
    networks: [edu-network]

  backend:
    depends_on: [postgres, mongodb]
    networks: [edu-network]
    environment:
      - DB_HOST=postgres  # DNS resolution via Docker
      - MONGO_URI=mongodb://mongodb:27017

networks:
  edu-network:
    driver: bridge
```

**Key Point:** Services communicate using **service names as hostnames** (e.g., `postgres`, `mongodb`) within the Docker network.

## Quick Start

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Access databases
docker exec -it postgres psql -U postgres -d edu
docker exec -it mongodb mongosh edu_analytics

# Access services
Frontend:  http://localhost:5173
Backend:   http://localhost:8080
Upload:    http://localhost:8001/docs
CO Gen:    http://localhost:8085/docs
```
