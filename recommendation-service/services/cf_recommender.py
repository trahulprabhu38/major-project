"""
Collaborative Filtering Recommender
Ported from the original Python module
"""

import pandas as pd
import numpy as np
import logging
import os
import pickle
from typing import Dict, List, Any, Optional
from sklearn.metrics.pairwise import cosine_similarity

from core.config import settings

logger = logging.getLogger(__name__)

# Try to import optional dependencies
try:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not available, CF will use basic similarity")

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    logger.warning("XGBoost not available, using fallback scoring")


class CollaborativeFilteringRecommender:
    """
    Collaborative Filtering recommender using student similarity
    """
    
    def __init__(self):
        self.n_clusters = settings.N_CLUSTERS
        self.student_profiles = {}
        self.kmeans_model = None
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
    
    def create_skill_gap_profile(
        self,
        weak_questions: List[str],
        internal_no: int,
        co_map: Dict[str, List[str]]
    ) -> np.ndarray:
        """Create skill gap vector for a student"""
        all_cos = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5']
        
        co_weakness = {co: 0 for co in all_cos}
        
        for co, questions in co_map.items():
            if co in co_weakness:
                co_weakness[co] = len(questions)
        
        profile = [co_weakness[co] for co in all_cos]
        profile.append(internal_no)
        
        return np.array(profile)
    
    def load_student_interactions(self) -> pd.DataFrame:
        """Load all student interactions (votes, feedback, completions)"""
        interactions = pd.DataFrame()
        
        # Load votes
        if os.path.exists(settings.VOTES_FILE):
            try:
                votes = pd.read_csv(settings.VOTES_FILE)
                votes['vote'] = pd.to_numeric(votes['vote'], errors='coerce')
                votes = votes.dropna(subset=['vote'])
                if not votes.empty:
                    votes['interaction_score'] = votes['vote'].map({1: 1.0, -1: 0.0})
                    interactions = pd.concat([
                        interactions,
                        votes[['student_id', 'resource_id', 'interaction_score']]
                    ])
            except Exception as e:
                logger.error(f"Error loading votes: {str(e)}")
        
        # Load feedback
        if os.path.exists(settings.FEEDBACK_FILE):
            try:
                feedback = pd.read_csv(settings.FEEDBACK_FILE)
                feedback['rating'] = pd.to_numeric(feedback['rating'], errors='coerce')
                feedback = feedback.dropna(subset=['rating'])
                if not feedback.empty:
                    feedback['interaction_score'] = (feedback['rating'] - 1) / 4
                    interactions = pd.concat([
                        interactions,
                        feedback[['student_id', 'resource_id', 'interaction_score']]
                    ])
            except Exception as e:
                logger.error(f"Error loading feedback: {str(e)}")
        
        # Load completions
        if os.path.exists(settings.COMPLETED_FILE):
            try:
                completed = pd.read_csv(settings.COMPLETED_FILE)
                completed['interaction_score'] = 0.8
                interactions = pd.concat([
                    interactions,
                    completed[['student_id', 'resource_id', 'interaction_score']]
                ])
            except Exception as e:
                logger.error(f"Error loading completions: {str(e)}")
        
        if interactions.empty:
            return pd.DataFrame(columns=['student_id', 'resource_id', 'interaction_score'])
        
        # Aggregate
        interactions = interactions.groupby(
            ['student_id', 'resource_id']
        )['interaction_score'].mean().reset_index()
        
        return interactions
    
    def find_similar_students(
        self,
        target_profile: np.ndarray,
        student_profiles: Dict[str, np.ndarray],
        top_k: int = 10
    ) -> List[str]:
        """Find students with similar skill gap profiles"""
        if not student_profiles or len(student_profiles) < 2:
            return []
        
        similarities = []
        
        for student_id, profile in student_profiles.items():
            try:
                similarity = cosine_similarity(
                    target_profile.reshape(1, -1),
                    profile.reshape(1, -1)
                )[0][0]
                similarities.append((student_id, similarity))
            except Exception as e:
                logger.error(f"Error computing similarity: {str(e)}")
                continue
        
        similarities.sort(key=lambda x: x[1], reverse=True)
        return [s[0] for s in similarities[:top_k]]
    
    def recommend_resources_cf(
        self,
        target_student_id: str,
        weak_questions: List[str],
        internal_no: int,
        co_map: Dict[str, List[str]],
        resources_df: pd.DataFrame,
        top_k_per_co: int = 7
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Generate CF-based recommendations"""
        # Create skill gap profile
        target_profile = self.create_skill_gap_profile(
            weak_questions, internal_no, co_map
        )
        
        # Load interactions
        interactions = self.load_student_interactions()
        
        if interactions.empty:
            return self._fallback_recommendations(co_map, resources_df, top_k_per_co)
        
        # Build profiles for interacting students
        historical_profiles = {}
        
        for student_id in interactions['student_id'].unique():
            student_resources = interactions[
                interactions['student_id'] == student_id
            ]['resource_id'].values
            
            student_cos = resources_df[
                resources_df['resource_id'].isin(student_resources)
            ]['CO'].values
            
            co_profile = [
                np.sum(student_cos == f'CO{i}') 
                for i in range(1, 6)
            ]
            co_profile.append(internal_no)
            historical_profiles[student_id] = np.array(co_profile)
        
        # Find similar students
        similar_students = self.find_similar_students(
            target_profile,
            historical_profiles,
            top_k=min(10, len(historical_profiles))
        )
        
        if not similar_students:
            return self._fallback_recommendations(co_map, resources_df, top_k_per_co)
        
        # Get resources rated by similar students
        similar_interactions = interactions[
            interactions['student_id'].isin(similar_students)
        ]
        
        # Calculate average ratings
        resource_ratings = similar_interactions.groupby('resource_id')[
            'interaction_score'
        ].agg([('avg_rating', 'mean'), ('num_ratings', 'count')]).reset_index()
        
        # Merge with resource details
        resource_ratings = resource_ratings.merge(
            resources_df[['resource_id', 'CO', 'title', 'url', 'topic',
                         'difficulty', 'estimated_time_min', 'description', 'type']],
            on='resource_id',
            how='left'
        )
        
        # Generate recommendations per CO
        recommendations = {}
        
        for co in co_map.keys():
            co_resources = resource_ratings[resource_ratings['CO'] == co].copy()
            
            if co_resources.empty:
                # Fallback to all resources for this CO
                co_resources = resources_df[resources_df['CO'] == co].copy()
                co_resources['avg_rating'] = 0.5
                co_resources['num_ratings'] = 0
            
            co_resources = co_resources.sort_values(
                by=['avg_rating', 'num_ratings'],
                ascending=[False, False]
            )
            
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
                    'type': row.get('type', 'video'),
                    'cf_rating': float(row.get('avg_rating', 0.5)),
                    'num_similar_students': int(row.get('num_ratings', 0))
                })
            
            recommendations[co] = recs
        
        return recommendations
    
    def _fallback_recommendations(
        self,
        co_map: Dict[str, List[str]],
        resources_df: pd.DataFrame,
        top_k_per_co: int
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Fallback when no CF data available"""
        recommendations = {}
        
        difficulty_order = {'easy': 0, 'medium': 1, 'hard': 2}
        
        for co in co_map.keys():
            co_resources = resources_df[resources_df['CO'] == co].copy()
            
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
                    'type': row.get('type', 'video'),
                    'cf_rating': 0.5,
                    'num_similar_students': 0
                })
            
            recommendations[co] = recs
        
        return recommendations
    
    def hybrid_recommend(
        self,
        student_id: str,
        weak_questions: List[str],
        internal_no: int,
        co_map: Dict[str, List[str]],
        topic_map: Dict[str, List[str]],
        resources_df: pd.DataFrame,
        top_k_per_co: int = 7,
        cf_weight: float = 0.7
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Hybrid recommendation combining CF and content-based"""
        # Get CF recommendations
        cf_recs = self.recommend_resources_cf(
            student_id, weak_questions, internal_no,
            co_map, resources_df, top_k_per_co * 2
        )
        
        # Apply hybrid scoring
        final_recommendations = {}
        
        for co, cf_resources in cf_recs.items():
            # Get relevant topics for this CO
            co_topics = set()
            for topic, questions in topic_map.items():
                for q in questions:
                    if co in co_map and q in co_map[co]:
                        co_topics.add(topic.lower())
            
            # Score each resource
            scored_resources = []
            for resource in cf_resources:
                cf_score = resource.get('cf_rating', 0.5)
                
                # Content-based score
                resource_topic = str(resource.get('topic', '')).lower()
                topic_match = 1.0 if resource_topic in co_topics else 0.3
                
                diff = str(resource.get('difficulty', 'medium')).lower()
                diff_score = {'easy': 1.0, 'medium': 0.7, 'hard': 0.4}.get(diff, 0.7)
                
                content_score = (topic_match * 0.7 + diff_score * 0.3)
                hybrid_score = cf_weight * cf_score + (1 - cf_weight) * content_score
                
                resource['hybrid_score'] = hybrid_score
                scored_resources.append(resource)
            
            # Sort by hybrid score
            scored_resources.sort(key=lambda x: x['hybrid_score'], reverse=True)
            final_recommendations[co] = scored_resources[:top_k_per_co]
        
        return final_recommendations



