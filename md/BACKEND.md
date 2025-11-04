# 🚀 OBE CO/PO Attainment Analysis System - Backend Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Database Design](#database-design)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [File Structure](#file-structure)
- [Setup & Configuration](#setup--configuration)
- [Environment Variables](#environment-variables)

---

## Overview

The backend is a **Node.js + Express** REST API implementing a **polyglot persistence architecture** with **PostgreSQL** for relational data and **MongoDB** for analytics and flexible data storage. It supports JWT-based authentication with role-based access control (Teacher/Student).

### Key Features
- ✅ **26+ REST API Endpoints**
- ✅ **Polyglot Database Architecture** (PostgreSQL + MongoDB)
- ✅ **JWT Authentication** with Role-Based Access Control
- ✅ **File Upload & Parsing** (Excel/CSV marks upload)
- ✅ **Automated CO/PO Attainment Calculation**
- ✅ **Comprehensive Analytics** (Student, Course, Module-level)
- ✅ **Docker Support** for containerized deployment

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Runtime** | Node.js | 20+ |
| **Framework** | Express.js | 4.x |
| **Primary Database** | PostgreSQL | 16+ |
| **Analytics Database** | MongoDB | 7+ |
| **Authentication** | JWT (jsonwebtoken) | 9.x |
| **Password Hashing** | bcryptjs | 2.4.x |
| **File Upload** | Multer | 1.4.x |
| **File Parsing** | xlsx, papaparse | Latest |
| **Validation** | express-validator, Joi | Latest |
| **Security** | Helmet, CORS | Latest |
| **Logging** | Morgan | Latest |

---

## Architecture

### Polyglot Persistence Model

```
┌─────────────────────────────────────────────────┐
│           Node.js Express Backend               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │  PostgreSQL  │         │    MongoDB      │  │
│  │  (Relational)│         │  (Analytics)    │  │
│  └──────────────┘         └─────────────────┘  │
│                                                 │
│  • Users                  • Teachers            │
│  • Courses                • Activity Logs       │
│  • Assessments            • Attainment Cache    │
│  • Questions              • Student Analytics   │
│  • Student Scores         • Module Performance  │
│  • CO/PO Attainment       • Time-series Data    │
│  • Mappings                                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Request Flow

```
Client Request → Middleware (Auth, Validation)
               → Controller (Business Logic)
               → Database Layer (PostgreSQL/MongoDB)
               → Attainment Calculator
               → Data Mapper (Cross-DB Sync)
               → Response (JSON)
```

---

## Database Design

### PostgreSQL Schema

#### Core Tables

**users**
```sql
- id (PK, UUID)
- email (UNIQUE)
- password_hash
- name
- role (teacher/student)
- usn (for students)
- department
- created_at, updated_at
```

**courses**
```sql
- id (PK, SERIAL)
- code (UNIQUE)
- name
- description
- semester
- year
- credits
- teacher_id (FK → users)
- created_at, updated_at
```

**students_courses** (Enrollment)
```sql
- student_id (FK → users)
- course_id (FK → courses)
- enrollment_date
- status (active/completed)
```

**course_outcomes**
```sql
- id (PK, SERIAL)
- course_id (FK → courses)
- co_number
- description
- module_number
```

**program_outcomes**
```sql
- id (PK, SERIAL)
- po_number
- description
```

**assessments**
```sql
- id (PK, SERIAL)
- course_id (FK → courses)
- type (IA1/IA2/SEE/Quiz)
- name
- assessment_date
- max_marks
- weightage
```

**questions**
```sql
- id (PK, SERIAL)
- assessment_id (FK → assessments)
- question_number
- question_text
- max_marks
- co_id (FK → course_outcomes)
```

**student_scores**
```sql
- id (PK, SERIAL)
- student_id (FK → users)
- question_id (FK → questions)
- marks_obtained
- created_at
```

**co_attainment**
```sql
- id (PK, SERIAL)
- course_id (FK → courses)
- co_id (FK → course_outcomes)
- assessment_id (FK → assessments)
- attainment_percentage
- total_students
- students_above_threshold
- threshold_percentage (default 60)
- calculated_at
```

**po_attainment**
```sql
- id (PK, SERIAL)
- course_id (FK → courses)
- po_id (FK → program_outcomes)
- attainment_level
- calculation_method (direct/indirect)
- calculated_at
```

**co_po_mapping**
```sql
- co_id (FK → course_outcomes)
- po_id (FK → program_outcomes)
- correlation_level (1=Low, 2=Medium, 3=High)
```

**question_po_mapping**
```sql
- question_id (FK → questions)
- po_id (FK → program_outcomes)
```

### MongoDB Collections

**teachers**
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password_hash: String,
  name: String,
  postgres_id: Number, // Cross-reference
  preferences: Object,
  created_at: Date
}
```

**teacher_activity_log**
```javascript
{
  teacher_id: Number,
  action: String,
  details: Object,
  timestamp: Date,
  ip_address: String
}
```

**attainment_by_course**
```javascript
{
  course_id: Number,
  timestamp: Date,
  co_id: Number,
  co_number: Number,
  attainment_percentage: Number,
  total_students: Number,
  students_above_threshold: Number
}
```

**attainment_by_student**
```javascript
{
  student_id: Number,
  course_id: Number,
  timestamp: Date,
  co_id: Number,
  po_id: Number,
  score: Number,
  max_score: Number,
  percentage: Number
}
```

**module_performance**
```javascript
{
  course_id: Number,
  module_number: Number,
  timestamp: Date,
  avg_score: Number,
  max_score: Number,
  student_count: Number,
  co_ids: [Number]
}
```

**po_attainment**
```javascript
{
  course_id: Number,
  po_id: Number,
  timestamp: Date,
  attainment_level: Number,
  contributing_cos: [Number],
  student_count: Number
}
```

---

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Create new user account | ❌ |
| POST | `/login` | Authenticate and get JWT token | ❌ |
| GET | `/profile` | Get current user profile | ✅ |

**Request Example:**
```json
POST /api/auth/register
{
  "email": "student@example.com",
  "password": "securepass",
  "name": "John Doe",
  "role": "student",
  "usn": "4NI21CS001",
  "department": "CSE"
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { "id": 1, "name": "John Doe", "role": "student" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Courses (`/api/courses`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | Get all courses (filtered by role) | ✅ | Both |
| GET | `/:id` | Get course by ID | ✅ | Both |
| POST | `/` | Create new course | ✅ | Teacher |
| PUT | `/:id` | Update course | ✅ | Teacher |
| DELETE | `/:id` | Delete course | ✅ | Teacher |
| POST | `/:id/enroll` | Enroll students in course | ✅ | Teacher |
| GET | `/:id/students` | Get enrolled students | ✅ | Teacher |
| GET | `/dashboard` | Get teacher dashboard stats | ✅ | Teacher |
| GET | `/:id/analytics` | Get course analytics | ✅ | Teacher |

### Assessments (`/api/assessments`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/` | Create assessment | ✅ | Teacher |
| GET | `/course/:courseId` | Get assessments for course | ✅ | Both |
| POST | `/questions` | Create question | ✅ | Teacher |
| GET | `/:assessmentId/questions` | Get questions | ✅ | Both |
| POST | `/course/:courseId/assessment/:assessmentId/calculate` | Calculate attainment | ✅ | Teacher |
| GET | `/course/:courseId/co-attainment` | Get CO attainment | ✅ | Teacher |
| GET | `/course/:courseId/po-attainment` | Get PO attainment | ✅ | Teacher |

### Upload (`/api/upload`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/assessment` | Upload marks (Excel/CSV) | ✅ | Teacher |
| POST | `/enroll` | Bulk enroll students | ✅ | Teacher |
| GET | `/template` | Download marks template | ✅ | Teacher |

**Upload Format:**
```
Form-data:
- file: <Excel/CSV file>
- assessmentId: <number>
```

### Students (`/api/students`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/courses` | Get enrolled courses | ✅ | Student |
| GET | `/courses/:courseId/scores` | Get scores for course | ✅ | Student |
| GET | `/courses/:courseId/co-performance` | Get CO performance | ✅ | Student |
| GET | `/courses/:courseId/po-performance` | Get PO performance | ✅ | Student |
| GET | `/courses/:courseId/analytics` | Get overall analytics | ✅ | Student |

---

## Authentication

### JWT Implementation

**Token Generation:**
```javascript
const token = jwt.sign(
  {
    id: user.id,
    role: user.role,
    email: user.email
  },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);
```

**Token Verification Middleware:**
```javascript
export const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
};
```

**Role-Based Authorization:**
```javascript
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
};
```

---

## File Structure

```
backend/
├── config/
│   ├── db.js              # PostgreSQL connection
│   └── mongodb.js         # MongoDB connection
├── controllers/
│   ├── authController.js
│   ├── courseController.js
│   ├── assessmentController.js
│   ├── studentController.js
│   └── uploadController.js
├── middleware/
│   ├── auth.js            # JWT authentication
│   └── upload.js          # Multer configuration
├── routes/
│   ├── auth.js
│   ├── courses.js
│   ├── assessments.js
│   ├── students.js
│   └── upload.js
├── utils/
│   ├── attainmentCalculator.js  # CO/PO calculation logic
│   ├── dataMapper.js            # PostgreSQL ↔ MongoDB sync
│   └── fileParser.js            # Excel/CSV parsing
├── migrations/
│   ├── migrate.js         # DB schema creation
│   └── seed.js            # Sample data seeding
├── .env                   # Environment variables
├── .env.example           # Template
├── package.json
├── Dockerfile
└── server.js              # Entry point
```

---

## Setup & Configuration

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- MongoDB 7+
- Docker (optional)

### Installation

1. **Clone and Install:**
```bash
cd backend
npm install
```

2. **Configure Environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Run Migrations:**
```bash
npm run migrate
npm run seed  # Optional: seed sample data
```

4. **Start Server:**
```bash
npm run dev   # Development
npm start     # Production
```

---

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=8080

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=obe_system

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=edu_analytics

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=.xlsx,.csv
```

---

## Deployment

### Docker Compose
```bash
docker-compose up -d
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT_SECRET (min 32 chars)
- [ ] Enable HTTPS
- [ ] Configure CORS origins
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Configure logging (Winston/Bunyan)
- [ ] Set up monitoring (PM2/New Relic)

---

## Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'
```

---

## Support & Contribution

For issues or contributions, contact the development team or raise an issue in the repository.

**Last Updated:** November 2025
**Version:** 1.0.0
