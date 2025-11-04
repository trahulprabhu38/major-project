# CO Generator Microservice

Production-grade FastAPI microservice for automated Course Outcome (CO) generation using Large Language Models and Bloom's Taxonomy.

## 🎯 Features

- ✅ **Automated CO Generation** - Generate measurable course outcomes from syllabus files
- ✅ **Multi-Format Support** - PDF, DOCX, TXT file processing
- ✅ **Bloom's Taxonomy** - Automatic classification of COs by cognitive levels
- ✅ **Vector Search** - ChromaDB for semantic retrieval with FAISS fallback
- ✅ **LLM Integration** - Uses Flan-T5 for contextual CO generation
- ✅ **Streaming Support** - Real-time CO generation with Server-Sent Events
- ✅ **PostgreSQL Storage** - Persistent CO storage with verification
- ✅ **Docker Ready** - Fully containerized with health checks

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CO Generator Service                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │   FastAPI    │────▶│  Text        │                  │
│  │   Routes     │     │  Extractor   │                  │
│  └──────────────┘     └──────────────┘                  │
│         │                     │                          │
│         │              ┌──────────────┐                  │
│         └─────────────▶│  ChromaDB    │◀───┐            │
│                        │  Client      │    │            │
│                        └──────────────┘    │            │
│                               │            │            │
│                        ┌──────────────┐    │            │
│                        │  FAISS       │    │            │
│                        │  Fallback    │────┘            │
│                        └──────────────┘                  │
│                               │                          │
│                        ┌──────────────┐                  │
│                        │  Model       │                  │
│                        │  Runner      │                  │
│                        │ (Flan-T5)    │                  │
│                        └──────────────┘                  │
│                               │                          │
│                        ┌──────────────┐                  │
│                        │  Bloom       │                  │
│                        │  Classifier  │                  │
│                        └──────────────┘                  │
│                               │                          │
│                        ┌──────────────┐                  │
│                        │  PostgreSQL  │                  │
│                        │  Database    │                  │
│                        └──────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
co-generator/
├── app/
│   ├── main.py                 # FastAPI application
│   ├── routes/
│   │   ├── upload.py           # Syllabus upload endpoint
│   │   ├── generate.py         # CO generation endpoint
│   │   ├── verify.py           # CO verification endpoint
│   │   └── list_cos.py         # CO listing endpoint
│   ├── services/
│   │   ├── text_extractor.py  # PDF/DOCX/TXT extraction
│   │   ├── model_runner.py     # LLM inference
│   │   ├── bloom_classifier.py # Bloom taxonomy classifier
│   │   └── database.py         # PostgreSQL operations
│   ├── utils/
│   │   ├── chroma_client.py    # ChromaDB integration
│   │   ├── faiss_client.py     # FAISS fallback
│   │   └── prompt_builder.py   # Prompt engineering
│   └── models/
│       └── co_schema.py        # Pydantic models
├── Dockerfile
├── requirements.txt
├── bloom_levels.json           # Bloom's taxonomy definitions
└── README.md
```

## 🚀 API Endpoints

### 1. Upload Syllabus

```bash
POST /api/co/upload
Content-Type: multipart/form-data

{
  "file": <PDF/DOCX/TXT file>,
  "course_id": "uuid",
  "teacher_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "course_id": "...",
  "filename": "syllabus.pdf",
  "text_length": 5000,
  "chunk_count": 10,
  "stored_in_chroma": true
}
```

### 2. Generate COs

```bash
POST /api/co/generate

{
  "course_id": "uuid",
  "teacher_id": "uuid",
  "n_co": 5
}
```

**Response:**
```json
{
  "success": true,
  "cos": [
    {
      "co_text": "Understand database normalization...",
      "bloom_level": "Understand",
      "confidence": 0.9
    }
  ]
}
```

### 3. Generate COs (Streaming)

```bash
POST /api/co/generate/stream

{
  "course_id": "uuid",
  "teacher_id": "uuid",
  "n_co": 5
}
```

**Server-Sent Events stream**

### 4. Verify CO

```bash
POST /api/co/verify

{
  "co_id": 123,
  "verified": true
}
```

### 5. List COs

```bash
GET /api/co/list?course_id=uuid&teacher_id=uuid&verified_only=false
```

### 6. Get CO Statistics

```bash
GET /api/co/stats/{course_id}
```

**Response:**
```json
{
  "total_cos": 5,
  "verified_cos": 3,
  "bloom_distribution": {
    "Understand": 2,
    "Apply": 2,
    "Analyze": 1
  }
}
```

### 7. Health Check

```bash
GET /health
```

## 🔧 Installation & Setup

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export POSTGRES_URL=postgresql://admin:password@localhost:5432/edu
export CHROMA_HOST=localhost
export CHROMA_PORT=8000
export MODEL_PATH=google/flan-t5-base

# Run the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8085 --reload
```

### Docker Deployment

```bash
# Build image
docker build -t co-generator .

# Run container
docker run -p 8085:8085 \
  -e POSTGRES_URL=postgresql://admin:password@postgres:5432/edu \
  -e CHROMA_HOST=chromadb \
  -e CHROMA_PORT=8000 \
  co-generator
```

### Docker Compose (Recommended)

```bash
# From project root
docker-compose up co-generator chromadb postgres -d
```

## 🧪 Testing

### Test Upload

```bash
curl -X POST http://localhost:8085/api/co/upload \
  -F "file=@syllabus.pdf" \
  -F "course_id=123e4567-e89b-12d3-a456-426614174000" \
  -F "teacher_id=123e4567-e89b-12d3-a456-426614174001"
```

### Test Generate

```bash
curl -X POST http://localhost:8085/api/co/generate \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "123e4567-e89b-12d3-a456-426614174000",
    "teacher_id": "123e4567-e89b-12d3-a456-426614174001",
    "n_co": 5
  }'
```

### Access API Documentation

- Swagger UI: http://localhost:8085/docs
- ReDoc: http://localhost:8085/redoc

## 📊 Database Schema

```sql
CREATE TABLE course_outcomes (
    id SERIAL PRIMARY KEY,
    teacher_id UUID NOT NULL,
    course_id UUID NOT NULL,
    co_number INTEGER DEFAULT 1,
    co_text TEXT NOT NULL,
    bloom_level VARCHAR(50),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_URL` | PostgreSQL connection URL | `postgresql://admin:password@postgres:5432/edu` |
| `CHROMA_HOST` | ChromaDB host | `chromadb` |
| `CHROMA_PORT` | ChromaDB port | `8000` |
| `MODEL_PATH` | HuggingFace model name | `google/flan-t5-base` |

## 🧠 Bloom's Taxonomy Levels

The service automatically classifies COs into these cognitive levels:

1. **Remember** - Recall facts and basic concepts
2. **Understand** - Explain ideas or concepts
3. **Apply** - Use information in new situations
4. **Analyze** - Draw connections among ideas
5. **Evaluate** - Justify a stand or decision
6. **Create** - Produce new or original work

## 🛠️ Tech Stack

- **Framework:** FastAPI 0.109.0
- **ML Model:** Flan-T5 (google/flan-t5-base)
- **Vector DB:** ChromaDB 0.4.22
- **Fallback:** FAISS 1.7.4
- **Database:** PostgreSQL 16 + SQLAlchemy
- **Text Processing:** PyPDF2, python-docx
- **Embeddings:** sentence-transformers

## 📝 Bloom Levels Configuration

Edit `bloom_levels.json` to customize action verbs:

```json
{
  "Understand": {
    "description": "Explain ideas or concepts",
    "verbs": ["explain", "describe", "discuss", ...]
  }
}
```

## 🐛 Troubleshooting

### Model Loading Issues

```bash
# Pre-download model
python -c "from transformers import AutoTokenizer, AutoModelForSeq2SeqLM; \
  AutoTokenizer.from_pretrained('google/flan-t5-base'); \
  AutoModelForSeq2SeqLM.from_pretrained('google/flan-t5-base')"
```

### ChromaDB Connection Failed

- Check if ChromaDB container is running
- Service will automatically fallback to FAISS
- Check logs: `docker logs chromadb`

### Memory Issues

- Use smaller model: `google/flan-t5-small`
- Reduce batch size
- Increase Docker memory limit

## 📈 Performance

- **Model Loading:** ~10-30 seconds (first request)
- **Text Extraction:** <1 second per file
- **CO Generation:** 2-5 seconds for 5 COs
- **Embedding:** ~0.5 seconds per chunk

## 🔐 Security

- File uploads are stored temporarily and cleaned up
- SQL injection protection via SQLAlchemy
- CORS configured (update for production)
- Input validation with Pydantic

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Flan-T5 Model Card](https://huggingface.co/google/flan-t5-base)
- [Bloom's Taxonomy](https://cft.vanderbilt.edu/guides-sub-pages/blooms-taxonomy/)

## 🎉 Conclusion

Production-ready CO generation service with:
✅ Automated syllabus processing
✅ AI-powered CO generation
✅ Bloom's taxonomy classification
✅ Vector search with fallback
✅ RESTful API with streaming
✅ Docker containerization

**Start generating COs today!** 🚀
