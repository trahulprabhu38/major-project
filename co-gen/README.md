# CO Generator Service

FastAPI service for Course Outcome (CO) generation using RAG (Retrieval Augmented Generation) with ChromaDB and Groq LLM.

## Features

- **Document Processing**: Supports PDF, DOCX, PPTX, and TXT files
- **Vector Storage**: Uses ChromaDB for semantic search and retrieval
- **AI Generation**: Leverages Groq API with LLaMA models for CO generation
- **RAG Pipeline**: Combines document context with LLM for accurate, syllabus-based COs
- **Bloom's Taxonomy**: Automatically classifies COs by cognitive levels

## Architecture

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  FastAPI Server │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│ Chroma │ │   Groq   │
│   DB   │ │   API    │
└────────┘ └──────────┘
```

## API Endpoints

### POST /api/co/upload
Upload syllabus file and ingest into ChromaDB.

**Request:**
- `file`: Syllabus file (PDF, DOCX, PPTX, TXT)
- `course_id`: Course UUID
- `course_code`: Course code (e.g., "CS101")
- `teacher_id`: Teacher UUID

**Response:**
```json
{
  "success": true,
  "message": "Syllabus uploaded successfully",
  "course_id": "...",
  "course_code": "CS101",
  "filename": "syllabus.pdf"
}
```

### POST /api/co/generate
Generate Course Outcomes using RAG.

**Query Parameters:**
- `course_id`: Course UUID
- `course_code`: Course code
- `num_cos`: Number of COs to generate (1-10, default: 5)

**Response:**
```json
{
  "success": true,
  "course_id": "...",
  "course_code": "CS101",
  "contexts": [...],
  "generated_cos": [
    {
      "co_text": "Students will be able to...",
      "bloom_level": "Apply",
      "verified": false
    }
  ],
  "total_docs": 10
}
```

### GET /api/co/stats/{course_id}
Get statistics for a course.

**Query Parameters:**
- `course_code`: Course code

**Response:**
```json
{
  "success": true,
  "course_id": "...",
  "course_code": "CS101",
  "chroma_doc_count": 10
}
```

### GET /health
Health check endpoint.

## Configuration

Environment variables (see `.env.example`):

- `PORT`: Service port (default: 8085)
- `CHROMA_HOST`: ChromaDB host
- `CHROMA_PORT`: ChromaDB port
- `GROQ_API_KEY`: Groq API key
- `GROQ_MODEL`: Model to use (default: llama-3.1-8b-instant)
- `EMBEDDING_MODEL`: Sentence transformer model

## Development

### Local Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

### Docker Setup

```bash
# Build and run with docker-compose
docker-compose up co-generator
```

## How It Works

1. **Upload**: Teacher uploads syllabus PDF/document
2. **Extraction**: Text is extracted from document
3. **Chunking**: Text is split into overlapping chunks
4. **Embedding**: Chunks are converted to vectors using sentence-transformers
5. **Storage**: Vectors stored in ChromaDB with metadata
6. **Retrieval**: When generating, relevant chunks are retrieved
7. **Generation**: Groq LLM generates COs based on retrieved context
8. **Classification**: COs are classified by Bloom's taxonomy level

## Bloom's Taxonomy Levels

- **Remember**: Recall, recognize, identify
- **Understand**: Explain, describe, summarize
- **Apply**: Implement, execute, use, demonstrate
- **Analyze**: Compare, contrast, examine, differentiate
- **Evaluate**: Assess, judge, critique, justify
- **Create**: Design, develop, construct, formulate

## Error Handling

- Graceful fallback if Groq API fails
- Automatic retry for ChromaDB connection
- Detailed error messages and logging
- Health checks for all dependencies
