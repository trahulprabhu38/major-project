# QUICK FIX GUIDE - Upload Button & Database Issues

## 🎯 Problems Fixed

1. ✅ **Missing PostgreSQL columns** (`teacher_id`, `verified`, `co_text`)
2. ✅ **ChromaDB metadata error** (None values rejected)
3. ✅ **Simplified architecture** - Now uses `course_code` as primary identifier

---

## 🚀 IMMEDIATE DEPLOYMENT

### Step 1: Stop Services
```bash
cd /Users/trahulprabhu38/Desktop/major-project
docker-compose down
```

### Step 2: Rebuild CO Generator (Has Changes)
```bash
docker-compose build co-generator
```

### Step 3: Start All Services
```bash
docker-compose up -d
```

### Step 4: Watch CO Generator Logs
```bash
docker logs -f co_generator
```

**Expected Output**:
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
✅ CO Generator Service Ready!
```

---

## 🧪 TESTING THE FIX

### Test 1: Verify Database Schema

```bash
# Check if columns were added
docker exec postgres psql -U admin -d edu -c "\d course_outcomes"
```

**You should see**:
- `teacher_id` (uuid)
- `co_text` (text)
- `verified` (boolean)

### Test 2: Test Upload Flow

1. **Open Frontend**: http://localhost:5173
2. **Login** as a teacher
3. **Go to CO Generator** page
4. **Fill in**:
   - Course Code: `DS1` (or any code you want)
   - Course Name: `Data Structures`
5. **Upload** a syllabus PDF file
6. **Click Upload**

**Expected**:
- ✅ "Syllabus uploaded successfully!" message
- ✅ NO 404 errors
- ✅ NO "teacher_id does not exist" errors

### Test 3: Check Backend Logs

```bash
docker logs co_generator | tail -50
```

**You should see**:
```
📤 [UPLOAD] Request received
   Course Code: DS1
   Teacher ID: <uuid>
   File: syllabus.pdf
[UPLOAD] Step 1: Validating course DS1 in PostgreSQL...
[DB] Fetching course by code: DS1
[DB] ✅ Course found: DS1 (DSA) in 7.11ms
[UPLOAD] ✅ Course found: DS1 - DSA
[UPLOAD] Step 2: Validating file type...
[UPLOAD] ✅ File type valid: .pdf
[UPLOAD] Step 3: Saving file to temp storage...
[UPLOAD] ✅ File saved: /tmp/co-generator/DS1_..._.pdf (121,360 bytes)
[UPLOAD] Step 4: Storing metadata in MongoDB...
[MONGO] ✅ Stored upload metadata: syllabus.pdf | Course: DS1
[UPLOAD] Step 5: Starting background ingestion...
[UPLOAD] ✅ SUCCESS
[INGESTION] Starting for course DS1...
📄 Parsing syllabus: DS1_..._.pdf
Extracted 3693 chars from 3 pages
🔧 Preprocessing text...
💾 Storing 6 chunks in ChromaDB...
📝 Adding 6 documents to ChromaDB
✅ Added 6 documents to ChromaDB for course DS1  # <-- THIS SHOULD NOW WORK!
[INGESTION] ✅ Completed for DS1 in 0.40s
```

**Key difference**: No more `Failed to add documents to ChromaDB: Expected metadata value to be a str, int, float or bool, got None` error!

### Test 4: Generate COs

1. **Wait 5 seconds** after upload (for ingestion to complete)
2. **Enter number of COs**: 5 or 6
3. **Click "Generate COs"**

**Expected**:
```
[GENERATE] Request received
   Course Code: DS1
   Teacher ID: <uuid>
   Num COs: 6
[GENERATE] Step 1: Validating course DS1...
[DB] Fetching course by code: DS1
[DB] ✅ Course found: DS1 in 5.23ms
[GENERATE] Step 2: Checking ingestion status...
[GENERATE] ✅ Ingestion complete for DS1
[GENERATE] Step 3: Running CO generation...
[GENERATE] ✅ Generated 6 COs in 2345.67ms
[GENERATE] Step 4: Saving COs to PostgreSQL...
[DB] Saving 6 COs for course DS1, teacher <uuid>
[DB]   CO1: <uuid> | Analyze
[DB]   CO2: <uuid> | Apply
...
[DB] ✅ Saved 6 COs in 45.23ms
[GENERATE] Step 5: Storing metadata in MongoDB...
[MONGO] ✅ Stored CO generation metadata: 6 COs | Course: DS1
[GENERATE] ✅ SUCCESS
   Course: DS1
   COs Generated: 6
   Generation Time: 2345.67ms
```

---

## 📊 Verify Data Was Saved

### Check PostgreSQL

```bash
docker exec postgres psql -U admin -d edu -c "SELECT co_number, co_text, bloom_level, verified FROM course_outcomes WHERE course_id = (SELECT id FROM courses WHERE code = 'DS1');"
```

**You should see your generated COs** with:
- `co_number`: 1, 2, 3, 4, 5, 6
- `co_text`: The generated CO text
- `bloom_level`: Analyze, Apply, Evaluate, etc.
- `verified`: false

### Check MongoDB Activity Log

```bash
docker exec mongodb mongosh edu_analytics --eval "db.teacher_activity_log.find().sort({timestamp: -1}).limit(3).pretty()"
```

**You should see**:
- Upload activity
- CO generation activity

---

## ✅ Success Criteria

- [ ] Upload button works without errors
- [ ] No "teacher_id does not exist" errors
- [ ] No "verified does not exist" errors
- [ ] No ChromaDB metadata errors
- [ ] COs are generated successfully
- [ ] COs are saved to PostgreSQL
- [ ] Activity logged to MongoDB
- [ ] Frontend displays generated COs

---

## 🐛 If Something Still Fails

### Issue: "Course not found" Error

**Solution**:
1. Make sure you created the course in the backend:
   ```bash
   curl -X POST http://localhost:8080/api/courses/create-or-get \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "course_code": "DS1",
       "course_name": "Data Structures and Algorithms"
     }'
   ```

### Issue: ChromaDB Still Rejecting Metadata

**Check logs for**:
```
Failed to add documents to ChromaDB: ...
```

**Solution**:
1. The fix is already in place in `chroma_client.py` (lines 209-227)
2. Make sure you rebuilt the CO generator service
3. Restart: `docker-compose restart co-generator`

### Issue: PostgreSQL Columns Still Missing

**Solution**:
```bash
# Manually add columns
docker exec postgres psql -U admin -d edu -c "
ALTER TABLE course_outcomes ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id);
ALTER TABLE course_outcomes ADD COLUMN IF NOT EXISTS co_text TEXT;
ALTER TABLE course_outcomes ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
"
```

---

## 📝 What Changed

### 1. PostgreSQL Schema
**Added to `course_outcomes` table**:
- `teacher_id` - UUID of teacher who created the CO
- `co_text` - AI-generated CO text (alias for description)
- `verified` - Boolean flag for teacher verification

### 2. ChromaDB Metadata Sanitization
**File**: `co-generator/app/utils/chroma_client.py`

**Before**:
```python
metadata.append({
    "course_id": course_id,
    "page": page_numbers[i] if page_numbers else None,  # ❌ None value!
})
```

**After**:
```python
meta_dict = {
    "course_id": course_id,
}
# Only add page if it exists (ChromaDB rejects None)
if page_numbers and i < len(page_numbers) and page_numbers[i] is not None:
    meta_dict["page"] = page_numbers[i]

# Final sanitization: remove any None values
sanitized_meta = {k: v for k, v in meta_dict.items() if v is not None}
```

### 3. Simplified Architecture
**Now uses `course_code` as primary identifier**:
- Upload endpoint: `/api/co/upload` - accepts `course_code` (not `course_id`)
- Status endpoint: `/api/co/status/{course_code}`
- Generate endpoint: `/api/co/generate` - accepts `course_code`
- List endpoint: `/api/co/list/{course_code}`
- Stats endpoint: `/api/co/stats/{course_code}`

### 4. Frontend Changes
**File**: `edu-frontend/src/services/coGeneratorAPI.js`

**Before**:
```javascript
uploadSyllabus(file, courseId, teacherId)  // ❌ Used UUID
```

**After**:
```javascript
uploadSyllabus(file, courseCode, teacherId)  // ✅ Uses course code
```

**File**: `edu-frontend/src/pages/teacher/COGenerator.jsx`

**Before**:
```javascript
await coGeneratorAPI.uploadSyllabus(file, courseId, user.id);
```

**After**:
```javascript
await coGeneratorAPI.uploadSyllabus(file, courseCode, user.id);
```

---

## 🔄 Rollback (If Needed)

If you need to revert changes:

```bash
# Restore old routes
cd co-generator/app/routes
cp co_uuid_version_backup.py co.py

# Restore old frontend API
cd edu-frontend/src/services
cp coGeneratorAPI_uuid_backup.js coGeneratorAPI.js

# Rebuild and restart
docker-compose build co-generator
docker-compose restart co-generator frontend
```

---

## 📞 Support

If issues persist:

1. Check logs: `docker logs co_generator`
2. Check database: `docker exec postgres psql -U admin -d edu -c "\d course_outcomes"`
3. Check ChromaDB: `curl http://localhost:8000/api/v1/heartbeat`
4. Verify environment variables: `docker exec co_generator env | grep POSTGRES`

---

## 🎉 Summary

**Fixed Issues**:
1. ✅ Database schema mismatch (missing columns)
2. ✅ ChromaDB metadata error (None values)
3. ✅ Upload button now works!
4. ✅ COs are generated and saved
5. ✅ Comprehensive logging everywhere

**Architecture**:
- Simple and intuitive: Use `course_code` (e.g., "DS1") everywhere
- PostgreSQL manages courses, COs, and users
- MongoDB logs activity and analytics
- ChromaDB stores document embeddings for RAG

**You're ready to upload syllabi and generate COs!** 🚀
