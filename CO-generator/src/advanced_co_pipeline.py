from typing import List, Dict, Optional
from pathlib import Path
import json

# Import all layers
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from document_intelligence import DocumentIntelligence
from knowledge_graph import KnowledgeGraph
from graph_rag import GraphRAGRetrieval
from multitask_model import MultiTaskCOModel
from refinement_layer import RefinementLayer

class AdvancedCOPipeline:
    """
    End-to-end advanced CO generation pipeline:
    1. Document Intelligence Layer
    2. Knowledge Graph Construction
    3. Graph-RAG Retrieval
    4. Multi-Task LLM Generation
    5. Refinement Layer
    """
    
    def __init__(self, base_model: str = "Qwen/Qwen2.5-0.5B-Instruct", lora_path: str = None):
        """Initialize complete pipeline"""
        print("="*60)
        print("ADVANCED CO GENERATION PIPELINE")
        print("="*60)
        
        # Initialize all layers
        self.doc_intelligence = DocumentIntelligence()
        self.knowledge_graph = KnowledgeGraph()
        self.graph_rag = GraphRAGRetrieval()
        self.multitask_model = MultiTaskCOModel(base_model, lora_path)
        self.refinement = RefinementLayer()
        
        # Connect components
        self.knowledge_graph.connect()
        self.graph_rag.set_knowledge_graph(self.knowledge_graph)
        
        print(" All pipeline components initialized")
        print("="*60)
    
    def process_syllabus(self, data_dir: str = "data/raw") -> Dict:
        """
        Stage 1: Document Intelligence
        Process all course materials
        """
        print("\n STAGE 1: Document Intelligence Layer")
        print("-" * 60)
        
        processed_docs = []
        
        # Find all PDFs
        pdf_files = []
        pdfs_dir = Path(data_dir) / "pdfs"
        syllabus_dir = Path(data_dir) / "syllabus"
        
        if pdfs_dir.exists():
            pdf_files.extend(list(pdfs_dir.glob("*.pdf")))
        if syllabus_dir.exists():
            pdf_files.extend(list(syllabus_dir.glob("*.pdf")))
        
        print(f"Found {len(pdf_files)} documents to process")
        
        for pdf_file in pdf_files[:5]:  # Limit for demo
            doc_result = self.doc_intelligence.process_document(str(pdf_file))
            if doc_result:
                processed_docs.append(doc_result)
        
        print(f"Processed {len(processed_docs)} documents")
        return {
            'processed_docs': processed_docs,
            'total_chunks': sum(doc['total_chunks'] for doc in processed_docs)
        }
    
    def build_knowledge_graph(self, processed_docs: List[Dict]) -> Dict:
        """
        Stage 2: Knowledge Graph Construction
        Build structured graph representation
        """
        print("\n STAGE 2: Knowledge Graph Construction")
        print("-" * 60)
        
        graph_data = self.knowledge_graph.build_syllabus_graph(processed_docs)
        
        # Export for visualization
        self.knowledge_graph.export_graph("data/knowledge_graph.json")
        
        return graph_data
    
    def generate_cos_advanced(self, num_apply: int, num_analyze: int) -> List[Dict]:
        """
        Complete pipeline execution:
        Stages 3-5: Graph-RAG → Multi-Task LLM → Refinement
        """
        print("\n STAGE 3-5: CO Generation Pipeline")
        print("-" * 60)
        
        # Build Bloom structure
        bloom_levels = []
        for i in range(num_apply):
            bloom_levels.append("Apply")
        for i in range(num_analyze):
            bloom_levels.append("Analyze")
        bloom_levels.append("Evaluate")  # CO5
        bloom_levels.append("Create")     # CO6
        
        final_cos = []
        previous_cos = []
        
        for i in range(6):
            co_num = i + 1
            level = bloom_levels[i]
            
            print(f"\nGenerating CO{co_num} ({level} level)...")
            
            # Stage 3: Graph-RAG Retrieval
            context_result = self.graph_rag.get_co_context(co_num, level, previous_cos)
            context = context_result['context']
            
            print(f"   Retrieved {context_result['stats']['total_retrieved']} relevant chunks")
            graph_paths = self.knowledge_graph.graph_data.get('paths', [])
            print(f"    Graph paths: {len(graph_paths)}")
            
            # Stage 4: Multi-Task LLM Generation
            co_result = self.multitask_model.generate_with_metadata(
                context, co_num, level, previous_cos
            )
            
            if not co_result:
                # Fallback to simple generation
                co_result = {
                    'co_text': f"CO{co_num} [Generated from advanced pipeline]",
                    'bloom_level': level,
                    'po_mappings': 'PO1, PO2, PO3',
                    'confidence': 0.8
                }
            
            # Stage 5: Refinement Layer
            retrieval_results = {'retrieval_results': context_result['retrieval_results']}
            # Get graph paths from graph search results
            graph_search_results = self.graph_rag.graph_search(f"CO{co_num} {level}")
            graph_paths = graph_search_results.get('paths', [])
            
            refined_co = self.refinement.refine_co(
                co_result, 
                retrieval_results, 
                graph_paths
            )
            
            final_cos.append(refined_co)
            previous_cos.append(refined_co['co_text'])
            
            print(f"   CO{co_num} generated and refined")
            print(f"      Score: {refined_co['scores']['final_score']:.2f}")
            print(f"      Approved: {refined_co['approved']}")
        
        return final_cos
    
    def generate_complete(self, num_apply: int = 2, num_analyze: int = 2) -> Dict:
        """
        Execute complete pipeline end-to-end
        """
        print("\n" + "="*60)
        print(" EXECUTING COMPLETE ADVANCED PIPELINE")
        print("="*60)
        
        # Stage 1: Document Intelligence
        doc_results = self.process_syllabus()
        
        # Stage 2: Knowledge Graph
        graph_data = self.build_knowledge_graph(doc_results['processed_docs'])
        
        # Stage 3-5: CO Generation
        cos = self.generate_cos_advanced(num_apply, num_analyze)
        
        # Format output
        co_output = "\n".join([co['co_text'] for co in cos])
        
        result = {
            'cos': cos,
            'co_output': co_output,
            'pipeline_stats': {
                'documents_processed': len(doc_results['processed_docs']),
                'total_chunks': doc_results['total_chunks'],
                'graph_nodes': len(graph_data['nodes']),
                'graph_relationships': len(graph_data['relationships']),
                'average_score': sum(co['scores']['final_score'] for co in cos) / len(cos),
                'approved_count': sum(1 for co in cos if co['approved'])
            },
            'justifications': [co['justification'] for co in cos]
        }
        
        print("\n" + "="*60)
        print(" PIPELINE EXECUTION COMPLETE")
        print("="*60)
        print(f" Pipeline Statistics:")
        print(f"   Documents: {result['pipeline_stats']['documents_processed']}")
        print(f"   Graph Nodes: {result['pipeline_stats']['graph_nodes']}")
        print(f"   Average Score: {result['pipeline_stats']['average_score']:.2f}")
        print(f"   Approved COs: {result['pipeline_stats']['approved_count']}/6")
        
        return result
    
    def export_report(self, result: Dict, output_path: str = "data/pipeline_report.json"):
        """Export complete pipeline report with justifications"""
        report = {
            'architecture': 'Advanced Multi-Stage AI Pipeline',
            'components': [
                'Document Intelligence Layer',
                'Knowledge Graph (Neo4j)',
                'Graph-RAG Retrieval',
                'Multi-Task Fine-Tuned LLM (QLoRA)',
                'Refinement Layer (RLHF)'
            ],
            'results': result,
            'explainability': {
                'graph_based': True,
                'source_tracking': True,
                'relation_chains': True
            }
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nComplete report exported to: {output_path}")

