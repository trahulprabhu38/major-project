"""
Main recommendation service - orchestrates recommendation generation
"""

import logging
import os
import glob
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any

from core.config import settings
from services.backend_client import BackendClient
from services.performance_analyzer import PerformanceAnalyzer
from services.cf_recommender import CollaborativeFilteringRecommender

logger = logging.getLogger(__name__)


class RecommenderService:
    """Main service for generating recommendations"""
    
    def __init__(self):
        self.backend_client = BackendClient()
        self.performance_analyzer = PerformanceAnalyzer()
        self.cf_recommender = CollaborativeFilteringRecommender()
    
    def load_resources(self) -> pd.DataFrame:
        """Load resources from CSV"""
        try:
            if not os.path.exists(settings.RESOURCES_FILE):
                logger.warning(f"Resources file not found: {settings.RESOURCES_FILE}")
                # Return empty DataFrame with expected columns
                return pd.DataFrame(columns=[
                    "resource_id", "title", "url", "CO", "topic",
                    "estimated_time_min", "difficulty", "description", "type"
                ])
            
            df = pd.read_csv(settings.RESOURCES_FILE)
            
            # Ensure required columns exist
            required_cols = ["resource_id", "title", "url", "CO", "topic",
                           "estimated_time_min", "difficulty", "description", "type"]
            for col in required_cols:
                if col not in df.columns:
                    df[col] = ""
            
            # Clean and normalize
            df["CO"] = df["CO"].astype(str).str.strip()
            df["topic"] = df["topic"].astype(str).str.strip()
            df["difficulty"] = df["difficulty"].fillna("medium").astype(str)
            df["type"] = df["type"].fillna("video").astype(str)
            df["estimated_time_min"] = pd.to_numeric(
                df["estimated_time_min"], errors="coerce"
            ).fillna(30).astype(int)
            
            logger.info(f"Loaded {len(df)} resources")
            return df
            
        except Exception as e:
            logger.error(f"Error loading resources: {str(e)}", exc_info=True)
            return pd.DataFrame(columns=[
                "resource_id", "title", "url", "CO", "topic",
                "estimated_time_min", "difficulty", "description", "type"
            ])
    
    def load_question_map(self) -> pd.DataFrame:
        """Load question-CO-topic mapping"""
        try:
            if not os.path.exists(settings.QUESTION_MAP_FILE):
                logger.warning(f"Question map not found: {settings.QUESTION_MAP_FILE}")
                return pd.DataFrame(columns=["internal", "question", "co", "topic"])
            
            df = pd.read_csv(settings.QUESTION_MAP_FILE, dtype=str).fillna("")
            df["internal"] = df["internal"].astype(int)
            return df[["internal", "question", "co", "topic"]]
            
        except Exception as e:
            logger.error(f"Error loading question map: {str(e)}", exc_info=True)
            return pd.DataFrame(columns=["internal", "question", "co", "topic"])
    
    def find_marks_file(self, internal_no: int) -> Optional[str]:
        """Find marks file for given internal number"""
        patterns = [
            f"*cie{internal_no}*.csv", f"*cie_{internal_no}*.csv",
            f"*CIE{internal_no}*.csv", f"*ia{internal_no}*.csv",
            f"*internal{internal_no}*.csv"
        ]
        
        candidates = []
        for pattern in patterns:
            candidates.extend(glob.glob(os.path.join(settings.DATA_DIR, pattern)))
        
        candidates = sorted(set(candidates))
        return candidates[0] if candidates else None
    
    async def detect_weak_questions(
        self,
        student_id: str,
        internal_no: int,
        threshold: int = 5,
        course_id: Optional[int] = None
    ) -> List[str]:
        """
        Detect weak questions for a student
        
        First tries to get data from backend API, falls back to local CSV
        """
        # Try to fetch from backend if course_id is provided
        if course_id:
            try:
                logger.info(f"Fetching performance data from backend for student {student_id}")
                marks_data = await self.backend_client.get_student_marks_by_usn(
                    course_id, student_id, f"CIE{internal_no}"
                )
                
                if marks_data:
                    return self.performance_analyzer.analyze_from_backend_data(
                        marks_data, internal_no, threshold
                    )
            except Exception as e:
                logger.warning(f"Failed to fetch from backend, falling back to local: {str(e)}")
        
        # Fallback to local CSV
        marks_file = self.find_marks_file(internal_no)
        if not marks_file:
            logger.warning(f"No marks file found for internal {internal_no}")
            return []
        
        return self.performance_analyzer.analyze_from_csv(
            marks_file, student_id, internal_no, threshold
        )
    
    def map_questions_to_cos_topics(
        self,
        questions: List[str],
        internal_no: int
    ) -> tuple:
        """Map questions to COs and topics"""
        question_map = self.load_question_map()
        qm_internal = question_map[question_map["internal"] == internal_no]
        
        co_map = {}
        topic_map = {}
        
        for q in questions:
            q_str = str(q)
            row = qm_internal[qm_internal["question"] == q_str]
            
            if row.empty:
                # Try startswith match
                row = qm_internal[qm_internal["question"].str.startswith(q_str)]
            
            if not row.empty:
                co = row.iloc[0]["co"]
                topic = row.iloc[0]["topic"]
                
                co_map.setdefault(co, []).append(q_str)
                topic_map.setdefault(topic, []).append(q_str)
        
        return set(co_map.keys()), co_map, set(topic_map.keys()), topic_map
    
    def compute_resource_effectiveness(self, resource_id: str) -> float:
        """Compute effectiveness score for a resource"""
        try:
            # Read feedback and votes
            feedback_df = self._read_csv_safe(settings.FEEDBACK_FILE)
            votes_df = self._read_csv_safe(settings.VOTES_FILE)
            
            # Check feedback first
            if not feedback_df.empty:
                subset = feedback_df[feedback_df["resource_id"] == resource_id]
                if not subset.empty and "rating" in subset.columns:
                    ratings = pd.to_numeric(subset["rating"], errors="coerce").dropna()
                    if len(ratings) > 0:
                        return float(ratings.mean())
            
            # Fallback to votes
            if not votes_df.empty:
                subset = votes_df[votes_df["resource_id"] == resource_id]
                if not subset.empty and "vote" in subset.columns:
                    votes = pd.to_numeric(subset["vote"], errors="coerce").dropna()
                    if len(votes) > 0:
                        avg_vote = float(votes.mean())  # -1 to 1
                        # Map to 1-5 scale
                        return 1 + 4 * ((avg_vote + 1) / 2)
            
            return 3.0  # Default neutral score
            
        except Exception as e:
            logger.error(f"Error computing effectiveness: {str(e)}")
            return 3.0
    
    def _read_csv_safe(self, path: str) -> pd.DataFrame:
        """Safely read CSV file"""
        if not os.path.exists(path):
            return pd.DataFrame()
        try:
            return pd.read_csv(path)
        except:
            return pd.DataFrame()
    
    def rank_resources_content_based(
        self,
        resources_df: pd.DataFrame,
        co: str,
        preferred_topics: set,
        top_k: int = 7
    ) -> List[Dict[str, Any]]:
        """Rank resources using content-based filtering"""
        df = resources_df[
            resources_df["CO"].str.strip().str.upper() == co.strip().upper()
        ].copy()
        
        if df.empty:
            return []
        
        # Topic match scoring
        preferred_topics_lower = {t.lower() for t in preferred_topics}
        df["_topic_match"] = df["topic"].apply(
            lambda t: 1 if str(t).lower().strip() in preferred_topics_lower else 0
        )
        
        # Difficulty scoring (easier first for struggling students)
        diff_order = {"easy": 0, "medium": 1, "hard": 2}
        df["_diff_val"] = df["difficulty"].apply(
            lambda d: diff_order.get(str(d).lower(), 1)
        )
        
        # Effectiveness scoring
        df["_effectiveness"] = df["resource_id"].apply(
            self.compute_resource_effectiveness
        )
        
        # Sort: topic match (desc), difficulty (asc), time (asc), effectiveness (desc)
        df_sorted = df.sort_values(
            by=["_topic_match", "_diff_val", "estimated_time_min", "_effectiveness"],
            ascending=[False, True, True, False]
        )
        
        # Convert to list of dicts
        results = []
        for _, row in df_sorted.head(top_k).iterrows():
            results.append({
                "resource_id": row["resource_id"],
                "title": row["title"],
                "url": row["url"],
                "CO": row["CO"],
                "topic": row["topic"],
                "estimated_time_min": int(row["estimated_time_min"]),
                "difficulty": row["difficulty"],
                "description": row["description"],
                "type": row.get("type", "video"),
                "effectiveness": float(row["_effectiveness"])
            })
        
        return results
    
    async def recommend_for_student(
        self,
        student_id: str,
        internal_no: int,
        threshold: int = 5,
        top_k_per_co: int = 7,
        use_cf: bool = True,
        cf_weight: float = 0.7,
        course_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate recommendations for a student
        
        Returns dict with:
        - student_id
        - internal_no
        - weak_questions
        - co_map
        - topic_map
        - recommendations (CO -> list of resources)
        """
        try:
            # Detect weak questions
            weak_questions = await self.detect_weak_questions(
                student_id, internal_no, threshold, course_id
            )
            
            if not weak_questions:
                return {
                    "student_id": student_id,
                    "internal_no": internal_no,
                    "weak_questions": [],
                    "co_map": {},
                    "topic_map": {},
                    "recommendations": {}
                }
            
            # Map to COs and topics
            cos, co_map, topics, topic_map = self.map_questions_to_cos_topics(
                weak_questions, internal_no
            )
            
            # Load resources
            resources_df = self.load_resources()
            
            # Generate recommendations
            if use_cf:
                # Use collaborative filtering
                recommendations = self.cf_recommender.hybrid_recommend(
                    student_id, weak_questions, internal_no,
                    co_map, topic_map, resources_df,
                    top_k_per_co, cf_weight
                )
            else:
                # Use content-based filtering
                recommendations = {}
                for co in cos:
                    # Find relevant topics for this CO
                    co_topics = set()
                    for topic, qs in topic_map.items():
                        for q in qs:
                            if co in co_map and q in co_map[co]:
                                co_topics.add(topic)
                    
                    if not co_topics:
                        co_topics = topics
                    
                    recs = self.rank_resources_content_based(
                        resources_df, co, co_topics, top_k_per_co
                    )
                    recommendations[co] = recs
            
            return {
                "student_id": student_id,
                "internal_no": internal_no,
                "weak_questions": weak_questions,
                "co_map": co_map,
                "topic_map": topic_map,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}", exc_info=True)
            raise



