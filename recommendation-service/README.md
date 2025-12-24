# Recommendation Service

FastAPI-based recommendation system for personalized learning resource suggestions.

## Features

- **Personalized Recommendations**: Analyzes student performance to recommend relevant learning resources
- **Collaborative Filtering**: Leverages ratings from students with similar skill gaps
- **Content-Based Filtering**: Matches resources by topic relevance and difficulty
- **Hybrid Approach**: Combines CF and content-based for optimal recommendations
- **Study Plan Generation**: Creates day-wise study plans based on recommendations
- **Analytics Dashboard**: Provides insights on resource effectiveness and student progress
- **Feedback System**: Collects votes, ratings, and completion status

## API Endpoints

### Recommendations
- `POST /api/recommendations/student` - Get personalized recommendations
- `GET /api/recommendations/student/{student_id}` - Get recommendations by query params
- `POST /api/recommendations/study-plan` - Generate study plan
- `POST /api/recommendations/batch` - Batch recommendations for multiple students
- `GET /api/recommendations/course/{course_id}/recommendations-summary` - Course-wide summary

### Resources
- `GET /api/resources/` - List all resources with filters
- `GET /api/resources/{resource_id}` - Get specific resource
- `POST /api/resources/` - Create new resource
- `PUT /api/resources/{resource_id}` - Update resource
- `DELETE /api/resources/{resource_id}` - Delete resource
- `POST /api/resources/upload-csv` - Bulk upload via CSV

### Feedback
- `POST /api/feedback/vote` - Submit upvote/downvote
- `POST /api/feedback/rating` - Submit rating (1-5)
- `POST /api/feedback/completion` - Mark resource as completed
- `GET /api/feedback/student/{student_id}/history` - Get student feedback history
- `GET /api/feedback/resource/{resource_id}/stats` - Get resource stats

### Analytics
- `GET /api/analytics/overview` - Overall analytics overview
- `GET /api/analytics/student/{student_id}/progress` - Student progress tracking
- `GET /api/analytics/resources/effectiveness` - Resource effectiveness scores
- `GET /api/analytics/teacher/dashboard` - Teacher dashboard data

## Setup

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8003
```

### Docker

```bash
# Build image
docker build -t recommendation-service .

# Run container
docker run -p 8003:8003 recommendation-service
```

### Docker Compose

The service is integrated with docker-compose:

```bash
docker-compose up recommendation-service
```

## Data Files

### Required Files
- `data/resources.csv` - Learning resources catalog
- `data/question_map_inferred.csv` - Question-CO-Topic mappings
- `data/DBMS MARKS - cie1marks (1).csv` - Internal test marks (optional, can fetch from backend)

### Generated Files
- `logs/votes.csv` - Student votes on resources
- `logs/feedback.csv` - Student ratings and comments
- `logs/completed.csv` - Resource completions
- `logs/recommendation_service.log` - Application logs

## Integration with Backend

The service integrates with the main backend to fetch:
- Student performance data
- Course enrollments
- Detailed calculations (CO attainment, horizontal/vertical analysis)

This ensures recommendations are based on real-time performance data.

## Configuration

See `.env.example` for configuration options.

Key settings in `core/config.py`:
- `BACKEND_API_URL` - Main backend URL
- `DEFAULT_THRESHOLD` - Question pass threshold
- `CF_WEIGHT` - Collaborative filtering weight
- `INTERNAL_CO_MAP` - Question-CO mappings per internal

## API Documentation

Visit `/docs` for interactive API documentation (Swagger UI).
Visit `/redoc` for alternative API documentation (ReDoc).

## Architecture

```
recommendation-service/
├── main.py                 # FastAPI application entry point
├── api/                    # API route handlers
│   ├── recommendations.py  # Recommendation endpoints
│   ├── resources.py        # Resource management
│   ├── feedback.py         # Feedback endpoints
│   └── analytics.py        # Analytics endpoints
├── services/               # Business logic
│   ├── recommender_service.py      # Main recommendation logic
│   ├── backend_client.py           # Backend API client
│   ├── performance_analyzer.py     # Performance analysis
│   ├── cf_recommender.py          # Collaborative filtering
│   ├── study_plan_service.py      # Study plan generation
│   ├── feedback_service.py        # Feedback management
│   ├── analytics_service.py       # Analytics logic
│   └── resource_service.py        # Resource CRUD
├── models/                 # Pydantic schemas
│   └── schemas.py
├── core/                   # Core configuration
│   ├── config.py           # Settings
│   └── logging_config.py   # Logging setup
└── data/                   # Data files
    └── logs/               # Generated logs
```

## License

MIT



