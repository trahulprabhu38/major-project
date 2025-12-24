"""
Enhanced CO Generation Pipeline
================================
Production-ready pipeline with:
- Full metrics tracking
- Latency optimization
- Neo4j-ready Knowledge Graph
- Graph-RAG with hybrid retrieval
- Fine-tuned LLM inference
- Refinement with reward scoring
- Comprehensive reporting
"""

import os
import sys
import time
import json
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.dirname(__file__))

# Import components
from metrics_evaluation import MetricsEvaluator, PipelineMetrics, COQualityMetrics
from latency_optimizer import (
    OptimizedPipeline, LatencyProfiler, EmbeddingCache, 
    ModelOptimizer, LatencyBenchmark, PROFILER
)

try:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from peft import PeftModel
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("⚠️ PyTorch not available - running in demo mode")

try:
    from sentence_transformers import SentenceTransformer
    import chromadb
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False

# ============================================================================
# ENHANCED KNOWLEDGE GRAPH (Neo4j-Ready)
# ============================================================================

class EnhancedKnowledgeGraph:
    """
    Enhanced Knowledge Graph with Neo4j integration support
    Falls back to in-memory graph when Neo4j unavailable
    """
    
    def __init__(self, uri: str = "bolt://localhost:7687", 
                 user: str = "neo4j", password: str = "password"):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None
        self.connected = False
        
        # In-memory fallback
        self.graph_data = {
            'nodes': [],
            'relationships': [],
            'paths': [],
            'statistics': {}
        }
        
        self._try_connect_neo4j()
    
    def _try_connect_neo4j(self):
        """Attempt Neo4j connection"""
        try:
            from neo4j import GraphDatabase
            self.driver = GraphDatabase.driver(
                self.uri, 
                auth=(self.user, self.password)
            )
            # Test connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            self.connected = True
            print("✅ Connected to Neo4j Knowledge Graph")
        except ImportError:
            print("⚠️ Neo4j driver not installed - using in-memory graph")
        except Exception as e:
            print(f"⚠️ Neo4j connection failed: {e} - using in-memory graph")
    
    def create_node(self, node_type: str, properties: Dict) -> str:
        """Create a node in the graph"""
        node_id = f"{node_type}_{len(self.graph_data['nodes'])}"
        
        if self.connected and self.driver:
            # Neo4j implementation
            try:
                with self.driver.session() as session:
                    props_str = ", ".join([f"{k}: ${k}" for k in properties.keys()])
                    query = f"CREATE (n:{node_type} {{id: $node_id, {props_str}}}) RETURN n"
                    session.run(query, node_id=node_id, **properties)
            except Exception as e:
                print(f"Neo4j error: {e}")
        
        # Always store in memory for quick access
        node = {
            'id': node_id,
            'type': node_type,
            'properties': properties
        }
        self.graph_data['nodes'].append(node)
        return node_id
    
    def create_relationship(self, from_node: str, to_node: str, 
                           rel_type: str, properties: Dict = None) -> str:
        """Create a relationship between nodes"""
        rel_id = f"rel_{len(self.graph_data['relationships'])}"
        
        if self.connected and self.driver:
            try:
                with self.driver.session() as session:
                    query = f"""
                    MATCH (a {{id: $from_id}}), (b {{id: $to_id}})
                    CREATE (a)-[r:{rel_type}]->(b)
                    RETURN r
                    """
                    session.run(query, from_id=from_node, to_id=to_node)
            except Exception as e:
                print(f"Neo4j error: {e}")
        
        rel = {
            'id': rel_id,
            'from': from_node,
            'to': to_node,
            'type': rel_type,
            'properties': properties or {}
        }
        self.graph_data['relationships'].append(rel)
        return rel_id
    
    def find_paths(self, start_type: str, end_type: str, 
                   max_depth: int = 3) -> List[List[str]]:
        """Find paths between node types"""
        paths = []
        
        if self.connected and self.driver:
            try:
                with self.driver.session() as session:
                    query = f"""
                    MATCH path = (a:{start_type})-[*1..{max_depth}]-(b:{end_type})
                    RETURN [node in nodes(path) | node.id] as path_nodes
                    LIMIT 10
                    """
                    result = session.run(query)
                    for record in result:
                        paths.append(record['path_nodes'])
            except Exception as e:
                print(f"Neo4j path query error: {e}")
        
        # Fallback: Simple BFS on in-memory graph
        if not paths:
            paths = self._find_paths_inmemory(start_type, end_type, max_depth)
        
        self.graph_data['paths'] = paths
        return paths
    
    def _find_paths_inmemory(self, start_type: str, end_type: str, 
                             max_depth: int) -> List[List[str]]:
        """BFS path finding on in-memory graph"""
        paths = []
        start_nodes = [n['id'] for n in self.graph_data['nodes'] 
                      if n['type'] == start_type]
        end_nodes = set(n['id'] for n in self.graph_data['nodes'] 
                       if n['type'] == end_type)
        
        # Build adjacency list
        adj = {}
        for rel in self.graph_data['relationships']:
            if rel['from'] not in adj:
                adj[rel['from']] = []
            adj[rel['from']].append(rel['to'])
        
        # BFS from each start node
        for start in start_nodes[:3]:  # Limit starts
            queue = [(start, [start])]
            visited = {start}
            
            while queue and len(paths) < 5:
                current, path = queue.pop(0)
                
                if current in end_nodes:
                    paths.append(path)
                    continue
                
                if len(path) >= max_depth:
                    continue
                
                for neighbor in adj.get(current, []):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append((neighbor, path + [neighbor]))
        
        return paths
    
    def get_statistics(self) -> Dict:
        """Get graph statistics"""
        node_types = {}
        rel_types = {}
        
        for node in self.graph_data['nodes']:
            t = node['type']
            node_types[t] = node_types.get(t, 0) + 1
        
        for rel in self.graph_data['relationships']:
            t = rel['type']
            rel_types[t] = rel_types.get(t, 0) + 1
        
        stats = {
            'total_nodes': len(self.graph_data['nodes']),
            'total_relationships': len(self.graph_data['relationships']),
            'total_paths': len(self.graph_data['paths']),
            'node_types': node_types,
            'relationship_types': rel_types,
            'neo4j_connected': self.connected
        }
        
        self.graph_data['statistics'] = stats
        return stats
    
    def export(self, filepath: str):
        """Export graph to JSON"""
        with open(filepath, 'w') as f:
            json.dump(self.graph_data, f, indent=2)
    
    def close(self):
        """Close Neo4j connection"""
        if self.driver:
            self.driver.close()


# ============================================================================
# ENHANCED GRAPH-RAG RETRIEVAL
# ============================================================================

class EnhancedGraphRAG:
    """
    Enhanced Graph-RAG with optimized retrieval
    Combines vector search + graph traversal with caching
    """
    
    def __init__(self, chroma_path: str = "data/chroma_db",
                 collection_name: str = "dbms_syllabus",
                 embedding_cache: Optional[EmbeddingCache] = None):
        
        self.embedding_cache = embedding_cache or EmbeddingCache(max_size=5000)
        self.knowledge_graph = None
        
        # Initialize embedding model
        if EMBEDDINGS_AVAILABLE:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        else:
            self.embedding_model = None
        
        # Connect to ChromaDB
        try:
            self.client = chromadb.PersistentClient(path=chroma_path)
            self.collection = self.client.get_collection(collection_name)
            self.vector_db_ready = True
            print(f"✅ ChromaDB connected: {collection_name}")
        except Exception as e:
            self.vector_db_ready = False
            print(f"⚠️ ChromaDB not available: {e}")
    
    def set_knowledge_graph(self, kg: EnhancedKnowledgeGraph):
        """Set knowledge graph reference"""
        self.knowledge_graph = kg
    
    @PROFILER.profile("vector_search")
    def vector_search(self, query: str, n_results: int = 5) -> List[Dict]:
        """Optimized vector search with caching"""
        if not self.vector_db_ready:
            return []
        
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            vector_results = []
            if results['documents'] and results['documents'][0]:
                for i in range(len(results['documents'][0])):
                    vector_results.append({
                        'content': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'distance': results['distances'][0][i] if results['distances'] else 0.0,
                        'score': 1.0 - results['distances'][0][i] if results['distances'] else 0.5,
                        'source': 'vector_search'
                    })
            
            return vector_results
        except Exception as e:
            print(f"Vector search error: {e}")
            return []
    
    @PROFILER.profile("graph_traversal")
    def graph_search(self, query: str, start_type: str = "Module",
                     end_type: str = "Topic") -> Dict:
        """Graph-based retrieval"""
        if not self.knowledge_graph:
            return {'nodes': [], 'relationships': [], 'paths': []}
        
        # Find relevant paths
        paths = self.knowledge_graph.find_paths(start_type, end_type, max_depth=2)
        
        # Get relevant nodes based on query
        query_lower = query.lower()
        relevant_nodes = []
        for node in self.knowledge_graph.graph_data['nodes']:
            node_text = json.dumps(node['properties']).lower()
            if any(word in node_text for word in query_lower.split()):
                relevant_nodes.append(node)
        
        return {
            'nodes': relevant_nodes[:5],
            'relationships': self.knowledge_graph.graph_data['relationships'][:10],
            'paths': paths[:3]
        }
    
    def hybrid_retrieve(self, query: str, co_num: int, 
                        bloom_level: str) -> Dict:
        """
        Hybrid retrieval combining vector + graph search
        with reciprocal rank fusion
        """
        # Vector search
        vector_results = self.vector_search(query, n_results=5)
        
        # Graph search
        graph_results = self.graph_search(query)
        
        # Combine with reciprocal rank fusion
        combined = []
        seen = set()
        
        # Add vector results (weight: 0.7)
        for i, result in enumerate(vector_results):
            content_hash = hash(result.get('content', '')[:100])
            if content_hash not in seen:
                seen.add(content_hash)
                result['hybrid_score'] = result['score'] * 0.7 + (1 / (i + 1)) * 0.1
                combined.append(result)
        
        # Add graph context (weight: 0.3)
        for node in graph_results.get('nodes', [])[:3]:
            content = f"[GRAPH] {node['type']}: {json.dumps(node['properties'])}"
            content_hash = hash(content[:100])
            if content_hash not in seen:
                seen.add(content_hash)
                combined.append({
                    'content': content,
                    'source': 'knowledge_graph',
                    'hybrid_score': 0.3
                })
        
        # Add path context
        for path in graph_results.get('paths', [])[:2]:
            path_str = " → ".join(path)
            combined.append({
                'content': f"[PATH] {path_str}",
                'source': 'graph_path',
                'hybrid_score': 0.25
            })
        
        # Sort by hybrid score
        combined.sort(key=lambda x: x.get('hybrid_score', 0), reverse=True)
        
        return {
            'results': combined[:8],
            'vector_count': len(vector_results),
            'graph_nodes': len(graph_results.get('nodes', [])),
            'graph_paths': len(graph_results.get('paths', []))
        }


# ============================================================================
# ENHANCED MULTI-TASK MODEL
# ============================================================================

class EnhancedMultiTaskModel:
    """
    Enhanced LLM with optimizations for CO generation
    """
    
    def __init__(self, base_model: str = "Qwen/Qwen2.5-0.5B-Instruct",
                 lora_path: Optional[str] = None):
        self.base_model_name = base_model
        self.lora_path = lora_path
        self.model = None
        self.tokenizer = None
        
        # Get optimizer
        self.optimizer = ModelOptimizer()
        self.device = self.optimizer.device
        
        # Load model
        self._load_model()
    
    def _load_model(self):
        """Load and optimize model"""
        if not TORCH_AVAILABLE:
            print("⚠️ PyTorch not available - model in demo mode")
            return
        
        try:
            print(f"📥 Loading {self.base_model_name}...")
            
            self.tokenizer = AutoTokenizer.from_pretrained(self.base_model_name)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            self.model = AutoModelForCausalLM.from_pretrained(
                self.base_model_name,
                torch_dtype=torch.float32,
                device_map=None
            )
            
            # Load LoRA adapter
            if self.lora_path and os.path.exists(self.lora_path):
                self.model = PeftModel.from_pretrained(self.model, self.lora_path)
                print(f"✅ LoRA adapter loaded: {self.lora_path}")
            
            # Move to device and optimize
            self.model.to(self.device)
            self.model = self.optimizer.optimize_model_for_inference(self.model)
            self.model.eval()
            
            print(f"✅ Model ready on {self.device}")
            
        except Exception as e:
            print(f"❌ Model loading error: {e}")
    
    @PROFILER.profile("llm_inference")
    def generate_co(self, context: str, co_num: int, 
                    bloom_level: str, previous_cos: List[str]) -> Dict:
        """Generate a single CO with metadata"""
        if not self.model:
            return self._mock_generation(co_num, bloom_level)
        
        # Build prompt
        previous_text = "\n".join([f"- {co}" for co in previous_cos]) if previous_cos else "None"
        
        prompt = f"""Generate Course Outcome CO{co_num} at {bloom_level} level.

CONTEXT:
{context[:1500]}

REQUIREMENTS:
- CO{co_num} at {bloom_level} Bloom level
- 15-20 words, specific and measurable
- Must be unique from:
{previous_text}

FORMAT:
CO{co_num}: [CO text]
Bloom Level: {bloom_level}
PO Mappings: PO1, PO2, PO3

CO{co_num}:"""
        
        try:
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                truncation=True,
                max_length=1024
            ).to(self.device)
            
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=150,
                    temperature=0.8,
                    do_sample=True,
                    top_p=0.9,
                    repetition_penalty=1.5,
                    pad_token_id=self.tokenizer.eos_token_id,
                    use_cache=True
                )
            
            generated = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            return self._parse_output(generated, co_num, bloom_level)
            
        except Exception as e:
            print(f"Generation error: {e}")
            return self._mock_generation(co_num, bloom_level)
    
    def _parse_output(self, text: str, co_num: int, bloom_level: str) -> Dict:
        """Parse model output"""
        import re
        
        # Extract CO text
        co_pattern = rf"CO{co_num}[:\s]+([^\n]+)"
        co_match = re.search(co_pattern, text, re.IGNORECASE)
        co_text = co_match.group(1).strip() if co_match else f"Generated CO{co_num}"
        
        # Clean up
        co_text = re.sub(r'^(Apply|Analyze|Evaluate|Create)\s+', '', co_text, flags=re.IGNORECASE)
        
        # Extract PO mappings
        po_pattern = r"PO[:\s]*Mappings?[:\s]*([^\n]+)"
        po_match = re.search(po_pattern, text, re.IGNORECASE)
        po_mappings = po_match.group(1).strip() if po_match else "PO1, PO2, PO3"
        
        return {
            'co_text': f"CO{co_num} {co_text}",
            'bloom_level': bloom_level,
            'po_mappings': po_mappings,
            'raw_output': text[:500]
        }
    
    def _mock_generation(self, co_num: int, bloom_level: str) -> Dict:
        """Mock generation for demo mode"""
        mock_cos = {
            1: "Apply DBMS concepts to design and create databases using SQL and relational algebra",
            2: "Apply normalization techniques to database schemas for data integrity",
            3: "Analyse scenarios involving transaction management using ACID properties",
            4: "Analyse query optimization techniques for database performance improvement",
            5: "Evaluate database designs using modern tools like MySQL and MongoDB",
            6: "Create comprehensive experiment reports documenting DBMS implementations"
        }
        
        return {
            'co_text': f"CO{co_num} {mock_cos.get(co_num, 'Generated course outcome')}",
            'bloom_level': bloom_level,
            'po_mappings': f"PO1, PO{co_num % 5 + 1}, PO{co_num % 3 + 4}",
            'raw_output': '[Demo mode]'
        }


# ============================================================================
# ENHANCED REFINEMENT LAYER
# ============================================================================

class EnhancedRefinementLayer:
    """
    Enhanced refinement with reward scoring
    Simulates RLHF preference scoring
    """
    
    def __init__(self):
        self.reward_weights = {
            'conciseness': 0.20,
            'vtu_compliance': 0.25,
            'obe_alignment': 0.25,
            'bloom_accuracy': 0.20,
            'specificity': 0.10
        }
        
        self.vtu_action_verbs = {
            'Apply': ['apply', 'use', 'implement', 'demonstrate', 'execute'],
            'Analyze': ['analyze', 'analyse', 'examine', 'compare', 'investigate'],
            'Evaluate': ['evaluate', 'assess', 'justify', 'validate', 'critique'],
            'Create': ['create', 'design', 'develop', 'construct', 'write']
        }
    
    @PROFILER.profile("refinement")
    def refine_and_score(self, co_result: Dict, 
                         retrieval_context: Dict,
                         graph_paths: List) -> Dict:
        """Comprehensive CO refinement with reward scoring"""
        import re
        
        co_text = co_result.get('co_text', '')
        bloom_level = co_result.get('bloom_level', '')
        po_mappings = co_result.get('po_mappings', '')
        
        # Calculate individual scores
        scores = {}
        
        # 1. Conciseness score
        word_count = len(co_text.split())
        if 15 <= word_count <= 20:
            scores['conciseness'] = 1.0
        elif 12 <= word_count <= 25:
            scores['conciseness'] = 0.8
        else:
            scores['conciseness'] = max(0.3, 1 - abs(word_count - 17.5) / 20)
        
        # 2. VTU compliance score
        vtu_checks = {
            'proper_format': bool(re.match(r'^CO[1-6]\s+[A-Z]', co_text)),
            'has_action_verb': any(
                verb in co_text.lower() 
                for verbs in self.vtu_action_verbs.values() 
                for verb in verbs
            ),
            'correct_bloom_verb': any(
                verb in co_text.lower() 
                for verb in self.vtu_action_verbs.get(bloom_level, [])
            ),
            'specific_content': any(
                term in co_text.lower() 
                for term in ['sql', 'database', 'normalization', 'transaction', 
                           'query', 'schema', 'mongodb', 'index']
            )
        }
        scores['vtu_compliance'] = sum(vtu_checks.values()) / len(vtu_checks)
        
        # 3. OBE alignment score
        measurable_verbs = ['apply', 'analyse', 'analyze', 'evaluate', 'create', 
                          'design', 'implement', 'demonstrate', 'conduct']
        has_po = 'PO' in po_mappings
        has_measurable = any(v in co_text.lower() for v in measurable_verbs)
        scores['obe_alignment'] = (0.5 if has_po else 0) + (0.5 if has_measurable else 0)
        
        # 4. Bloom accuracy (presence of correct level verbs)
        bloom_verbs = self.vtu_action_verbs.get(bloom_level, [])
        scores['bloom_accuracy'] = 1.0 if any(v in co_text.lower() for v in bloom_verbs) else 0.5
        
        # 5. Specificity score (technical terms)
        technical_terms = ['sql', 'relational', 'normalization', 'transaction',
                          'acid', 'mongodb', 'nosql', 'indexing', 'query',
                          'schema', 'erd', 'constraint', 'trigger']
        term_count = sum(1 for t in technical_terms if t in co_text.lower())
        scores['specificity'] = min(1.0, term_count / 3)
        
        # Calculate weighted reward score
        reward_score = sum(
            scores[metric] * weight 
            for metric, weight in self.reward_weights.items()
        )
        
        # Generate justification
        justification = {
            'source_nodes': [node['id'] for node in retrieval_context.get('results', [])[:3] 
                           if 'GRAPH' in str(node.get('content', ''))],
            'retrieval_sources': [r.get('source', 'unknown') 
                                 for r in retrieval_context.get('results', [])[:3]],
            'graph_paths': graph_paths[:2],
            'score_breakdown': scores
        }
        
        return {
            'co_text': co_text,
            'bloom_level': bloom_level,
            'po_mappings': po_mappings,
            'reward_score': round(reward_score, 3),
            'individual_scores': {k: round(v, 3) for k, v in scores.items()},
            'approved': reward_score >= 0.75,
            'justification': justification,
            'vtu_checks': vtu_checks
        }


# ============================================================================
# MAIN ENHANCED PIPELINE
# ============================================================================

class EnhancedCOPipeline:
    """
    Complete enhanced CO generation pipeline with:
    - Full metrics tracking
    - Latency optimization
    - Graph-RAG retrieval
    - Multi-task LLM
    - Refinement layer
    """
    
    def __init__(self, 
                 base_model: str = "Qwen/Qwen2.5-0.5B-Instruct",
                 lora_path: Optional[str] = None,
                 chroma_path: str = "data/chroma_db"):
        
        print("\n" + "=" * 70)
        print("🚀 ENHANCED CO GENERATION PIPELINE")
        print("=" * 70)
        
        # Initialize metrics
        self.metrics_evaluator = MetricsEvaluator()
        
        # Initialize optimizations
        self.embedding_cache = EmbeddingCache(max_size=5000)
        
        # Initialize components
        self.metrics_evaluator.start_timer('initialization')
        
        self.knowledge_graph = EnhancedKnowledgeGraph()
        self.graph_rag = EnhancedGraphRAG(
            chroma_path=chroma_path,
            embedding_cache=self.embedding_cache
        )
        self.graph_rag.set_knowledge_graph(self.knowledge_graph)
        
        self.multitask_model = EnhancedMultiTaskModel(
            base_model=base_model,
            lora_path=lora_path
        )
        
        self.refinement = EnhancedRefinementLayer()
        
        init_time = self.metrics_evaluator.stop_timer('initialization')
        
        print("=" * 70)
        print(f"✅ Pipeline initialized in {init_time:.2f} ms")
        print(f"✅ Device: {self.multitask_model.device}")
        print(f"✅ Neo4j: {'Connected' if self.knowledge_graph.connected else 'In-memory mode'}")
        print(f"✅ ChromaDB: {'Ready' if self.graph_rag.vector_db_ready else 'Not available'}")
        print("=" * 70 + "\n")
    
    def generate_all_cos(self, num_apply: int = 2, 
                         num_analyze: int = 2,
                         subject: str = "DBMS") -> Dict:
        """
        Generate all 6 COs with full pipeline
        """
        print("\n" + "=" * 70)
        print("📝 GENERATING COURSE OUTCOMES")
        print("=" * 70)
        
        # Build Bloom structure
        bloom_levels = []
        for _ in range(num_apply):
            bloom_levels.append("Apply")
        for _ in range(num_analyze):
            bloom_levels.append("Analyze")
        bloom_levels.append("Evaluate")
        bloom_levels.append("Create")
        
        # Level-specific context queries
        level_queries = {
            "Apply": "SQL queries database design normalization implementation",
            "Analyze": "transaction concurrency query optimization analysis",
            "Evaluate": "experiments tools MySQL MongoDB evaluation",
            "Create": "design create report documentation development"
        }
        
        cos = []
        previous_cos = []
        
        total_start = time.perf_counter()
        
        for i in range(6):
            co_num = i + 1
            bloom_level = bloom_levels[i]
            
            print(f"\n🔄 Generating CO{co_num} ({bloom_level})...")
            
            # Stage 1: Graph-RAG Retrieval
            query = level_queries.get(bloom_level, "database management")
            self.metrics_evaluator.start_timer('retrieval')
            retrieval_result = self.graph_rag.hybrid_retrieve(query, co_num, bloom_level)
            self.metrics_evaluator.stop_timer('retrieval')
            
            # Build context from retrieval
            context = "\n".join([
                r.get('content', '')[:300] 
                for r in retrieval_result.get('results', [])[:5]
            ])
            
            print(f"   📊 Retrieved: {len(retrieval_result.get('results', []))} items")
            
            # Stage 2: LLM Generation
            self.metrics_evaluator.start_timer('llm_inference')
            co_result = self.multitask_model.generate_co(
                context, co_num, bloom_level, previous_cos
            )
            self.metrics_evaluator.stop_timer('llm_inference')
            
            # Stage 3: Refinement
            self.metrics_evaluator.start_timer('refinement')
            graph_paths = self.knowledge_graph.graph_data.get('paths', [])
            refined_co = self.refinement.refine_and_score(
                co_result, retrieval_result, graph_paths
            )
            self.metrics_evaluator.stop_timer('refinement')
            
            cos.append(refined_co)
            previous_cos.append(refined_co['co_text'])
            
            print(f"   ✅ Score: {refined_co['reward_score']:.2f} | "
                  f"Approved: {'Yes' if refined_co['approved'] else 'No'}")
        
        total_time = (time.perf_counter() - total_start) * 1000
        
        # Prepare CO data for metrics evaluation
        cos_for_eval = [
            {
                'co_text': co['co_text'],
                'bloom_level': co['bloom_level'],
                'po_mappings': co['po_mappings']
            }
            for co in cos
        ]
        
        # Compute metrics
        pipeline_metrics = self.metrics_evaluator.evaluate_all_cos(cos_for_eval, subject)
        
        # Generate output
        co_output = "\n".join([co['co_text'] for co in cos])
        
        result = {
            'cos': cos,
            'co_output': co_output,
            'metrics': pipeline_metrics.to_dict(),
            'latency': {
                'total_ms': round(total_time, 2),
                'avg_per_co_ms': round(total_time / 6, 2)
            },
            'profiler_stats': PROFILER.get_stats(),
            'cache_stats': self.embedding_cache.stats()
        }
        
        self._print_summary(result)
        
        return result
    
    def _print_summary(self, result: Dict):
        """Print pipeline execution summary"""
        print("\n" + "=" * 70)
        print("📊 PIPELINE EXECUTION SUMMARY")
        print("=" * 70)
        
        metrics = result['metrics']
        
        print(f"\n🎯 ACCURACY METRICS:")
        print(f"   Bloom Classification: {metrics.get('bloom_classification_accuracy', 0):.1%}")
        print(f"   Average Quality Score: {metrics.get('average_quality_score', 0):.1%}")
        print(f"   VTU Compliance: {metrics.get('average_vtu_compliance', 0):.1%}")
        print(f"   OBE Alignment: {metrics.get('average_obe_alignment', 0):.1%}")
        
        print(f"\n⏱️ LATENCY METRICS:")
        print(f"   Total Pipeline: {result['latency']['total_ms']:.2f} ms")
        print(f"   Avg per CO: {result['latency']['avg_per_co_ms']:.2f} ms")
        
        # Print profiler breakdown
        for stage, stats in result.get('profiler_stats', {}).items():
            if stats.get('total_ms', 0) > 0:
                print(f"   {stage}: {stats['total_ms']:.2f} ms ({stats['count']} calls)")
        
        print(f"\n💾 CACHE STATS:")
        cache_stats = result.get('cache_stats', {})
        print(f"   Hit Rate: {cache_stats.get('hit_rate', '0%')}")
        print(f"   Cache Size: {cache_stats.get('size', 0)}")
        
        print(f"\n📋 GENERATED COs:")
        print("-" * 50)
        print(result['co_output'])
        print("-" * 50)
        
        approved = sum(1 for co in result['cos'] if co.get('approved', False))
        print(f"\n✅ Approved: {approved}/6 COs")
        print("=" * 70)
    
    def export_report(self, result: Dict, filepath: str = "data/pipeline_report.json"):
        """Export comprehensive pipeline report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'architecture': 'Enhanced Multi-Stage AI Pipeline',
            'components': {
                'document_intelligence': 'Semantic chunking + embedding',
                'knowledge_graph': 'Neo4j-ready with in-memory fallback',
                'retrieval': 'Graph-RAG hybrid (vector + graph)',
                'generation': 'Fine-tuned Qwen with LoRA',
                'refinement': 'RLHF-style reward scoring'
            },
            'results': result,
            'explainability': {
                'graph_based': True,
                'source_tracking': True,
                'score_breakdown': True
            }
        }
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Report exported to: {filepath}")
    
    def cleanup(self):
        """Cleanup resources"""
        self.embedding_cache.save()
        self.knowledge_graph.close()
        PROFILER.reset()


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    # Determine paths
    workspace_root = Path(__file__).parent.parent
    lora_path = workspace_root / "qwen_co_lora"
    
    if not lora_path.exists():
        lora_path = workspace_root / "gptneo_co_lora"
    
    # Initialize pipeline
    pipeline = EnhancedCOPipeline(
        base_model="Qwen/Qwen2.5-0.5B-Instruct",
        lora_path=str(lora_path) if lora_path.exists() else None,
        chroma_path=str(workspace_root / "data" / "chroma_db")
    )
    
    # Generate COs
    result = pipeline.generate_all_cos(num_apply=2, num_analyze=2)
    
    # Export report
    pipeline.export_report(result, str(workspace_root / "data" / "pipeline_report.json"))
    
    # Print profiler report
    print(PROFILER.report())
    
    # Cleanup
    pipeline.cleanup()

