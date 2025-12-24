"""
Demo Script for Advanced CO Generation Pipeline
Showcases the complete architecture to professors
"""
import sys
import os

# Add src directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from advanced_co_pipeline import AdvancedCOPipeline
import json

# def print_architecture():
#     """Print impressive architecture description"""
#     print("""
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║          ADVANCED MULTI-STAGE AI CO GENERATION PIPELINE                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝

# 🏗️  ARCHITECTURE OVERVIEW:

# ┌─────────────────────────────────────────────────────────────────────────┐
# │ STAGE 1: Document Intelligence Layer                                    │
# ├─────────────────────────────────────────────────────────────────────────┤
# │ • Multi-format extraction (PDF, PPT, DOCX, TXT)                         │
# │ • Semantic chunking with sentence boundary detection                     │
# │ • Transformer-based embeddings (all-MiniLM-L6-v2)                       │
# │ • Metadata extraction (modules, topics, keywords)                        │
# └─────────────────────────────────────────────────────────────────────────┘
#                               ↓
# ┌─────────────────────────────────────────────────────────────────────────┐
# │ STAGE 2: Knowledge Graph Construction (Neo4j)                           │
# ├─────────────────────────────────────────────────────────────────────────┤
# │ • Nodes: Modules, Topics, Subtopics, Bloom Verbs, Skills, POs           │
# │ • Edges: Prerequisites, Hierarchies, Semantic Similarity                │
# │ • LLM-driven relationship detection                                      │
# │ • Structured syllabus representation                                    │
# └─────────────────────────────────────────────────────────────────────────┘
#                               ↓
# ┌─────────────────────────────────────────────────────────────────────────┐
# │ STAGE 3: Graph-RAG Retrieval Layer                                      │
# ├─────────────────────────────────────────────────────────────────────────┤
# │ • Vector Search (ChromaDB/FAISS) - Semantic similarity                   │
# │ • Graph Traversal - Conceptual relationships                            │
# │ • Hybrid Ranking - Fusion of vector + graph results                     │
# │ • Context-aware retrieval for each CO                                   │
# └─────────────────────────────────────────────────────────────────────────┘
#                               ↓
# ┌─────────────────────────────────────────────────────────────────────────┐
# │ STAGE 4: Multi-Task Fine-Tuned LLM (QLoRA)                               │
# ├─────────────────────────────────────────────────────────────────────────┤
# │ • Base Model: LLaMA-3/Mistral/Qwen                                      │
# │ • Fine-tuning: QLoRA (Parameter-efficient)                              │
# │ • Multi-task Output:                                                    │
# │   - CO text generation                                                  │
# │   - Bloom level classification                                         │
# │   - PO mapping                                                          │
# │ • Single forward pass                                                   │
# └─────────────────────────────────────────────────────────────────────────┘
#                               ↓
# ┌─────────────────────────────────────────────────────────────────────────┐
# │ STAGE 5: Refinement Layer (RLHF/PPO)                                     │
# ├─────────────────────────────────────────────────────────────────────────┤
# │ • Reward Model: Faculty preference data                                 │
# │ • VTU-style phrasing validation                                         │
# │ • Conciseness scoring (15-20 words)                                     │
# │ • OBE alignment check                                                   │
# │ • Explainable justification (source nodes + relation chains)            │
# └─────────────────────────────────────────────────────────────────────────┘

# ✨ KEY FEATURES:
#   • Explainable: Graph-based justification with source tracking
#   • Transparent: Full audit trail of generation process
#   • Academically Rigorous: VTU and OBE compliant
#   • Scalable: Works across multiple subjects
#   • Impressive: State-of-the-art AI architecture

# """)

def run_demo():
    """Run complete pipeline demo"""
    # print_architecture()
    
    print(" Starting Pipeline Demo...\n")
    
    # Initialize pipeline
    pipeline = AdvancedCOPipeline(
        base_model="Qwen/Qwen2.5-0.5B-Instruct",
        lora_path="qwen_co_lora"  # Use existing LoRA if available
    )
    
    # Execute complete pipeline
    result = pipeline.generate_complete(num_apply=2, num_analyze=2)
    
    # Display results
    print("\n" + "="*60)
    print("GENERATED COURSE OUTCOMES")
    print("="*60)
    print(result['co_output'])
    
    print("\n" + "="*60)
    print(" DETAILED RESULTS")
    print("="*60)
    for i, co in enumerate(result['cos'], 1):
        print(f"\nCO{i}:")
        print(f"  Text: {co['co_text']}")
        print(f"  Bloom Level: {co['bloom_level']}")
        print(f"  PO Mappings: {co['po_mappings']}")
        print(f"  Final Score: {co['scores']['final_score']:.2f}")
        print(f"  Approved: {'' if co['approved'] else ''}")
        print(f"  Justification Sources: {len(co['justification']['retrieval_sources'])}")
    
    # Export report
    pipeline.export_report(result)
    
    print("\n" + "="*60)
    print("DEMO COMPLETE")
    print("="*60)
    print("\n Full report with justifications saved to: data/pipeline_report.json")
    print(" Knowledge graph exported to: data/knowledge_graph.json")
    
    return result

if __name__ == "__main__":
    run_demo()

