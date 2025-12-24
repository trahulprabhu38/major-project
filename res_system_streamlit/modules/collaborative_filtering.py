# modules/collaborative_filtering.py
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics.pairwise import cosine_similarity
import os
import pickle

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("⚠️ XGBoost not installed. Install with: pip install xgboost")

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
DATA_DIR = os.path.join(BASE_DIR, "data")
LOGS_DIR = os.path.join(BASE_DIR, "logs")

VOTES_CSV = os.path.join(LOGS_DIR, "votes.csv")
FEEDBACK_CSV = os.path.join(LOGS_DIR, "feedback.csv")
COMPLETED_CSV = os.path.join(LOGS_DIR, "completed.csv")

# Model cache files
KMEANS_MODEL_PATH = os.path.join(LOGS_DIR, "kmeans_model.pkl")
XGBOOST_MODEL_PATH = os.path.join(LOGS_DIR, "xgboost_model.pkl")
SCALER_PATH = os.path.join(LOGS_DIR, "scaler.pkl")

class CollaborativeFilteringRecommender:
    """
    Enhanced Collaborative Filtering recommender using:
    1. K-Means clustering to group students with similar skill gaps
    2. XGBoost to predict resource ratings based on student-resource features
    3. Hybrid scoring combining ML predictions with content relevance
    """
    
    def __init__(self, n_clusters=5, retrain=False):
        self.n_clusters = n_clusters
        self.student_profiles = {}
        self.kmeans_model = None
        self.xgb_model = None
        self.scaler = StandardScaler()
        self.retrain = retrain
        
        # Load pre-trained models if available
        if not retrain:
            self._load_models()
    
    def _load_models(self):
        """Load pre-trained models from disk"""
        if os.path.exists(KMEANS_MODEL_PATH):
            with open(KMEANS_MODEL_PATH, 'rb') as f:
                self.kmeans_model = pickle.load(f)
        
        if os.path.exists(XGBOOST_MODEL_PATH) and XGBOOST_AVAILABLE:
            with open(XGBOOST_MODEL_PATH, 'rb') as f:
                self.xgb_model = pickle.load(f)
        
        if os.path.exists(SCALER_PATH):
            with open(SCALER_PATH, 'rb') as f:
                self.scaler = pickle.load(f)
    
    def _save_models(self):
        """Save trained models to disk"""
        os.makedirs(LOGS_DIR, exist_ok=True)
        
        if self.kmeans_model is not None:
            with open(KMEANS_MODEL_PATH, 'wb') as f:
                pickle.dump(self.kmeans_model, f)
        
        if self.xgb_model is not None and XGBOOST_AVAILABLE:
            with open(XGBOOST_MODEL_PATH, 'wb') as f:
                pickle.dump(self.xgb_model, f)
        
        with open(SCALER_PATH, 'wb') as f:
            pickle.dump(self.scaler, f)
        
    def create_skill_gap_profile(self, weak_questions, internal_no, co_map):
        """
        Create a skill gap vector for a student based on their weak questions.
        Returns a vector representing weakness in each CO.
        """
        # Define all possible COs across all internals
        all_cos = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5']
        
        # Count weak questions per CO
        co_weakness = {co: 0 for co in all_cos}
        
        for co, questions in co_map.items():
            if co in co_weakness:
                co_weakness[co] = len(questions)
        
        # Create vector: [CO1_weakness, CO2_weakness, ..., CO5_weakness, internal_no]
        profile = [co_weakness[co] for co in all_cos]
        profile.append(internal_no)  # Add internal as a feature
        
        return np.array(profile)
    
    def load_student_interactions(self):
        """Load all student interactions with resources (votes, feedback, completions)"""
        interactions = pd.DataFrame()
        
        # Load votes
        if os.path.exists(VOTES_CSV):
            votes = pd.read_csv(VOTES_CSV)
            # Ensure vote column is numeric
            votes['vote'] = pd.to_numeric(votes['vote'], errors='coerce')
            votes = votes.dropna(subset=['vote'])
            if not votes.empty:
                votes['interaction_score'] = votes['vote'].map({1: 1.0, -1: 0.0})
                interactions = pd.concat([interactions, votes[['student_id', 'resource_id', 'interaction_score']]])
        
        # Load feedback (ratings)
        if os.path.exists(FEEDBACK_CSV):
            feedback = pd.read_csv(FEEDBACK_CSV)
            # Ensure rating column is numeric
            feedback['rating'] = pd.to_numeric(feedback['rating'], errors='coerce')
            feedback = feedback.dropna(subset=['rating'])
            
            if not feedback.empty:
                # Normalize ratings to 0-1 scale
                feedback['interaction_score'] = (feedback['rating'] - 1) / 4  # 1-5 scale to 0-1
                interactions = pd.concat([interactions, feedback[['student_id', 'resource_id', 'interaction_score']]])
        
        # Load completions (implicit positive feedback)
        if os.path.exists(COMPLETED_CSV):
            completed = pd.read_csv(COMPLETED_CSV)
            completed['interaction_score'] = 0.8  # Completion indicates good resource
            interactions = pd.concat([interactions, completed[['student_id', 'resource_id', 'interaction_score']]])
        
        if interactions.empty:
            return pd.DataFrame(columns=['student_id', 'resource_id', 'interaction_score'])
        
        # Aggregate multiple interactions for same student-resource pair
        interactions = interactions.groupby(['student_id', 'resource_id'])['interaction_score'].mean().reset_index()
        
        return interactions
    
    def build_training_data(self, interactions, resources_df):
        """
        Build training dataset for XGBoost with features:
        - Student skill gap features (CO weaknesses)
        - Resource features (CO, difficulty, type)
        - Historical interaction features
        """
        if interactions.empty:
            return None, None
        
        training_data = []
        
        for _, row in interactions.iterrows():
            student_id = row['student_id']
            resource_id = row['resource_id']
            rating = row['interaction_score']
            
            # Get resource features
            resource_row = resources_df[resources_df['resource_id'] == resource_id]
            if resource_row.empty:
                continue
            
            resource_row = resource_row.iloc[0]
            
            # Extract CO as numeric (CO1->1, CO2->2, etc.)
            co_str = resource_row.get('CO', 'CO1')
            co_num = int(co_str.replace('CO', '')) if 'CO' in str(co_str) else 1
            
            # Difficulty encoding
            diff_map = {'easy': 1, 'medium': 2, 'hard': 3}
            difficulty = diff_map.get(str(resource_row.get('difficulty', 'medium')).lower(), 2)
            
            # Type encoding
            type_map = {'video': 1, 'article': 2, 'tutorial': 3, 'practice': 4, 'documentation': 5}
            rtype = type_map.get(str(resource_row.get('type', 'article')).lower(), 2)
            
            # Estimated time
            est_time = int(resource_row.get('estimated_time_min', 30))
            
            # Student interaction history (count of previous interactions)
            student_interactions = len(interactions[interactions['student_id'] == student_id])
            
            # Resource popularity (count of interactions)
            resource_popularity = len(interactions[interactions['resource_id'] == resource_id])
            
            # Create feature vector
            features = [
                co_num,
                difficulty,
                rtype,
                est_time,
                student_interactions,
                resource_popularity
            ]
            
            training_data.append(features + [rating])
        
        if not training_data:
            return None, None
        
        df = pd.DataFrame(training_data, columns=[
            'co', 'difficulty', 'type', 'time', 'student_history', 'resource_popularity', 'rating'
        ])
        
        X = df.drop('rating', axis=1).values
        y = df['rating'].values
        
        return X, y
    
    def train_xgboost_model(self, interactions, resources_df):
        """Train XGBoost model to predict resource ratings"""
        if not XGBOOST_AVAILABLE:
            print("⚠️ XGBoost not available. Skipping model training.")
            return None
        
        X, y = self.build_training_data(interactions, resources_df)
        
        if X is None or len(X) < 10:
            print("⚠️ Not enough training data (need at least 10 samples)")
            return None
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train XGBoost
        self.xgb_model = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            objective='reg:squarederror',
            random_state=42
        )
        
        self.xgb_model.fit(X_train, y_train)
        
        # Evaluate
        train_score = self.xgb_model.score(X_train, y_train)
        test_score = self.xgb_model.score(X_test, y_test) if len(X_test) > 0 else 0
        
        print(f"✅ XGBoost trained - Train R²: {train_score:.3f}, Test R²: {test_score:.3f}")
        
        self._save_models()
        return self.xgb_model
    
    def predict_resource_rating(self, student_id, resource_row, interactions):
        """Predict rating for a resource using XGBoost"""
        if self.xgb_model is None or not XGBOOST_AVAILABLE:
            # Fallback to simple average
            return 0.5
        
        # Extract features (same as training)
        co_str = resource_row.get('CO', 'CO1')
        co_num = int(co_str.replace('CO', '')) if 'CO' in str(co_str) else 1
        
        diff_map = {'easy': 1, 'medium': 2, 'hard': 3}
        difficulty = diff_map.get(str(resource_row.get('difficulty', 'medium')).lower(), 2)
        
        type_map = {'video': 1, 'article': 2, 'tutorial': 3, 'practice': 4, 'documentation': 5}
        rtype = type_map.get(str(resource_row.get('type', 'article')).lower(), 2)
        
        est_time = int(resource_row.get('estimated_time_min', 30))
        student_interactions = len(interactions[interactions['student_id'] == student_id])
        resource_popularity = len(interactions[interactions['resource_id'] == resource_row.get('resource_id', '')])
        
        features = np.array([[co_num, difficulty, rtype, est_time, student_interactions, resource_popularity]])
        
        try:
            prediction = self.xgb_model.predict(features)[0]
            # Clip to 0-1 range
            return max(0.0, min(1.0, prediction))
        except:
            return 0.5
    
    def find_similar_students(self, target_profile, student_profiles_dict, top_k=10):
        """
        Find students with similar skill gap profiles using cosine similarity.
        """
        if not student_profiles_dict or len(student_profiles_dict) < 2:
            return []
        
        similarities = []
        
        for student_id, profile in student_profiles_dict.items():
            similarity = cosine_similarity(
                target_profile.reshape(1, -1),
                profile.reshape(1, -1)
            )[0][0]
            similarities.append((student_id, similarity))
        
        # Sort by similarity (descending) and return top_k
        similarities.sort(key=lambda x: x[1], reverse=True)
        return [s[0] for s in similarities[:top_k]]
    
    def cluster_students(self, profiles_dict):
        """
        Cluster students based on their skill gap profiles using K-Means.
        Returns cluster assignments.
        """
        if len(profiles_dict) < self.n_clusters:
            # Not enough students to cluster, use similarity-based approach
            return None
        
        student_ids = list(profiles_dict.keys())
        profiles = np.array([profiles_dict[sid] for sid in student_ids])
        
        # Standardize features
        profiles_scaled = self.scaler.fit_transform(profiles)
        
        # K-Means clustering
        kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(profiles_scaled)
        
        # Create cluster mapping
        clusters = {}
        for idx, student_id in enumerate(student_ids):
            cluster_id = cluster_labels[idx]
            if cluster_id not in clusters:
                clusters[cluster_id] = []
            clusters[cluster_id].append(student_id)
        
        return clusters, kmeans
    
    def get_cluster_for_student(self, target_profile, kmeans_model):
        """Get cluster assignment for a new student"""
        profile_scaled = self.scaler.transform(target_profile.reshape(1, -1))
        return kmeans_model.predict(profile_scaled)[0]
    
    def recommend_resources_cf(self, target_student_id, weak_questions, internal_no, 
                               co_map, resources_df, top_k_per_co=7):
        """
        Main CF recommendation function.
        
        Args:
            target_student_id: The student to recommend for
            weak_questions: List of weak question numbers
            internal_no: Internal test number
            co_map: Dictionary mapping COs to weak questions
            resources_df: DataFrame of all resources
            top_k_per_co: Number of resources to recommend per CO
            
        Returns:
            Dictionary mapping CO -> list of recommended resources (sorted by rating)
        """
        # Create skill gap profile for target student
        target_profile = self.create_skill_gap_profile(weak_questions, internal_no, co_map)
        
        # Load all student interactions
        interactions = self.load_student_interactions()
        
        if interactions.empty:
            # No historical data, return empty recommendations
            return self._fallback_recommendations(co_map, resources_df, top_k_per_co)
        
        # Build profiles for all students who have interacted
        historical_profiles = {}
        
        # For simplicity, we'll create profiles based on the resources they interacted with
        # In a real system, you'd store actual skill gap data for each student
        for student_id in interactions['student_id'].unique():
            # Create a dummy profile (in production, load actual skill gaps)
            # For now, use resource CO distribution as proxy
            student_resources = interactions[interactions['student_id'] == student_id]['resource_id'].values
            student_cos = resources_df[resources_df['resource_id'].isin(student_resources)]['CO'].values
            
            # Count CO interactions as proxy for skill gaps
            co_profile = [np.sum(student_cos == f'CO{i}') for i in range(1, 6)]
            co_profile.append(internal_no)  # Add internal
            historical_profiles[student_id] = np.array(co_profile)
        
        # Find similar students
        similar_students = self.find_similar_students(
            target_profile, 
            historical_profiles, 
            top_k=min(10, len(historical_profiles))
        )
        
        # Get resources rated by similar students
        similar_interactions = interactions[interactions['student_id'].isin(similar_students)]
        
        # Calculate average ratings per resource from similar students
        resource_ratings = similar_interactions.groupby('resource_id')['interaction_score'].agg([
            ('avg_rating', 'mean'),
            ('num_ratings', 'count')
        ]).reset_index()
        
        # Merge with resource details
        resource_ratings = resource_ratings.merge(
            resources_df[['resource_id', 'CO', 'title', 'url', 'topic', 'difficulty', 
                         'estimated_time_min', 'description']],
            on='resource_id',
            how='left'
        )
        
        # Filter and rank resources per CO
        recommendations = {}
        
        for co in co_map.keys():
            # Get resources for this CO
            co_resources = resource_ratings[resource_ratings['CO'] == co].copy()
            
            if co_resources.empty:
                # No rated resources for this CO, use fallback
                co_resources = resources_df[resources_df['CO'] == co].copy()
                co_resources['avg_rating'] = 0.5  # Default rating
                co_resources['num_ratings'] = 0
            
            # Sort by average rating (descending), then by number of ratings
            co_resources = co_resources.sort_values(
                by=['avg_rating', 'num_ratings'], 
                ascending=[False, False]
            )
            
            # Convert to list of dicts
            recs = []
            for _, row in co_resources.head(top_k_per_co).iterrows():
                recs.append({
                    'resource_id': row['resource_id'],
                    'title': row.get('title', ''),
                    'url': row.get('url', ''),
                    'CO': row.get('CO', co),
                    'topic': row.get('topic', ''),
                    'estimated_time_min': int(row.get('estimated_time_min', 30)),
                    'difficulty': row.get('difficulty', 'medium'),
                    'description': row.get('description', ''),
                    'cf_rating': float(row.get('avg_rating', 0.5)),
                    'num_similar_students': int(row.get('num_ratings', 0))
                })
            
            recommendations[co] = recs
        
        return recommendations
    
    def _fallback_recommendations(self, co_map, resources_df, top_k_per_co):
        """Fallback when no CF data available - return basic recommendations"""
        recommendations = {}
        
        for co in co_map.keys():
            co_resources = resources_df[resources_df['CO'] == co].copy()
            
            # Sort by difficulty (easier first)
            difficulty_order = {'easy': 0, 'medium': 1, 'hard': 2}
            co_resources['diff_val'] = co_resources['difficulty'].map(
                lambda x: difficulty_order.get(str(x).lower(), 1)
            )
            co_resources = co_resources.sort_values('diff_val')
            
            recs = []
            for _, row in co_resources.head(top_k_per_co).iterrows():
                recs.append({
                    'resource_id': row['resource_id'],
                    'title': row.get('title', ''),
                    'url': row.get('url', ''),
                    'CO': row.get('CO', co),
                    'topic': row.get('topic', ''),
                    'estimated_time_min': int(row.get('estimated_time_min', 30)),
                    'difficulty': row.get('difficulty', 'medium'),
                    'description': row.get('description', ''),
                    'cf_rating': 0.5,
                    'num_similar_students': 0
                })
            
            recommendations[co] = recs
        
        return recommendations


def hybrid_recommend(student_id, weak_questions, internal_no, co_map, topic_map, 
                     resources_df, top_k_per_co=7, cf_weight=0.7):
    """
    Hybrid recommendation combining:
    1. Collaborative Filtering (CF) - ratings from similar students
    2. Content-Based - topic relevance and difficulty
    
    Args:
        cf_weight: Weight for CF score (1-cf_weight will be content-based weight)
    """
    cf_recommender = CollaborativeFilteringRecommender()
    
    # Get CF recommendations
    cf_recs = cf_recommender.recommend_resources_cf(
        student_id, weak_questions, internal_no, co_map, resources_df, top_k_per_co * 2
    )
    
    # Get content-based scores (topic relevance)
    final_recommendations = {}
    
    for co, cf_resources in cf_recs.items():
        # Get relevant topics for this CO
        co_topics = set()
        for topic, questions in topic_map.items():
            for q in questions:
                if q in [str(x) for x in weak_questions]:
                    # Check if this question maps to current CO
                    if co in co_map and q in co_map[co]:
                        co_topics.add(topic.lower())
        
        # Score each resource
        scored_resources = []
        for resource in cf_resources:
            cf_score = resource.get('cf_rating', 0.5)
            
            # Content-based score: topic match
            resource_topic = str(resource.get('topic', '')).lower()
            topic_match = 1.0 if resource_topic in co_topics else 0.3
            
            # Difficulty preference (easier resources ranked higher for struggling students)
            diff = str(resource.get('difficulty', 'medium')).lower()
            diff_score = {'easy': 1.0, 'medium': 0.7, 'hard': 0.4}.get(diff, 0.7)
            
            # Combine scores
            content_score = (topic_match * 0.7 + diff_score * 0.3)
            hybrid_score = cf_weight * cf_score + (1 - cf_weight) * content_score
            
            resource['hybrid_score'] = hybrid_score
            scored_resources.append(resource)
        
        # Sort by hybrid score
        scored_resources.sort(key=lambda x: x['hybrid_score'], reverse=True)
        
        final_recommendations[co] = scored_resources[:top_k_per_co]
    
    return final_recommendations
