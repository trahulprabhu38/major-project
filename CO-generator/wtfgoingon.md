# WTF is Going On? 🤔

## TL;DR
This is an **AI-powered Course Outcome (CO) Generator** for VTU courses. It takes your PDFs/PPTs/DOCX files, processes them through a 5-stage AI pipeline, and spits out 6 perfectly formatted Course Outcomes that follow Bloom's Taxonomy and VTU guidelines.

---

## 🎯 The Big Picture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VTU CO GENERATOR PIPELINE                        │
│                                                                     │
│  Input: PDFs, PPTs, DOCX → Output: 6 VTU-Aligned Course Outcomes  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete System Flow (ASCII Art)

```
                    ┌──────────────────────┐
                    │   USER UPLOADS       │
                    │  Course Materials    │
                    │ (PDF/PPT/DOCX/TXT)   │
                    └──────────┬───────────┘
                               │
                               ▼
        ╔══════════════════════════════════════════════════╗
        ║         STAGE 1: DOCUMENT INTELLIGENCE           ║
        ╚══════════════════════════════════════════════════╝
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   [PDF Extract]        [PPT Extract]         [DOCX Extract]
   PyPDF2/OCR           python-pptx           python-docx
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Semantic Chunking   │
                    │  (1000 chars chunks) │
                    │  + Overlap (200)     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Generate Embeddings │
                    │  (all-MiniLM-L6-v2)  │
                    └──────────┬───────────┘
                               │
                               ▼
        ╔══════════════════════════════════════════════════╗
        ║      STAGE 2: KNOWLEDGE GRAPH CONSTRUCTION       ║
        ╚══════════════════════════════════════════════════╝
                               │
                               ▼
        ┌─────────────────────────────────────────────────┐
        │         Build Graph Structure                   │
        │                                                 │
        │  Nodes:                    Edges:               │
        │  • Modules                 • PREREQUISITE       │
        │  • Topics                  • CONTAINS           │
        │  • Bloom Levels            • REQUIRES           │
        │  • PO Mappings             • MAPS_TO_PO         │
        └─────────────────┬───────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Store in Neo4j      │
              │   (or in-memory)      │
              └───────────┬───────────┘
                          │
        ╔═════════════════▼═════════════════════════════════╗
        ║        STAGE 3: GRAPH-RAG RETRIEVAL               ║
        ╚═══════════════════════════════════════════════════╝
                          │
        ┌─────────────────┴────────────────────┐
        │                                      │
        ▼                                      ▼
┌───────────────────┐              ┌──────────────────────┐
│  Vector Search    │              │  Graph Traversal     │
│  (ChromaDB)       │              │  (BFS on KG)         │
│  • HNSW Index     │              │  • Find related      │
│  • Similarity     │              │    topics/modules    │
│  • Top-k chunks   │              │  • PO connections    │
└─────────┬─────────┘              └──────────┬───────────┘
          │                                   │
          └──────────────┬────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Hybrid Fusion       │
              │  70% Vector +        │
              │  30% Graph           │
              └──────────┬───────────┘
                         │
        ╔════════════════▼══════════════════════════════════╗
        ║       STAGE 4: MULTI-TASK LLM GENERATION          ║
        ╚═══════════════════════════════════════════════════╝
                         │
                         ▼
        ┌────────────────────────────────────────────────┐
        │         Fine-Tuned Language Model              │
        │                                                │
        │  Base Models:                                  │
        │  • Qwen 2.5 0.5B (preferred)                   │
        │  • GPT-Neo 125M (Mac fallback)                 │
        │                                                │
        │  Fine-tuning:                                  │
        │  • LoRA Adapters (r=16, α=32)                  │
        │  • Trained on VTU CO examples                  │
        │                                                │
        │  Multi-Task Outputs:                           │
        │  1. CO Text (15-20 words)                      │
        │  2. Bloom Level (Apply/Analyze/Evaluate)       │
        │  3. PO Mappings (PO1-PO12)                     │
        └────────────────┬───────────────────────────────┘
                         │
        ╔════════════════▼══════════════════════════════════╗
        ║         STAGE 5: REFINEMENT LAYER                 ║
        ╚═══════════════════════════════════════════════════╝
                         │
                         ▼
        ┌────────────────────────────────────────────────┐
        │         Reward Model Scoring                   │
        │                                                │
        │  1. Conciseness Check (15-20 words)            │
        │  2. VTU Compliance (terminology, format)       │
        │  3. OBE Alignment (measurable, actionable)     │
        │  4. Bloom Taxonomy Accuracy                    │
        │  5. PO Mapping Validity                        │
        │                                                │
        │  Final Score: 0-100%                           │
        └────────────────┬───────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Add Explainability  │
              │  • Source chunks     │
              │  • Graph paths       │
              │  • Justification     │
              └──────────┬───────────┘
                         │
                         ▼
        ┌────────────────────────────────────────────────┐
        │           FINAL OUTPUT (6 COs)                 │
        │                                                │
        │  Example:                                      │
        │  CO1: Apply data structures to solve          │
        │       real-world algorithmic problems          │
        │       [Bloom: Apply] [PO: PO1, PO2, PO12]      │
        │                                                │
        │  + Metrics Dashboard                           │
        │  + Performance Report                          │
        │  + Quality Scores                              │
        └────────────────────────────────────────────────┘
```

---

## 📂 Key Files & What They Do

### Core Pipeline Files
```
src/
├── enhanced_pipeline.py          ⭐ Main orchestrator - runs all 5 stages
├── metrics_dashboard.py          🎨 Streamlit UI - upload files & see results
├── smart_co_generator.py         🧠 CO generation logic
└── fastapi.py                    🌐 REST API (currently not active)
```

### Stage Components
```
src/
├── document_intelligence.py      📄 Stage 1: Extract & chunk documents
├── extract_text.py               📝 Helper for text extraction
├── build_chromadb.py             💾 Build vector database
│
├── knowledge_graph.py            🕸️  Stage 2: Build knowledge graph
│
├── graph_rag.py                  🔍 Stage 3: Hybrid retrieval
├── chromadb_utils.py             🔎 ChromaDB search utilities
│
├── multitask_model.py            🤖 Stage 4: LLM with LoRA adapters
├── train_lora_qwen.py            🏋️  Train Qwen model
├── train_lora_mac.py             🍎 Train GPT-Neo (Mac optimized)
│
└── refinement_layer.py           ✨ Stage 5: Reward scoring & validation
```

### Support Files
```
src/
├── metrics_evaluation.py         📊 Evaluate quality metrics
├── latency_optimizer.py          ⚡ Caching & performance optimization
├── build_jsonl.py                📋 Training data generation
├── build_better_jsonl.py         📋 Advanced training data
└── rebuild_training_data.py      🔄 Clean & deduplicate training data
```

---

## 🗂️ Data Flow Through Directories

```
/data/
├── raw/                          📥 Original uploaded files (PDFs, PPTs)
│   ├── syllabus.pdf
│   └── course_materials.pptx
│
├── extracted/                    📝 Extracted text from documents
│   ├── syllabus.txt
│   └── course_materials.txt
│
├── jsonl/                        📋 Training data for LLM fine-tuning
│   ├── training_data.jsonl
│   └── cleaned_training_data.jsonl
│
├── chroma_db/                    💾 Vector database (22MB, 444 chunks)
│   └── [ChromaDB files]
│
├── knowledge_graph.json          🕸️  Graph structure (134KB)
│
├── pipeline_report.json          📊 Latest pipeline execution metrics
│
└── user_feedback.json            💬 Feedback for RLHF improvement

/gptneo_co_lora/                  🤖 GPT-Neo model + LoRA (59MB)
/qwen_co_lora/                    🤖 Qwen model + LoRA (98MB)
```

---

## 🔧 Tech Stack

### AI & ML
- **PyTorch** - Deep learning framework
- **Transformers** - Hugging Face models (Qwen 2.5, GPT-Neo)
- **PEFT (LoRA)** - Efficient fine-tuning
- **Sentence Transformers** - Embeddings (all-MiniLM-L6-v2)

### Databases
- **ChromaDB** - Vector database (semantic search)
- **Neo4j** - Knowledge graph (optional, falls back to in-memory)

### Web Frameworks
- **Streamlit** - Interactive dashboard
- **FastAPI** - REST API (currently disabled)

### Document Processing
- **PyPDF2** - PDF extraction
- **python-pptx** - PowerPoint extraction
- **python-docx** - Word extraction
- **pytesseract** - OCR for images

---

## ⚡ Performance Metrics

```
┌─────────────────────────────────────────┐
│  Pipeline Performance (6 COs)           │
├─────────────────────────────────────────┤
│  Total Time:        ~3.5 seconds        │
│  Per CO:            ~580 milliseconds   │
│  Bloom Accuracy:    ≥85%                │
│  VTU Compliance:    ≥88%                │
│  OBE Alignment:     ≥80%                │
│  Overall Quality:   ≥82%                │
└─────────────────────────────────────────┘
```

---

## 🎯 What Makes This Special?

### 1. Multi-Stage AI Pipeline
Not just a simple LLM prompt - uses 5 sophisticated stages for accuracy

### 2. Graph-RAG Hybrid
Combines vector search (ChromaDB) + knowledge graph traversal for better context

### 3. Fine-Tuned Models
Custom LoRA adapters trained on VTU CO examples (not generic GPT)

### 4. Explainable AI
Every CO comes with:
- Source chunks from documents
- Knowledge graph traversal paths
- Justification for Bloom level & PO mappings

### 5. VTU Compliance
- Follows exact VTU formatting
- Bloom's Taxonomy validated
- OBE (Outcome-Based Education) aligned
- PO (Program Outcome) mappings included

---

## 🚀 How to Use

### Via Streamlit Dashboard (Recommended)
```bash
streamlit run src/metrics_dashboard.py
```
1. Upload your PDF/PPT/DOCX files
2. Click "Generate COs"
3. See 6 generated COs with metrics

### Via Python Script
```python
from src.smart_co_generator import SmartCOGenerator

generator = SmartCOGenerator()
cos = generator.generate_cos("path/to/syllabus.pdf", num_cos=6)
print(cos)
```

---

## 🔍 Example Output

```
CO1: Apply data structures and algorithms to solve computational problems
     [Bloom: Apply] [PO: PO1, PO2, PO12]
     Source: Module 1 - Data Structures (Graph path: Module→Topic→Bloom)

CO2: Analyze the time and space complexity of various sorting algorithms
     [Bloom: Analyze] [PO: PO1, PO2, PO3, PO12]
     Source: Module 2 - Algorithm Analysis

CO3: Evaluate different database normalization techniques for data integrity
     [Bloom: Evaluate] [PO: PO2, PO3, PO5]
     Source: Module 3 - Database Design

... (3 more COs)
```

---

## 🧩 Component Interactions

```
┌──────────────────┐
│  Streamlit UI    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  SmartCOGenerator        │
└────────┬─────────────────┘
         │
         ├─► DocumentIntelligence (Stage 1)
         │       └─► ChromaDB (vector store)
         │
         ├─► KnowledgeGraph (Stage 2)
         │       └─► Neo4j/In-memory graph
         │
         ├─► GraphRAG (Stage 3)
         │       ├─► ChromaDB search
         │       └─► Graph traversal
         │
         ├─► MultiTaskModel (Stage 4)
         │       ├─► Qwen 2.5 0.5B + LoRA
         │       └─► GPT-Neo 125M + LoRA
         │
         └─► RefinementLayer (Stage 5)
                 ├─► Reward scoring
                 └─► Explainability

┌──────────────────────────┐
│  LatencyOptimizer        │
│  • Embedding cache       │
│  • Batch processing      │
│  • Profiling             │
└──────────────────────────┘

┌──────────────────────────┐
│  MetricsEvaluation       │
│  • Quality scoring       │
│  • Compliance checks     │
│  • Accuracy metrics      │
└──────────────────────────┘
```

---

## 🎓 Educational Context

This tool is designed for:
- **VTU** (Visvesvaraya Technological University) courses
- **OBE** (Outcome-Based Education) compliance
- **NBA** (National Board of Accreditation) requirements
- **Bloom's Taxonomy** classification
- **Program Outcome (PO)** mapping

---

## 📈 Training Pipeline

```
Raw CO Examples
       ↓
build_better_jsonl.py → Generate JSONL training data
       ↓
rebuild_training_data.py → Clean & deduplicate
       ↓
train_lora_qwen.py → Fine-tune with LoRA
       ↓
qwen_co_lora/ → Save adapter weights
       ↓
multitask_model.py → Load for inference
```

---

## 🐳 Docker Support

```bash
docker build -t co-generator .
docker run -p 8501:8501 co-generator
```

Runs Streamlit dashboard in container with all dependencies.

---

## 💡 Key Optimizations

1. **Embedding Cache**: LRU cache (10K entries) saves 80% on redundant embedding calls
2. **Batch Processing**: ThreadPoolExecutor parallelizes document processing
3. **Model Compilation**: `torch.compile()` speeds up inference
4. **Persistent Cache**: Embeddings stored to disk for cross-session reuse
5. **HNSW Index**: Fast approximate nearest neighbor search in ChromaDB

---

## 🎯 Quality Targets

- ✅ Bloom Classification: ≥85% accuracy
- ✅ VTU Compliance: ≥88% adherence
- ✅ OBE Alignment: ≥80% alignment
- ✅ Overall Quality: ≥82% score
- ✅ Latency: <600ms per CO

---

## 🔮 What's Not Currently Used

- FastAPI server (`src/fastapi.py`) - commented out
- Neo4j database - falls back to in-memory graph
- Some demo files (`demo_pipeline.py`, `demo_integration.py`) - standalone demos

---

## 🏗️ Architecture Philosophy

1. **Modularity**: Each stage is independent, can be swapped/upgraded
2. **Explainability**: Full traceability from source to output
3. **Scalability**: ChromaDB + Neo4j ready for enterprise
4. **Performance**: Optimized for speed without sacrificing quality
5. **Compliance**: VTU/OBE/NBA standards baked in

---

## 🎬 Summary

This is a **production-grade AI system** that transforms course materials into accreditation-ready Course Outcomes using:
- **Graph-RAG** (cutting-edge retrieval)
- **LoRA fine-tuning** (custom VTU knowledge)
- **Multi-stage pipeline** (not just prompt engineering)
- **Explainable AI** (full justification)

Built for educational institutions needing fast, accurate, compliant CO generation at scale.

---

**Made with ❤️ for VTU Faculty & Accreditation Teams**
