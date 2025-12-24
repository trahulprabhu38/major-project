# Quick Start Guide

## Running the Recommendation Service

### Option 1: Docker Compose (Recommended)

The easiest way to run the entire system including the recommendation service:

```bash
# From the project root
cd /Users/snehapratap/Downloads/major-project

# Start all services
docker-compose up -d

# Check recommendation service logs
docker-compose logs -f recommendation-service

# Stop services
docker-compose down
```

The service will be available at: `http://localhost:8003`

### Option 2: Standalone Docker

```bash
cd recommendation-service

# Build the image
docker build -t recommendation-service .

# Run the container
docker run -d \
  -p 8003:8003 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e BACKEND_API_URL=http://host.docker.internal:8080/api \
  --name recommendation-service \
  recommendation-service

# View logs
docker logs -f recommendation-service

# Stop and remove
docker stop recommendation-service
docker rm recommendation-service
```

### Option 3: Local Development

```bash
cd recommendation-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables (optional)
export BACKEND_API_URL=http://localhost:8080/api
export ENVIRONMENT=development
export LOG_LEVEL=DEBUG

# Run the server
uvicorn main:app --reload --port 8003

# Or with hot reload
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8003
```

## Testing the Service

### 1. Health Check

```bash
curl http://localhost:8003/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-03T...",
  "version": "2.0.0",
  "environment": "production"
}
```

### 2. Get Recommendations

```bash
# Using query parameters
curl "http://localhost:8003/api/recommendations/student/1DS23AI001?internal_no=1&threshold=5&use_cf=true"

# Using POST request
curl -X POST http://localhost:8003/api/recommendations/student \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "1DS23AI001",
    "internal_no": 1,
    "threshold": 5,
    "top_k_per_co": 7,
    "use_cf": true,
    "cf_weight": 0.7,
    "course_id": 1
  }'
```

### 3. Generate Study Plan

```bash
curl -X POST http://localhost:8003/api/recommendations/study-plan \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "1DS23AI001",
    "internal_no": 1,
    "study_days": 7,
    "threshold": 5,
    "use_cf": true
  }'
```

### 4. Submit Feedback

```bash
# Upvote a resource
curl -X POST http://localhost:8003/api/feedback/vote \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "1DS23AI001",
    "resource_id": "dbms_video_001",
    "vote": 1
  }'

# Submit rating
curl -X POST http://localhost:8003/api/feedback/rating \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "1DS23AI001",
    "resource_id": "dbms_video_001",
    "rating": 5,
    "comment": "Very helpful video!"
  }'

# Mark as completed
curl -X POST http://localhost:8003/api/feedback/completion \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "1DS23AI001",
    "resource_id": "dbms_video_001"
  }'
```

### 5. Get Analytics

```bash
# Overview
curl http://localhost:8003/api/analytics/overview

# Student progress
curl http://localhost:8003/api/analytics/student/1DS23AI001/progress

# Resource effectiveness
curl "http://localhost:8003/api/analytics/resources/effectiveness?co=CO1&min_interactions=1"

# Teacher dashboard
curl http://localhost:8003/api/analytics/teacher/dashboard
```

### 6. Resource Management

```bash
# List resources
curl "http://localhost:8003/api/resources/?co=CO1&difficulty=easy&limit=10"

# Get specific resource
curl http://localhost:8003/api/resources/dbms_video_001

# Get resources summary
curl http://localhost:8003/api/resources/stats/summary
```

## API Documentation

Once the service is running, visit:

- **Swagger UI**: http://localhost:8003/docs
- **ReDoc**: http://localhost:8003/redoc
- **Root**: http://localhost:8003/

## Data Setup

### Required Files

Place these CSV files in the `data/` directory:

1. **resources.csv** - Learning resources catalog
   ```csv
   resource_id,title,url,CO,topic,estimated_time_min,difficulty,description,type
   dbms_video_001,SQL Basics,https://youtube.com/...,CO1,SQL,30,easy,Introduction to SQL,video
   ```

2. **question_map_inferred.csv** - Question-CO-Topic mappings
   ```csv
   internal,question,co,topic
   1,1,CO1,Database Fundamentals
   1,2,CO4,Normalization
   ```

3. **CIE marks files** (optional - can fetch from backend):
   - `DBMS MARKS - cie1marks (1).csv`
   - `DBMS MARKS - cie2marks (1).csv`
   - `DBMS MARKS - cie3marks (1).csv`

### Sample Data

Sample data files are available in `res_system_streamlit/data/` and have been copied automatically during setup.

## Configuration

### Environment Variables

Create a `.env` file (or use environment variables):

```env
# Application
ENVIRONMENT=development
LOG_LEVEL=DEBUG

# Backend API
BACKEND_API_URL=http://localhost:8080/api

# Recommendation Settings
DEFAULT_THRESHOLD=5
CF_WEIGHT=0.7
```

### Configuration File

Edit `core/config.py` for more advanced settings:

- CO mappings per internal
- OR pairs (optional questions)
- Clustering parameters
- Cache settings

## Troubleshooting

### Service won't start

```bash
# Check if port 8003 is already in use
lsof -i :8003

# Check Docker logs
docker-compose logs recommendation-service

# Check if data directory exists
ls -la recommendation-service/data/
```

### No recommendations returned

- Ensure marks files exist in `data/` OR course_id is provided to fetch from backend
- Check that resources.csv has matching COs
- Verify student ID exists in marks file
- Check logs: `docker-compose logs recommendation-service`

### Backend connection fails

- Ensure backend service is running
- Check BACKEND_API_URL environment variable
- Verify network connectivity: `docker-compose exec recommendation-service ping backend`

### Import errors

```bash
# Reinstall dependencies
pip install -r requirements.txt

# Or in Docker
docker-compose build --no-cache recommendation-service
docker-compose up -d recommendation-service
```

## Development Workflow

1. **Make changes** to Python files
2. **Test locally**: `uvicorn main:app --reload`
3. **Build and test in Docker**: `docker-compose build recommendation-service`
4. **Deploy**: `docker-compose up -d recommendation-service`

## Monitoring

```bash
# Watch logs in real-time
docker-compose logs -f recommendation-service

# Check health
watch -n 5 'curl -s http://localhost:8003/health | jq'

# Monitor API usage
tail -f recommendation-service/logs/recommendation_service.log

# Check feedback data
ls -lh recommendation-service/logs/*.csv
```

## Next Steps

1. ✅ Service is running
2. ✅ Test API endpoints
3. 📱 Integrate with frontend (see INTEGRATION.md)
4. 📊 Monitor analytics dashboard
5. 🔧 Customize recommendations (edit config.py)
6. 📈 Review student feedback logs

## Support

For issues or questions:
- Check logs: `logs/recommendation_service.log`
- Review API docs: http://localhost:8003/docs
- See integration guide: INTEGRATION.md



