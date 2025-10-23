import chromadb
from sentence_transformers import SentenceTransformer

# Initialize ChromaDB client
client = chromadb.PersistentClient(path="app/data/chroma_db")
collection = client.get_or_create_collection("course_docs")

# Load embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

def add_to_db(doc_id: str, text: str):
    embedding = model.encode([text])
    collection.add(
        ids=[doc_id],
        documents=[text],
        embeddings=embedding.tolist()
    )

def search_in_db(query: str, n_results: int = 3):
    query_emb = model.encode([query])
    results = collection.query(query_embeddings=query_emb.tolist(), n_results=n_results)
    return results