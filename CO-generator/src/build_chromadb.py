"""
Build ChromaDB from all PDFs in data/raw directory
This creates a vector database for semantic search of syllabus content
"""
import os
import chromadb
from pathlib import Path
from sentence_transformers import SentenceTransformer
from PyPDF2 import PdfReader
import re

# Configuration
RAW_DATA_DIR = "data/raw"
CHROMA_DB_PATH = "data/chroma_db"
COLLECTION_NAME = "dbms_syllabus"

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file"""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"❌ Error extracting {pdf_path}: {e}")
        return None

def clean_text(text):
    """Clean extracted text"""
    if not text:
        return ""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters that might cause issues
    text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f]', '', text)
    return text.strip()

def chunk_text(text, chunk_size=1000, overlap=200):
    """Split text into overlapping chunks for better context"""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence endings near the end
            last_period = chunk.rfind('.')
            last_newline = chunk.rfind('\n')
            break_point = max(last_period, last_newline)
            
            if break_point > chunk_size * 0.7:  # If we found a good break point
                chunk = chunk[:break_point + 1]
                end = start + break_point + 1
        
        chunks.append(chunk.strip())
        start = end - overlap  # Overlap for context
    
    return chunks

def build_chromadb():
    """Build ChromaDB from all PDFs in data/raw"""
    print("🔨 Building ChromaDB from data/raw...")
    
    # Initialize ChromaDB client
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    
    # Get or create collection
    try:
        collection = client.get_collection(COLLECTION_NAME)
        print(f"📦 Found existing collection: {COLLECTION_NAME}")
        # Clear existing collection to rebuild
        client.delete_collection(COLLECTION_NAME)
        print("🗑️  Cleared existing collection")
    except:
        pass
    
    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"description": "DBMS Syllabus and Course Materials"}
    )
    print(f"✅ Created collection: {COLLECTION_NAME}")
    
    # Load embedding model
    print("🔄 Loading embedding model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("✅ Embedding model loaded")
    
    # Find all PDFs
    pdf_files = []
    
    # Check pdfs directory
    pdfs_dir = Path(RAW_DATA_DIR) / "pdfs"
    if pdfs_dir.exists():
        pdf_files.extend(list(pdfs_dir.glob("*.pdf")))
    
    # Check syllabus directory
    syllabus_dir = Path(RAW_DATA_DIR) / "syllabus"
    if syllabus_dir.exists():
        pdf_files.extend(list(syllabus_dir.glob("*.pdf")))
    
    # Also check root of raw directory
    raw_dir = Path(RAW_DATA_DIR)
    if raw_dir.exists():
        pdf_files.extend(list(raw_dir.glob("*.pdf")))
    
    if not pdf_files:
        print(f"❌ No PDF files found in {RAW_DATA_DIR}")
        return
    
    print(f"📚 Found {len(pdf_files)} PDF files")
    
    all_documents = []
    all_embeddings = []
    all_ids = []
    all_metadatas = []
    
    doc_counter = 0
    
    for pdf_file in pdf_files:
        print(f"\n📄 Processing: {pdf_file.name}")
        
        # Extract text
        text = extract_text_from_pdf(pdf_file)
        if not text:
            print(f"⚠️  Skipping {pdf_file.name} (no text extracted)")
            continue
        
        text = clean_text(text)
        if len(text) < 100:  # Skip very short documents
            print(f"⚠️  Skipping {pdf_file.name} (too short: {len(text)} chars)")
            continue
        
        print(f"   Extracted {len(text)} characters")
        
        # Chunk the text
        chunks = chunk_text(text, chunk_size=1000, overlap=200)
        print(f"   Split into {len(chunks)} chunks")
        
        # Process each chunk
        for chunk_idx, chunk in enumerate(chunks):
            if len(chunk.strip()) < 50:  # Skip very short chunks
                continue
            
            # Create embedding
            embedding = model.encode(chunk, show_progress_bar=False)
            
            # Create unique ID
            doc_id = f"{pdf_file.stem}_{chunk_idx}"
            
            # Create metadata
            metadata = {
                "source_file": pdf_file.name,
                "source_path": str(pdf_file),
                "chunk_index": chunk_idx,
                "total_chunks": len(chunks),
                "chunk_length": len(chunk)
            }
            
            all_documents.append(chunk)
            all_embeddings.append(embedding.tolist())
            all_ids.append(doc_id)
            all_metadatas.append(metadata)
            
            doc_counter += 1
    
    # Add all documents to ChromaDB in batches
    print(f"\n💾 Adding {doc_counter} documents to ChromaDB...")
    
    # ChromaDB can handle batch insertion
    batch_size = 100
    for i in range(0, len(all_documents), batch_size):
        batch_docs = all_documents[i:i+batch_size]
        batch_embeddings = all_embeddings[i:i+batch_size]
        batch_ids = all_ids[i:i+batch_size]
        batch_metadatas = all_metadatas[i:i+batch_size]
        
        collection.add(
            documents=batch_docs,
            embeddings=batch_embeddings,
            ids=batch_ids,
            metadatas=batch_metadatas
        )
        print(f"   Added batch {i//batch_size + 1} ({len(batch_docs)} documents)")
    
    print(f"\n✅ ChromaDB built successfully!")
    print(f"   📊 Total documents: {doc_counter}")
    print(f"   📁 Database path: {CHROMA_DB_PATH}")
    print(f"   📦 Collection: {COLLECTION_NAME}")
    
    # Test query
    print("\n🔍 Testing search functionality...")
    results = collection.query(
        query_texts=["database management systems"],
        n_results=3
    )
    print(f"   Found {len(results['documents'][0])} relevant documents")
    if results['documents'][0]:
        print(f"   Sample result: {results['documents'][0][0][:100]}...")

def search_chromadb(query, n_results=5):
    """Search ChromaDB for relevant content"""
    try:
        client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        collection = client.get_collection(COLLECTION_NAME)
        
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        return results
    except Exception as e:
        print(f"❌ Error searching ChromaDB: {e}")
        return None

if __name__ == "__main__":
    build_chromadb()
    
    # Example search
    print("\n" + "="*50)
    print("Example search:")
    results = search_chromadb("SQL queries and database design", n_results=3)
    if results:
        print(f"\nFound {len(results['documents'][0])} results:")
        for i, doc in enumerate(results['documents'][0], 1):
            print(f"\n{i}. Source: {results['metadatas'][0][i-1]['source_file']}")
            print(f"   {doc[:200]}...")

