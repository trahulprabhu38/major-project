# Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. Services Running

```bash
docker-compose ps
```

Expected output:
- ✅ postgres (healthy)
- ✅ mongodb (healthy)
- ✅ nodejs-backend (running)
- ✅ react-frontend (running)
- ✅ fastapi_upload_service (running)

### 2. Health Checks

```bash
# Backend API
curl http://localhost:8080/health

# Upload Service
curl http://localhost:8001/health

# Frontend
curl http://localhost:5173
```

### 3. Database Connectivity

```bash
# PostgreSQL
docker exec -it postgres psql -U admin -d edu -c "SELECT COUNT(*) FROM users;"

# MongoDB
docker exec -it mongodb mongosh --eval "db.adminCommand('ping')"
```

---

## 🧪 Functional Testing

### Test 1: User Registration & Login

```bash
# Register student
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.student@example.com",
    "password": "test123",
    "name": "Test Student",
    "role": "student",
    "usn": "1MS21CS999",
    "department": "CSE"
  }'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test.student@example.com","password":"test123"}'
```

### Test 2: File Upload (FastAPI)

```bash
curl -X POST http://localhost:8001/upload \
  -F "file=@sample-data.csv"
```

Expected: Table created in PostgreSQL with 200 response

### Test 3: Student Enrollment

```bash
# Get token first (from login response)
TOKEN="your-token-here"

# Enroll
curl -X POST http://localhost:8080/api/students/enroll \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_code": "CS501",
    "course_name": "Data Structures",
    "teacher_name": "Prof. Test",
    "semester": 5,
    "branch": "CSE"
  }'
```

### Test 4: View Enrolled Courses

```bash
curl http://localhost:8080/api/students/courses \
  -H "Authorization: Bearer $TOKEN"
```

Expected: JSON array with enrolled course

### Test 5: Frontend UI

1. Open http://localhost:5173
2. Login as student
3. Navigate to Dashboard
4. Verify courses are displayed
5. Login as teacher
6. Go to Upload Marks
7. Upload sample-data.csv
8. Verify success message with table details

---

## 🔒 Security Checklist

### Development
- [x] CORS enabled for localhost
- [x] JWT authentication working
- [x] Password hashing implemented
- [x] SQL injection prevention (parameterized queries)
- [x] File validation (extensions, sizes)

### Production (TODO before going live)
- [ ] Change database passwords
- [ ] Update JWT_SECRET to strong random value
- [ ] Configure CORS for production domains only
- [ ] Enable HTTPS/SSL
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerts
- [ ] Enable database backups
- [ ] Review and harden security headers
- [ ] Add input sanitization middleware
- [ ] Set up logging aggregation

---

## 📊 Performance Checklist

- [x] Database connection pooling enabled
- [x] Docker health checks configured
- [x] Chunked file uploads (pandas)
- [x] Indexed database columns
- [ ] CDN for static assets (production)
- [ ] Compression enabled (gzip)
- [ ] Caching strategy (Redis - optional)

---

## 📝 Documentation Checklist

- [x] README.md updated
- [x] API documentation (Swagger)
- [x] Architecture diagrams
- [x] Quick start guide
- [x] Integration guide
- [x] Troubleshooting section
- [x] Environment variables documented
- [x] Sample data provided

---

## 🚀 Deployment Steps (Production)

### 1. Environment Configuration

```bash
# Backend .env
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24)
MONGODB_URI=mongodb://prod-mongo:27017/edu

# Upload Service .env
POSTGRES_PASSWORD=<same-as-backend>
```

### 2. Build Optimized Images

```bash
docker-compose -f docker-compose.prod.yml build --no-cache
```

### 3. Database Migration

```bash
# Run migrations
docker exec -it postgres psql -U admin -d edu < backend/migrations/001_initial_schema.sql
docker exec -it postgres psql -U admin -d edu < backend/migrations/002_add_department_to_courses.sql
```

### 4. Start Production Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify Deployment

```bash
# Check all services
docker-compose ps

# Check logs
docker-compose logs -f --tail=50
```

---

## 🔍 Monitoring

### Logs to Monitor

```bash
# All services
docker-compose logs -f

# Specific services
docker logs fastapi_upload_service -f
docker logs nodejs-backend -f
docker logs postgres -f
```

### Key Metrics

- Response time (< 200ms for API calls)
- Error rate (< 1%)
- Database connections (not maxed out)
- Disk usage (PostgreSQL and MongoDB)
- Memory usage per container
- CPU usage

---

## 🐛 Rollback Plan

If issues occur:

```bash
# Stop services
docker-compose down

# Restore database backup
docker exec -i postgres psql -U admin -d edu < backup.sql

# Start previous version
git checkout <previous-tag>
docker-compose up -d
```

---

## ✅ Go-Live Checklist

### Before Launch
- [ ] All tests passing
- [ ] Database backups configured
- [ ] Monitoring alerts set up
- [ ] SSL certificates installed
- [ ] DNS configured
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Documentation reviewed
- [ ] Team trained on deployment

### After Launch
- [ ] Monitor logs for errors
- [ ] Verify all features working
- [ ] Check performance metrics
- [ ] Notify users
- [ ] Update status page
- [ ] Create post-deployment report

---

## 📞 Support Contacts

- DevOps: [Contact]
- Backend: [Contact]
- Frontend: [Contact]
- Database: [Contact]

---

## 🎉 Success Criteria

✅ All services running without errors for 24 hours
✅ Response times within acceptable range
✅ No data loss or corruption
✅ User feedback positive
✅ Zero critical security issues

---

**Date Completed:** ___________
**Deployed By:** ___________
**Approved By:** ___________
