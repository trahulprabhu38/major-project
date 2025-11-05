# Testing and Deployment Guide

## Summary of Changes

### Database Refactoring ✅
- **PostgreSQL**: Now the single source of truth for all structured data (users, courses, COs, assessments, marks)
- **MongoDB**: Used exclusively for analytics, caching, and activity logs
- **ChromaDB**: Used for vector storage and RAG (unchanged)

### CO Generator Service (FastAPI) ✅
- ✅ Added PostgreSQL connection pool (`app/services/postgres.py`)
- ✅ Added MongoDB connection (`app/services/mongodb.py`)
- ✅ **Updated `/upload` endpoint** - Now accepts `course_id` (UUID) instead of `course_code`
- ✅ **Added NEW `/list/{course_id}` endpoint** - List COs by course UUID
- ✅ **Added NEW `/stats/{course_id}` endpoint** - Get stats by course UUID
- ✅ **Updated `/generate` endpoint** - Accepts `course_id` + `teacher_id`, saves COs to PostgreSQL
- ✅ Updated `/status/{course_id}` - Check ingestion status by course UUID
- ✅ Comprehensive logging on every operation (request, database, business logic)
- ✅ Activity logging to MongoDB (uploads, generations, etc.)

### Backend Service (Node.js) ✅
- ✅ Added Winston logger (`middleware/logging.js`)
- ✅ Request/response logging middleware
- ✅ Structured JSON logging for all operations
- ✅ Database query logging capability
- ✅ Business event logging

### Frontend (React) ✅
- ✅ Updated `coGeneratorAPI.js` to use `course_id` everywhere
- ✅ All endpoints now use `/api/co/list/{course_id}` format
- ✅ Upload sends `course_id` and `teacher_id` instead of `course_code`
- ✅ Generate sends `course_id` and `teacher_id`

### Docker Compose ✅
- ✅ CO Generator now depends on PostgreSQL, MongoDB, and ChromaDB
- ✅ Added PostgreSQL environment variables
- ✅ Added MongoDB environment variables
- ✅ Updated health checks

---

## Pre-Deployment Checklist

### 1. Install Dependencies

#### Backend (Node.js)
```bash
cd backend
npm install
# This will install winston for logging
```

#### CO Generator (Python/FastAPI)
```bash
cd co-generator
pip install -r requirements.txt
# This will install psycopg2-binary and pymongo
```

### 2. Apply Database Migrations

#### PostgreSQL
The initial schema should already be applied via `001_initial_schema.sql` on first run.
If you need to apply the CO generator schema updates:

```bash
docker exec -it postgres psql -U admin -d edu -f /docker-entrypoint-initdb.d/002_co_generator_schema.sql
```

Or manually:
```bash
docker exec -it postgres psql -U admin -d edu
```

Then run:
```sql
-- Check if course_outcomes table exists and has required columns
\d course_outcomes

-- Should show: id, course_id, co_number, co_text, description, bloom_level, verified, teacher_id, created_at, updated_at
```

#### MongoDB
MongoDB collections are created automatically on first insert.
No manual setup needed.

### 3. Verify Environment Variables

Check that all services have correct environment variables in `docker-compose.yml`:

- ✅ Backend: `POSTGRES_HOST`, `POSTGRES_DB`, `MONGODB_URI`
- ✅ CO Generator: `POSTGRES_HOST`, `POSTGRES_DB`, `MONGODB_HOST`, `MONGODB_DB`, `CHROMA_HOST`
- ✅ Frontend: `VITE_API_URL`, `VITE_CO_API_URL`

---

## Deployment Steps

### Step 1: Stop All Services
```bash
docker-compose down
```

### Step 2: Clean Build (Optional but Recommended)
```bash
# Remove old images
docker-compose down --rmi all --volumes --remove-orphans

# Or just remove CO generator image
docker rmi co_generator
```

### Step 3: Rebuild and Start Services
```bash
# Build and start all services
docker-compose up --build -d

# Or start specific services
docker-compose up --build -d co-generator backend frontend
```

### Step 4: Monitor Startup Logs

#### Watch CO Generator logs
```bash
docker logs -f co_generator
```

You should see:
```
🚀 Starting CO Generator Microservice (Port 8085)
📦 Configuration:
   - CHROMA_HOST=chromadb:8000
   - POSTGRES_HOST=postgres DB=edu
   - MONGODB_HOST=mongodb DB=edu_analytics
🔗 Connecting to PostgreSQL...
✅ PostgreSQL connected: postgres:edu
🔗 Connecting to MongoDB...
✅ MongoDB connected: mongodb:edu_analytics
🔗 Connecting to ChromaDB...
✅ ChromaDB connected: 0 documents in collection
✅ CO Generator Service Ready (Groq API)!
```

#### Watch Backend logs
```bash
docker logs -f nodejs-backend
```

You should see:
```
🚀 Starting OBE Backend Server
📊 Connecting to PostgreSQL...
✅ PostgreSQL connected
📊 Connecting to MongoDB...
✅ MongoDB connected
✅ OBE Backend Server Ready!
   - Port: 8080
   - API: http://localhost:8080
```

### Step 5: Health Checks

```bash
# Backend health
curl http://localhost:8080/health

# CO Generator health
curl http://localhost:8085/health

# Expected output from CO Generator:
{
  "status": "ok",
  "chroma": "ok",
  "postgres": "ok",
  "mongodb": "ok",
  "model": "ok",
  "version": "1.0.0",
  "timestamp": "2025-01-05T..."
}
```

---

## Testing the Complete Flow

### Test 1: User Registration and Login

```bash
# Register a teacher
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123",
    "role": "teacher",
    "name": "Test Teacher",
    "department": "Computer Science"
  }'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'

# Save the token from the response
export TOKEN="<your-jwt-token>"
export TEACHER_ID="<user-id-from-response>"
```

### Test 2: Create or Get Course

```bash
# Create/get a course
curl -X POST http://localhost:8080/api/courses/create-or-get \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "course_code": "CS101",
    "course_name": "Data Structures and Algorithms",
    "semester": 5,
    "year": 2025,
    "department": "Computer Science"
  }'

# Save the course_id from the response
export COURSE_ID="<course-id-from-response>"
```

### Test 3: Upload Syllabus

```bash
# Upload a syllabus file
curl -X POST http://localhost:8085/api/co/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/syllabus.pdf" \
  -F "course_id=$COURSE_ID" \
  -F "teacher_id=$TEACHER_ID"

# Expected response:
{
  "status": "processing",
  "message": "File 'syllabus.pdf' received. Ingestion started in background.",
  "course_id": "...",
  "course_code": "CS101",
  "filename": "syllabus.pdf",
  "file_size": 245632,
  "instructions": "Use GET /api/co/status/{course_id} to check progress"
}
```

### Test 4: Check Ingestion Status

```bash
# Check status (wait a few seconds after upload)
curl http://localhost:8085/api/co/status/$COURSE_ID

# Expected response (when done):
{
  "course_id": "...",
  "course_code": "CS101",
  "status": "done",
  "message": "Ingestion complete",
  "chunks": 42,
  "duration": 3.5
}
```

### Test 5: Generate COs

```bash
# Generate 5 COs
curl -X POST http://localhost:8085/api/co/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "course_id": "'$COURSE_ID'",
    "teacher_id": "'$TEACHER_ID'",
    "num_cos": 5,
    "temperature": 0.3,
    "seed": 42
  }'

# Expected response:
{
  "success": true,
  "message": "Generated 5 course outcomes",
  "course_code": "CS101",
  "co_list": [
    {
      "number": 1,
      "text": "Analyze the time and space complexity of algorithms...",
      "bloom_level": {
        "level": 4,
        "name": "Analyze"
      },
      "evidence": [...]
    },
    ...
  ],
  "prompt_tokens": 1234,
  "gen_tokens": 567,
  "latency_ms": 2345
}
```

### Test 6: List COs

```bash
# List all COs for the course
curl http://localhost:8085/api/co/list/$COURSE_ID

# Expected response:
{
  "success": true,
  "course_id": "...",
  "course_code": "CS101",
  "course_name": "Data Structures and Algorithms",
  "co_list": [
    {
      "id": "...",
      "course_id": "...",
      "teacher_id": "...",
      "co_number": 1,
      "co_text": "Analyze the time and space complexity...",
      "bloom_level": "Analyze",
      "verified": false,
      "created_at": "2025-01-05T..."
    },
    ...
  ],
  "total_cos": 5
}
```

### Test 7: Get Stats

```bash
# Get stats for the course
curl http://localhost:8085/api/co/stats/$COURSE_ID

# Expected response:
{
  "success": true,
  "course_id": "...",
  "course_code": "CS101",
  "course_name": "Data Structures and Algorithms",
  "co_counts": {
    "total": 5,
    "verified": 0,
    "unverified": 5
  },
  "bloom_distribution": {
    "Analyze": 2,
    "Apply": 2,
    "Evaluate": 1
  },
  "rag_chunks": 42,
  "rag_status": "ok",
  "last_updated": "2025-01-05T..."
}
```

### Test 8: Frontend UI Testing

1. **Open Frontend**: http://localhost:5173
2. **Login** as the teacher
3. **Navigate to CO Generator** page
4. **Fill in Course Details**:
   - Course Code: CS101
   - Course Name: Data Structures and Algorithms
5. **Upload Syllabus**: Choose a PDF/DOCX file
6. **Click Upload** - Should show "Upload successful" message
7. **Wait for Ingestion** - Status should update automatically
8. **Click Generate COs** - Should generate and display COs
9. **View Generated COs** - Should show all COs with Bloom levels
10. **Check Stats** - Should display CO count and distribution

---

## Verify Logging

### Backend Logs
```bash
# Check combined logs
cat backend/logs/combined.log | jq

# Check error logs
cat backend/logs/error.log | jq

# Example log entry:
{
  "timestamp": "2025-01-05 10:30:45.123",
  "level": "info",
  "message": "Incoming request",
  "service": "backend-api",
  "type": "request",
  "method": "POST",
  "url": "/api/courses/create-or-get",
  "user_id": "...",
  "user_role": "teacher"
}
```

### CO Generator Logs
```bash
# Watch logs in real-time
docker logs -f co_generator

# Example log entries:
[UPLOAD] Request received
   File: syllabus.pdf
   Course ID: abc-123-def-456
   Teacher ID: xyz-789
[UPLOAD] Step 1: Fetching course from PostgreSQL...
[DB] Fetching course: abc-123-def-456
[DB] ✅ Course found: CS101 - Data Structures and Algorithms in 15.23ms
[UPLOAD] ✅ Course found: CS101 - Data Structures and Algorithms
[UPLOAD] Step 2: Validating file type...
[UPLOAD] ✅ File type valid: .pdf
[UPLOAD] Step 3: Saving file to temp storage...
[UPLOAD] ✅ File saved: /tmp/co-generator/CS101_20250105_103045_syllabus.pdf (245,632 bytes)
[UPLOAD] Step 4: Storing metadata in MongoDB...
[MONGO] ✅ Stored upload metadata: syllabus.pdf (245632 bytes) | Course: CS101
[UPLOAD] Step 5: Starting background ingestion...
[UPLOAD] ✅ SUCCESS
```

### MongoDB Activity Log
```bash
# Connect to MongoDB
docker exec -it mongodb mongosh edu_analytics

# Check activity logs
db.teacher_activity_log.find().sort({timestamp: -1}).limit(5).pretty()

# Example:
{
  "_id": ObjectId("..."),
  "teacher_id": "xyz-789",
  "action": "uploaded_syllabus",
  "course_id": "abc-123",
  "course_code": "CS101",
  "details": {
    "filename": "syllabus.pdf",
    "file_size": 245632,
    "file_type": ".pdf"
  },
  "timestamp": ISODate("2025-01-05T10:30:45.123Z")
}
```

---

## Troubleshooting

### Issue 1: CO Generator fails to connect to PostgreSQL

**Symptoms**:
```
❌ PostgreSQL connection failed - service will NOT start
```

**Solution**:
1. Check PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   docker logs postgres
   ```

3. Test connection manually:
   ```bash
   docker exec -it co_generator python -c "
   import psycopg2
   conn = psycopg2.connect(
     host='postgres',
     port=5432,
     database='edu',
     user='admin',
     password='password'
   )
   print('✅ Connected')
   conn.close()
   "
   ```

### Issue 2: Upload button not working / 404 errors

**Symptoms**:
- Frontend shows 404 errors
- Console logs: `GET /api/co/list/{id} 404`

**Solution**:
1. Verify CO Generator is running:
   ```bash
   curl http://localhost:8085/health
   ```

2. Check CO Generator logs for errors:
   ```bash
   docker logs co_generator | grep ERROR
   ```

3. Verify frontend is using correct API URL:
   ```bash
   docker logs react-frontend | grep VITE_CO_API_URL
   ```

### Issue 3: Course not found errors

**Symptoms**:
```
Course not found with ID: ...
```

**Solution**:
1. Verify course exists in PostgreSQL:
   ```bash
   docker exec -it postgres psql -U admin -d edu -c "SELECT * FROM courses;"
   ```

2. Check if course_id is being passed correctly:
   ```bash
   # Open browser DevTools → Network tab
   # Check the request payload
   ```

3. Ensure frontend is creating course before upload:
   ```javascript
   // In COGenerator.jsx, handleUpload should call:
   await createOrGetCourse();
   ```

### Issue 4: MongoDB analytics not working

**Symptoms**:
- CO generation works but no activity logs
- Warnings in logs: `MongoDB metadata storage failed`

**Solution**:
1. Check MongoDB is running:
   ```bash
   docker ps | grep mongodb
   ```

2. Test connection:
   ```bash
   docker exec -it mongodb mongosh --eval "db.adminCommand('ping')"
   ```

3. Check if collections exist:
   ```bash
   docker exec -it mongodb mongosh edu_analytics --eval "show collections"
   ```

---

## Performance Monitoring

### Database Query Performance

Monitor slow queries in PostgreSQL:
```sql
-- Enable query logging
ALTER DATABASE edu SET log_min_duration_statement = 1000; -- Log queries > 1s

-- View slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

### CO Generation Performance

Check generation times in logs:
```bash
docker logs co_generator | grep "LLM Duration"
```

Expected times:
- Upload: < 1s
- Ingestion: 2-5s (depending on file size)
- Generation (5 COs): 2-4s

---

## Production Deployment

### Security Checklist

1. **Change All Secrets**:
   ```bash
   # Generate new secrets
   openssl rand -hex 32  # For JWT_SECRET
   openssl rand -hex 16  # For database passwords
   ```

2. **Update docker-compose.yml**:
   - Set `ALLOW_RESET: false` in CO Generator
   - Set `NODE_ENV: production` in Backend
   - Use `.env` file for secrets (don't commit secrets to git)

3. **Enable HTTPS**:
   - Use nginx as reverse proxy
   - Get SSL certificates (Let's Encrypt)

4. **Database Security**:
   - Don't expose database ports publicly
   - Use strong passwords
   - Enable SSL connections

5. **Logging**:
   - Set `LOG_LEVEL: INFO` or `WARNING` in production
   - Set up log rotation
   - Use external log aggregation (e.g., ELK stack)

---

## Success Criteria ✅

- [x] All services start without errors
- [x] Health checks pass for all services
- [x] User can register and login
- [x] Course creation works
- [x] Syllabus upload completes successfully
- [x] Ingestion status can be checked
- [x] CO generation produces valid results
- [x] Generated COs are saved to PostgreSQL
- [x] COs can be listed via frontend
- [x] Stats are displayed correctly
- [x] All operations are logged properly
- [x] MongoDB activity logs are created
- [x] No 404 errors on legitimate requests
- [x] Frontend UI is fully functional

---

## Next Steps

1. **Test with Real Data**: Upload actual course syllabi and verify quality of generated COs
2. **Performance Tuning**: Optimize database queries and add indexes if needed
3. **Error Handling**: Add more graceful error messages to frontend
4. **Analytics Dashboard**: Build teacher dashboard using MongoDB analytics data
5. **Bulk Operations**: Add batch CO generation for multiple courses
6. **Export Features**: Add CO export to PDF/Excel
7. **Verification Workflow**: Implement CO verification UI
8. **Student Features**: Build student view for CO-wise performance

---

## Support

If you encounter issues not covered in this guide:

1. Check logs: `docker logs <service-name>`
2. Check database: `docker exec -it postgres psql -U admin -d edu`
3. Check MongoDB: `docker exec -it mongodb mongosh edu_analytics`
4. Review code changes in `DATABASE_REFACTORING_PLAN.md`
5. Open an issue with:
   - Error messages
   - Relevant logs
   - Steps to reproduce
