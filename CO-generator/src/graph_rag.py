from typing import List, Dict, Tuple
import chromadb
from sentence_transformers import SentenceTransformer

class GraphRAGRetrieval:
    """
    Advanced retrieval combining:
    - Vector search (semantic similarity)
    - Graph path traversal (conceptual relationships)
    - Hybrid ranking
    """
    
    def __init__(self, chroma_path: str = "data/chroma_db", collection_name: str = "dbms_syllabus"):
        """Initialize Graph-RAG with vector DB and knowledge graph"""
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Connect to ChromaDB
        try:
            self.client = chromadb.PersistentClient(path=chroma_path)
            self.collection = self.client.get_collection(collection_name)
            self.vector_db_ready = True
            print(" Vector Database (ChromaDB) connected")
        except:
            self.vector_db_ready = False
            print(" ChromaDB not available")
        
        # Knowledge graph will be injected
        self.knowledge_graph = None
        print(" Graph-RAG Retrieval Layer initialized")
    
    def set_knowledge_graph(self, kg):
        """Inject knowledge graph instance"""
        self.knowledge_graph = kg
        print("Knowledge Graph connected to Graph-RAG")
    
    def vector_search(self, query: str, n_results: int = 5) -> List[Dict]:
        """Semantic vector search using ChromaDB"""
        if not self.vector_db_ready:
            return []
        
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            vector_results = []
            if results['documents'] and len(results['documents'][0]) > 0:
                for i in range(len(results['documents'][0])):
                    vector_results.append({
                        'content': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'distance': results['distances'][0][i] if results['distances'] else 0.0,
                        'source': 'vector_search'
                    })
            
            return vector_results
        except Exception as e:
            print(f"Vector search error: {e}")
            return []
    
    def graph_search(self, query: str) -> Dict:
        """Knowledge graph traversal for conceptual relationships"""
        if not self.knowledge_graph:
            return {'nodes': [], 'relationships': [], 'paths': []}
        
        return self.knowledge_graph.query_graph(query)
    
    def hybrid_retrieve(self, query: str, co_num: int, level: str, n_vector: int = 5) -> Dict:
        """
        Hybrid retrieval combining:
        1. Vector search for semantic similarity
        2. Graph traversal for conceptual structure
        3. Ranked fusion of results
        """
        print(f"Graph-RAG Retrieval for CO{co_num} ({level} level)...")
        
        # Vector search
        vector_results = self.vector_search(query, n_results=n_vector)
        print(f"   Vector search: {len(vector_results)} results")
        
        # Graph search
        graph_results = self.graph_search(query)
        print(f"    Graph search: {len(graph_results['nodes'])} nodes, {len(graph_results['paths'])} paths")
        
        # Extract graph context
        graph_context = []
        for node in graph_results['nodes'][:5]:
            graph_context.append({
                'type': 'graph_node',
                'content': f"{node['type']}: {node['properties']}",
                'source': 'knowledge_graph'
            })
        
        for path in graph_results['paths'][:3]:
            path_str = " → ".join(path)
            graph_context.append({
                'type': 'graph_path',
                'content': f"Conceptual path: {path_str}",
                'source': 'knowledge_graph'
            })
        
        # Ranked fusion
        # Combine vector and graph results with weights
        all_results = []
        
        # Add vector results (weight: 0.7)
        for result in vector_results:
            result['score'] = (1.0 - result['distance']) * 0.7
            all_results.append(result)
        
        # Add graph results (weight: 0.3)
        for graph_item in graph_context:
            graph_item['score'] = 0.3
            all_results.append(graph_item)
        
        # Sort by score
        all_results.sort(key=lambda x: x['score'], reverse=True)
        
        # Extract top content
        top_content = []
        seen_content = set()
        
        for result in all_results:
            content = result.get('content', '')
            content_hash = hash(content[:100])
            
            if content_hash not in seen_content and len(content) > 50:
                seen_content.add(content_hash)
                top_content.append(result)
                if len(top_content) >= 8:  # Top 8 results
                    break
        
        print(f"    Hybrid retrieval: {len(top_content)} unique results")
        
        return {
            'vector_results': vector_results,
            'graph_results': graph_results,
            'hybrid_results': top_content,
            'retrieval_stats': {
                'vector_count': len(vector_results),
                'graph_nodes': len(graph_results['nodes']),
                'graph_paths': len(graph_results['paths']),
                'final_count': len(top_content)
            }
        }
    
    def get_co_context(self, co_num: int, level: str, previous_cos: List[str] = None) -> Dict:
        """
        Get comprehensive context for CO generation:
        - Level-specific queries
        - Graph paths for conceptual understanding
        - Vector search for factual content
        """
        # Build level-specific queries
        level_queries = {
            "Apply": ["SQL queries", "database design", "normalization", "practical applications"],
            "Analyze": ["transaction management", "concurrency", "query optimization", "scenario analysis"],
            "Evaluate": ["experiments", "tools", "MySQL", "MongoDB", "performance evaluation"],
            "Create": ["reports", "database creation", "design projects", "documentation"]
        }
        
        queries = level_queries.get(level, ["database management", "DBMS"])
        
        # Multi-query retrieval
        all_hybrid_results = []
        for query in queries[:2]:
            results = self.hybrid_retrieve(query, co_num, level, n_vector=3)
            all_hybrid_results.extend(results['hybrid_results'])
        
        # Deduplicate and rank
        seen = set()
        unique_results = []
        for result in all_hybrid_results:
            content_id = hash(result.get('content', '')[:100])
            if content_id not in seen:
                seen.add(content_id)
                unique_results.append(result)
        
        # Sort by score
        unique_results.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        # Build context string
        context_parts = []
        for result in unique_results[:5]:
            content = result.get('content', '')
            source = result.get('source', 'unknown')
            context_parts.append(f"[{source.upper()}] {content[:500]}")
        
        context = "\n\n".join(context_parts)
        
        return {
            'context': context,
            'retrieval_results': unique_results[:5],
            'stats': {
                'total_retrieved': len(unique_results),
                'context_length': len(context)
            }
        }

