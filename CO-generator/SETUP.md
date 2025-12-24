# CO Generator - Complete Setup Guide

## Complete 5-Stage GraphRAG Architecture Implementation

This project implements a production-ready **GraphRAG-powered Course Outcome (CO) Generator** using a sophisticated 5-stage AI pipeline.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    5-STAGE CO GENERATION PIPELINE                │
└──────────────────────────────────────────────────────────────────┘

📄 STAGE 1: Document Intelligence
   ├─ Multi-format extraction (PDF, PPT, DOCX, TXT)
   ├─ Semantic chunking (1000 chars, 200 overlap)
   ├─ Embedding generation (all-MiniLM-L6-v2)
   └─ Store in ChromaDB

🕸️  STAGE 2: Knowledge Graph Construction
   ├─ Build graph from processed docs
   ├─ Nodes: Modules, Topics, Bloom Levels, POs
   ├─ Edges: CONTAINS, PREREQUISITE, MAPS_TO_PO
   └─ Store in Neo4j (or in-memory fallback)

🔍 STAGE 3: Graph-RAG Retrieval
   ├─ Vector search (ChromaDB) - 70% weight
   ├─ Graph traversal (Neo4j/BFS) - 30% weight
   └─ Hybrid fusion for context

🤖 STAGE 4: Multi-Task LLM Generation
   ├─ Fine-tuned Qwen/GPT-Neo with LoRA
   ├─ Generate CO text (15-20 words)
   ├─ Predict Bloom level
   └─ Suggest PO mappings

✨ STAGE 5: Refinement Layer
   ├─ Conciseness scoring (15-20 words optimal)
   ├─ VTU compliance checking
   ├─ OBE alignment validation
   ├─ Bloom taxonomy accuracy
   └─ Final reward score (0-1)

💾 OUTPUT: Saved COs with Full Explainability
   ├─ Source documents tracked
   ├─ Graph paths recorded
   ├─ Retrieval methods logged
   └─ Score breakdowns included
```

---

## 🚀 Quick Start with Docker Compose (Recommended)

### Prerequisites

- Docker Desktop installed
- At least 4GB RAM available
- At least 10GB disk space

### Step 1: Clone and Navigate

```bash
cd /path/to/CO-generator
```

### Step 2: Start Services

```bash
# Start Neo4j and backend services
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

This will start:
- **Neo4j** on port 7474 (HTTP) and 7687 (Bolt)
- **FastAPI Backend** on port 8000

### Step 3: Verify Services

```bash
# Check health
curl http://localhost:8000/health

# Neo4j browser
open http://localhost:7474
# Login: neo4j / cogenerator123
```

### Step 4: Upload Documents and Generate COs

```bash
# Using curl
curl -X POST http://localhost:8000/generate-cos \
  -F "files=@data/raw/syllabus.pdf" \
  -F "num_apply=2" \
  -F "num_analyze=2" \
  -F "subject=DBMS"

# Or visit the Swagger UI
open http://localhost:8000/docs
```

---

## 🔧 Manual Setup (Without Docker)

### Prerequisites

- Python 3.10+
- Neo4j Desktop or Server (optional but recommended)

### Step 1: Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Install Neo4j driver
pip install neo4j
```

### Step 2: Start Neo4j (Optional)

**Option A: Neo4j Desktop**
1. Download from https://neo4j.com/download/
2. Create new database
3. Set password to `cogenerator123`
4. Start database

**Option B: Neo4j Docker**
```bash
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/cogenerator123 \
  neo4j:5.15.0
```

**Option C: Skip Neo4j (in-memory mode)**
The system will automatically fall back to in-memory graph if Neo4j is unavailable.

### Step 3: Prepare Data

```bash
# Create required directories
mkdir -p data/raw data/chroma_db data/generated_cos

# Add your syllabus files
cp /path/to/syllabus.pdf data/raw/
```

### Step 4: Run Complete Pipeline (Standalone)

```bash
python src/complete_pipeline.py
```

This will:
1. Process documents in `data/raw/`
2. Build knowledge graph
3. Generate 6 COs
4. Save results to `data/generated_cos.json`

### Step 5: Run FastAPI Server

```bash
# Set environment variables (if needed)
export NEO4J_URI=bolt://localhost:7687
export NEO4J_PASSWORD=cogenerator123

# Start server
python -m uvicorn src.fastapi_complete:app --reload --port 8000
```

Visit http://localhost:8000/docs for Swagger UI.

---

## 📡 API Endpoints

### 1. Generate COs (Complete Pipeline)

**NEW:** After generating COs, you can also fetch CO-PO mapping data for frontend visualization!

```bash
POST /generate-cos

# Form Data:
- files: PDF/PPT/DOCX/TXT files (multiple)
- num_apply: 2 (0-4)
- num_analyze: 2 (0-4)
- subject: "DBMS"

# Response:
{
  "success": true,
  "session_id": "20250130_123456",
  "cos": [...],  # 6 generated COs
  "metrics": {...},  # Quality metrics
  "graph_stats": {
    "nodes": 42,
    "relationships": 78,
    "paths": 15
  },
  "document_stats": {...},
  "latency": {...}
}
```

### 2. List All Sessions

```bash
GET /sessions

# Response:
{
  "success": true,
  "total_sessions": 10,
  "sessions": [...]
}
```

### 3. Get Specific Session

```bash
GET /sessions/{session_id}

# Response:
{
  "success": true,
  "session": {
    "session_id": "20250130_123456",
    "cos": [...],
    "metadata": {...},
    "explainability": {
      "source_documents": ["syllabus.pdf"],
      "graph_paths_used": 15,
      "retrieval_method": "Graph-RAG Hybrid"
    }
  }
}
```

### 4. Export Session

```bash
GET /sessions/{session_id}/export

# Downloads JSON file with complete session data
```

### 5. View Knowledge Graph

```bash
GET /knowledge-graph

# Response:
{
  "success": true,
  "graph_data": {
    "nodes": [...],
    "relationships": [...],
    "paths": [...]
  }
}
```

### 6. Health Check

```bash
GET /health

# Response:
{
  "status": "healthy",
  "version": "2.0.0",
  "neo4j_connected": true
}
```

### 7. Get CO-PO Mapping (NEW! 🎯)

**Get mapping for specific session:**
```bash
GET /sessions/{session_id}/co-po-mapping

# Response includes:
# - Matrix format (for tables/grids)
# - CO details with Bloom levels
# - PO coverage statistics
```

**Get latest CO-PO mapping:**
```bash
GET /co-po-mapping/latest

# Returns mapping for most recent session
```

**Get visualization-ready data:**
```bash
GET /co-po-mapping/visualize/{session_id}

# Response includes 4 formats:
# 1. Heatmap data (for Chart.js, Plotly)
# 2. Table data (for DataTables, AG Grid)
# 3. Graph data (for D3.js, Cytoscape)
# 4. Summary statistics
```

**Example Response:**
```json
{
  "success": true,
  "session_id": "20250130_123456",
  "co_po_matrix": {
    "headers": {
      "cos": ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6"],
      "pos": ["PO1", "PO2", ..., "PO12"]
    },
    "matrix": [
      {
        "co_num": 1,
        "mappings": {"PO1": 1, "PO2": 1, "PO3": 0, ...}
      }
    ]
  },
  "statistics": {
    "po_coverage": {"PO1": 6, "PO2": 5, ...},
    "coverage_percentage": {"PO1": 100.0, "PO2": 83.3, ...}
  }
}
```

**Visualize in Browser:**
```bash
# Open the demo visualization
open co_po_demo.html
```

**See full API documentation:**
- [CO-PO Mapping API Guide](CO_PO_MAPPING_API.md)

---

## 🔍 Testing the Complete Pipeline

### Test Script

Create `test_pipeline.py`:

```python
import requests
import json

# Upload file and generate COs
with open('data/raw/syllabus.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/generate-cos',
        files={'files': f},
        data={
            'num_apply': 2,
            'num_analyze': 2,
            'subject': 'DBMS'
        }
    )

result = response.json()
print(json.dumps(result, indent=2))

# Check session
session_id = result['session_id']
session = requests.get(f'http://localhost:8000/sessions/{session_id}').json()
print(f"\nSession {session_id} has {len(session['session']['cos'])} COs")

# View explainability
print("\nExplainability:")
print(json.dumps(session['session']['explainability'], indent=2))
```

Run:
```bash
python test_pipeline.py
```

---

## 📊 Verifying All Components Work

### 1. Document Intelligence ✓
```bash
# Check ChromaDB
ls -lh data/chroma_db/

# Should see database files
```

### 2. Knowledge Graph ✓
```bash
# Check exported graph
cat data/knowledge_graph.json | jq '.statistics'

# Or visit Neo4j browser
open http://localhost:7474
```

### 3. Graph-RAG Retrieval ✓
```bash
# Generate COs and check logs
docker-compose logs backend | grep "Graph-RAG"

# Should see:
# [Stage 3] Graph-RAG Retrieval...
# Retrieved: X items
```

### 4. Multi-Task LLM ✓
```bash
# Check if LoRA models exist
ls -lh qwen_co_lora/
ls -lh gptneo_co_lora/
```

### 5. Refinement Layer ✓
```bash
# Check CO scores in response
curl http://localhost:8000/sessions | jq '.sessions[0].cos[0].individual_scores'

# Should show:
# {
#   "conciseness": 0.95,
#   "vtu_compliance": 0.88,
#   "obe_alignment": 0.90,
#   ...
# }
```

### 6. CO Storage ✓
```bash
# Check saved COs
cat data/generated_cos.json | jq '.total_cos_generated'
cat data/generated_cos.json | jq '.sessions | length'
```

---

## 🐛 Troubleshooting

### Issue: Neo4j Connection Failed

**Solution:**
```bash
# Check Neo4j is running
docker ps | grep neo4j

# Check logs
docker logs co-generator-neo4j

# Restart
docker-compose restart neo4j

# Or use in-memory mode (automatic fallback)
# The pipeline will work without Neo4j
```

### Issue: ChromaDB Not Found

**Solution:**
```bash
# Build ChromaDB first
python src/build_chromadb.py

# Or it will be built automatically on first run
```

### Issue: Out of Memory

**Solution:**
```bash
# Reduce Docker memory or use smaller model
# Edit docker-compose.yml:
environment:
  - MODEL_SIZE=small
```

### Issue: Import Errors

**Solution:**
```bash
# Reinstall dependencies
pip install -r requirements.txt
pip install neo4j sentence-transformers chromadb
```

---

## 📂 Project Structure

```
CO-generator/
├── docker-compose.yml          # Multi-service orchestration
├── Dockerfile                  # Backend container
├── src/
│   ├── complete_pipeline.py    # ⭐ Complete 5-stage pipeline
│   ├── fastapi_complete.py     # ⭐ FastAPI with full pipeline
│   ├── document_intelligence.py # Stage 1
│   ├── knowledge_graph.py      # Stage 2
│   ├── graph_rag.py            # Stage 3
│   ├── multitask_model.py      # Stage 4
│   ├── refinement_layer.py     # Stage 5
│   └── ...
├── data/
│   ├── raw/                    # Input files
│   ├── chroma_db/              # Vector database
│   ├── knowledge_graph.json    # Exported graph
│   └── generated_cos.json      # ⭐ Saved COs with metadata
└── README.md
```

---

## 🎯 Success Criteria

Your setup is complete when:

✅ Docker compose starts both services
✅ Neo4j browser accessible at http://localhost:7474
✅ FastAPI docs at http://localhost:8000/docs
✅ `/health` endpoint returns `neo4j_connected: true`
✅ Uploading a PDF generates 6 COs
✅ COs have explainability data (graph paths, sources)
✅ Sessions are saved to `data/generated_cos.json`
✅ Knowledge graph exported to `data/knowledge_graph.json`
✅ All 5 stages execute in logs

---

## 🔗 Additional Resources

- **Neo4j Browser:** http://localhost:7474
- **API Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Neo4j Credentials:** `neo4j` / `cogenerator123`

---

## 📝 Notes

- The pipeline automatically falls back to in-memory graph if Neo4j unavailable
- ChromaDB is built automatically on first document processing
- COs are saved with full metadata for explainability
- All 5 stages are executed for each CO generation
- Graph paths and retrieval methods are tracked

---

**Happy CO Generation! 🎓**
