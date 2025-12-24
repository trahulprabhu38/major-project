# Integration Guide

## Frontend Integration

### API Service (JavaScript/React)

Create a service file to interact with the recommendation API:

```javascript
// src/services/recommendationAPI.js

const RECOMMENDATION_API_URL = import.meta.env.VITE_RECOMMENDATION_SERVICE_URL || 'http://localhost:8003';

export const recommendationAPI = {
  // Get recommendations for a student
  async getRecommendations(studentId, internalNo, courseId, options = {}) {
    const params = new URLSearchParams({
      internal_no: internalNo,
      threshold: options.threshold || 5,
      top_k: options.topK || 7,
      use_cf: options.useCF !== undefined ? options.useCF : true,
      cf_weight: options.cfWeight || 0.7,
      ...(courseId && { course_id: courseId })
    });

    const response = await fetch(
      `${RECOMMENDATION_API_URL}/api/recommendations/student/${studentId}?${params}`
    );
    return response.json();
  },

  // Generate study plan
  async getStudyPlan(studentId, internalNo, studyDays = 7, options = {}) {
    const response = await fetch(
      `${RECOMMENDATION_API_URL}/api/recommendations/study-plan`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          internal_no: internalNo,
          study_days: studyDays,
          threshold: options.threshold || 5,
          use_cf: options.useCF !== undefined ? options.useCF : true,
          cf_weight: options.cfWeight || 0.7
        })
      }
    );
    return response.json();
  },

  // Submit feedback
  async submitVote(studentId, resourceId, vote) {
    const response = await fetch(
      `${RECOMMENDATION_API_URL}/api/feedback/vote`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          resource_id: resourceId,
          vote: vote // 1 for upvote, -1 for downvote
        })
      }
    );
    return response.json();
  },

  async submitRating(studentId, resourceId, rating, comment = null) {
    const response = await fetch(
      `${RECOMMENDATION_API_URL}/api/feedback/rating`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          resource_id: resourceId,
          rating: rating, // 1-5
          comment: comment
        })
      }
    );
    return response.json();
  },

  async markCompleted(studentId, resourceId) {
    const response = await fetch(
      `${RECOMMENDATION_API_URL}/api/feedback/completion`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          resource_id: resourceId
        })
      }
    );
    return response.json();
  },

  // Get analytics
  async getStudentProgress(studentId) {
    const response = await fetch(
      `${RECOMMENDATION_API_URL}/api/analytics/student/${studentId}/progress`
    );
    return response.json();
  },

  async getCourseSummary(courseId, internalNo) {
    const response = await fetch(
      `${RECOMMENDATION_API_URL}/api/recommendations/course/${courseId}/recommendations-summary?internal_no=${internalNo}`
    );
    return response.json();
  },

  async getTeacherDashboard() {
    const response = await fetch(
      `${RECOMMENDATION_API_URL}/api/analytics/teacher/dashboard`
    );
    return response.json();
  },

  // Resource management
  async getResources(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${RECOMMENDATION_API_URL}/api/resources/?${params}`
    );
    return response.json();
  },

  async getResourceStats(resourceId) {
    const response = await fetch(
      `${RECOMMENDATION_API_URL}/api/feedback/resource/${resourceId}/stats`
    );
    return response.json();
  }
};
```

### React Component Example

```jsx
// src/components/student/RecommendationsView.jsx

import React, { useState, useEffect } from 'react';
import { recommendationAPI } from '../../services/recommendationAPI';
import { useAuth } from '../../contexts/AuthContext';

export const RecommendationsView = ({ courseId, internalNo }) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useCF, setUseCF] = useState(true);
  const [cfWeight, setCfWeight] = useState(0.7);

  useEffect(() => {
    loadRecommendations();
  }, [courseId, internalNo, useCF, cfWeight]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const data = await recommendationAPI.getRecommendations(
        user.usn,
        internalNo,
        courseId,
        { useCF, cfWeight }
      );
      setRecommendations(data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (resourceId, vote) => {
    try {
      await recommendationAPI.submitVote(user.usn, resourceId, vote);
      // Show success message
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  const handleComplete = async (resourceId) => {
    try {
      await recommendationAPI.markCompleted(user.usn, resourceId);
      // Show success message
    } catch (error) {
      console.error('Error marking completion:', error);
    }
  };

  if (loading) return <div>Loading recommendations...</div>;
  if (!recommendations) return <div>No recommendations available</div>;

  return (
    <div className="recommendations-container">
      <div className="header">
        <h2>Personalized Recommendations</h2>
        <div className="settings">
          <label>
            <input
              type="checkbox"
              checked={useCF}
              onChange={(e) => setUseCF(e.target.checked)}
            />
            Use Collaborative Filtering
          </label>
          {useCF && (
            <label>
              CF Weight: {cfWeight}
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={cfWeight}
                onChange={(e) => setCfWeight(parseFloat(e.target.value))}
              />
            </label>
          )}
        </div>
      </div>

      {recommendations.statistics && (
        <div className="stats">
          <div className="stat">
            <span>Weak Questions:</span>
            <strong>{recommendations.statistics.weak_questions_count}</strong>
          </div>
          <div className="stat">
            <span>COs Affected:</span>
            <strong>{recommendations.statistics.cos_affected}</strong>
          </div>
          <div className="stat">
            <span>Resources:</span>
            <strong>{recommendations.statistics.total_resources}</strong>
          </div>
        </div>
      )}

      {Object.entries(recommendations.recommendations).map(([co, resources]) => (
        <div key={co} className="co-section">
          <h3>{co}</h3>
          {recommendations.co_map[co] && (
            <p className="weak-questions">
              Weak questions: {recommendations.co_map[co].join(', ')}
            </p>
          )}
          
          <div className="resources-grid">
            {resources.map((resource) => (
              <div key={resource.resource_id} className="resource-card">
                <h4>{resource.title}</h4>
                <p>{resource.description}</p>
                <div className="meta">
                  <span className={`difficulty ${resource.difficulty}`}>
                    {resource.difficulty}
                  </span>
                  <span className="time">{resource.estimated_time_min} min</span>
                  <span className="type">{resource.type}</span>
                </div>
                
                {resource.hybrid_score && (
                  <div className="score">
                    Recommendation Score: {(resource.hybrid_score * 100).toFixed(0)}%
                  </div>
                )}
                
                <div className="actions">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    Open Resource
                  </a>
                  <button
                    onClick={() => handleVote(resource.resource_id, 1)}
                    className="btn-icon"
                  >
                    👍
                  </button>
                  <button
                    onClick={() => handleVote(resource.resource_id, -1)}
                    className="btn-icon"
                  >
                    👎
                  </button>
                  <button
                    onClick={() => handleComplete(resource.resource_id)}
                    className="btn-success"
                  >
                    ✓ Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Backend Integration

The recommendation service automatically fetches data from the backend API for:

1. **Student Performance**: `/api/detailed-calculations/course/:courseId/student/:studentId/performance`
2. **Course Students**: `/api/detailed-calculations/course/:courseId/students`
3. **Horizontal Analysis**: `/api/detailed-calculations/course/:courseId/horizontal-analysis`

Ensure these endpoints are accessible and return the expected data structure.

## Teacher Dashboard Integration

```jsx
// Teacher component to view course-wide recommendations
const TeacherRecommendationsDashboard = ({ courseId, internalNo }) => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    async function loadSummary() {
      const data = await recommendationAPI.getCourseSummary(courseId, internalNo);
      setSummary(data);
    }
    loadSummary();
  }, [courseId, internalNo]);

  // Display weakest COs, topics, and most recommended resources
  // ...
};
```

## Testing

```bash
# Test health endpoint
curl http://localhost:8003/health

# Test recommendations
curl "http://localhost:8003/api/recommendations/student/1DS23AI001?internal_no=1"

# Test with POST
curl -X POST http://localhost:8003/api/recommendations/student \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "1DS23AI001",
    "internal_no": 1,
    "course_id": 1,
    "threshold": 5,
    "top_k_per_co": 7,
    "use_cf": true,
    "cf_weight": 0.7
  }'
```



