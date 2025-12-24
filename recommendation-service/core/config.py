"""
Configuration settings for the Recommendation Service
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Recommendation Service"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    
    # API
    API_PREFIX: str = "/api"
    BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://backend:8080/api")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:8080",
        "http://frontend:5173",
        "http://backend:8080"
    ]
    
    # Directories
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    LOGS_DIR: str = os.path.join(BASE_DIR, "logs")
    MODELS_DIR: str = os.path.join(BASE_DIR, "models_cache")
    
    # File paths
    RESOURCES_FILE: str = os.path.join(DATA_DIR, "resources.csv")
    QUESTION_MAP_FILE: str = os.path.join(DATA_DIR, "question_map_inferred.csv")
    VOTES_FILE: str = os.path.join(LOGS_DIR, "votes.csv")
    FEEDBACK_FILE: str = os.path.join(LOGS_DIR, "feedback.csv")
    COMPLETED_FILE: str = os.path.join(LOGS_DIR, "completed.csv")
    
    # Recommendation settings
    DEFAULT_THRESHOLD: int = 5
    DEFAULT_TOP_K: int = 7
    CF_WEIGHT: float = 0.7
    N_CLUSTERS: int = 5
    SIMILARITY_TOP_K: int = 10
    
    # CO mappings per internal
    INTERNAL_CO_MAP: dict = {
        1: {"1": "CO1", "2": "CO4", "3": "CO2", "4": "CO2", "5": "CO1", "6": "CO1", "7": "CO4", "8": "CO4"},
        2: {"1": "CO4", "2": "CO3", "3": "CO4", "4": "CO4", "5": "CO4", "6": "CO4", "7": "CO3", "8": "CO3"},
        3: {"1": "CO3", "2": "CO5", "3": "CO3", "4": "CO3", "5": "CO5", "6": "CO5", "7": "CO5", "8": "CO5"}
    }
    
    # OR pairs (optional questions)
    OR_PAIRS: List[tuple] = [(3, 4), (5, 6), (7, 8)]
    
    # ML settings
    ENABLE_XGBOOST: bool = True
    RETRAIN_MODELS: bool = False
    
    # Caching
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 300  # 5 minutes
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()



