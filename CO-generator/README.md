# CO Generator Microservice

The CO Generator implements an advanced 5-stage AI-based pipeline for Course Outcome (CO) generation, explainability, and compliance—designed for integration in modern OBE analytics stacks.

---

## What is the CO Generator?

A standalone Python FastAPI service that reads course documents or syllabi, builds semantic and graph-based indices, uses retrieval-augmented generation (GraphRAG) to propose 6 compliant COs per subject, and saves all explainability/validation data with every run.

- **Documents → Chunks → Knowledge Graph → GraphRAG → LLM → Validation → Persistent COs**

---

## 5-Stage Pipeline

### Pipeline Diagram

```mermaid
graph TD
  UPLOAD[User uploads doc (PDF/PPT/DOCX/TXT)]
  A[Stage 1:<br>Document Intelligence] -->|Chunks + embeddings| B
  B[Stage 2:<br>Knowledge Graph<br>(Neo4j)] -->|Nodes+Rels| C
  C[Stage 3:<br>GraphRAG<br>Hybrid Retrieval] -->|Context| D
  D[Stage 4:<br>Multi-task LLM<br>(Qwen/GPTNeo+LoRA)] -->|COs| E
  E[Stage 5:<br>Refinement Layer] -->|Scores, explain| STOR{Save: generated_cos.json}
  UPLOAD --> A
  STOR --> OUT[API Return + Session state]
```

**Stages:**
1. **Document Intelligence**: Extracts structured text, semantic chunks, and embeddings (ChromaDB).
2. **Knowledge Graph**: Builds a multi-typed, explainable course graph in Neo4j (or in-memory fallback).
3. **GraphRAG Retrieval**: Both vector similarity (ChromaDB) and graph traversal power the document context for the LLM.
4. **LLM CO Generation**: Fine-tuned LLM (Qwen/GPTNeo+LoRA) proposes COs, predicts Bloom, maps POs.
5. **Refinement Layer**: Scores COs on conciseness, VTU format, OBE alignment, Bloom accuracy, specificity—only high-quality COs are saved and returned.

---

## Endpoints

- `POST /generate-cos` – Main entry; upload docs, runs pipeline, returns COs, scores, metadata
- `GET /sessions` – List sessions
- `GET /sessions/{id}` – Retrieve session outputs and explainability
- `GET /sessions/{id}/export` – Download as JSON
- `GET /knowledge-graph` – Dump full graph (nodes, edges, stats)
- `GET /statistics` – Pipeline/system stats
- `GET /health` – Health and Neo4j/Chroma status

> See OpenAPI docs at `/docs` or `/redoc` on port 8000

---

## Key Files & Structure

- `src/complete_pipeline.py` – Top-level pipeline API (all 5 stages)
- `src/document_intelligence.py` – Document extraction & embeddings
- `src/knowledge_graph.py` – Neo4j (or fallback) graph logic
- `src/graph_rag.py` – Hybrid retrieval (vector + path)
- `src/multitask_model.py` – LLM+LoRA hooks
- `src/refinement_layer.py` – CO quality scoring, refine
- `src/fastapi_complete.py` – FastAPI main, API routes
- `data/raw/` – Uploaded/processed docs
- `data/chroma_db/` – Embeddings (vector store)
- `data/knowledge_graph.json` – Exported course graph
- `data/generated_cos.json` – All outputs with explainability
- `qwen_co_lora/, gptneo_co_lora/` – Model weights/adapters

---

## Database and Storage

- **ChromaDB (Vector)**: Embedding index for semantic chunk and retrieval.
- **Neo4j (Graph)**: Persistent, explainable course/topic/PO knowledge graph.
- **All outputs**: Saved as JSON for explainability, traceability at every step.
- **Falls back to in-memory if Neo4j is down.**

---

## Running via Docker Compose (recommended)

This service is orchestrated by the project’s root `docker-compose.yml`.

```bash
# Start all services (root)
docker-compose up -d

# Health check
curl http://localhost:8002/health

# Open API docs
open http://localhost:8002/docs
```

---

## Troubleshooting

- **Neo4j Down?** – Pipeline will run but with no persistent KG; data stays in-memory.
- **ChromaDB Not Found?** – Embeddings index will rebuild on first run automatically.
- **OOM/Memory?** – Use a smaller model; limit Docker memory.
- See `SETUP.md` here for full dev, build, and troubleshooting steps!

---

## Extending or Adapting

- Add new LLM adapters in `qwen_co_lora/`, `gptneo_co_lora/`
- Refine reward model logic in `refinement_layer.py`
- Pipe outputs or context analytics via new endpoints

---

## Further Info
- For end-to-end API use, see root README and OpenAPI docs.
- Full implementation doc: `IMPLEMENTATION_SUMMARY.md`
