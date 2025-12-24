# Enhanced ML-Based Collaborative Filtering System

## Overview
The recommender system now uses advanced machine learning techniques for personalized resource recommendations:

### 1. **K-Means Clustering for Student Grouping**
- **Purpose**: Group students with similar skill gaps together
- **Features Used**: 
  - CO1-CO5 weakness counts (number of weak questions per CO)
  - Internal test number
- **Benefits**:
  - Faster similarity search (compare clusters, not all students)
  - More meaningful groupings than simple cosine similarity
  - Automatically adapts as more students join

### 2. **XGBoost for Rating Prediction**
- **Purpose**: Predict how well a student will rate a resource
- **Features Used**:
  - Resource CO (1-5)
  - Resource difficulty (easy=1, medium=2, hard=3)
  - Resource type (video, article, tutorial, etc.)
  - Estimated time
  - Student interaction history count
  - Resource popularity
- **Benefits**:
  - Learns complex patterns from historical data
  - Better predictions than simple averages
  - Handles cold-start problem gracefully

## Architecture

```
Student Input (USN + Internal)
    ↓
Detect Weak Questions
    ↓
Create Skill Gap Profile [CO1, CO2, CO3, CO4, CO5, Internal]
    ↓
┌─────────────────────────────────────────────────┐
│  K-Means Clustering                             │
│  - Find students in same cluster                │
│  - Returns similar students automatically       │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  XGBoost Rating Prediction                      │
│  - For each resource in target COs              │
│  - Predict rating based on features             │
│  - Rank by predicted rating                     │
└─────────────────────────────────────────────────┘
    ↓
Hybrid Scoring (CF + Content-Based)
    ↓
Top K Resources per CO
```

## Model Training

### Initial Training
Models train automatically when:
- First recommendation request is made
- At least 10 interaction records exist (votes, feedback, completions)

### Incremental Updates
Models are saved to disk and reused:
- `logs/kmeans_model.pkl` - K-Means cluster model
- `logs/xgboost_model.pkl` - XGBoost rating predictor
- `logs/scaler.pkl` - Feature scaler

To force retraining:
```python
cf = CollaborativeFilteringRecommender(retrain=True)
```

## Performance Metrics

### K-Means Clustering
- **Clusters**: 5 (configurable)
- **Convergence**: Typically 5-10 iterations
- **Output**: Prints cluster distribution
  ```
  ✅ K-Means clustering: 45 students → 5 clusters
     Cluster 0: 12 students
     Cluster 1: 8 students
     ...
  ```

### XGBoost Model
- **Algorithm**: Gradient Boosting Regressor
- **Parameters**:
  - Trees: 100
  - Max depth: 5
  - Learning rate: 0.1
- **Evaluation**: Prints R² scores
  ```
  ✅ XGBoost trained - Train R²: 0.847, Test R²: 0.763
  ```

## Data Flow

### Training Data Structure
```python
Features (X):
- co: 1-5 (which CO the resource covers)
- difficulty: 1-3 (easy/medium/hard)
- type: 1-5 (video/article/tutorial/practice/docs)
- time: estimated minutes
- student_history: count of student's past interactions
- resource_popularity: count of all interactions with resource

Target (y):
- rating: 0-1 (normalized interaction score)
```

### Interaction Sources
1. **Votes**: Upvote=1.0, Downvote=0.0
2. **Feedback**: Rating 1-5 normalized to 0-1
3. **Completions**: Fixed 0.8 (implicit positive signal)

## Fallback Mechanisms

### Insufficient Data
- **< 10 interactions**: Uses content-based recommendations (difficulty + topic match)
- **< 5 students**: Skips clustering, uses all students
- **XGBoost unavailable**: Falls back to average ratings

### Cold Start (New Students)
- Uses content-based features (topic, difficulty)
- Predicts cluster membership from skill gap profile
- Leverages cluster-level patterns

## Usage Example

```python
from modules.collaborative_filtering import CollaborativeFilteringRecommender, hybrid_recommend
from modules.recommender_by_questions import load_resources

# Initialize
cf = CollaborativeFilteringRecommender(n_clusters=5)

# Load resources
resources_df = load_resources()

# Get recommendations with ML-based CF
recommendations = hybrid_recommend(
    student_id="1DS23AI001",
    weak_questions=[2, 5, 6],
    internal_no=1,
    co_map={'CO1': ['5', '6'], 'CO4': ['2']},
    topic_map={'Transaction Management': ['2'], 'Database Design': ['5', '6']},
    resources_df=resources_df,
    top_k_per_co=7,
    cf_weight=0.7  # 70% ML prediction, 30% content-based
)
```

## Benefits Over Simple CF

| Aspect | Simple CF | ML-Enhanced CF |
|--------|-----------|----------------|
| Similarity | Cosine similarity | K-Means clustering |
| Rating Prediction | Simple average | XGBoost with features |
| Scalability | O(n) students | O(k) clusters |
| Cold Start | Poor | Better (uses features) |
| Pattern Learning | None | Learns complex patterns |
| Adaptability | Static | Improves with data |

## Monitoring & Debugging

Enable debugging in Streamlit app to see:
- Cluster assignments
- Prediction methods used
- Model availability status
- Number of similar students found

Example output:
```
📊 Found 12 students in target cluster
✅ Using XGBoost predictions for 15 resources
```

## Future Enhancements

1. **Deep Learning**: Replace XGBoost with neural collaborative filtering
2. **Context-Aware**: Add time-of-day, day-of-week features
3. **Multi-Armed Bandit**: Exploration-exploitation for new resources
4. **A/B Testing**: Compare ML vs simple CF effectiveness
5. **Real-Time Updates**: Incremental learning as students interact

## Configuration

Adjust in `collaborative_filtering.py`:
```python
# Number of clusters
cf = CollaborativeFilteringRecommender(n_clusters=5)

# XGBoost parameters
self.xgb_model = xgb.XGBRegressor(
    n_estimators=100,      # More trees = better fit
    max_depth=5,           # Tree depth
    learning_rate=0.1      # Step size
)
```

## Troubleshooting

### "XGBoost not available"
```bash
pip install xgboost
```

### Models not saving
- Check `logs/` directory exists and is writable
- Verify sufficient disk space

### Poor predictions
- Need more interaction data (aim for 100+ interactions)
- Try retraining: `CollaborativeFilteringRecommender(retrain=True)`
- Adjust `cf_weight` (lower = more content-based)

### Clustering errors
- Reduce `n_clusters` if fewer students
- Check for NaN values in skill gap profiles
