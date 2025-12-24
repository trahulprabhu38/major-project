"""
ChromaDB utility functions for searching syllabus content
"""
import chromadb
from pathlib import Path

CHROMA_DB_PATH = "data/chroma_db"
COLLECTION_NAME = "dbms_syllabus"

def get_collection():
    """Get or create ChromaDB collection"""
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    try:
        collection = client.get_collection(COLLECTION_NAME)
        return collection
    except:
        return None

def search_syllabus(query, n_results=5):
    """
    Search ChromaDB for relevant syllabus content
    
    Args:
        query: Search query string
        n_results: Number of results to return
    
    Returns:
        List of relevant document chunks with metadata
    """
    collection = get_collection()
    if not collection:
        return []
    
    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        # Format results
        formatted_results = []
        if results['documents'] and len(results['documents'][0]) > 0:
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    'content': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                    'distance': results['distances'][0][i] if results['distances'] else None
                })
        
        return formatted_results
    except Exception as e:
        print(f"Error searching ChromaDB: {e}")
        return []

def get_relevant_content_for_co(co_num, level, previous_cos=None):
    """
    Get relevant syllabus content for generating a specific CO
    
    Args:
        co_num: CO number (1-6)
        level: Bloom's taxonomy level (Apply, Analyze, Evaluate, Create)
        previous_cos: List of previously generated COs to avoid duplicates
    
    Returns:
        Relevant syllabus content chunks
    """
    # Build search query based on level
    level_queries = {
        "Apply": ["SQL queries", "database design", "normalization", "schema design", "practical applications"],
        "Analyze": ["transaction management", "concurrency control", "query optimization", "database analysis", "scenario analysis"],
        "Evaluate": ["experiments", "tools", "MySQL", "MongoDB", "database evaluation", "performance"],
        "Create": ["reports", "experiments", "database creation", "design projects", "documentation"]
    }
    
    # Use level-specific queries
    queries = level_queries.get(level, ["database management", "DBMS"])
    
    # Search for relevant content
    all_results = []
    for query in queries[:2]:  # Use first 2 queries
        results = search_syllabus(query, n_results=3)
        all_results.extend(results)
    
    # Remove duplicates and sort by relevance
    seen = set()
    unique_results = []
    for result in all_results:
        content_id = result['content'][:100]  # Use first 100 chars as ID
        if content_id not in seen:
            seen.add(content_id)
            unique_results.append(result)
    
    # Sort by distance (lower is better)
    unique_results.sort(key=lambda x: x['distance'] if x['distance'] is not None else 999)
    
    # Return top 3 most relevant chunks
    return unique_results[:3]

def get_major_topics_from_syllabus():
    """Extract major topics from syllabus by searching for common DBMS topics"""
    major_topics = [
        "introduction to databases",
        "SQL queries",
        "normalization",
        "entity relationship model",
        "transaction management",
        "database design",
        "NoSQL MongoDB",
        "relational algebra"
    ]
    
    all_content = []
    for topic in major_topics:
        results = search_syllabus(topic, n_results=2)
        for result in results:
            all_content.append(result['content'])
    
    return all_content

