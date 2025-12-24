# DBMS Resource Recommender Service

A FastAPI-based recommendation system that provides personalized learning resources for Database Management Systems (DBMS) courses. The system analyzes student performance on internal tests and recommends tailored resources based on their weak areas.

## Features

- **Performance Analysis**: Identifies weak questions and course outcomes (COs) based on internal test marks
- **Personalized Recommendations**: Suggests learning resources (videos, articles, tutorials) based on weak areas
- **Collaborative Filtering**: Uses ratings from students with similar skill gaps to recommend resources
- **Hybrid Scoring**: Combines collaborative filtering with content-based recommendations
- **Study Plan Generator**: Creates a day-by-day study schedule
- **Interactive Feedback**: Students can rate, upvote/downvote, and mark resources as completed
- **Analytics**: Tracks resource effectiveness and student progress

## Architecture

### Backend (FastAPI)
- **Framework**: FastAPI
- **Port**: 8004
- **Language**: Python 3.11
- **Database**: CSV-based (local storage for logs and marks)

### Frontend (React)
- **Framework**: React with Material-UI
- **Integration**: Seamless integration into student portal
- **Route**: `/student/dbms-recommender`

## Installation & Setup

### Using Docker Compose (Recommended)

The service is already integrated into the main docker-compose.yml. Simply run:

```bash
# Start all services including DBMS Recommender
docker-compose up -d

# Check if service is running
docker-compose ps dbms-recommender

# View logs
docker-compose logs -f dbms-recommender
```

The service will be available at: `http://localhost:8004`

### Manual Setup (Development)

1. **Install Dependencies**:
```bash
cd res_system_streamlit
pip install -r requirements.txt
```

2. **Prepare Data**:
   - Place student marks CSV files in `data/` directory
   - File naming convention: `*cie1*.csv`, `*cie2*.csv`, `*cie3*.csv`
   - Add resources to `data/resources.csv`
   - Add question mapping to `data/question_map_inferred.csv`

3. **Run the Service**:
```bash
python fastapi_main.py
```

4. **Run Streamlit App (Optional)**:
```bash
streamlit run streamlit_app.py
```

## API Endpoints

### Health Check
```
GET /health
```

### Get Recommendations
```
POST /api/recommendations
{
  "student_id": "1DS23AI001",
  "internal_no": 1,
  "threshold": 5,
  "top_k_per_co": 7,
  "use_cf": true,
  "cf_weight": 0.7
}
```

### Submit Vote
```
POST /api/vote
{
  "student_id": "1DS23AI001",
  "resource_id": "R001",
  "vote": 1  // 1 for upvote, -1 for downvote
}
```

### Submit Feedback
```
POST /api/feedback
{
  "student_id": "1DS23AI001",
  "resource_id": "R001",
  "rating": 5,  // 1-5
  "comment": "Very helpful!"
}
```

### Mark as Completed
```
POST /api/complete
{
  "student_id": "1DS23AI001",
  "resource_id": "R001"
}
```

### Generate Study Plan
```
POST /api/study-plan
{
  "recommendations": { ... },
  "study_days": 7
}
```

### Get Weak Areas
```
GET /api/student/{student_id}/weak-areas?internal_no=1&threshold=5
```

### Analytics (Teacher/Admin)
```
GET /api/analytics/votes
GET /api/analytics/feedback
```

## Data Format

### Student Marks CSV
Expected format (with 2 header rows):
```csv
[Header row 1 - can be anything]
[Header row 2 - can be anything]
Sl No.,USN,Q1A,Q1B,Q2A,Q2B,Q3A,Q3B,...
1,1DS23AI001,8,9,7,8,5,4,...
```

### Resources CSV
```csv
resource_id,title,url,CO,topic,estimated_time_min,difficulty,description,type
R001,SQL Basics,https://youtube.com/...,CO1,SQL,30,easy,Introduction to SQL,video
R002,Normalization,https://...,CO2,Database Design,45,medium,Database normalization,article
```

### Question Map CSV
```csv
internal,question,co,topic
1,1,CO1,SQL Basics
1,2,CO4,Transaction Management
2,1,CO4,Indexing
```

## React Integration

The DBMS Recommender is integrated into the student portal:

1. **Route**: Navigate to `/student/dbms-recommender`
2. **Navigation**: Added to the student sidebar menu
3. **API**: Uses `dbmsRecommenderAPI` service from `services/dbmsRecommenderAPI.js`

### Key Components

**DBMSRecommender.jsx** - Main component with:
- Settings panel (internal number, threshold, CF settings)
- Performance analysis with weak questions
- KPI cards (weak questions, resources, time, COs)
- Study plan with daily schedule
- Resource cards with voting/feedback
- Tabs for CO-based and all resources view

## Collaborative Filtering

The system uses collaborative filtering to enhance recommendations:

1. **Student Profiling**: Creates skill gap profiles based on weak COs
2. **Similarity Detection**: Finds students with similar skill gaps
3. **Rating Aggregation**: Collects ratings from similar students
4. **Hybrid Scoring**: Combines CF scores with content relevance
5. **XGBoost Model**: Predicts resource ratings (optional)

### CF Configuration

- **CF Weight**: Controls the weight of collaborative filtering (0-1)
  - Higher = more weight on similar students' ratings
  - Lower = more weight on content relevance
- **Default**: 0.7 (70% CF, 30% content-based)

## Customization

### Adding New Resources

Edit `data/resources.csv` and add new entries:
```csv
R999,Your Title,https://url,CO1,Topic,30,easy,Description,video
```

### Modifying CO Mapping

Edit `modules/recommender_by_questions.py`:
```python
INTERNAL_CO_MAP = {
    1: { "1":"CO1", "2":"CO4", ... },
    2: { "1":"CO4", "2":"CO3", ... },
    3: { "1":"CO3", "2":"CO5", ... }
}
```

### Adjusting OR Pairs

Questions that are optional (if either answered, it's OK):
```python
OR_PAIRS = [(3,4), (5,6), (7,8)]
```

## Troubleshooting

### Service not starting
```bash
# Check logs
docker-compose logs dbms-recommender

# Restart service
docker-compose restart dbms-recommender
```

### No recommendations showing
- Ensure student marks file exists for the internal number
- Check student USN matches exactly (case-sensitive)
- Verify resources.csv has entries for the weak COs

### Collaborative filtering not working
- Ensure votes.csv and feedback.csv have data
- Check if XGBoost is installed: `pip install xgboost`
- Try lowering CF weight or disabling CF

### CORS errors in browser
- Check that VITE_DBMS_RECOMMENDER_URL is set correctly in frontend
- Verify the service is accessible at http://localhost:8004

## Environment Variables

### Backend
- `PORT`: Service port (default: 8004)
- `PYTHONUNBUFFERED`: Set to 1 for real-time logs

### Frontend
- `VITE_DBMS_RECOMMENDER_URL`: Backend URL (default: http://localhost:8004)

## Technology Stack

### Backend
- FastAPI
- Pandas & NumPy
- Scikit-learn
- XGBoost (optional)
- Pydantic

### Frontend
- React 18
- Material-UI (MUI)
- Framer Motion
- Axios

## Performance Considerations

- **Data Caching**: Question map and resources are loaded on startup
- **Async Operations**: All API endpoints are async
- **Batch Processing**: Study plan generation is optimized
- **Model Caching**: ML models are saved to disk and reused

## Future Enhancements

- [ ] Support for multiple courses (currently DBMS only)
- [ ] PostgreSQL/MongoDB backend for scalability
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard for teachers
- [ ] Mobile app support
- [ ] Email notifications for study reminders
- [ ] Gamification (badges, leaderboards)
- [ ] Integration with LMS platforms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License

## Support

For issues or questions:
- Check logs: `docker-compose logs dbms-recommender`
- Review API documentation: http://localhost:8004/docs
- Contact: [Your contact information]

## Acknowledgments

- Built with FastAPI and React
- Uses collaborative filtering algorithms
- Inspired by modern EdTech platforms

