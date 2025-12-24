import json
import os
import re
from pathlib import Path

EXTRACTED_DIR = "data/extracted"
OUT_DIR = "data/jsonl"
os.makedirs(OUT_DIR, exist_ok=True)

TRAIN_PATH = os.path.join(OUT_DIR, "train.jsonl")

def extract_key_topics_and_concepts(content):
    """Extract major topics, concepts, and tools from syllabus content"""
    content_lower = content.lower()
    topics = []
    concepts = []
    tools = []
    
    # Extract module/unit names (major topics)
    module_patterns = [
        r"(?:module|unit|chapter)\s*[0-9]+[:\-]?\s*([^\n]+)",
        r"unit\s*[0-9]+[:\-]?\s*([^\n]+)",
    ]
    for pattern in module_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        for m in matches:
            topic = m.strip()
            if len(topic) > 5 and len(topic) < 100:
                topics.append(topic)
    
    # Extract major topic headings (lines that look like headings)
    lines = content.split('\n')
    for line in lines[:100]:  # Check first 100 lines
        line_stripped = line.strip()
        if (len(line_stripped) > 10 and len(line_stripped) < 100 and 
            line_stripped[0].isupper() and 
            not line_stripped.endswith('.') and
            line_stripped.count(' ') < 15):
            # Check if it's a meaningful topic
            if any(word in line_stripped.lower() for word in [
                'database', 'sql', 'design', 'normalization', 'transaction', 
                'query', 'schema', 'index', 'constraint', 'relational', 
                'entity', 'relationship', 'model', 'algebra', 'nosql', 'mongodb'
            ]):
                topics.append(line_stripped)
                if len(topics) >= 10:
                    break
    
    # Extract technical concepts
    concept_patterns = {
        "SQL": ["sql", "structured query language", "queries", "query processing"],
        "normalization": ["normalization", "normal form", "nf", "functional dependency"],
        "transaction": ["transaction", "concurrency", "locking", "acid", "deadlock"],
        "design": ["design", "schema", "erd", "entity relationship", "conceptual design"],
        "nosql": ["nosql", "mongodb", "document database", "non-relational"],
        "indexing": ["index", "indexing", "b-tree", "hash index"],
        "constraints": ["constraint", "integrity", "foreign key", "primary key", "referential"],
        "views": ["view", "virtual table"],
        "triggers": ["trigger", "stored procedure"],
        "replication": ["replication", "sharding", "distributed", "scalability"],
        "optimization": ["optimization", "query optimization", "performance"],
        "relational algebra": ["relational algebra", "select", "project", "join", "union"],
        "er model": ["entity relationship", "er model", "entity type", "relationship type"]
    }
    
    for concept, patterns in concept_patterns.items():
        if any(pattern in content_lower for pattern in patterns):
            concepts.append(concept)
    
    # Extract tools
    if "mysql" in content_lower:
        tools.append("MySQL")
    if "mongodb" in content_lower:
        tools.append("MongoDB")
    if "postgresql" in content_lower or "postgres" in content_lower:
        tools.append("PostgreSQL")
    if "oracle" in content_lower:
        tools.append("Oracle")
    
    return topics[:8], list(set(concepts))[:8], tools

def generate_descriptive_co(level, co_num, topics, concepts, tools, content_sample):
    """Generate a descriptive CO (15-20 words) based on level and content"""
    content_lower = content_sample.lower()
    
    if level == "Understand":
        if "database" in content_lower or "dbms" in content_lower:
            return f"CO{co_num} Understand the basics of databases and database management systems"
        elif topics:
            topic = topics[0] if len(topics) > 0 else "database systems"
            return f"CO{co_num} Understand the fundamental concepts and principles of {topic.lower()}"
        else:
            return f"CO{co_num} Understand the basics of databases and database management systems"
    
    elif level == "Apply":
        # Generate longer, more descriptive Apply COs
        if "sql" in concepts or "query" in content_lower:
            return f"CO{co_num} Apply DBMS concepts to design and create databases that address specific real-world scenarios"
        elif "normalization" in concepts:
            return f"CO{co_num} Apply normalization techniques and database design principles to create efficient database structures for real-world applications"
        elif "design" in concepts or "schema" in content_lower:
            return f"CO{co_num} Apply database design principles and schema creation techniques to develop databases that address specific real-world scenarios"
        elif "relational algebra" in concepts or "algebra" in content_lower:
            return f"CO{co_num} Demonstrate the various SQL and Relational algebra query processing techniques for data retrieval and manipulation"
        elif "constraint" in concepts or "integrity" in content_lower:
            return f"CO{co_num} Apply integrity constraints and validation rules to ensure data quality and consistency in database systems"
        elif "index" in concepts:
            return f"CO{co_num} Apply indexing strategies and query optimization techniques to improve database performance and efficiency in real-world applications"
        elif topics:
            topic = topics[0] if len(topics) > 0 else "database concepts"
            return f"CO{co_num} Apply concepts and techniques related to {topic.lower()} to solve practical problems and address real-world database scenarios"
        else:
            return f"CO{co_num} Apply DBMS concepts to design and create databases that address specific real-world scenarios"
    
    elif level == "Analyze":
        # Generate longer, more descriptive Analyze COs
        if "transaction" in concepts:
            return f"CO{co_num} Analyse a given scenario involving database transaction management and concurrency control mechanisms to use suitable database techniques"
        elif "nosql" in concepts or "mongodb" in content_lower:
            return f"CO{co_num} Analyse and compare relational and non-relational database systems to determine their suitability for different real-world scenarios"
        elif "replication" in concepts or "sharding" in content_lower:
            return f"CO{co_num} Analyse database replication and sharding strategies for scalability to determine the best approach for distributed database systems"
        elif "optimization" in concepts or "performance" in content_lower:
            return f"CO{co_num} Analyse query optimization techniques and their impact on database performance to identify the most suitable approach for given scenarios"
        elif "normalization" in concepts:
            return f"CO{co_num} Analyse database design problems and apply normalization techniques to eliminate redundancy and ensure data integrity"
        elif topics:
            topic = topics[0] if len(topics) > 0 else "database systems"
            return f"CO{co_num} Analyse different aspects of {topic.lower()} and their applications to solve complex database problems"
        else:
            return f"CO{co_num} Analyse a given scenario and use suitable database technique to address real-world database problems"
    
    elif level == "Evaluate":
        # CO5: Always Evaluate
        if tools:
            tools_str = " and ".join(tools)
            return f"CO{co_num} Ability to conduct experiments as individual or team to using modern tools like {tools_str} for database management and operations"
        elif "mongodb" in content_lower or "nosql" in content_lower:
            return f"CO{co_num} Ability to conduct experiments as individual or team to using modern tools like MySQL and MongoDB"
        else:
            return f"CO{co_num} Ability to conduct experiments as individual or team to using modern tools like MySQL and MongoDB for database management"
    
    else:  # Create - CO6
        if "experiment" in content_lower or "lab" in content_lower:
            return f"CO{co_num} Write clear and concise experiment reports that detail the methods, results, and conclusions of DBMS experiment"
        elif topics:
            topic = topics[0] if len(topics) > 0 else "database management"
            return f"CO{co_num} Write clear and concise experiment reports that detail the methods, results, and conclusions of {topic.lower()} experiments in database systems"
        else:
            return f"CO{co_num} Write clear and concise experiment reports that detail the methods, results, and conclusions of DBMS experiment"

def generate_cos_from_content(content, num_apply, num_analyze):
    """
    Generate 6 descriptive COs (15-20 words each) based on ACTUAL CONTENT.
    Ensures uniqueness and proper Bloom's taxonomy levels.
    """
    topics, concepts, tools = extract_key_topics_and_concepts(content)
    content_sample = content[:2000]  # Use first 2000 chars for context
    
    cos = []
    used_concepts = set()
    used_co_texts = set()  # Track CO texts to avoid duplicates
    
    # Generate CO1: Always Understand (as per user's example)
    co1 = generate_descriptive_co("Understand", 1, topics, concepts, tools, content_sample)
    cos.append(co1)
    used_co_texts.add(co1.lower())
    
    # Build list of Apply and Analyze COs to generate
    levels_to_generate = []
    for i in range(num_apply):
        levels_to_generate.append("Apply")
    for i in range(num_analyze):
        levels_to_generate.append("Analyze")
    
    # Generate CO2-CO4 with unique content
    co_num = 2
    concept_idx = 0
    
    for level in levels_to_generate[:4]:  # Max 4 for CO2-CO4
        # Try different concepts/topics to ensure uniqueness
        max_attempts = 10
        co_generated = None
        
        for attempt in range(max_attempts):
            # Rotate through concepts and topics for variety
            if concepts and concept_idx < len(concepts):
                # Temporarily mark concept as used for this generation
                temp_used = used_concepts.copy()
                temp_used.add(concepts[concept_idx % len(concepts)])
                concept_idx += 1
            else:
                temp_used = used_concepts.copy()
            
            # Generate CO with current context
            co = generate_descriptive_co(level, co_num, topics, concepts, tools, content_sample)
            
            # Check if it's unique
            co_lower = co.lower()
            if co_lower not in used_co_texts:
                cos.append(co)
                used_co_texts.add(co_lower)
                # Mark concept as used
                if concepts and (concept_idx - 1) < len(concepts):
                    used_concepts.add(concepts[(concept_idx - 1) % len(concepts)])
                co_generated = co
                break
        
        # If still couldn't generate unique, use a variation
        if not co_generated:
            # Create a variation by adding topic info
            if topics and len(topics) > 0:
                topic = topics[co_num % len(topics)]
                if level == "Apply":
                    co = f"CO{co_num} Apply concepts and techniques related to {topic.lower()} to solve practical problems and address real-world database scenarios"
                else:
                    co = f"CO{co_num} Analyse different aspects of {topic.lower()} and their applications to solve complex database problems"
            else:
                if level == "Apply":
                    co = f"CO{co_num} Apply database design principles and schema creation techniques to develop databases that address specific real-world scenarios"
                else:
                    co = f"CO{co_num} Analyse a given scenario and use suitable database technique to address real-world database problems"
            
            cos.append(co)
            used_co_texts.add(co.lower())
        
        co_num += 1
    
    # Ensure we have exactly 4 COs for CO1-CO4
    while len(cos) < 4:
        # Fill remaining slots
        if num_apply > len([c for c in cos if "apply" in c.lower()]):
            level = "Apply"
        else:
            level = "Analyze"
        
        co = generate_descriptive_co(level, co_num, topics, concepts, tools, content_sample)
        if co.lower() not in used_co_texts:
            cos.append(co)
            used_co_texts.add(co.lower())
        co_num += 1
    
    # CO5: Evaluate (always)
    co5 = generate_descriptive_co("Evaluate", 5, topics, concepts, tools, content_sample)
    cos.append(co5)
    
    # CO6: Create (always)
    co6 = generate_descriptive_co("Create", 6, topics, concepts, tools, content_sample)
    cos.append(co6)
    
    # Ensure exactly 6 COs
    return "\n".join(cos[:6])

def build_jsonl():
    """Build improved training JSONL with descriptive COs (15-20 words)"""
    files = list(Path(EXTRACTED_DIR).glob("*.txt"))
    data = []
    
    print(f"📂 Found {len(files)} text files in {EXTRACTED_DIR}")
    
    for file in files:
        print(f"  Processing: {file.name}")
        raw = file.read_text(encoding="utf-8")
        
        # Use more content for better context (5000 chars)
        content = raw[:5000] if len(raw) > 5000 else raw
        
        # Generate variations with different Apply/Analyze mixes
        variations = [
            (2, 2),  # 2 Apply, 2 Analyze
            (3, 1),  # 3 Apply, 1 Analyze
            (1, 3),  # 1 Apply, 3 Analyze
            (4, 0),  # 4 Apply, 0 Analyze
            (0, 4),  # 0 Apply, 4 Analyze
        ]
        
        for num_apply, num_analyze in variations:
            # Generate descriptive COs based on actual content
            cos_output = generate_cos_from_content(content, num_apply, num_analyze)
            
            # Verify COs are descriptive (check word count)
            cos_lines = cos_output.split('\n')
            all_descriptive = True
            for co_line in cos_lines:
                if co_line.strip():
                    word_count = len(co_line.split())
                    if word_count < 10:  # Too short
                        all_descriptive = False
                        break
            
            if all_descriptive:
                entry = {
                    "instruction": f"Generate 6 comprehensive Course Outcomes (COs) from this syllabus content. Each CO must be a complete statement with 15-20 words covering major topics:\n\n{content}",
                    "output": cos_output
                }
                data.append(entry)
    
    # Write to JSONL
    with open(TRAIN_PATH, "w", encoding="utf-8") as f:
        for d in data:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")
    
    print(f"\n✅ JSONL created at: {TRAIN_PATH}")
    print(f"✅ Total samples: {len(data)}")
    print("\n📋 Sample entries:")
    for i, sample in enumerate(data[:3]):
        print(f"\n--- Sample {i+1} ---")
        print(f"Instruction length: {len(sample['instruction'])} chars")
        print(f"Output:\n{sample['output']}")
        # Count words in each CO
        cos = sample['output'].split('\n')
        for co in cos:
            if co.strip():
                word_count = len(co.split())
                print(f"  {co[:60]}... ({word_count} words)")

if __name__ == "__main__":
    build_jsonl()

