# Collaborative Filtering for Resource Recommendations

## Overview

The system now includes **Collaborative Filtering (CF)** to recommend resources based on ratings from students with similar skill gaps. This enhances the original content-based approach by leveraging the wisdom of the crowd.

## How It Works

### 1. **Skill Gap Profiling**
Each student gets a skill gap profile based on their weak questions:
- Vector format: `[CO1_weakness, CO2_weakness, CO3_weakness, CO4_weakness, CO5_weakness, internal_no]`
- Example: Student weak in 2 CO1 questions and 1 CO4 question → `[2, 0, 0, 1, 0, 1]`

### 2. **Student Clustering**
Students are grouped by similar skill gaps using:
- **Cosine Similarity**: Finds students with similar weakness patterns
- **K-Means Clustering**: Groups students into clusters (when enough data exists)

### 3. **Collaborative Resource Ranking**
Resources are ranked based on ratings from similar students:
```
For each resource:
  - Find students with similar skill gaps
  - Aggregate their ratings (votes, feedback, completions)
  - Calculate average rating
  - Sort resources by rating (highest to lowest)
```

### 4. **Hybrid Scoring**
Combines CF with content-based filtering:
```
hybrid_score = (cf_weight × CF_score) + ((1 - cf_weight) × content_score)

Where:
  - CF_score = Average rating from similar students (0-1)
  - content_score = Topic relevance × 0.7 + Difficulty preference × 0.3
  - cf_weight = User-adjustable (default: 0.7)
```

## Data Sources

The CF system uses three types of student interactions:

1. **Votes** (`logs/votes.csv`)
   - Upvote (+1) → 1.0 score
   - Downvote (-1) → 0.0 score

2. **Feedback** (`logs/feedback.csv`)
   - Ratings (1-5) → Normalized to 0-1 scale
   - Formula: `(rating - 1) / 4`

3. **Completions** (`logs/completed.csv`)
   - Implicit positive feedback
   - Score: 0.8

## Usage in Streamlit App

### Enable Collaborative Filtering:
1. Check "Use Collaborative Filtering" in the sidebar
2. Adjust CF weight slider (0.0 = pure content-based, 1.0 = pure CF)
3. View CF-specific information on resource cards:
   - **CF Rating**: Percentage rating from similar students
   - **Similar Students**: Number of students who rated this resource
   - **Hybrid Score**: Combined CF + content score

### Student Workflow:
1. Enter USN and select internal test
2. System analyzes weak questions
3. Creates skill gap profile
4. Finds similar students
5. Recommends top-rated resources from similar students
6. Student rates/votes on resources
7. Data improves future recommendations (feedback loop)

## Algorithm Details

### Finding Similar Students:
```python
# Calculate cosine similarity between student profiles
similarity = cosine_similarity(student_A_profile, student_B_profile)

# Example profiles:
Student A: [2, 0, 0, 1, 0, 1]  # Weak in CO1 (2 qs), CO4 (1 q), Internal 1
Student B: [2, 1, 0, 0, 0, 1]  # Weak in CO1 (2 qs), CO2 (1 q), Internal 1
Student C: [0, 0, 3, 0, 0, 2]  # Weak in CO3 (3 qs), Internal 2

# Similarity scores:
sim(A, B) = 0.85  # High similarity (both weak in CO1, same internal)
sim(A, C) = 0.35  # Low similarity (different COs and internals)
```

### Resource Ranking:
```python
# For each CO, rank resources by rating from similar students
for co in affected_COs:
    resources = get_resources_for_CO(co)
    
    for resource in resources:
        ratings = []
        for similar_student in similar_students:
            if similar_student rated resource:
                ratings.append(rating)
        
        avg_rating = mean(ratings)
        resource.cf_score = avg_rating
    
    # Sort by cf_score (highest first)
    ranked_resources = sort(resources, by=cf_score, descending=True)
```

## Benefits

1. **Personalized**: Recommendations based on students like you
2. **Adaptive**: Improves as more students rate resources
3. **Evidence-Based**: Uses actual effectiveness data, not just content matching
4. **Hybrid Approach**: Combines CF with topic relevance for best results

## Cold Start Handling

When insufficient data exists:
- **Fallback Mode**: Uses content-based recommendations
- **Default Rating**: Resources get neutral 0.5 rating
- **Progressive Learning**: As students interact, CF improves

## Implementation Files

- `modules/collaborative_filtering.py`: Core CF algorithms
- `modules/recommender_by_questions.py`: Integration with question-based system
- `streamlit_app.py`: UI controls and CF information display

## Future Enhancements

- Store actual skill gap profiles in database
- Implement matrix factorization for better scalability
- Add time-decay for older ratings
- Incorporate learning trajectory data
- Deep learning models for preference prediction
