"""Generate sample interaction data for testing ML models"""
import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

# Create logs directory if needed
os.makedirs('logs', exist_ok=True)

# Load actual resource IDs from resources.csv
resources_df = pd.read_csv('data/resources.csv')
resource_ids = resources_df['resource_id'].tolist()

# Sample student IDs
students = [f"1DS23AI{str(i).zfill(3)}" for i in range(1, 21)]  # 20 students

print("Generating sample interaction data...")
print("=" * 60)

# Generate votes
votes_data = []
base_time = datetime.now() - timedelta(days=30)

for i in range(100):  # 100 votes
    student = np.random.choice(students)
    resource = np.random.choice(resource_ids)
    vote = np.random.choice([1, -1], p=[0.7, 0.3])  # 70% upvotes
    timestamp = base_time + timedelta(days=np.random.randint(0, 30), 
                                     hours=np.random.randint(0, 24))
    
    votes_data.append({
        'student_id': student,
        'resource_id': resource,
        'vote': vote,
        'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
    })

votes_df = pd.DataFrame(votes_data)
votes_df.to_csv('logs/votes.csv', index=False)
print(f"✅ Generated {len(votes_df)} votes")
print(f"   Students: {votes_df['student_id'].nunique()}")
print(f"   Resources: {votes_df['resource_id'].nunique()}")

# Generate feedback
feedback_data = []

for i in range(80):  # 80 feedback entries
    student = np.random.choice(students)
    resource = np.random.choice(resource_ids)
    rating = np.random.choice([3, 4, 5], p=[0.2, 0.5, 0.3])  # Mostly positive
    improvement = np.random.choice([10, 20, 30, 40, 50])
    comments = [
        "Very helpful resource",
        "Good explanation",
        "Could be better",
        "Excellent content",
        "Clear and concise"
    ]
    comment = np.random.choice(comments)
    timestamp = base_time + timedelta(days=np.random.randint(0, 30),
                                     hours=np.random.randint(0, 24))
    
    feedback_data.append({
        'student_id': student,
        'resource_id': resource,
        'rating': rating,
        'comment': comment,
        'improvement_percent': improvement,
        'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
    })

feedback_df = pd.DataFrame(feedback_data)
feedback_df.to_csv('logs/feedback.csv', index=False)
print(f"✅ Generated {len(feedback_df)} feedback entries")
print(f"   Avg rating: {feedback_df['rating'].mean():.2f}/5")

# Generate completions
completion_data = []

for i in range(60):  # 60 completions
    student = np.random.choice(students)
    resource = np.random.choice(resource_ids)
    timestamp = base_time + timedelta(days=np.random.randint(0, 30),
                                     hours=np.random.randint(0, 24))
    
    completion_data.append({
        'student_id': student,
        'resource_id': resource,
        'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
    })

completed_df = pd.DataFrame(completion_data)
completed_df.to_csv('logs/completed.csv', index=False)
print(f"✅ Generated {len(completed_df)} completions")

print("\n" + "=" * 60)
print("📊 Summary Statistics:")
print("=" * 60)

all_interactions = len(votes_df) + len(feedback_df) + len(completed_df)
print(f"Total interactions: {all_interactions}")
print(f"  - Votes: {len(votes_df)}")
print(f"  - Feedback: {len(feedback_df)}")
print(f"  - Completions: {len(completed_df)}")
print(f"\nUnique students: {votes_df['student_id'].nunique()}")
print(f"Unique resources: {votes_df['resource_id'].nunique()}")

print("\nSample data preview:")
print("\n📝 Votes:")
print(votes_df.head(3).to_string(index=False))
print("\n💬 Feedback:")
print(feedback_df.head(3).to_string(index=False))
print("\n✅ Completions:")
print(completed_df.head(3).to_string(index=False))

print("\n" + "=" * 60)
print("✅ Sample data generation complete!")
print("Now run: python test_ml_cf.py")
print("=" * 60)
