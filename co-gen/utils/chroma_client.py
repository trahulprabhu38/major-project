"""
ChromaDB client for vector storage and retrieval
"""
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Optional
import logging

from config import settings

logger = logging.getLogger(__name__)


class ChromaDBClient:
    """Client for interacting with ChromaDB"""

    def __init__(self):
        """Initialize ChromaDB client and embedding model"""
        self.chroma_url = f"http://{settings.CHROMA_HOST}:{settings.CHROMA_PORT}"
        self.collection_name = settings.CHROMA_COLLECTION
        self.embedding_model = None
        self.client = None
        self.collection = None

        logger.info(f"Initializing ChromaDB client with URL: {self.chroma_url}")
        self._initialize_client()
        self._initialize_embedding_model()

    def _initialize_client(self):
        """Initialize ChromaDB HTTP client"""
        try:
            self.client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=settings.ALLOW_RESET
                )
            )
            # Test connection
            self.client.heartbeat()
            logger.info("Successfully connected to ChromaDB")
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")
            raise ConnectionError(f"Cannot connect to ChromaDB at {self.chroma_url}: {e}")

    def _initialize_embedding_model(self):
        """Load embedding model"""
        try:
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise RuntimeError(f"Cannot load embedding model: {e}")

    def get_or_create_collection(self, course_code: str) -> chromadb.Collection:
        """
        Get or create a collection for a specific course.
        Collection name format: syllabus_contexts_{course_code}
        """
        collection_name = f"{self.collection_name}_{course_code.lower()}"

        try:
            collection = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"course_code": course_code}
            )
            logger.info(f"Got/created collection: {collection_name}")
            return collection
        except Exception as e:
            logger.error(f"Failed to get/create collection {collection_name}: {e}")
            raise

    def ingest_document(
        self,
        course_code: str,
        course_id: str,
        text: str,
        filename: str,
        chunk_size: int = None,
        overlap: int = None
    ) -> int:
        """
        Ingest a document into ChromaDB.
        Stores BOTH the full syllabus text AND chunked versions.
        Returns the number of chunks ingested.
        """
        from utils.text_extractor import TextExtractor

        chunk_size = chunk_size or settings.CHUNK_SIZE
        overlap = overlap or settings.CHUNK_OVERLAP

        # Get collection for this course
        collection = self.get_or_create_collection(course_code)

        # FIRST: Store the full syllabus text as a single document
        # This is critical for accurate CO generation
        full_syllabus_id = f"{course_code}_FULL_SYLLABUS"
        full_embedding = self.embedding_model.encode(
            [text[:8000]],  # Limit to first 8000 chars for embedding
            show_progress_bar=False,
            convert_to_numpy=True
        ).astype('float32')

        # Normalize
        norm = np.linalg.norm(full_embedding)
        full_embedding = full_embedding / norm

        try:
            collection.add(
                ids=[full_syllabus_id],
                embeddings=full_embedding.tolist(),
                documents=[text],  # Store FULL text
                metadatas=[{
                    "course_code": course_code,
                    "course_id": course_id,
                    "source_file": filename,
                    "is_full_syllabus": True,
                    "chunk_index": -1
                }]
            )
            logger.info(f"Stored full syllabus text for {course_code}")
        except Exception as e:
            logger.warning(f"Failed to store full syllabus: {e}")

        # SECOND: Also chunk the text for potential future use
        chunks = TextExtractor.chunk_text(text, chunk_size=chunk_size, overlap=overlap)

        if not chunks:
            logger.warning(f"No chunks extracted from {filename}")
            return 1  # Still return 1 for the full syllabus

        logger.info(f"Processing {len(chunks)} chunks from {filename}")

        # Generate embeddings
        embeddings = self.embedding_model.encode(
            chunks,
            show_progress_bar=False,
            convert_to_numpy=True
        ).astype('float32')

        # Normalize embeddings
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        embeddings = embeddings / norms

        # Prepare metadata
        ids = [f"{course_code}_{filename}_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "course_code": course_code,
                "course_id": course_id,
                "source_file": filename,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "is_full_syllabus": False
            }
            for i in range(len(chunks))
        ]

        # Add to ChromaDB
        try:
            collection.add(
                ids=ids,
                embeddings=embeddings.tolist(),
                documents=chunks,
                metadatas=metadatas
            )
            logger.info(f"Successfully ingested {len(chunks)} chunks for {course_code}")
            return len(chunks) + 1  # +1 for full syllabus
        except Exception as e:
            logger.error(f"Failed to add chunks to ChromaDB: {e}")
            raise

    def get_full_syllabus(self, course_code: str) -> Optional[str]:
        """
        Retrieve the FULL syllabus text for CO generation.
        This returns the complete syllabus section, not chunks.
        """
        collection = self.get_or_create_collection(course_code)

        try:
            # Try to get the full syllabus document
            full_syllabus_id = f"{course_code}_FULL_SYLLABUS"
            results = collection.get(
                ids=[full_syllabus_id]
            )

            if results and results.get('documents') and len(results['documents']) > 0:
                full_text = results['documents'][0]
                logger.info(f"Retrieved full syllabus for {course_code} ({len(full_text)} chars)")
                return full_text

            # Fallback: if full syllabus not found, reconstruct from chunks
            logger.warning(f"Full syllabus not found for {course_code}, reconstructing from chunks")
            all_chunks = collection.get(
                where={"is_full_syllabus": False}
            )

            if all_chunks and all_chunks.get('documents'):
                # Sort by chunk_index and concatenate
                chunk_data = list(zip(
                    all_chunks['documents'],
                    all_chunks.get('metadatas', [{}] * len(all_chunks['documents']))
                ))
                chunk_data.sort(key=lambda x: x[1].get('chunk_index', 0))
                reconstructed = '\n'.join([doc for doc, _ in chunk_data])
                logger.info(f"Reconstructed syllabus from {len(chunk_data)} chunks")
                return reconstructed

            return None

        except Exception as e:
            logger.error(f"Failed to retrieve full syllabus: {e}")
            return None

    def retrieve_contexts(
        self,
        course_code: str,
        query: Optional[str] = None,
        n_results: int = None
    ) -> List[Dict]:
        """
        Retrieve contexts from ChromaDB.
        If query is None, returns all documents for the course.
        If query is provided, returns semantically similar contexts.
        """
        n_results = n_results or settings.DEFAULT_RETRIEVAL_K
        collection = self.get_or_create_collection(course_code)

        try:
            # Get collection count
            count = collection.count()
            if count == 0:
                logger.warning(f"No documents found for course {course_code}")
                return []

            if query:
                # Query with embedding
                query_embedding = self.embedding_model.encode(
                    [query],
                    show_progress_bar=False,
                    convert_to_numpy=True
                ).astype('float32')

                # Normalize
                norm = np.linalg.norm(query_embedding)
                query_embedding = query_embedding / norm

                results = collection.query(
                    query_embeddings=query_embedding.tolist(),
                    n_results=min(n_results, count)
                )
            else:
                # Get all or sample
                results = collection.get(
                    limit=min(n_results, count)
                )

            # Format results
            contexts = []
            if query and results['documents']:
                # Query results have nested lists
                for i, doc in enumerate(results['documents'][0]):
                    contexts.append({
                        'document': doc,
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'distance': results['distances'][0][i] if results.get('distances') else 0.0,
                        'id': results['ids'][0][i] if results['ids'] else None
                    })
            elif results.get('documents'):
                # Get results are flat
                for i, doc in enumerate(results['documents']):
                    contexts.append({
                        'document': doc,
                        'metadata': results['metadatas'][i] if results.get('metadatas') else {},
                        'distance': 0.0,
                        'id': results['ids'][i] if results.get('ids') else None
                    })

            logger.info(f"Retrieved {len(contexts)} contexts for {course_code}")
            return contexts

        except Exception as e:
            logger.error(f"Failed to retrieve contexts: {e}")
            raise

    def get_document_count(self, course_code: str) -> int:
        """Get the number of documents in a course collection"""
        try:
            collection = self.get_or_create_collection(course_code)
            count = collection.count()
            return count
        except Exception as e:
            logger.error(f"Failed to get document count: {e}")
            return 0

    def delete_collection(self, course_code: str) -> bool:
        """Delete a course collection"""
        collection_name = f"{self.collection_name}_{course_code.lower()}"
        try:
            self.client.delete_collection(name=collection_name)
            logger.info(f"Deleted collection: {collection_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete collection {collection_name}: {e}")
            return False


# Singleton instance
_chroma_client: Optional[ChromaDBClient] = None


def get_chroma_client() -> ChromaDBClient:
    """Get or create ChromaDB client singleton"""
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = ChromaDBClient()
    return _chroma_client
