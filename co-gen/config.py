"""
Configuration module for CO Generator Service
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Service configuration
    PORT: int = 8085
    LOG_LEVEL: str = "INFO"
    ALLOW_RESET: bool = True

    # PostgreSQL
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "edu"
    POSTGRES_USER: str = "admin"
    POSTGRES_PASSWORD: str = "password"

    # ChromaDB
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000
    CHROMA_COLLECTION: str = "syllabus_contexts"

    # Groq API
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    # Embedding model
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Generation defaults
    DEFAULT_RETRIEVAL_K: int = 6
    DEFAULT_SEED: int = 42
    DEFAULT_TEMPERATURE: float = 0.3

    # Chunking
    CHUNK_SIZE: int = 400
    CHUNK_OVERLAP: int = 80

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
