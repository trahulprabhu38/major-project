# Quick Start Guide

## 🚀 Start Everything

```bash
./start-dev.sh
```

OR manually:

```bash
docker-compose up --build -d
```

## 📱 Access URLs

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:8080
- **Upload API:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

## 🧪 Quick Test

### 1. Test Upload Service

```bash
# Health check
curl http://localhost:8001/health

# Upload a CSV
curl -X POST http://localhost:8001/upload \
  -F "file=@your-file.csv"
```

### 2. Create Test User

```bash
# Register student
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "test123",
    "name": "Test Student",
    "role": "student",
    "usn": "1MS21CS001",
    "department": "CSE"
  }'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"test123"}'
```

## 📊 View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs fastapi_upload_service -f
docker logs nodejs-backend -f
docker logs react-frontend -f
```

## 🛑 Stop Everything

```bash
docker-compose down
```

## 🔧 Common Issues

**Service not starting?**
```bash
docker-compose restart [service_name]
```

**Database issues?**
```bash
docker exec -it postgres psql -U admin -d edu
```

**Port conflicts?**
```bash
# Check what's using the port
lsof -i :5173
lsof -i :8080
lsof -i :8001
```

## 📖 Full Documentation

See `FASTAPI_INTEGRATION_GUIDE.md` for complete details.
