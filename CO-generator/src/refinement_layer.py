from typing import Dict, List
import re

class RefinementLayer:
    """
    Post-processing refinement using reward model:
    - VTU-style phrasing validation
    - Conciseness scoring
    - OBE alignment check
    - Faculty preference simulation
    """
    
    def __init__(self):
        """Initialize refinement layer"""
        self.vtu_keywords = [
            'understand', 'apply', 'analyze', 'evaluate', 'create',
            'demonstrate', 'design', 'develop', 'implement', 'ability'
        ]
        print("✅ Refinement Layer initialized (RLHF-ready)")
    
    def score_conciseness(self, co_text: str) -> float:
        """Score conciseness (15-20 words ideal)"""
        word_count = len(co_text.split())
        
        if 15 <= word_count <= 20:
            return 1.0
        elif 12 <= word_count <= 25:
            return 0.8
        elif 10 <= word_count <= 30:
            return 0.6
        else:
            return 0.4
    
    def check_vtu_style(self, co_text: str) -> Dict:
        """Check VTU-style compliance"""
        checks = {
            'starts_with_verb': False,
            'has_action_verb': False,
            'appropriate_length': False,
            'no_colon_after_co': False,
            'proper_capitalization': False
        }
        
        # Check format: CO1 Text (no colon)
        if re.match(r'CO[1-6]\s+[A-Z]', co_text):
            checks['no_colon_after_co'] = True
            checks['proper_capitalization'] = True
        
        # Check for action verbs
        text_lower = co_text.lower()
        action_verbs = ['understand', 'apply', 'analyze', 'evaluate', 'create', 
                       'demonstrate', 'design', 'develop', 'implement', 'ability']
        
        for verb in action_verbs:
            if verb in text_lower:
                checks['has_action_verb'] = True
                if text_lower.startswith(f'co{co_text[2]} {verb}'):
                    checks['starts_with_verb'] = True
                break
        
        # Check length
        word_count = len(co_text.split())
        checks['appropriate_length'] = 15 <= word_count <= 20
        
        score = sum(checks.values()) / len(checks)
        
        return {
            'checks': checks,
            'score': score,
            'compliance': score >= 0.8
        }
    
    def check_obe_alignment(self, co_text: str, bloom_level: str, po_mappings: str) -> Dict:
        """Check OBE (Outcome-Based Education) alignment"""
        alignment = {
            'bloom_alignment': False,
            'po_mapping_present': False,
            'measurable': False,
            'action_oriented': False
        }
        
        # Check Bloom alignment
        text_lower = co_text.lower()
        bloom_verbs = {
            'Apply': ['apply', 'use', 'implement', 'demonstrate', 'execute'],
            'Analyze': ['analyze', 'examine', 'compare', 'differentiate', 'investigate'],
            'Evaluate': ['evaluate', 'assess', 'justify', 'critique', 'validate'],
            'Create': ['create', 'design', 'construct', 'develop', 'formulate', 'write']
        }
        
        level_verbs = bloom_verbs.get(bloom_level, [])
        for verb in level_verbs:
            if verb in text_lower:
                alignment['bloom_alignment'] = True
                break
        
        # Check PO mapping
        if po_mappings and 'PO' in po_mappings:
            alignment['po_mapping_present'] = True
        
        # Check if measurable (has specific outcomes)
        measurable_indicators = ['ability', 'demonstrate', 'apply', 'analyze', 'evaluate', 'create']
        alignment['measurable'] = any(indicator in text_lower for indicator in measurable_indicators)
        
        # Check action-oriented
        alignment['action_oriented'] = not co_text.lower().startswith(('understanding', 'knowledge of'))
        
        score = sum(alignment.values()) / len(alignment)
        
        return {
            'alignment': alignment,
            'score': score,
            'obe_compliant': score >= 0.75
        }
    
    def generate_justification(self, co_text: str, retrieval_results: Dict, graph_paths: List) -> Dict:
        """Generate explainable justification with source nodes and relation chains"""
        justification = {
            'co_text': co_text,
            'source_nodes': [],
            'relation_chains': [],
            'retrieval_sources': []
        }
        
        # Extract source nodes from graph
        if graph_paths:
            for path in graph_paths[:2]:
                justification['relation_chains'].append({
                    'path': path,
                    'type': 'conceptual_relationship'
                })
        
        # Extract retrieval sources
        if retrieval_results:
            for result in retrieval_results.get('retrieval_results', [])[:3]:
                source = result.get('metadata', {}).get('source_file', 'unknown')
                justification['retrieval_sources'].append({
                    'file': source,
                    'type': result.get('source', 'vector_search')
                })
        
        return justification
    
    def refine_co(self, co_result: Dict, retrieval_results: Dict, graph_paths: List) -> Dict:
        """
        Complete refinement pipeline:
        1. Conciseness scoring
        2. VTU-style validation
        3. OBE alignment check
        4. Generate justification
        5. Final score
        """
        co_text = co_result.get('co_text', '')
        bloom_level = co_result.get('bloom_level', '')
        po_mappings = co_result.get('po_mappings', '')
        
        print(f"🔧 Refining CO: {co_text[:50]}...")
        
        # Score components
        conciseness_score = self.score_conciseness(co_text)
        vtu_check = self.check_vtu_style(co_text)
        obe_check = self.check_obe_alignment(co_text, bloom_level, po_mappings)
        
        # Generate justification
        justification = self.generate_justification(co_text, retrieval_results, graph_paths)
        
        # Calculate final score (reward model output)
        final_score = (
            conciseness_score * 0.3 +
            vtu_check['score'] * 0.3 +
            obe_check['score'] * 0.4
        )
        
        refinement_result = {
            'co_text': co_text,
            'bloom_level': bloom_level,
            'po_mappings': po_mappings,
            'scores': {
                'conciseness': conciseness_score,
                'vtu_compliance': vtu_check['score'],
                'obe_alignment': obe_check['score'],
                'final_score': final_score
            },
            'checks': {
                'vtu': vtu_check,
                'obe': obe_check
            },
            'justification': justification,
            'approved': final_score >= 0.75
        }
        
        print(f"   Refinement complete: Score {final_score:.2f}, Approved: {refinement_result['approved']}")
        
        return refinement_result

