"""Test script for ML-based CF system"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from modules.collaborative_filtering import CollaborativeFilteringRecommender, hybrid_recommend
from modules.recommender_by_questions import load_resources
import pandas as pd

print("=" * 60)
print("Testing ML-Enhanced Collaborative Filtering System")
print("=" * 60)

# Test 1: Check XGBoost availability
print("\n1️⃣ Checking XGBoost...")
try:
    import xgboost as xgb
    print(f"   ✅ XGBoost version {xgb.__version__} available")
except ImportError:
    print("   ❌ XGBoost not available")

# Test 2: Initialize CF Recommender
print("\n2️⃣ Initializing CF Recommender...")
cf = CollaborativeFilteringRecommender(n_clusters=5)
print("   ✅ CF Recommender initialized")

# Test 3: Load resources
print("\n3️⃣ Loading resources...")
resources_df = load_resources()
print(f"   ✅ Loaded {len(resources_df)} resources")

# Test 4: Load interactions
print("\n4️⃣ Loading interaction history...")
interactions = cf.load_student_interactions()
print(f"   ✅ Found {len(interactions)} interactions")
if not interactions.empty:
    print(f"   📊 {interactions['student_id'].nunique()} unique students")
    print(f"   📚 {interactions['resource_id'].nunique()} unique resources")

# Test 5: Create skill gap profile
print("\n5️⃣ Creating skill gap profile...")
test_profile = cf.create_skill_gap_profile(
    weak_questions=[2, 5, 6],
    internal_no=1,
    co_map={'CO1': ['5', '6'], 'CO4': ['2']}
)
print(f"   ✅ Profile shape: {test_profile.shape}")
print(f"   📊 Profile: {test_profile}")

# Test 6: Test clustering (if enough data)
print("\n6️⃣ Testing K-Means clustering...")
if len(interactions) >= 10:
    # Build student profiles
    historical_profiles = {}
    for student_id in interactions['student_id'].unique()[:10]:  # Test with first 10
        student_resources = interactions[interactions['student_id'] == student_id]['resource_id'].values
        student_cos = resources_df[resources_df['resource_id'].isin(student_resources)]['CO'].values
        co_profile = [len(student_cos)] * 5 + [1]
        historical_profiles[student_id] = test_profile  # Use test profile for now
    
    if len(historical_profiles) >= 5:
        clusters, model = cf.cluster_students(historical_profiles)
        print(f"   ✅ Clustering successful")
    else:
        print(f"   ⚠️ Only {len(historical_profiles)} students - need at least 5")
else:
    print("   ⚠️ Not enough interaction data for clustering")

# Test 7: Test XGBoost training (if enough data)
print("\n7️⃣ Testing XGBoost training...")
if len(interactions) >= 10:
    model = cf.train_xgboost_model(interactions, resources_df)
    if model:
        print("   ✅ XGBoost model trained successfully")
    else:
        print("   ⚠️ XGBoost training skipped (insufficient data)")
else:
    print("   ⚠️ Not enough interaction data for training")

# Test 8: Test prediction
print("\n8️⃣ Testing rating prediction...")
if cf.xgb_model is not None:
    sample_resource = resources_df.iloc[0]
    prediction = cf.predict_resource_rating("TEST_STUDENT", sample_resource, interactions)
    print(f"   ✅ Predicted rating: {prediction:.3f}")
    print(f"   📚 For resource: {sample_resource['title']}")
else:
    print("   ⚠️ XGBoost model not available - using fallback")

# Test 9: End-to-end recommendation
print("\n9️⃣ Testing end-to-end hybrid recommendation...")
try:
    recommendations = hybrid_recommend(
        student_id="1DS23AI001",
        weak_questions=[2, 5, 6],
        internal_no=1,
        co_map={'CO1': ['5', '6'], 'CO4': ['2']},
        topic_map={'Transaction Management': ['2'], 'Database Design': ['5', '6']},
        resources_df=resources_df,
        top_k_per_co=3,
        cf_weight=0.7
    )
    print(f"   ✅ Generated recommendations for {len(recommendations)} COs")
    
    for co, resources in recommendations.items():
        print(f"\n   {co}: {len(resources)} resources")
        for r in resources[:2]:  # Show first 2
            print(f"      • {r['title']}")
            print(f"        CF Rating: {r.get('cf_rating', 0):.2f}, Hybrid: {r.get('hybrid_score', 0):.2f}")
            if 'prediction_method' in r:
                print(f"        Method: {r['prediction_method']}")
                
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("✅ ML-CF System Test Complete!")
print("=" * 60)
