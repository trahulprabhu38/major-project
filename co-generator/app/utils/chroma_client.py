"""
Enhanced ChromaDB client with L2-normalized embeddings
Ensures identical embedding alignment between local and Docker environments
"""
import os
import logging
from typing import List, Optional, Dict, Tuple
import numpy as np
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class ChromaClient:
    """
    Production-grade ChromaDB client with:
    - L2-normalized embeddings for consistent cosine similarity
    - Similarity threshold filtering
    - Retry logic with health checks
    - Context reconstruction with metadata
    """

    def __init__(self):
        """Initialize ChromaDB client with retry logic and normalized embeddings"""
        self.host = os.getenv("CHROMA_HOST", "chromadb")
        self.port = int(os.getenv("CHROMA_PORT", "8000"))
        self.collection_name = "syllabus_contexts"
        self.max_retries = 5
        self.retry_delay = 2  # seconds

        # Similarity threshold
        self.similarity_threshold = 0.3

        # Initialize embedding model with EXACT configuration
        logger.info("🔧 Loading SentenceTransformer model: sentence-transformers/all-MiniLM-L6-v2")
        self.model_name = "sentence-transformers/all-MiniLM-L6-v2"
        self.embedding_model = SentenceTransformer(self.model_name)

        # Force CPU inference for deterministic results
        self.embedding_model.to('cpu')

        logger.info("✅ Embedding model loaded (CPU, deterministic)")

        # Initialize ChromaDB client with retry
        self.client = None
        self.collection = None
        self.connected = False
        self._connect_with_retry()

    def _connect_with_retry(self):
        """Connect to ChromaDB with retry logic"""
        import time

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"⏳ Attempting to connect to ChromaDB at {self.host}:{self.port} (attempt {attempt}/{self.max_retries})")

                # Create HTTP client with Settings
                self.client = chromadb.HttpClient(
                    host=self.host,
                    port=self.port,
                    settings=Settings(
                        anonymized_telemetry=False,
                        allow_reset=True
                    )
                )

                # Test connection with heartbeat
                heartbeat_result = self.client.heartbeat()
                logger.info(f"💓 ChromaDB heartbeat response: {heartbeat_result}")

                # Get or create collection
                self.collection = self.client.get_or_create_collection(
                    name=self.collection_name,
                    metadata={"description": "Course syllabus materials for CO generation"}
                )

                logger.info(f"✅ Successfully connected to ChromaDB at {self.host}:{self.port}")
                logger.info(f"📦 Collection '{self.collection_name}' ready with {self.collection.count()} documents")
                self.connected = True
                return

            except Exception as e:
                logger.warning(f"⚠️  ChromaDB connection attempt {attempt} failed: {str(e)}")

                if attempt < self.max_retries:
                    logger.info(f"🔄 Retrying in {self.retry_delay} seconds...")
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"❌ Failed to connect to ChromaDB after {self.max_retries} attempts. Will use FAISS fallback.")
                    self.connected = False
                    self.client = None
                    self.collection = None

    def _normalize_embeddings(self, embeddings: np.ndarray) -> np.ndarray:
        """
        L2 normalize embeddings for cosine similarity

        Args:
            embeddings: Raw embeddings (n, dim)

        Returns:
            L2-normalized embeddings
        """
        # Ensure float32 dtype
        embeddings = np.array(embeddings).astype('float32')

        # L2 normalization: divide each vector by its L2 norm
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms = np.maximum(norms, 1e-12)  # Avoid division by zero
        normalized = embeddings / norms

        return normalized

    def _embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate L2-normalized embeddings

        Args:
            texts: List of texts to embed

        Returns:
            List of normalized embeddings
        """
        # Generate raw embeddings
        raw_embeddings = self.embedding_model.encode(texts)

        # L2 normalize
        normalized_embeddings = self._normalize_embeddings(raw_embeddings)

        return normalized_embeddings.tolist()

    def is_connected(self) -> bool:
        """Check if ChromaDB is connected"""
        if not self.connected:
            return False

        try:
            # Try a simple operation to verify connection
            self.client.heartbeat()
            return True
        except Exception:
            self.connected = False
            return False

    def add_documents(
        self,
        texts: List[str],
        course_id: str,
        metadata: Optional[List[Dict]] = None,
        source_file: str = "unknown",
        page_numbers: Optional[List[int]] = None
    ) -> bool:
        """
        Add document chunks to ChromaDB with L2-normalized embeddings

        Args:
            texts: List of text chunks
            course_id: Course ID for filtering
            metadata: Optional metadata for each chunk
            source_file: Source filename for context reconstruction
            page_numbers: Page numbers for each chunk

        Returns:
            True if successful
        """
        if not self.is_connected():
            logger.error("ChromaDB not connected")
            return False

        try:
            logger.info(f"📝 Adding {len(texts)} documents to ChromaDB")

            # Generate L2-normalized embeddings
            embeddings = self._embed_texts(texts)

            # Create IDs with timestamp to avoid duplicates
            import time
            timestamp = int(time.time() * 1000)
            ids = [f"{course_id}_chunk_{timestamp}_{i}" for i in range(len(texts))]

            # Prepare metadata with source information
            if metadata is None:
                metadata = []
                for i, text in enumerate(texts):
                    metadata.append({
                        "course_id": course_id,
                        "source_file": source_file,
                        "page": page_numbers[i] if page_numbers else None,
                        "chunk_index": i
                    })
            else:
                for i, meta in enumerate(metadata):
                    meta["course_id"] = course_id
                    meta["source_file"] = source_file
                    meta["page"] = page_numbers[i] if page_numbers else None

            # Add to collection
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadata
            )

            logger.info(f"✅ Added {len(texts)} documents to ChromaDB for course {course_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to add documents to ChromaDB: {str(e)}")
            return False

    def query(
        self,
        query_text: str,
        n_results: int = 5,
        course_id: Optional[str] = None,
        return_metadata: bool = False
    ) -> List[str] | List[Tuple[str, Dict, float]]:
        """
        Query ChromaDB for relevant documents with similarity filtering

        Args:
            query_text: Query string
            n_results: Number of results to return
            course_id: Optional course ID filter
            return_metadata: If True, return (text, metadata, distance) tuples

        Returns:
            List of relevant document texts or (text, metadata, distance) tuples
        """
        if not self.is_connected():
            logger.warning("ChromaDB not connected, returning empty results")
            return []

        try:
            # Generate L2-normalized query embedding
            query_embedding = self._embed_texts([query_text])[0]

            # Query collection - get more results for filtering
            query_n = min(n_results * 2, 20)

            if course_id:
                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=query_n,
                    where={"course_id": course_id},
                    include=["documents", "metadatas", "distances"]
                )
            else:
                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=query_n,
                    include=["documents", "metadatas", "distances"]
                )

            # Extract results with metadata
            documents = results.get("documents", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]

            # Filter by similarity threshold
            # For L2 distance with normalized vectors: similarity = 1 - distance/2
            filtered_results = []
            for doc, meta, dist in zip(documents, metadatas, distances):
                # Convert L2 distance to cosine similarity
                similarity = 1 - (dist / 2)

                if similarity >= self.similarity_threshold:
                    if return_metadata:
                        filtered_results.append((doc, meta, similarity))
                    else:
                        filtered_results.append(doc)

                if len(filtered_results) >= n_results:
                    break

            logger.info(
                f"📊 Retrieved {len(filtered_results)} documents from ChromaDB "
                f"(threshold: {self.similarity_threshold})"
            )
            return filtered_results

        except Exception as e:
            logger.error(f"Failed to query ChromaDB: {str(e)}")
            return []

    def query_with_context(
        self,
        query_text: str,
        n_results: int = 5,
        course_id: Optional[str] = None
    ) -> str:
        """
        Query and reconstruct context with source metadata

        Args:
            query_text: Query string
            n_results: Number of results
            course_id: Optional course filter

        Returns:
            Formatted context string with source attribution
        """
        results = self.query(
            query_text,
            n_results=n_results,
            course_id=course_id,
            return_metadata=True
        )

        if not results:
            return ""

        # Reconstruct context with source info
        context_parts = []
        for i, (text, meta, similarity) in enumerate(results, 1):
            source_file = meta.get("source_file", "unknown")
            page = meta.get("page")

            source_info = f"{source_file}"
            if page is not None:
                source_info += f" (page {page})"

            context_parts.append(
                f"[Context {i} - {source_info} - Relevance: {similarity:.2f}]\n{text}"
            )

        context = "\n\n".join(context_parts)
        logger.info(
            f"✅ Reconstructed context: {len(context)} characters from {len(results)} sources"
        )

        return context

    def delete_course_documents(self, course_id: str) -> bool:
        """
        Delete all documents for a course

        Args:
            course_id: Course ID

        Returns:
            True if successful
        """
        if not self.is_connected():
            logger.error("ChromaDB not connected")
            return False

        try:
            self.collection.delete(
                where={"course_id": course_id}
            )

            logger.info(f"Deleted documents for course {course_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete documents: {str(e)}")
            return False

    def get_collection_stats(self) -> Dict:
        """Get statistics about the collection"""
        if not self.is_connected():
            return {"connected": False}

        try:
            count = self.collection.count()
            return {
                "connected": True,
                "collection_name": self.collection_name,
                "document_count": count
            }
        except Exception as e:
            logger.error(f"Failed to get collection stats: {str(e)}")
            return {"connected": False, "error": str(e)}


# Global instance
_chroma_client = None


def get_chroma_client() -> ChromaClient:
    """Get or create global ChromaDB client"""
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = ChromaClient()
    return _chroma_client
