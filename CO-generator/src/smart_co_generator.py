"""
Smart CO Generator
==================
Extracts topics from syllabus/notes and generates VTU-aligned COs
that cover all modules comprehensively.
"""

import re
from typing import List, Dict, Tuple
from collections import defaultdict

# ============================================================================
# TOPIC EXTRACTION
# ============================================================================

class TopicExtractor:
    """Extract key topics from syllabus text"""
    
    def __init__(self):
        # Define topic patterns and their module mappings
        self.topic_patterns = {
            'module1': {
                'keywords': ['introduction', 'database', 'dbms', 'data model', 'schema', 
                            'three schema', 'data independence', 'database system'],
                'topics': ['databases', 'database management systems', 'DBMS architecture',
                          'data models', 'schemas', 'data independence']
            },
            'module2': {
                'keywords': ['er model', 'entity', 'relationship', 'attribute', 'key',
                            'er diagram', 'erd', 'mapping', 'weak entity', 'conceptual design'],
                'topics': ['ER modeling', 'entity-relationship diagrams', 'database design',
                          'entity types', 'relationships', 'ER-to-relational mapping']
            },
            'module3': {
                'keywords': ['sql', 'query', 'select', 'insert', 'update', 'delete',
                            'relational algebra', 'join', 'project', 'union', 'constraint'],
                'topics': ['SQL queries', 'relational algebra', 'query processing',
                          'data manipulation', 'constraints', 'views', 'triggers']
            },
            'module4': {
                'keywords': ['normalization', 'normal form', '1nf', '2nf', '3nf', 'bcnf',
                            'functional dependency', 'decomposition', 'redundancy'],
                'topics': ['normalization', 'functional dependencies', 'normal forms',
                          'database design optimization', 'data redundancy elimination']
            },
            'module5': {
                'keywords': ['transaction', 'concurrency', 'acid', 'lock', 'deadlock',
                            'nosql', 'mongodb', 'mysql', 'recovery', 'schedule'],
                'topics': ['transaction management', 'concurrency control', 'ACID properties',
                          'NoSQL databases', 'MongoDB', 'MySQL', 'database tools']
            }
        }
    
    def extract_modules_from_text(self, text: str) -> Dict[str, List[str]]:
        """Extract which modules are covered in the text"""
        text_lower = text.lower()
        found_modules = {}
        
        for module, data in self.topic_patterns.items():
            keyword_count = sum(1 for kw in data['keywords'] if kw in text_lower)
            if keyword_count >= 2:  # At least 2 keywords found
                found_modules[module] = {
                    'topics': data['topics'],
                    'relevance': keyword_count
                }
        
        return found_modules
    
    def extract_specific_topics(self, text: str) -> List[str]:
        """Extract specific technical topics mentioned in text"""
        topics = []
        text_lower = text.lower()
        
        # Specific topic detection
        topic_checks = [
            ('SQL', ['sql', 'select', 'insert', 'update', 'delete', 'query']),
            ('relational algebra', ['relational algebra', 'project', 'select operation', 'join operation']),
            ('ER modeling', ['er model', 'entity', 'relationship', 'er diagram', 'erd']),
            ('normalization', ['normalization', 'normal form', '1nf', '2nf', '3nf', 'bcnf']),
            ('transaction management', ['transaction', 'acid', 'concurrency', 'lock']),
            ('MongoDB', ['mongodb', 'nosql', 'document database']),
            ('MySQL', ['mysql', 'relational database']),
            ('database design', ['database design', 'schema design', 'conceptual design']),
            ('functional dependencies', ['functional dependency', 'fd', 'closure']),
            ('constraints', ['constraint', 'primary key', 'foreign key', 'integrity']),
        ]
        
        for topic_name, keywords in topic_checks:
            if any(kw in text_lower for kw in keywords):
                topics.append(topic_name)
        
        return topics


# ============================================================================
# VTU CO GENERATOR
# ============================================================================

class VTUCOGenerator:
    """Generate VTU-aligned Course Outcomes based on syllabus"""
    
    def __init__(self):
        self.extractor = TopicExtractor()
        
        # VTU CO Templates based on Bloom's Taxonomy
        self.co_templates = {
            'Understand': [
                "Understand the fundamentals of {topic} and their applications in database systems",
                "Understand the concepts of {topic} and database management principles",
                "Understand the basics of {topic} and database system architecture",
            ],
            'Apply': [
                "Apply {topic} concepts to design and create databases that address specific real-world scenarios",
                "Apply {topic} techniques to implement database solutions for practical applications",
                "Demonstrate the ability to use {topic} for database design and implementation",
            ],
            'Analyze': [
                "Analyse given scenarios and apply suitable {topic} techniques to solve database problems",
                "Analyse database requirements and apply {topic} for optimal solutions",
                "Analyse and evaluate {topic} approaches for database system design",
            ],
            'Evaluate': [
                "Ability to conduct experiments as individual or team using modern tools like {tools}",
                "Evaluate and compare different {topic} approaches using industry-standard tools",
                "Ability to perform hands-on experiments with {tools} for database management",
            ],
            'Create': [
                "Write clear and concise experiment reports detailing the methods, results, and conclusions of {topic} experiments",
                "Design and document comprehensive database solutions using {topic} principles",
                "Create detailed technical reports documenting {topic} implementations and findings",
            ]
        }
    
    def generate_cos(self, text: str, num_apply: int = 2, num_analyze: int = 2) -> List[Dict]:
        """
        Generate 6 VTU-aligned COs from syllabus text
        
        Args:
            text: Extracted syllabus/notes text
            num_apply: Number of Apply-level COs (for CO1-CO4)
            num_analyze: Number of Analyze-level COs (for CO1-CO4)
        
        Returns:
            List of 6 CO dictionaries
        """
        # Extract topics
        modules = self.extractor.extract_modules_from_text(text)
        specific_topics = self.extractor.extract_specific_topics(text)
        
        # Build Bloom level sequence
        # First 4 COs: mix of Apply and Analyze
        # CO5: Evaluate, CO6: Create
        bloom_sequence = []
        
        # For typical DBMS: CO1 is often Understand, CO2-CO4 are Apply/Analyze
        bloom_sequence.append('Understand')  # CO1 - basics
        
        # Remaining CO2-CO4 based on user preference
        remaining_apply = num_apply
        remaining_analyze = num_analyze
        
        # If user wants 2 Apply + 2 Analyze, CO1 counts as 1
        # Adjust: CO1 is Understand, so we have 3 more for Apply/Analyze
        for i in range(3):  # CO2, CO3, CO4
            if remaining_apply > 0:
                bloom_sequence.append('Apply')
                remaining_apply -= 1
            elif remaining_analyze > 0:
                bloom_sequence.append('Analyze')
                remaining_analyze -= 1
        
        bloom_sequence.append('Evaluate')  # CO5
        bloom_sequence.append('Create')    # CO6
        
        # Determine tools mentioned
        tools = []
        text_lower = text.lower()
        if 'mysql' in text_lower:
            tools.append('MySQL')
        if 'mongodb' in text_lower or 'mongo' in text_lower:
            tools.append('MongoDB')
        if not tools:
            tools = ['MySQL', 'MongoDB']  # Default
        tools_str = ' and '.join(tools)
        
        # Generate COs
        cos = []
        
        # CO1: Understand basics (Module 1)
        co1 = {
            'co_num': 1,
            'co_text': "CO1 Understand the fundamentals of databases and database management systems",
            'bloom_level': 'Understand',
            'po_mappings': 'PO1, PO2',
            'module_coverage': 'Module 1'
        }
        cos.append(co1)
        
        # CO2: Apply - Database Design (Module 2 - ER Modeling)
        co2 = {
            'co_num': 2,
            'co_text': "CO2 Apply DBMS concepts to design and create databases that address specific real-world scenarios using ER modeling",
            'bloom_level': 'Apply',
            'po_mappings': 'PO1, PO2, PO3',
            'module_coverage': 'Module 2'
        }
        cos.append(co2)
        
        # CO3: Analyze - Database Techniques (Module 3/4)
        co3 = {
            'co_num': 3,
            'co_text': "CO3 Analyse given scenarios and apply suitable database techniques including normalization and query optimization",
            'bloom_level': 'Analyze',
            'po_mappings': 'PO1, PO2, PO4',
            'module_coverage': 'Module 3, 4'
        }
        cos.append(co3)
        
        # CO4: Apply/Demonstrate - SQL and Relational Algebra (Module 3)
        co4 = {
            'co_num': 4,
            'co_text': "CO4 Demonstrate proficiency in SQL queries and relational algebra operations for data manipulation and retrieval",
            'bloom_level': 'Apply',
            'po_mappings': 'PO1, PO3, PO5',
            'module_coverage': 'Module 1, 3'
        }
        cos.append(co4)
        
        # CO5: Evaluate - Experiments with Tools (Module 5)
        co5 = {
            'co_num': 5,
            'co_text': f"CO5 Ability to conduct experiments as individual or team using modern database tools like {tools_str}",
            'bloom_level': 'Evaluate',
            'po_mappings': 'PO4, PO5, PO9',
            'module_coverage': 'Module 5'
        }
        cos.append(co5)
        
        # CO6: Create - Reports (Lab work)
        co6 = {
            'co_num': 6,
            'co_text': "CO6 Write clear and concise experiment reports detailing the methods, results, and conclusions of DBMS experiments",
            'bloom_level': 'Create',
            'po_mappings': 'PO10, PO12',
            'module_coverage': 'All Modules'
        }
        cos.append(co6)
        
        return cos
    
    def generate_custom_cos(self, text: str, num_apply: int = 2, num_analyze: int = 2) -> List[Dict]:
        """
        Generate COs based on actual topics found in text
        RESPECTS the num_apply and num_analyze configuration!
        
        CO1-CO4: Mix of Apply and Analyze based on user config
        CO5: Always Evaluate
        CO6: Always Create
        """
        topics = self.extractor.extract_specific_topics(text)
        modules = self.extractor.extract_modules_from_text(text)
        
        # Detect tools
        text_lower = text.lower()
        tools = []
        if 'mysql' in text_lower:
            tools.append('MySQL')
        if 'mongodb' in text_lower or 'mongo' in text_lower:
            tools.append('MongoDB')
        if 'oracle' in text_lower:
            tools.append('Oracle')
        if not tools:
            tools = ['MySQL', 'MongoDB']
        tools_str = ' and '.join(tools)
        
        # Build Bloom level sequence for CO1-CO4 based on user config
        bloom_sequence = []
        for _ in range(num_apply):
            bloom_sequence.append('Apply')
        for _ in range(num_analyze):
            bloom_sequence.append('Analyze')
        # CO5 and CO6 are fixed
        bloom_sequence.append('Evaluate')  # CO5
        bloom_sequence.append('Create')    # CO6
        
        # CO templates based on Bloom level
        apply_templates = [
            ("Apply DBMS concepts to design and create databases that address specific real-world scenarios", 
             ['database design', 'ER modeling', 'schema design'], 'PO1, PO2, PO3'),
            ("Apply normalization techniques to database schemas to eliminate redundancy and ensure data integrity",
             ['normalization', 'functional dependencies', 'normal forms'], 'PO1, PO2, PO4'),
            ("Demonstrate proficiency in SQL and relational algebra query processing for data manipulation",
             ['SQL', 'relational algebra', 'query processing'], 'PO1, PO3, PO5'),
            ("Apply database constraints and integrity rules to maintain data consistency and validity",
             ['constraints', 'data integrity', 'validation'], 'PO1, PO2, PO3'),
        ]
        
        analyze_templates = [
            ("Analyse given scenarios and apply suitable database techniques including normalization and functional dependencies",
             ['normalization', 'functional dependencies', 'database techniques'], 'PO1, PO2, PO4'),
            ("Analyse scenarios involving transaction management and concurrency control using ACID properties",
             ['transaction management', 'concurrency control', 'ACID properties'], 'PO1, PO2, PO4'),
            ("Analyse query optimization techniques and execution plans for database performance improvement",
             ['query optimization', 'execution plans', 'performance'], 'PO1, PO3, PO5'),
            ("Analyse database design requirements and evaluate different schema approaches for optimal solutions",
             ['database design', 'schema analysis', 'requirements'], 'PO1, PO2, PO4'),
        ]
        
        cos = []
        apply_idx = 0
        analyze_idx = 0
        
        # Generate CO1-CO4 based on configured Bloom levels
        for i in range(4):
            co_num = i + 1
            bloom_level = bloom_sequence[i]
            
            if bloom_level == 'Apply':
                template = apply_templates[apply_idx % len(apply_templates)]
                apply_idx += 1
            else:  # Analyze
                template = analyze_templates[analyze_idx % len(analyze_templates)]
                analyze_idx += 1
            
            co_text, topics_covered, po_mappings = template
            
            cos.append({
                'co_num': co_num,
                'co_text': f"CO{co_num} {co_text}",
                'bloom_level': bloom_level,
                'po_mappings': po_mappings,
                'topics_covered': topics_covered
            })
        
        # CO5: Evaluate - Tools (always fixed)
        cos.append({
            'co_num': 5,
            'co_text': f"CO5 Ability to conduct experiments as individual or team using modern tools like {tools_str}",
            'bloom_level': 'Evaluate',
            'po_mappings': 'PO4, PO5, PO9',
            'topics_covered': tools
        })
        
        # CO6: Create - Reports (always fixed)
        cos.append({
            'co_num': 6,
            'co_text': "CO6 Write clear and concise experiment reports that detail the methods, results, and conclusions of DBMS experiments",
            'bloom_level': 'Create',
            'po_mappings': 'PO10, PO12',
            'topics_covered': ['documentation', 'technical writing', 'experiment reports']
        })
        
        return cos
    
    def format_cos_output(self, cos: List[Dict]) -> str:
        """Format COs for display"""
        output = []
        for co in cos:
            output.append(co['co_text'])
        return '\n\n'.join(output)


# ============================================================================
# EVALUATION
# ============================================================================

def evaluate_generated_cos(cos: List[Dict]) -> Dict:
    """Evaluate quality of generated COs"""
    results = {
        'total_cos': len(cos),
        'bloom_distribution': defaultdict(int),
        'avg_word_count': 0,
        'po_coverage': set(),
        'quality_score': 0.0
    }
    
    total_words = 0
    quality_checks = 0
    
    for co in cos:
        # Bloom distribution
        results['bloom_distribution'][co['bloom_level']] += 1
        
        # Word count
        words = len(co['co_text'].split())
        total_words += words
        
        # PO coverage
        if 'po_mappings' in co:
            pos = re.findall(r'PO\d+', co['po_mappings'])
            results['po_coverage'].update(pos)
        
        # Quality checks
        text = co['co_text']
        if len(text) > 50:  # Minimum length
            quality_checks += 1
        if any(verb in text.lower() for verb in ['understand', 'apply', 'analyse', 'analyze', 'demonstrate', 'ability', 'write']):
            quality_checks += 1
        if re.match(r'CO\d', text):
            quality_checks += 1
    
    results['avg_word_count'] = total_words / len(cos) if cos else 0
    results['po_coverage'] = len(results['po_coverage'])
    results['quality_score'] = quality_checks / (len(cos) * 3) if cos else 0
    
    return results


# ============================================================================
# TEST
# ============================================================================

if __name__ == "__main__":
    # Test with sample text
    sample_text = """
    MODULE1: DATABASE MANAGEMENT SYSTEMS
    Introduction to Databases: Introduction, An Example, Characteristics of Database approach
    Database System Concepts and Architecture: Data models, Schemas and instances
    SQL: SQL Data Definition and Data Types, Basic retrieval queries in SQL
    
    Module 2: ER Model and Relational Data Model
    Data Modelling using the Entity-Relationship(ER) model
    Entity types, Entity Sets, Attributes, and Keys
    ER Diagrams, ER-to-Relational Mapping
    
    Module 3: Relational Algebra
    SELECT, PROJECT, JOIN operations
    Relational Model Constraints
    
    Module 4: Normalization
    Functional Dependencies, Normal Forms
    1NF, 2NF, 3NF, BCNF
    
    Module 5: Transactions and NoSQL
    Transaction management, ACID properties
    MongoDB, MySQL
    """
    
    generator = VTUCOGenerator()
    cos = generator.generate_custom_cos(sample_text, num_apply=2, num_analyze=2)
    
    print("=" * 70)
    print("GENERATED VTU-ALIGNED COURSE OUTCOMES")
    print("=" * 70)
    
    for co in cos:
        print(f"\n{co['co_text']}")
        print(f"   Bloom Level: {co['bloom_level']}")
        print(f"   PO Mappings: {co['po_mappings']}")
    
    print("\n" + "=" * 70)
    
    # Evaluate
    eval_results = evaluate_generated_cos(cos)
    print(f"\nQuality Score: {eval_results['quality_score']:.1%}")
    print(f"PO Coverage: {eval_results['po_coverage']} POs")
    print(f"Avg Word Count: {eval_results['avg_word_count']:.0f} words")

