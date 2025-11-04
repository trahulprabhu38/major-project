# OBE CO/PO Attainment Analysis System - Backend API

Node.js + Express backend for the Outcome-Based Education (OBE) CO/PO Attainment Analysis System.

## 🚀 Features

- **Authentication**: JWT-based authentication with role-based access control
- **Course Management**: Create and manage courses, COs, POs
- **Assessment Management**: Create assessments, questions, and map to COs/POs
- **File Upload**: Bulk import student marks from Excel/CSV files
- **Attainment Calculation**: Automatic CO/PO attainment calculation
- **Analytics**: Student performance analytics and visualizations
- **Dual Database**: PostgreSQL for relational data, MongoDB for analytics

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- MongoDB 5.1+
- npm or yarn

## 🛠️ Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=8080
NODE_ENV=development

JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=edu
POSTGRES_USER=admin
POSTGRES_PASSWORD=password

MONGODB_HOST=localhost
MONGODB_PORT=9042
MONGODB_KEYSPACE=edu_analytics
MONGODB_LOCAL_DATA_CENTER=datacenter1
```

### 3. Start Databases

Using Docker Compose:

```bash
docker-compose up -d postgres scylla
```

Or start them separately.

### 4. Run Migrations

```bash
npm run migrate
```

### 5. Seed Database (Optional)

```bash
npm run seed
```

This creates:
- 8 Program Outcomes (POs)
- 3 Teachers
- 1 Course with 5 COs
- 50 Students
- 3 Assessments with 10 questions
- Sample student scores

### 6. Start Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server runs on `http://localhost:8080`

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/profile` | Get user profile | Yes |
| PUT | `/api/auth/profile` | Update profile | Yes |

### Courses

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/courses` | Get all courses | Yes | All |
| POST | `/api/courses` | Create course | Yes | Teacher |
| GET | `/api/courses/:id` | Get course details | Yes | All |
| PUT | `/api/courses/:id` | Update course | Yes | Teacher |
| DELETE | `/api/courses/:id` | Delete course | Yes | Teacher |
| POST | `/api/courses/:id/enroll` | Enroll students | Yes | Teacher |
| GET | `/api/courses/:id/students` | Get enrolled students | Yes | All |

### Assessments

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/api/assessments` | Create assessment | Yes | Teacher |
| GET | `/api/assessments/course/:courseId` | Get assessments | Yes | All |
| POST | `/api/assessments/questions` | Create question | Yes | Teacher |
| GET | `/api/assessments/:assessmentId/questions` | Get questions | Yes | All |
| POST | `/api/assessments/course/:courseId/assessment/:assessmentId/calculate` | Calculate attainment | Yes | Teacher |
| GET | `/api/assessments/course/:courseId/co-attainment` | Get CO attainment | Yes | All |
| GET | `/api/assessments/course/:courseId/po-attainment` | Get PO attainment | Yes | All |

### File Upload

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/api/upload/assessment` | Upload assessment file | Yes | Teacher |
| POST | `/api/upload/enroll` | Bulk enroll students | Yes | Teacher |
| GET | `/api/upload/template` | Download Excel template | Yes | Teacher |

### Student Analytics

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/students/courses` | Get enrolled courses | Yes | Student |
| GET | `/api/students/courses/:courseId/scores` | Get scores | Yes | Student |
| GET | `/api/students/courses/:courseId/co-performance` | Get CO performance | Yes | Student |
| GET | `/api/students/courses/:courseId/po-performance` | Get PO performance | Yes | Student |
| GET | `/api/students/courses/:courseId/analytics` | Get analytics | Yes | Student |

## 📤 File Upload Format

### Assessment Marks Upload

Excel/CSV format:

| USN | Question_ID | Marks | CO_Number | PO_Numbers |
|-----|-------------|-------|-----------|------------|
| 1MS22CS001 | Q1 | 8 | 1 | 1,2 |
| 1MS22CS001 | Q2 | 6 | 2 | 1,2,5 |
| 1MS22CS002 | Q1 | 9 | 1 | 1,2 |

Download template: `GET /api/upload/template`

## 🔒 Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

## 🗄️ Database Schema

### PostgreSQL Tables

- `users` - Students, teachers, admins
- `courses` - Course information
- `program_outcomes` - POs (institution-wide)
- `course_outcomes` - COs (course-specific)
- `co_po_mapping` - CO to PO mappings
- `students_courses` - Enrollment
- `assessments` - Exams, assignments, labs
- `questions` - Assessment questions
- `question_po_mapping` - Question to PO mappings
- `student_scores` - Student marks
- `co_attainment` - Calculated CO attainment
- `po_attainment` - Calculated PO attainment

### MongoDB Tables

- `attainment_by_course` - Time-series CO attainment
- `attainment_by_student` - Student performance tracking
- `module_performance` - Module-wise analytics
- `po_attainment` - PO attainment tracking
- `student_progress` - Progress over time

## 🧪 Testing

### Test User Credentials (after seeding)

**Teacher:**
```
Email: rajesh.kumar@example.edu
Password: password123
```

**Student:**
```
Email: student1@example.edu
Password: password123
```

### Example API Calls

**Login:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@example.edu","password":"password123"}'
```

**Get Courses:**
```bash
curl -X GET http://localhost:8080/api/courses \
  -H "Authorization: Bearer <token>"
```

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## 📊 Attainment Calculation

### CO Attainment Formula

```
CO Attainment = (Students scoring >= 60% in CO questions) / Total Students × 100
```

### PO Attainment Formula

```
PO Attainment = Σ(CO Attainment × Correlation Level) / Σ(Correlation Levels)
```

Correlation Levels:
- 1 = Low
- 2 = Medium
- 3 = High

## 🔧 Development

Project structure:

```
backend/
├── config/          # Database connections
├── controllers/     # Route handlers
├── middleware/      # Auth, upload, etc.
├── migrations/      # Database migrations
├── models/          # (Future: Data models)
├── routes/          # API routes
├── utils/           # Helper functions
├── uploads/         # Temporary file storage
├── server.js        # Main server file
├── package.json
└── .env
```

## 📝 License

MIT

## 👥 Team

Developed for OBE Automation Platform
