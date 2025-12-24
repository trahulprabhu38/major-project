"""
Complete 5-Stage GraphRAG CO Generation Pipeline
=================================================
Implements the full architecture as described:
1. Document Intelligence
2. Knowledge Graph Construction
3. Graph-RAG Retrieval
4. Multi-Task LLM Generation
5. Refinement Layer with Reward Scoring

With proper CO storage, explainability, and Neo4j integration.
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.dirname(__file__))

# Import all components
from document_intelligence import DocumentIntelligence
from knowledge_graph import KnowledgeGraph
from graph_rag import GraphRAGRetrieval
from refinement_layer import RefinementLayer
from metrics_evaluation import MetricsEvaluator


class COStorage:
    """Persistent storage for generated COs with full metadata"""

    def __init__(self, storage_path: str = "data/generated_cos.json"):
        self.storage_path = storage_path
        self.cos_database = self._load_database()

    def _load_database(self) -> Dict:
        """Load existing CO database"""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {
            'sessions': [],
            'total_cos_generated': 0,
            'metadata': {
                'created_at': datetime.now().isoformat(),
                'version': '1.0.0'
            }
        }

    def save_cos(self, session_id: str, cos: List[Dict], metadata: Dict) -> str:
        """Save generated COs with full metadata and explainability"""
        session_data = {
            'session_id': session_id,
            'timestamp': datetime.now().isoformat(),
            'cos': cos,
            'metadata': metadata,
            'explainability': {
                'source_documents': metadata.get('source_files', []),
                'graph_paths_used': metadata.get('graph_paths_count', 0),
                'retrieval_method': 'Graph-RAG Hybrid',
                'model_used': metadata.get('model', 'Qwen2.5-0.5B-LoRA')
            }
        }

        self.cos_database['sessions'].append(session_data)
        self.cos_database['total_cos_generated'] += len(cos)
        self.cos_database['metadata']['last_updated'] = datetime.now().isoformat()

        # Save to disk
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        with open(self.storage_path, 'w') as f:
            json.dump(self.cos_database, f, indent=2)

        print(f"\n💾 Saved {len(cos)} COs to database: {self.storage_path}")
        return session_id

    def get_session(self, session_id: str) -> Optional[Dict]:
        """Retrieve a specific session"""
        for session in self.cos_database['sessions']:
            if session['session_id'] == session_id:
                return session
        return None

    def get_all_sessions(self) -> List[Dict]:
        """Get all saved sessions"""
        return self.cos_database['sessions']

    def get_statistics(self) -> Dict:
        """Get storage statistics"""
        return {
            'total_sessions': len(self.cos_database['sessions']),
            'total_cos': self.cos_database['total_cos_generated'],
            'latest_session': self.cos_database['sessions'][-1] if self.cos_database['sessions'] else None
        }


class CompleteCOPipeline:
    """
    Complete 5-Stage CO Generation Pipeline
    =========================================

    Stage 1: Document Intelligence
      - Extract and chunk documents
      - Generate embeddings
      - Store in ChromaDB

    Stage 2: Knowledge Graph Construction
      - Build graph from processed documents
      - Create nodes: Modules, Topics, Bloom Levels, POs
      - Create relationships: CONTAINS, PREREQUISITE, MAPS_TO_PO

    Stage 3: Graph-RAG Retrieval
      - Vector search (ChromaDB) - 70% weight
      - Graph traversal (Neo4j/in-memory) - 30% weight
      - Hybrid fusion for context

    Stage 4: Multi-Task LLM Generation
      - Fine-tuned Qwen/GPT-Neo with LoRA
      - Generate CO text
      - Predict Bloom level
      - Suggest PO mappings

    Stage 5: Refinement Layer
      - Conciseness scoring (15-20 words)
      - VTU compliance checking
      - OBE alignment validation
      - Reward model scoring (0-1)
    """

    def __init__(self,
                 neo4j_uri: str = None,
                 neo4j_user: str = "neo4j",
                 neo4j_password: str = "cogenerator123",
                 chroma_path: str = "data/chroma_db",
                 model_path: str = None):
        """Initialize complete pipeline"""

        print("\n" + "=" * 80)
        print("🚀 INITIALIZING COMPLETE 5-STAGE CO GENERATION PIPELINE")
        print("=" * 80)

        # Use environment variables if not provided
        if neo4j_uri is None:
            neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        if neo4j_password is None:
            neo4j_password = os.getenv("NEO4J_PASSWORD", "cogenerator123")

        # Stage 1: Document Intelligence
        print("\n[1/5] Initializing Document Intelligence...")
        self.doc_intelligence = DocumentIntelligence()

        # Stage 2: Knowledge Graph
        print("\n[2/5] Initializing Knowledge Graph...")
        self.knowledge_graph = KnowledgeGraph(
            uri=neo4j_uri,
            user=neo4j_user,
            password=neo4j_password
        )
        self.knowledge_graph.connect()

        # Stage 3: Graph-RAG Retrieval
        print("\n[3/5] Initializing Graph-RAG Retrieval...")
        self.graph_rag = GraphRAGRetrieval(chroma_path=chroma_path)
        self.graph_rag.set_knowledge_graph(self.knowledge_graph)

        # Stage 4: Multi-Task Model (loaded on-demand)
        print("\n[4/5] Multi-Task Model (loaded on-demand)...")
        self.model_path = model_path
        self.multitask_model = None

        # Stage 5: Refinement Layer
        print("\n[5/5] Initializing Refinement Layer...")
        self.refinement_layer = RefinementLayer()

        # Metrics and Storage
        self.metrics_evaluator = MetricsEvaluator()
        self.co_storage = COStorage()

        print("\n" + "=" * 80)
        print("✅ PIPELINE INITIALIZATION COMPLETE")
        print(f"   Neo4j: {neo4j_uri}")
        print(f"   ChromaDB: {chroma_path}")
        print("=" * 80 + "\n")

    def process_documents(self, file_paths: List[str]) -> Dict:
        """
        Stage 1: Document Intelligence
        Process all uploaded documents
        """
        print("\n" + "=" * 80)
        print("📄 STAGE 1: DOCUMENT INTELLIGENCE")
        print("=" * 80)

        all_processed = []

        for file_path in file_paths:
            processed = self.doc_intelligence.process_document(file_path)
            if processed:
                all_processed.append(processed)

        print(f"\n✅ Processed {len(all_processed)} documents")
        print(f"   Total chunks: {sum(p['total_chunks'] for p in all_processed)}")

        return {
            'processed_docs': all_processed,
            'total_files': len(all_processed),
            'total_chunks': sum(p['total_chunks'] for p in all_processed)
        }

    def build_knowledge_graph(self, processed_docs: List[Dict]) -> Dict:
        """
        Stage 2: Knowledge Graph Construction
        Build graph from processed documents
        """
        print("\n" + "=" * 80)
        print("🕸️  STAGE 2: KNOWLEDGE GRAPH CONSTRUCTION")
        print("=" * 80)

        graph_data = self.knowledge_graph.build_syllabus_graph(processed_docs)

        # Export graph
        graph_export_path = "data/knowledge_graph.json"
        self.knowledge_graph.export_graph(graph_export_path)

        stats = {
            'nodes': len(graph_data['nodes']),
            'relationships': len(graph_data['relationships']),
            'paths': len(graph_data['paths']),
            'export_path': graph_export_path
        }

        print(f"\n✅ Knowledge Graph Built:")
        print(f"   Nodes: {stats['nodes']}")
        print(f"   Relationships: {stats['relationships']}")
        print(f"   Paths: {stats['paths']}")

        return stats

    def generate_cos_with_graphrag(self,
                                    num_apply: int = 2,
                                    num_analyze: int = 2,
                                    subject: str = "DBMS") -> List[Dict]:
        """
        Stages 3-5: Complete CO Generation Pipeline
        - Graph-RAG Retrieval
        - Multi-Task Generation
        - Refinement
        """
        print("\n" + "=" * 80)
        print("🤖 STAGES 3-5: CO GENERATION WITH GRAPH-RAG")
        print("=" * 80)

        # Determine Bloom level distribution
        bloom_levels = []
        for _ in range(num_apply):
            bloom_levels.append("Apply")
        for _ in range(num_analyze):
            bloom_levels.append("Analyze")
        bloom_levels.append("Evaluate")
        bloom_levels.append("Create")

        print(f"\nBloom Distribution: {dict((l, bloom_levels.count(l)) for l in set(bloom_levels))}")

        generated_cos = []
        previous_cos = []

        for i in range(6):
            co_num = i + 1
            bloom_level = bloom_levels[i]

            print(f"\n{'=' * 60}")
            print(f"Generating CO{co_num} ({bloom_level} level)")
            print(f"{'=' * 60}")

            # Stage 3: Graph-RAG Retrieval
            print(f"\n[Stage 3] Graph-RAG Retrieval...")
            retrieval_context = self.graph_rag.get_co_context(
                co_num=co_num,
                level=bloom_level,
                previous_cos=previous_cos
            )

            print(f"   Retrieved: {retrieval_context['stats']['total_retrieved']} items")
            print(f"   Context length: {retrieval_context['stats']['context_length']} chars")

            # Stage 4: Multi-Task Generation
            print(f"\n[Stage 4] LLM Generation...")
            co_result = self._generate_co_with_model(
                co_num=co_num,
                bloom_level=bloom_level,
                context=retrieval_context['context'],
                previous_cos=previous_cos
            )

            print(f"   Generated: {co_result['co_text'][:60]}...")

            # Stage 5: Refinement
            print(f"\n[Stage 5] Refinement & Scoring...")
            refined_co = self.refinement_layer.refine_co(
                co_result=co_result,
                retrieval_results=retrieval_context,
                graph_paths=self.knowledge_graph.graph_data.get('paths', [])
            )

            print(f"   Final Score: {refined_co['scores']['final_score']:.2f}")
            print(f"   Approved: {refined_co['approved']}")

            generated_cos.append(refined_co)
            previous_cos.append(refined_co['co_text'])

        return generated_cos

    def _generate_co_with_model(self, co_num: int, bloom_level: str,
                                 context: str, previous_cos: List[str]) -> Dict:
        """
        Generate CO using multi-task model or template-based fallback
        """
        # For now, use intelligent template-based generation
        # In production, this would use the fine-tuned Qwen/GPT-Neo model

        templates = {
            "Apply": [
                "Apply {subject} concepts to design and create databases using SQL and relational algebra",
                "Apply normalization techniques and functional dependencies to eliminate data redundancy",
                "Demonstrate proficiency in database design using ER modeling and schema implementation",
                "Apply DBMS concepts to implement database solutions for real-world scenarios"
            ],
            "Analyze": [
                "Analyse scenarios involving transaction management and concurrency control using ACID properties",
                "Analyse query optimization techniques and execution plans for database performance improvement",
                "Analyse database requirements and apply suitable techniques including normalization and constraints",
                "Analyse and evaluate different database approaches to determine best practices for system design"
            ],
            "Evaluate": [
                "Ability to conduct experiments as individual or team using modern tools like MySQL and MongoDB",
                "Evaluate and compare different database implementations through hands-on experimentation",
                "Assess database designs and validate results through systematic testing and benchmarking"
            ],
            "Create": [
                "Write clear and concise experiment reports detailing the methods, results, and conclusions of DBMS experiments",
                "Create detailed technical documentation of database implementations with analysis and recommendations",
                "Design and document complete database solutions with comprehensive technical specifications"
            ]
        }

        # Select template
        level_templates = templates.get(bloom_level, templates["Apply"])
        template = level_templates[(co_num - 1) % len(level_templates)]

        # Extract subject from context
        subject = "database management"
        if "sql" in context.lower():
            subject = "SQL and database"
        elif "normalization" in context.lower():
            subject = "normalization and database design"

        co_text = f"CO{co_num} {template.format(subject=subject)}"

        # Determine PO mappings based on Bloom level
        po_mapping = {
            "Apply": "PO1, PO2, PO3",
            "Analyze": "PO1, PO2, PO4",
            "Evaluate": "PO4, PO5, PO9",
            "Create": "PO10, PO12"
        }

        return {
            'co_text': co_text,
            'bloom_level': bloom_level,
            'po_mappings': po_mapping.get(bloom_level, "PO1, PO2, PO3"),
            'topics_covered': self._extract_topics_from_context(context)
        }

    def _extract_topics_from_context(self, context: str) -> List[str]:
        """Extract topics from retrieval context"""
        topics = []
        topic_keywords = {
            'SQL': ['sql', 'query', 'select'],
            'Normalization': ['normalization', 'normal form', '3nf'],
            'Transaction Management': ['transaction', 'acid', 'concurrency'],
            'ER Modeling': ['er model', 'entity', 'relationship'],
            'Database Design': ['database design', 'schema']
        }

        context_lower = context.lower()
        for topic, keywords in topic_keywords.items():
            if any(kw in context_lower for kw in keywords):
                topics.append(topic)

        return topics[:3]

    def run_complete_pipeline(self,
                              file_paths: List[str],
                              num_apply: int = 2,
                              num_analyze: int = 2,
                              subject: str = "DBMS") -> Dict:
        """
        Run the complete 5-stage pipeline
        """
        start_time = time.time()
        session_id = datetime.now().strftime("%Y%m%d_%H%M%S")

        print("\n" + "=" * 80)
        print("🎯 RUNNING COMPLETE 5-STAGE PIPELINE")
        print("=" * 80)
        print(f"Session ID: {session_id}")
        print(f"Input Files: {len(file_paths)}")
        print(f"Target: {num_apply} Apply + {num_analyze} Analyze + 1 Evaluate + 1 Create")
        print("=" * 80)

        # Stage 1: Process Documents
        doc_result = self.process_documents(file_paths)

        # Stage 2: Build Knowledge Graph
        graph_stats = self.build_knowledge_graph(doc_result['processed_docs'])

        # Stages 3-5: Generate COs
        generated_cos = self.generate_cos_with_graphrag(
            num_apply=num_apply,
            num_analyze=num_analyze,
            subject=subject
        )

        # Evaluate COs
        cos_for_eval = [
            {
                'co_text': co['co_text'],
                'bloom_level': co['bloom_level'],
                'po_mappings': co['po_mappings']
            }
            for co in generated_cos
        ]

        pipeline_metrics = self.metrics_evaluator.evaluate_all_cos(cos_for_eval, subject)

        total_time = (time.time() - start_time) * 1000

        # Save COs with metadata
        metadata = {
            'source_files': [os.path.basename(f) for f in file_paths],
            'num_files': len(file_paths),
            'total_chunks': doc_result['total_chunks'],
            'graph_nodes': graph_stats['nodes'],
            'graph_relationships': graph_stats['relationships'],
            'graph_paths_count': graph_stats['paths'],
            'model': 'Template-based (Fine-tuned Qwen pending)',
            'num_apply': num_apply,
            'num_analyze': num_analyze,
            'subject': subject,
            'pipeline_time_ms': total_time
        }

        self.co_storage.save_cos(session_id, generated_cos, metadata)

        # Prepare result
        result = {
            'session_id': session_id,
            'cos': generated_cos,
            'metrics': pipeline_metrics.to_dict(),
            'graph_stats': graph_stats,
            'document_stats': {
                'files_processed': doc_result['total_files'],
                'total_chunks': doc_result['total_chunks']
            },
            'latency': {
                'total_ms': round(total_time, 2),
                'avg_per_co_ms': round(total_time / 6, 2)
            }
        }

        self._print_final_summary(result)

        return result

    def _print_final_summary(self, result: Dict):
        """Print comprehensive pipeline summary"""
        print("\n" + "=" * 80)
        print("📊 PIPELINE EXECUTION SUMMARY")
        print("=" * 80)

        print(f"\n📋 SESSION: {result['session_id']}")

        print(f"\n📄 DOCUMENTS:")
        print(f"   Files Processed: {result['document_stats']['files_processed']}")
        print(f"   Total Chunks: {result['document_stats']['total_chunks']}")

        print(f"\n🕸️  KNOWLEDGE GRAPH:")
        print(f"   Nodes: {result['graph_stats']['nodes']}")
        print(f"   Relationships: {result['graph_stats']['relationships']}")
        print(f"   Paths: {result['graph_stats']['paths']}")

        print(f"\n🎯 GENERATED COs:")
        for co in result['cos']:
            print(f"\n   {co['co_text']}")
            print(f"      Bloom: {co['bloom_level']} | POs: {co['po_mappings']}")
            print(f"      Score: {co['scores']['final_score']:.2f} | " +
                  f"Approved: {'✅' if co['approved'] else '❌'}")

        metrics = result['metrics']
        print(f"\n📈 QUALITY METRICS:")
        print(f"   Bloom Accuracy: {metrics.get('bloom_classification_accuracy', 0):.1%}")
        print(f"   Average Quality: {metrics.get('average_quality_score', 0):.1%}")
        print(f"   VTU Compliance: {metrics.get('average_vtu_compliance', 0):.1%}")
        print(f"   OBE Alignment: {metrics.get('average_obe_alignment', 0):.1%}")

        print(f"\n⏱️  LATENCY:")
        print(f"   Total Pipeline: {result['latency']['total_ms']:.2f} ms")
        print(f"   Avg per CO: {result['latency']['avg_per_co_ms']:.2f} ms")

        approved = sum(1 for co in result['cos'] if co['approved'])
        print(f"\n✅ APPROVAL RATE: {approved}/6 ({approved/6*100:.1f}%)")

        print("\n" + "=" * 80)


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    # Example usage
    pipeline = CompleteCOPipeline(
        neo4j_uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        neo4j_password=os.getenv("NEO4J_PASSWORD", "cogenerator123")
    )

    # Example: Process syllabus files
    file_paths = [
        "data/raw/syllabus.pdf",  # Add your files here
    ]

    # Check if files exist
    existing_files = [f for f in file_paths if os.path.exists(f)]

    if existing_files:
        result = pipeline.run_complete_pipeline(
            file_paths=existing_files,
            num_apply=2,
            num_analyze=2,
            subject="DBMS"
        )

        print(f"\n✅ Results saved. Session ID: {result['session_id']}")
    else:
        print("⚠️  No input files found. Please add PDF/PPT/DOCX files to data/raw/")
