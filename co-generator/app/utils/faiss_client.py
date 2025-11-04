"""
Enhanced FAISS client with L2 normalization and similarity thresholding
Ensures identical embedding alignment between local and Docker environments
"""
import os
import logging
import numpy as np
import faiss
import pickle
import json
from typing import List, Optional, Tuple, Dict
from sentence_transformers import SentenceTransformer
from pathlib import Path

logger = logging.getLogger(__name__)


class FAISSClient:
    """
    Production-grade FAISS vector search client with:
    - L2 normalization for cosine similarity
    - Similarity threshold filtering (>0.3)
    - Persistent index with validation
    - Context reconstruction with metadata
    - Embedding caching for performance
    """

    # Class-level embedding cache to persist across requests
    _embedding_cache: Dict[str, np.ndarray] = {}

    def __init__(self, index_path: str = None):
        """
        Initialize FAISS client with production-grade configuration

        Args:
            index_path: Path to FAISS index file (defaults to /app/indices/faiss_index.bin)
        """
        # Use Docker volume mount path for persistence
        if index_path is None:
            indices_dir = os.getenv("INDICES_PATH", "/app/indices")
            os.makedirs(indices_dir, exist_ok=True)
            index_path = os.path.join(indices_dir, "faiss_index.bin")

        self.index_path = index_path
        self.metadata_path = index_path.replace(".bin", "_metadata.pkl")
        self.index_meta_path = index_path.replace(".bin", "_index_meta.json")

        # Initialize embedding model with EXACT configuration
        logger.info("🔧 Loading SentenceTransformer model: sentence-transformers/all-MiniLM-L6-v2")
        self.model_name = "sentence-transformers/all-MiniLM-L6-v2"
        self.embedding_model = SentenceTransformer(self.model_name)

        # Force CPU inference for deterministic results
        self.embedding_model.to('cpu')

        self.embedding_dim = 384  # Fixed dimension for all-MiniLM-L6-v2

        # Similarity threshold for filtering irrelevant context
        self.similarity_threshold = 0.3  # Reject cosine similarity < 0.3

        # Load or create index
        self.index = None
        self.documents = []
        self.metadata = []
        self.available = False

        self._load_or_create_index()

    def _normalize_embeddings(self, embeddings: np.ndarray) -> np.ndarray:
        """
        L2 normalize embeddings for cosine similarity

        Args:
            embeddings: Raw embeddings (n, dim)

        Returns:
            L2-normalized embeddings
        """
        # Ensure float32 dtype
        embeddings = embeddings.astype('float32')

        # L2 normalization: divide each vector by its L2 norm
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms = np.maximum(norms, 1e-12)  # Avoid division by zero
        normalized = embeddings / norms

        return normalized

    def _embed_texts(self, texts: List[str], use_cache: bool = True) -> np.ndarray:
        """
        Generate embeddings with L2 normalization and optional caching

        Args:
            texts: List of texts to embed
            use_cache: Whether to use embedding cache

        Returns:
            Normalized embeddings (n, 384)
        """
        embeddings_list = []

        for text in texts:
            # Check cache first
            if use_cache and text in self._embedding_cache:
                embeddings_list.append(self._embedding_cache[text])
                continue

            # Generate embedding
            raw_embedding = self.embedding_model.encode([text])[0]

            # L2 normalize
            normalized_embedding = self._normalize_embeddings(raw_embedding.reshape(1, -1))[0]

            # Cache it
            if use_cache:
                self._embedding_cache[text] = normalized_embedding

            embeddings_list.append(normalized_embedding)

        return np.array(embeddings_list, dtype='float32')

    def _load_or_create_index(self):
        """Load FAISS index and metadata from disk or create new"""
        try:
            if os.path.exists(self.index_path):
                logger.info(f"📂 Loading FAISS index from {self.index_path}")

                # Load FAISS index
                self.index = faiss.read_index(self.index_path)

                # Load metadata if exists
                if os.path.exists(self.metadata_path):
                    with open(self.metadata_path, 'rb') as f:
                        data = pickle.load(f)
                        self.documents = data.get('documents', [])
                        self.metadata = data.get('metadata', [])

                # Load index metadata
                if os.path.exists(self.index_meta_path):
                    with open(self.index_meta_path, 'r') as f:
                        index_meta = json.load(f)
                        logger.info(f"📊 Index metadata: {index_meta}")

                # Validate index alignment
                if not self._validate_index():
                    logger.warning("⚠️ Index validation failed - will rebuild if needed")

                logger.info(f"✅ Loaded FAISS index with {self.index.ntotal} vectors")
                self.available = True

            else:
                # Create new index using Inner Product for cosine similarity
                # (since we L2-normalize, inner product = cosine similarity)
                logger.info("🆕 Creating new FAISS IndexFlatIP (cosine similarity)")
                self.index = faiss.IndexFlatIP(self.embedding_dim)
                self.available = True

                # Save empty index
                self._save_index()

        except Exception as e:
            logger.error(f"❌ Failed to load FAISS index: {str(e)}")
            self.available = False

    def _validate_index(self) -> bool:
        """
        Validate that index vectors align with metadata

        Returns:
            True if valid
        """
        try:
            if self.index is None:
                return False

            index_count = self.index.ntotal
            doc_count = len(self.documents)
            meta_count = len(self.metadata)

            if index_count != doc_count or index_count != meta_count:
                logger.warning(
                    f"⚠️ Index mismatch: {index_count} vectors, "
                    f"{doc_count} documents, {meta_count} metadata entries"
                )
                return False

            logger.info(f"✅ Index validation passed: {index_count} aligned entries")
            return True

        except Exception as e:
            logger.error(f"❌ Index validation error: {str(e)}")
            return False

    def is_available(self) -> bool:
        """Check if FAISS is available"""
        return self.available and self.index is not None

    def add_documents(
        self,
        texts: List[str],
        course_id: str,
        metadata: Optional[List[dict]] = None,
        source_file: str = "unknown",
        page_numbers: Optional[List[int]] = None
    ) -> bool:
        """
        Add documents to FAISS index with L2-normalized embeddings

        Args:
            texts: List of document texts
            course_id: Course ID
            metadata: Optional metadata
            source_file: Source filename (for context reconstruction)
            page_numbers: Page numbers for each chunk

        Returns:
            True if successful
        """
        if not self.is_available():
            logger.error("FAISS index not available")
            return False

        try:
            logger.info(f"📝 Adding {len(texts)} documents to FAISS index")

            # Generate L2-normalized embeddings
            embeddings = self._embed_texts(texts, use_cache=True)

            # Add to index
            self.index.add(embeddings)

            # Store documents
            self.documents.extend(texts)

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

            self.metadata.extend(metadata)

            # Save index
            self._save_index()

            logger.info(f"✅ Added {len(texts)} documents (total: {self.index.ntotal})")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to add documents to FAISS: {str(e)}")
            return False

    def query(
        self,
        query_text: str,
        n_results: int = 5,
        course_id: Optional[str] = None,
        return_metadata: bool = False
    ) -> List[str] | List[Tuple[str, Dict, float]]:
        """
        Query FAISS index with similarity threshold filtering

        Args:
            query_text: Query string
            n_results: Number of results
            course_id: Optional course filter
            return_metadata: If True, return (text, metadata, score) tuples

        Returns:
            List of relevant documents or (text, metadata, score) tuples
        """
        if not self.is_available():
            logger.warning("FAISS index not available")
            return []

        if self.index.ntotal == 0:
            logger.warning("FAISS index is empty")
            return []

        try:
            # Generate L2-normalized query embedding
            query_embedding = self._embed_texts([query_text], use_cache=True)

            # Search using Inner Product (= cosine similarity for normalized vectors)
            k = min(n_results * 3, self.index.ntotal)  # Get more for filtering
            scores, indices = self.index.search(query_embedding, k)

            # Filter by similarity threshold and course_id
            results = []
            for score, idx in zip(scores[0], indices[0]):
                # Check similarity threshold (convert L2 distance to cosine similarity)
                if score < self.similarity_threshold:
                    continue

                if idx < len(self.documents):
                    # Check course filter
                    if course_id:
                        doc_meta = self.metadata[idx] if idx < len(self.metadata) else {}
                        if doc_meta.get("course_id") != course_id:
                            continue

                    doc_text = self.documents[idx]
                    doc_meta = self.metadata[idx] if idx < len(self.metadata) else {}

                    if return_metadata:
                        results.append((doc_text, doc_meta, float(score)))
                    else:
                        results.append(doc_text)

                    if len(results) >= n_results:
                        break

            logger.info(
                f"📊 Retrieved {len(results)} documents (threshold: {self.similarity_threshold})"
            )
            return results

        except Exception as e:
            logger.error(f"❌ Failed to query FAISS: {str(e)}")
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
        for i, (text, meta, score) in enumerate(results, 1):
            source_file = meta.get("source_file", "unknown")
            page = meta.get("page")

            source_info = f"{source_file}"
            if page is not None:
                source_info += f" (page {page})"

            context_parts.append(
                f"[Context {i} - {source_info} - Relevance: {score:.2f}]\n{text}"
            )

        context = "\n\n".join(context_parts)
        logger.info(f"✅ Reconstructed context: {len(context)} characters from {len(results)} sources")

        return context

    def _save_index(self):
        """Save FAISS index, metadata, and index metadata to disk"""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.index_path), exist_ok=True)

            # Save FAISS index
            faiss.write_index(self.index, self.index_path)

            # Save metadata
            with open(self.metadata_path, 'wb') as f:
                pickle.dump({
                    'documents': self.documents,
                    'metadata': self.metadata
                }, f)

            # Save index metadata
            index_meta = {
                "model_name": self.model_name,
                "embedding_dim": self.embedding_dim,
                "total_vectors": self.index.ntotal if self.index else 0,
                "total_documents": len(self.documents),
                "similarity_threshold": self.similarity_threshold
            }
            with open(self.index_meta_path, 'w') as f:
                json.dump(index_meta, f, indent=2)

            logger.debug(f"💾 Saved FAISS index to {self.index_path}")

        except Exception as e:
            logger.error(f"❌ Failed to save FAISS index: {str(e)}")

    def rebuild_index_from_metadata(self, metadata_file: str) -> bool:
        """
        Rebuild FAISS index from index_meta.json file

        Args:
            metadata_file: Path to index_meta.json

        Returns:
            True if successful
        """
        try:
            logger.info(f"🔄 Rebuilding index from {metadata_file}")

            with open(metadata_file, 'r') as f:
                data = json.load(f)

            chunks = data.get("chunks", [])
            if not chunks:
                logger.warning("No chunks found in metadata file")
                return False

            # Clear existing data
            self.index = faiss.IndexFlatIP(self.embedding_dim)
            self.documents = []
            self.metadata = []

            # Add chunks
            for chunk in chunks:
                text = chunk.get("text", "")
                course_id = chunk.get("course_id", "unknown")
                source = chunk.get("source", "unknown")
                page = chunk.get("page")

                if text:
                    self.add_documents(
                        texts=[text],
                        course_id=course_id,
                        source_file=source,
                        page_numbers=[page] if page else None
                    )

            logger.info(f"✅ Rebuilt index with {self.index.ntotal} vectors")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to rebuild index: {str(e)}")
            return False

    def get_stats(self) -> dict:
        """Get FAISS index statistics"""
        if not self.is_available():
            return {"available": False}

        return {
            "available": True,
            "model_name": self.model_name,
            "total_vectors": self.index.ntotal if self.index else 0,
            "total_documents": len(self.documents),
            "embedding_dim": self.embedding_dim,
            "similarity_threshold": self.similarity_threshold,
            "cache_size": len(self._embedding_cache),
            "index_valid": self._validate_index()
        }

    def clear_cache(self):
        """Clear embedding cache"""
        self._embedding_cache.clear()
        logger.info("🗑️ Cleared embedding cache")


# Global instance
_faiss_client = None


def get_faiss_client() -> FAISSClient:
    """Get or create global FAISS client"""
    global _faiss_client
    if _faiss_client is None:
        _faiss_client = FAISSClient()
    return _faiss_client
