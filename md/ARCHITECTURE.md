# System Architecture - OBE CO/PO Attainment Analysis System

## 🏗️ Overview

This is a **Polyglot Persistence Architecture** using multiple databases optimized for different data access patterns:
- **MongoDB** - Teacher profiles, authentication, analytics
- **PostgreSQL** - Student marks, assessments, course structure

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                           │
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   Teacher    │         │   Student    │                      │
│  │  Dashboard   │         │  Dashboard   │                      │
│  │  (React +    │         │  (React +    │                      │
│  │   MUI +      │         │   MUI +      │                      │
│  │   Framer)    │         │   Framer)    │                      │
│  └──────┬───────┘         └──────┬───────┘                      │
│         │                        │                               │
│         └────────────┬───────────┘                               │
│                      │                                           │
└──────────────────────┼───────────────────────────────────────────┘
                       │
                       │ REST API (JWT Auth)
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│                     API LAYER (Express.js)                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │     Auth     │  │    Upload    │  │  Analytics   │          │
│  │  Controller  │  │  Controller  │  │  Controller  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         └─────────────────┼──────────────────┘                   │
│                           │                                       │
│                   ┌───────▼────────┐                             │
│                   │  Data Mapping  │                             │
│                   │     Layer      │                             │
│                   │  (Polyglot)    │                             │
│                   └───────┬────────┘                             │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        │                                       │
┌───────▼────────┐                    ┌────────▼────────┐
│   MongoDB      │                    │  PostgreSQL     │
│                │                    │                 │
│  Teachers:     │                    │  Students:      │
│  - Profile     │◄──────────────────►│  - Marks        │
│  - Auth        │    Teacher ID      │  - Assessments  │
│  - Metadata    │    Mapping         │  - Courses      │
│                │                    │  - Enrollment   │
│  Analytics:    │                    │                 │
│  - Attainment  │                    │  Metadata:      │
│  - Performance │                    │  - COs/POs      │
│  - Time-series │                    │  - Questions    │
│                │                    │                 │
└────────────────┘                    └─────────────────┘
```

---

## 🎯 Polyglot Database Strategy

### **Why Polyglot Persistence?**

Different data has different characteristics and access patterns:

| Data Type | Database | Reason |
|-----------|----------|--------|
| **Teacher Profiles** | MongoDB | Flexible schema, authentication metadata, frequent updates |
| **Student Marks** | PostgreSQL | Strong consistency, ACID transactions, relational integrity |
| **Course Structure** | PostgreSQL | Complex relationships, foreign keys, referential integrity |
| **Analytics Data** | MongoDB | Time-series data, high write throughput, flexible aggregation |
| **Attainment Calculations** | MongoDB | Document-based results, nested data structures |

---

## 📦 Data Distribution

### **MongoDB Collections**

#### 1. `teachers` Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password_hash: String,
  name: String,
  department: String,
  role: "teacher",
  postgres_user_id: UUID, // Link to PostgreSQL
  created_at: Date,
  updated_at: Date,
  preferences: {
    theme: String,
    notifications: Boolean
  },
  stats: {
    total_courses: Number,
    total_students: Number
  }
}
```

#### 2. `attainment_by_course` Collection
```javascript
{
  _id: ObjectId,
  course_id: UUID, // From PostgreSQL
  teacher_mongo_id: ObjectId,
  timestamp: Date,
  co_attainments: [{
    co_id: UUID,
    co_number: Number,
    percentage: Number,
    students_above_threshold: Number,
    total_students: Number
  }],
  assessment_id: UUID,
  created_at: Date
}
```

#### 3. `student_analytics` Collection
```javascript
{
  _id: ObjectId,
  student_postgres_id: UUID, // Link to PostgreSQL
  course_id: UUID,
  timestamp: Date,
  co_performance: [{
    co_number: Number,
    score: Number,
    max_score: Number,
    percentage: Number
  }],
  po_performance: [{
    po_number: Number,
    attainment: Number
  }],
  overall_rank: Number,
  created_at: Date
}
```

#### 4. `teacher_activity_log` Collection
```javascript
{
  _id: ObjectId,
  teacher_id: ObjectId,
  action: String, // "upload", "calculate", "create_course"
  entity_type: String, // "assessment", "course"
  entity_id: UUID, // From PostgreSQL
  timestamp: Date,
  metadata: Object
}
```

---

### **PostgreSQL Tables**

#### Student-Related (Primary Source of Truth)
- `users` (students only)
- `students_courses` (enrollment)
- `student_scores` (marks)
- `assessments`
- `questions`

#### Course Structure (Shared)
- `courses`
- `course_outcomes`
- `program_outcomes`
- `co_po_mapping`
- `question_po_mapping`

#### Calculated Results (Cache)
- `co_attainment`
- `po_attainment`

---

## 🔄 Data Flow Architecture

### **1. Teacher Login Flow**
```
1. Teacher enters credentials
2. Backend checks MongoDB `teachers` collection
3. JWT token issued with MongoDB _id + PostgreSQL user_id
4. Token contains: { mongoId, postgresId, role, email }
```

### **2. Student Marks Upload Flow**
```
1. Teacher uploads Excel file
2. File parsed (USN, marks, CO/PO mapping)
3. Student marks → PostgreSQL `student_scores`
4. Trigger attainment calculation
5. Results → MongoDB `attainment_by_course`
6. Activity logged in MongoDB
```

### **3. Attainment Calculation Flow**
```
1. Teacher triggers calculation
2. Fetch data from PostgreSQL (marks, COs, students)
3. Calculate attainment percentages
4. Store in PostgreSQL (co_attainment, po_attainment) - cache
5. Store in MongoDB (attainment_by_course) - analytics
6. Return results to frontend
```

### **4. Student Dashboard Flow**
```
1. Student logs in (PostgreSQL users table)
2. Fetch marks from PostgreSQL
3. Fetch analytics from MongoDB (student_analytics)
4. Display:
   - Current marks (PostgreSQL)
   - Historical performance (MongoDB time-series)
   - CO/PO radar charts (aggregated from MongoDB)
```

---

## 🔗 Mapping Layer

### **Purpose**
Bridge MongoDB teachers with PostgreSQL course/assessment data.

### **Implementation**

**File: `backend/utils/dataMapper.js`**

```javascript
class DataMapper {
  // Convert MongoDB teacher ID to PostgreSQL user ID
  async getPostgresTeacherId(mongoTeacherId)

  // Convert PostgreSQL user ID to MongoDB teacher
  async getMongoTeacherId(postgresUserId)

  // Get teacher's courses from PostgreSQL
  async getTeacherCourses(mongoTeacherId)

  // Link course activity to MongoDB teacher
  async logTeacherActivity(mongoTeacherId, action, entity)
}
```

---

## 🎨 Frontend Architecture

### **Technology Stack**
- **React 19** - UI framework
- **Material-UI (MUI)** - Component library
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **React Router** - Routing
- **Axios** - API calls
- **Zustand** - State management

### **Component Hierarchy**

```
App
├── AuthProvider (Context)
├── Routes
│   ├── PublicRoutes
│   │   ├── Login (animated)
│   │   └── Register (animated)
│   │
│   ├── TeacherRoutes
│   │   ├── TeacherDashboard
│   │   │   ├── Overview (stats cards with animations)
│   │   │   ├── CourseList (grid with hover effects)
│   │   │   ├── UploadMarks (drag-drop with progress)
│   │   │   └── Analytics (charts with transitions)
│   │   │
│   │   └── CourseDetail
│   │       ├── AttainmentView (animated gauges)
│   │       ├── StudentPerformance (tables with sort/filter)
│   │       └── COPOMatrix (heatmap)
│   │
│   └── StudentRoutes
│       └── StudentDashboard
│           ├── CoursesOverview (cards with parallax)
│           ├── MyScores (timeline view)
│           ├── COPerformance (radar chart)
│           ├── POPerformance (bar chart)
│           └── ProgressTracking (line chart)
```

### **Animation Strategy**

#### Page Transitions
```javascript
// Fade + slide animations on route change
<AnimatePresence mode="wait">
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

#### Component Animations
- **Cards**: Hover scale + shadow
- **Buttons**: Ripple effect (MUI) + custom hover
- **Charts**: Staggered entry animations
- **Lists**: Fade-in sequence with delay
- **Modals**: Scale + fade
- **Loading**: Skeleton screens → content fade-in

---

## 🔐 Security Architecture

### **Authentication Flow**

```
1. Teacher Login
   ├── MongoDB authentication
   ├── Generate JWT with both IDs
   └── Return: { token, mongoId, postgresId }

2. Student Login
   ├── PostgreSQL authentication
   ├── Generate JWT with postgresId
   └── Return: { token, userId }

3. Protected Routes
   ├── Verify JWT
   ├── Extract IDs
   └── Query appropriate database
```

### **Authorization Levels**
- **Teacher**: Can upload marks, calculate attainment, view all students
- **Student**: Can view only own data
- **Admin**: Full access (future)

---

## 📈 Scalability Considerations

### **Horizontal Scaling**
```
Load Balancer
    │
    ├── Backend Instance 1
    ├── Backend Instance 2
    └── Backend Instance 3
         │
         ├── MongoDB (Replica Set)
         └── PostgreSQL (Read Replicas)
```

### **Caching Strategy**
- **Redis** (future): Cache frequently accessed attainment data
- **PostgreSQL**: Materialized views for complex queries
- **MongoDB**: Aggregation pipeline caching

### **Performance Optimization**
- **Database Indexes**:
  - MongoDB: teacher email, teacher_mongo_id, course_id + timestamp
  - PostgreSQL: student_id, course_id, assessment_id
- **Query Optimization**: Use projection, limit, pagination
- **Lazy Loading**: Charts and heavy components

---

## 🧪 Testing Strategy

### **Unit Tests**
- Data mapper functions
- Attainment calculation logic
- Authentication middleware

### **Integration Tests**
- Polyglot database transactions
- Teacher-course mapping
- File upload → calculation pipeline

### **E2E Tests**
- Complete teacher workflow (upload → calculate → view)
- Complete student workflow (login → view scores → analytics)

---

## 📊 Monitoring & Observability

### **Metrics to Track**
- API response times
- Database query performance (both DBs)
- MongoDB vs PostgreSQL query distribution
- File upload success/failure rates
- Attainment calculation times

### **Logging**
- Teacher activity logs (MongoDB)
- Error logs (both databases)
- API access logs
- Performance logs

---

## 🚀 Deployment Architecture

### **Docker Compose (Development)**
```yaml
services:
  mongodb:      # Port 27017
  postgres:     # Port 5432
  backend:      # Port 8080
  frontend:     # Port 5173
```

### **Production (GCP/AWS)**
```
┌─────────────────┐
│  Load Balancer  │
└────────┬────────┘
         │
    ┌────┴────┐
    │   GKE   │ (Kubernetes)
    └────┬────┘
         │
  ┌──────┴──────┐
  │   Backend   │ (Replicas)
  └──────┬──────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼───┐
│MongoDB│  │ RDS  │
│ Atlas │  │(PG)  │
└───────┘  └──────┘
```

---

## 🎯 Key Design Decisions

### **1. Why MongoDB for Teachers?**
✅ Flexible schema for evolving user profiles
✅ Fast authentication lookups
✅ Easy to add custom fields (preferences, stats)
✅ Better for activity logging (high write throughput)

### **2. Why PostgreSQL for Student Marks?**
✅ ACID transactions ensure data integrity
✅ Relational model fits course structure perfectly
✅ Foreign keys prevent orphaned records
✅ Complex JOINs for attainment calculations

### **3. Why Polyglot?**
✅ **Best tool for each job** - No single database is optimal for everything
✅ **Scalability** - Distribute load across databases
✅ **Performance** - Optimize each database for its workload
✅ **Flexibility** - Add/change databases without full rewrite

---

## 📚 Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 19.x |
| | Material-UI | 5.x |
| | Framer Motion | 11.x |
| | Recharts | 2.x |
| | Axios | 1.x |
| **Backend** | Node.js | 20.x |
| | Express | 4.x |
| | JWT | 9.x |
| **Databases** | MongoDB | 7.x |
| | PostgreSQL | 16.x |
| **DevOps** | Docker | Latest |
| | Docker Compose | 3.9 |

---

## 🔄 Future Enhancements

1. **Redis Cache Layer** - Cache attainment results
2. **WebSockets** - Real-time updates during calculations
3. **GraphQL** - More efficient data fetching
4. **Microservices** - Separate auth, upload, calculation services
5. **Message Queue** - RabbitMQ/Kafka for async processing
6. **Elasticsearch** - Full-text search across courses
7. **S3/GCS** - Store uploaded files separately

---

## 📝 API Design

### **RESTful Endpoints**

| Method | Endpoint | Database | Purpose |
|--------|----------|----------|---------|
| POST | `/api/auth/teacher/login` | MongoDB | Teacher authentication |
| POST | `/api/auth/student/login` | PostgreSQL | Student authentication |
| GET | `/api/teacher/profile` | MongoDB | Teacher profile |
| GET | `/api/teacher/courses` | PostgreSQL | Teacher's courses (mapped) |
| POST | `/api/upload/assessment` | PostgreSQL | Upload marks |
| POST | `/api/calculate/attainment` | Both | Calculate & store |
| GET | `/api/student/analytics` | MongoDB | Student analytics |
| GET | `/api/student/scores` | PostgreSQL | Student marks |

---

## ✅ Success Criteria

- ✅ **Data Consistency**: MongoDB and PostgreSQL stay in sync via mapping layer
- ✅ **Performance**: API responses < 200ms for 95th percentile
- ✅ **Scalability**: Handle 1000+ concurrent users
- ✅ **Reliability**: 99.9% uptime
- ✅ **Security**: All data encrypted, JWT auth, RBAC
- ✅ **UX**: Smooth animations, < 2s page loads

---

## 🎨 Design Philosophy

> **"Right Database for Right Data"**
>
> Use MongoDB's flexibility for evolving teacher profiles and analytics.
> Use PostgreSQL's reliability for critical student marks and grades.
> Map them seamlessly through a thin abstraction layer.

---

**Architecture Version**: 2.0
**Last Updated**: November 2025
**Status**: ✅ Implemented
