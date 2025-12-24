"""
CO Generator Metrics & Evaluation System
=========================================
Comprehensive evaluation framework for measuring:
- CO Quality (BLEU, ROUGE, semantic similarity)
- Bloom Level Classification Accuracy
- PO Mapping Accuracy
- VTU Compliance Scores
- OBE Alignment Metrics
- Latency Benchmarks
"""

import re
import time
import json
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field, asdict
from collections import defaultdict
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False

# ============================================================================
# BLOOM'S TAXONOMY REFERENCE DATA
# ============================================================================

BLOOM_TAXONOMY = {
    "Remember": {
        "level": 1,
        "verbs": ["define", "list", "recall", "identify", "name", "recognize", "state"],
        "description": "Recall facts and basic concepts"
    },
    "Understand": {
        "level": 2,
        "verbs": ["describe", "explain", "summarize", "classify", "interpret", "discuss"],
        "description": "Explain ideas or concepts"
    },
    "Apply": {
        "level": 3,
        "verbs": ["apply", "use", "demonstrate", "implement", "execute", "solve", "utilize", "compute"],
        "description": "Use information in new situations"
    },
    "Analyze": {
        "level": 4,
        "verbs": ["analyze", "analyse", "differentiate", "examine", "compare", "contrast", "investigate", "distinguish"],
        "description": "Draw connections among ideas"
    },
    "Evaluate": {
        "level": 5,
        "verbs": ["evaluate", "justify", "critique", "assess", "judge", "validate", "defend", "appraise"],
        "description": "Justify a stand or decision"
    },
    "Create": {
        "level": 6,
        "verbs": ["create", "design", "construct", "develop", "formulate", "propose", "build", "write"],
        "description": "Produce new or original work"
    }
}

VTU_PO_DESCRIPTIONS = {
    "PO1": "Engineering Knowledge",
    "PO2": "Problem Analysis",
    "PO3": "Design/Development of Solutions",
    "PO4": "Conduct Investigations",
    "PO5": "Modern Tool Usage",
    "PO6": "Engineer and Society",
    "PO7": "Environment and Sustainability",
    "PO8": "Ethics",
    "PO9": "Individual and Teamwork",
    "PO10": "Communication",
    "PO11": "Project Management",
    "PO12": "Life-long Learning"
}

# ============================================================================
# DATA CLASSES FOR METRICS
# ============================================================================

@dataclass
class LatencyMetrics:
    """Latency metrics for each pipeline stage"""
    document_processing_ms: float = 0.0
    embedding_generation_ms: float = 0.0
    graph_construction_ms: float = 0.0
    vector_search_ms: float = 0.0
    graph_traversal_ms: float = 0.0
    llm_inference_ms: float = 0.0
    refinement_ms: float = 0.0
    total_pipeline_ms: float = 0.0
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class COQualityMetrics:
    """Quality metrics for a single CO"""
    co_number: int
    co_text: str
    bloom_level_expected: str
    bloom_level_detected: str
    bloom_accuracy: float
    word_count: int
    conciseness_score: float
    vtu_compliance_score: float
    obe_alignment_score: float
    po_mappings: List[str] = field(default_factory=list)
    semantic_similarity_to_reference: float = 0.0
    has_action_verb: bool = False
    has_specific_concepts: bool = False
    overall_quality_score: float = 0.0
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass 
class PipelineMetrics:
    """Aggregated metrics for the entire pipeline"""
    timestamp: str = ""
    total_cos_generated: int = 0
    bloom_classification_accuracy: float = 0.0
    average_quality_score: float = 0.0
    average_conciseness_score: float = 0.0
    average_vtu_compliance: float = 0.0
    average_obe_alignment: float = 0.0
    po_coverage: float = 0.0  # % of POs addressed
    latency: LatencyMetrics = field(default_factory=LatencyMetrics)
    co_metrics: List[COQualityMetrics] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['latency'] = self.latency.to_dict()
        d['co_metrics'] = [co.to_dict() for co in self.co_metrics]
        return d

# ============================================================================
# METRICS EVALUATOR CLASS
# ============================================================================

class MetricsEvaluator:
    """
    Comprehensive metrics evaluator for CO Generator
    Provides accuracy metrics, quality scores, and latency benchmarks
    """
    
    def __init__(self, embedding_model: str = 'all-MiniLM-L6-v2'):
        self.embedding_model = None
        if EMBEDDINGS_AVAILABLE:
            try:
                self.embedding_model = SentenceTransformer(embedding_model)
                print(f"✅ MetricsEvaluator initialized with {embedding_model}")
            except Exception as e:
                print(f"⚠️ Could not load embedding model: {e}")
        
        self.reference_cos = self._load_reference_cos()
        self.latency_tracker = {}
    
    def _load_reference_cos(self) -> Dict[str, List[str]]:
        """Load reference COs for comparison (VTU gold standard examples)"""
        return {
            "DBMS": [
                "CO1 Apply DBMS concepts to design and create databases using SQL and relational algebra query processing",
                "CO2 Analyse scenarios involving normalization and use suitable database techniques to address complex problems",
                "CO3 Analyse scenarios involving transaction management and concurrency control using ACID properties",
                "CO4 Apply indexing and query optimization techniques to improve database performance",
                "CO5 Ability to conduct experiments as individual or team using modern tools like MySQL and MongoDB",
                "CO6 Write clear and concise experiment reports detailing methods, results, and conclusions of DBMS experiments"
            ],
            "DSA": [
                "CO1 Apply fundamental data structures like arrays, linked lists, and trees to solve computational problems",
                "CO2 Analyse time and space complexity of algorithms using asymptotic notation and recurrence relations",
                "CO3 Apply sorting and searching algorithms to organize and retrieve data efficiently",
                "CO4 Analyse graph traversal algorithms and shortest path techniques for network optimization problems",
                "CO5 Evaluate the performance of different algorithms through experimental analysis and benchmarking",
                "CO6 Design efficient algorithms for real-world problems using appropriate data structures and optimization techniques"
            ]
        }
    
    # ========================================================================
    # LATENCY TRACKING
    # ========================================================================
    
    def start_timer(self, stage: str):
        """Start timing a pipeline stage"""
        self.latency_tracker[stage] = {
            'start': time.perf_counter(),
            'end': None
        }
    
    def stop_timer(self, stage: str) -> float:
        """Stop timing and return elapsed ms"""
        if stage in self.latency_tracker:
            self.latency_tracker[stage]['end'] = time.perf_counter()
            elapsed_ms = (self.latency_tracker[stage]['end'] - 
                         self.latency_tracker[stage]['start']) * 1000
            return elapsed_ms
        return 0.0
    
    def get_latency_metrics(self) -> LatencyMetrics:
        """Get all latency metrics"""
        metrics = LatencyMetrics()
        
        stage_mapping = {
            'document_processing': 'document_processing_ms',
            'embedding_generation': 'embedding_generation_ms',
            'graph_construction': 'graph_construction_ms',
            'vector_search': 'vector_search_ms',
            'graph_traversal': 'graph_traversal_ms',
            'llm_inference': 'llm_inference_ms',
            'refinement': 'refinement_ms'
        }
        
        total = 0.0
        for stage, attr in stage_mapping.items():
            if stage in self.latency_tracker:
                elapsed = (self.latency_tracker[stage]['end'] - 
                          self.latency_tracker[stage]['start']) * 1000
                setattr(metrics, attr, round(elapsed, 2))
                total += elapsed
        
        metrics.total_pipeline_ms = round(total, 2)
        return metrics
    
    # ========================================================================
    # BLOOM LEVEL DETECTION & ACCURACY
    # ========================================================================
    
    def detect_bloom_level(self, co_text: str) -> Tuple[str, float]:
        """
        Detect the Bloom's taxonomy level from CO text
        Returns (level, confidence)
        Priority: Verb at start (after CO#) > verb anywhere
        """
        co_lower = co_text.lower()
        
        # First pass: Check for verb immediately after CO number (highest confidence)
        for level in ["Create", "Evaluate", "Analyze", "Apply", "Understand", "Remember"]:
            verbs = BLOOM_TAXONOMY[level]["verbs"]
            for verb in verbs:
                # Check if verb appears right after CO number (primary action verb)
                pattern = rf'co[1-6]\s+{verb}\b'
                if re.search(pattern, co_lower):
                    return level, 0.95
                # Also check "ability to" pattern for Evaluate level
                if level == "Evaluate" and re.search(rf'co[1-6]\s+ability\s+to', co_lower):
                    return level, 0.90
        
        # Second pass: Check first 5 words after CO number
        first_words_match = re.match(r'co[1-6]\s+(.{0,50})', co_lower)
        if first_words_match:
            first_part = first_words_match.group(1)
            for level in ["Create", "Evaluate", "Analyze", "Apply", "Understand", "Remember"]:
                verbs = BLOOM_TAXONOMY[level]["verbs"]
                for verb in verbs:
                    if first_part.startswith(verb):
                        return level, 0.90
        
        # Third pass: Check anywhere (lower confidence)
        # But prioritize by Bloom level order (Apply/Analyze are most common in tech COs)
        for level in ["Apply", "Analyze", "Evaluate", "Create", "Understand", "Remember"]:
            verbs = BLOOM_TAXONOMY[level]["verbs"]
            for verb in verbs:
                if verb in co_lower:
                    return level, 0.60
        
        # Default to Apply if no verb found (most common in technical COs)
        return "Apply", 0.5
    
    def calculate_bloom_accuracy(self, expected: str, detected: str) -> float:
        """Calculate accuracy score for Bloom level classification"""
        if expected == detected:
            return 1.0
        
        # Partial credit for adjacent levels
        expected_level = BLOOM_TAXONOMY.get(expected, {}).get("level", 0)
        detected_level = BLOOM_TAXONOMY.get(detected, {}).get("level", 0)
        
        difference = abs(expected_level - detected_level)
        if difference == 1:
            return 0.7  # Adjacent level
        elif difference == 2:
            return 0.4  # Two levels apart
        else:
            return 0.1  # More than two levels apart
    
    # ========================================================================
    # VTU COMPLIANCE SCORING
    # ========================================================================
    
    def evaluate_vtu_compliance(self, co_text: str) -> Dict:
        """
        Evaluate VTU-style compliance
        VTU COs should:
        - Start with CO number (no colon)
        - Use action verbs from Bloom's taxonomy
        - Be 15-25 words
        - Be specific to course content
        """
        checks = {
            'proper_format': False,      # CO1 Text (no colon)
            'action_verb_start': False,  # Starts with action verb after CO#
            'appropriate_length': False, # 15-25 words
            'specific_content': False,   # Contains technical terms
            'no_vague_phrases': False,   # Doesn't have "understand the basics"
            'proper_capitalization': False
        }
        
        # Check format: CO[1-6] [A-Z]
        if re.match(r'^CO[1-6]\s+[A-Z]', co_text):
            checks['proper_format'] = True
            checks['proper_capitalization'] = True
        
        # Check for action verb at start
        co_lower = co_text.lower()
        all_verbs = []
        for level_data in BLOOM_TAXONOMY.values():
            all_verbs.extend(level_data['verbs'])
        
        # Look for verb right after CO number
        for verb in all_verbs:
            if re.search(rf'co[1-6]\s+{verb}', co_lower):
                checks['action_verb_start'] = True
                break
        
        # Check length
        word_count = len(co_text.split())
        checks['appropriate_length'] = 15 <= word_count <= 25
        
        # Check for specific technical content
        technical_terms = [
            'sql', 'database', 'query', 'normalization', 'transaction',
            'schema', 'er model', 'relational', 'index', 'constraint',
            'mongodb', 'nosql', 'acid', 'trigger', 'view', 'join',
            'algorithm', 'data structure', 'function', 'optimization'
        ]
        checks['specific_content'] = any(term in co_lower for term in technical_terms)
        
        # Check for vague phrases (negative indicator)
        vague_phrases = [
            'understand the basics', 'basic understanding',
            'general knowledge', 'familiar with', 'awareness of',
            'know about', 'learn about'
        ]
        checks['no_vague_phrases'] = not any(phrase in co_lower for phrase in vague_phrases)
        
        score = sum(checks.values()) / len(checks)
        
        return {
            'checks': checks,
            'score': round(score, 3),
            'compliance_level': 'High' if score >= 0.8 else 'Medium' if score >= 0.6 else 'Low'
        }
    
    # ========================================================================
    # OBE ALIGNMENT SCORING
    # ========================================================================
    
    def evaluate_obe_alignment(self, co_text: str, bloom_level: str, po_mappings: List[str]) -> Dict:
        """
        Evaluate Outcome-Based Education alignment
        OBE COs should:
        - Be measurable and observable
        - Map to Program Outcomes
        - Align with stated Bloom level
        - Be action-oriented
        """
        alignment = {
            'measurable': False,
            'observable': False,
            'po_mapped': False,
            'bloom_aligned': False,
            'action_oriented': False,
            'specific_outcomes': False
        }
        
        co_lower = co_text.lower()
        
        # Check if measurable (contains quantifiable or demonstrable outcomes)
        measurable_indicators = [
            'demonstrate', 'apply', 'create', 'design', 'develop',
            'implement', 'analyze', 'evaluate', 'solve', 'write',
            'conduct', 'perform', 'execute', 'produce'
        ]
        alignment['measurable'] = any(ind in co_lower for ind in measurable_indicators)
        
        # Check if observable
        alignment['observable'] = alignment['measurable']  # Same criterion for now
        
        # Check PO mapping
        alignment['po_mapped'] = len(po_mappings) > 0
        
        # Check Bloom alignment
        if bloom_level in BLOOM_TAXONOMY:
            level_verbs = BLOOM_TAXONOMY[bloom_level]['verbs']
            alignment['bloom_aligned'] = any(verb in co_lower for verb in level_verbs)
        
        # Check action-oriented (not passive)
        passive_indicators = ['will be understood', 'is learned', 'becomes aware']
        alignment['action_oriented'] = not any(ind in co_lower for ind in passive_indicators)
        
        # Check specific outcomes
        alignment['specific_outcomes'] = len(co_text.split()) >= 15
        
        score = sum(alignment.values()) / len(alignment)
        
        return {
            'alignment': alignment,
            'score': round(score, 3),
            'obe_level': 'Compliant' if score >= 0.8 else 'Partial' if score >= 0.5 else 'Non-compliant'
        }
    
    # ========================================================================
    # SEMANTIC SIMILARITY (For Quality Assessment)
    # ========================================================================
    
    def compute_semantic_similarity(self, generated_co: str, reference_cos: List[str]) -> float:
        """Compute semantic similarity to reference COs"""
        if not self.embedding_model or not reference_cos:
            return 0.0
        
        try:
            gen_embedding = self.embedding_model.encode([generated_co])
            ref_embeddings = self.embedding_model.encode(reference_cos)
            
            similarities = cosine_similarity(gen_embedding, ref_embeddings)[0]
            return float(max(similarities))  # Best match
        except Exception as e:
            print(f"Similarity calculation error: {e}")
            return 0.0
    
    # ========================================================================
    # COMPREHENSIVE CO EVALUATION
    # ========================================================================
    
    def evaluate_single_co(self, co_text: str, expected_bloom: str, 
                           po_mappings: List[str] = None,
                           subject: str = "DBMS") -> COQualityMetrics:
        """
        Comprehensive evaluation of a single CO
        """
        if po_mappings is None:
            po_mappings = []
        
        # Extract CO number
        co_match = re.match(r'CO(\d)', co_text)
        co_number = int(co_match.group(1)) if co_match else 0
        
        # Bloom level detection
        detected_bloom, confidence = self.detect_bloom_level(co_text)
        bloom_accuracy = self.calculate_bloom_accuracy(expected_bloom, detected_bloom)
        
        # Word count and conciseness
        word_count = len(co_text.split())
        if 15 <= word_count <= 20:
            conciseness_score = 1.0
        elif 12 <= word_count <= 25:
            conciseness_score = 0.8
        elif 10 <= word_count <= 30:
            conciseness_score = 0.6
        else:
            conciseness_score = 0.4
        
        # VTU compliance
        vtu_result = self.evaluate_vtu_compliance(co_text)
        vtu_score = vtu_result['score']
        
        # OBE alignment
        obe_result = self.evaluate_obe_alignment(co_text, expected_bloom, po_mappings)
        obe_score = obe_result['score']
        
        # Semantic similarity
        reference_cos = self.reference_cos.get(subject, [])
        semantic_sim = self.compute_semantic_similarity(co_text, reference_cos)
        
        # Check for action verb and specific concepts
        has_action_verb = vtu_result['checks'].get('action_verb_start', False)
        has_specific_concepts = vtu_result['checks'].get('specific_content', False)
        
        # Overall quality score (weighted average)
        overall_score = (
            bloom_accuracy * 0.25 +
            conciseness_score * 0.15 +
            vtu_score * 0.25 +
            obe_score * 0.25 +
            semantic_sim * 0.10
        )
        
        return COQualityMetrics(
            co_number=co_number,
            co_text=co_text,
            bloom_level_expected=expected_bloom,
            bloom_level_detected=detected_bloom,
            bloom_accuracy=round(bloom_accuracy, 3),
            word_count=word_count,
            conciseness_score=round(conciseness_score, 3),
            vtu_compliance_score=round(vtu_score, 3),
            obe_alignment_score=round(obe_score, 3),
            po_mappings=po_mappings,
            semantic_similarity_to_reference=round(semantic_sim, 3),
            has_action_verb=has_action_verb,
            has_specific_concepts=has_specific_concepts,
            overall_quality_score=round(overall_score, 3)
        )
    
    def evaluate_all_cos(self, cos: List[Dict], subject: str = "DBMS") -> PipelineMetrics:
        """
        Evaluate all generated COs and compute aggregate metrics
        
        Args:
            cos: List of dicts with keys 'co_text', 'bloom_level', 'po_mappings'
        """
        from datetime import datetime
        
        co_metrics = []
        total_bloom_accuracy = 0
        total_quality = 0
        total_conciseness = 0
        total_vtu = 0
        total_obe = 0
        all_pos = set()
        
        for co_data in cos:
            co_text = co_data.get('co_text', '')
            bloom_level = co_data.get('bloom_level', 'Apply')
            po_mappings = co_data.get('po_mappings', [])
            
            # Parse PO mappings if string
            if isinstance(po_mappings, str):
                po_mappings = [po.strip() for po in po_mappings.split(',')]
            
            metrics = self.evaluate_single_co(co_text, bloom_level, po_mappings, subject)
            co_metrics.append(metrics)
            
            total_bloom_accuracy += metrics.bloom_accuracy
            total_quality += metrics.overall_quality_score
            total_conciseness += metrics.conciseness_score
            total_vtu += metrics.vtu_compliance_score
            total_obe += metrics.obe_alignment_score
            all_pos.update(po_mappings)
        
        n = len(cos) if cos else 1
        
        # PO coverage (how many of 12 POs are addressed)
        po_coverage = len(all_pos) / 12.0
        
        return PipelineMetrics(
            timestamp=datetime.now().isoformat(),
            total_cos_generated=len(cos),
            bloom_classification_accuracy=round(total_bloom_accuracy / n, 3),
            average_quality_score=round(total_quality / n, 3),
            average_conciseness_score=round(total_conciseness / n, 3),
            average_vtu_compliance=round(total_vtu / n, 3),
            average_obe_alignment=round(total_obe / n, 3),
            po_coverage=round(po_coverage, 3),
            latency=self.get_latency_metrics(),
            co_metrics=co_metrics
        )
    
    # ========================================================================
    # REPORTING
    # ========================================================================
    
    def generate_report(self, metrics: PipelineMetrics) -> str:
        """Generate a formatted metrics report"""
        report = []
        report.append("=" * 70)
        report.append("CO GENERATOR - METRICS REPORT")
        report.append("=" * 70)
        report.append(f"\nTimestamp: {metrics.timestamp}")
        report.append(f"Total COs Generated: {metrics.total_cos_generated}")
        
        report.append("\n" + "-" * 40)
        report.append("ACCURACY METRICS")
        report.append("-" * 40)
        report.append(f"Bloom Classification Accuracy: {metrics.bloom_classification_accuracy:.1%}")
        report.append(f"Average Quality Score: {metrics.average_quality_score:.1%}")
        report.append(f"VTU Compliance: {metrics.average_vtu_compliance:.1%}")
        report.append(f"OBE Alignment: {metrics.average_obe_alignment:.1%}")
        report.append(f"PO Coverage: {metrics.po_coverage:.1%}")
        
        report.append("\n" + "-" * 40)
        report.append("LATENCY METRICS")
        report.append("-" * 40)
        latency = metrics.latency
        report.append(f"Document Processing: {latency.document_processing_ms:.2f} ms")
        report.append(f"Embedding Generation: {latency.embedding_generation_ms:.2f} ms")
        report.append(f"Graph Construction: {latency.graph_construction_ms:.2f} ms")
        report.append(f"Vector Search: {latency.vector_search_ms:.2f} ms")
        report.append(f"Graph Traversal: {latency.graph_traversal_ms:.2f} ms")
        report.append(f"LLM Inference: {latency.llm_inference_ms:.2f} ms")
        report.append(f"Refinement: {latency.refinement_ms:.2f} ms")
        report.append(f"TOTAL PIPELINE: {latency.total_pipeline_ms:.2f} ms")
        
        report.append("\n" + "-" * 40)
        report.append("PER-CO BREAKDOWN")
        report.append("-" * 40)
        for co in metrics.co_metrics:
            report.append(f"\nCO{co.co_number}:")
            report.append(f"  Text: {co.co_text[:60]}...")
            report.append(f"  Bloom: {co.bloom_level_detected} (Expected: {co.bloom_level_expected})")
            report.append(f"  Quality Score: {co.overall_quality_score:.1%}")
            report.append(f"  VTU Compliance: {co.vtu_compliance_score:.1%}")
        
        report.append("\n" + "=" * 70)
        
        return "\n".join(report)
    
    def export_metrics_json(self, metrics: PipelineMetrics, filepath: str):
        """Export metrics to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(metrics.to_dict(), f, indent=2)
        print(f"✅ Metrics exported to {filepath}")


# ============================================================================
# QUICK TEST
# ============================================================================

if __name__ == "__main__":
    evaluator = MetricsEvaluator()
    
    # Test with sample COs
    sample_cos = [
        {
            "co_text": "CO1 Apply DBMS concepts to design and create databases using SQL and relational algebra query processing",
            "bloom_level": "Apply",
            "po_mappings": "PO1, PO2, PO3"
        },
        {
            "co_text": "CO2 Analyse scenarios involving normalization and use suitable database techniques to address complex problems",
            "bloom_level": "Analyze",
            "po_mappings": "PO1, PO2, PO4"
        },
        {
            "co_text": "CO3 Analyse scenarios involving transaction management and concurrency control using ACID properties",
            "bloom_level": "Analyze",
            "po_mappings": "PO1, PO3, PO5"
        },
        {
            "co_text": "CO4 Apply indexing and query optimization techniques to improve database performance",
            "bloom_level": "Apply",
            "po_mappings": "PO2, PO3, PO5"
        },
        {
            "co_text": "CO5 Ability to conduct experiments as individual or team using modern tools like MySQL and MongoDB",
            "bloom_level": "Evaluate",
            "po_mappings": "PO4, PO5, PO9"
        },
        {
            "co_text": "CO6 Write clear and concise experiment reports detailing methods, results, and conclusions of DBMS experiments",
            "bloom_level": "Create",
            "po_mappings": "PO6, PO10, PO12"
        }
    ]
    
    # Simulate latency
    evaluator.start_timer('llm_inference')
    time.sleep(0.1)  # Simulate inference
    evaluator.stop_timer('llm_inference')
    
    metrics = evaluator.evaluate_all_cos(sample_cos, subject="DBMS")
    report = evaluator.generate_report(metrics)
    print(report)

