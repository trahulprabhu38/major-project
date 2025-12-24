import json
import os
import re
from pathlib import Path

EXTRACTED_DIR = "data/extracted"
OUT_DIR = "data/jsonl"
os.makedirs(OUT_DIR, exist_ok=True)

TRAIN_PATH = os.path.join(OUT_DIR, "train.jsonl")

def extract_key_topics(content):
    """Extract key topics and concepts from the content"""
    content_lower = content.lower()
    topics = []
    concepts = []
    
    # Extract module/topic names
    module_patterns = [
        r"module\s*[0-9]+[:\-]?\s*([^\n]+)",
        r"unit\s*[0-9]+[:\-]?\s*([^\n]+)",
        r"chapter\s*[0-9]+[:\-]?\s*([^\n]+)",
    ]
    for pattern in module_patterns:
        matches = re.findall(pattern, content_lower, re.IGNORECASE)
        topics.extend([m.strip() for m in matches if len(m.strip()) > 5])
    
    # Extract technical terms that appear in content
    tech_terms = {
        "SQL": ["sql", "structured query language", "queries", "select", "insert", "update", "delete"],
        "normalization": ["normalization", "normal form", "nf", "1nf", "2nf", "3nf", "bcnf"],
        "transaction": ["transaction", "concurrency", "locking", "deadlock", "acid"],
        "design": ["design", "schema", "erd", "entity relationship", "database design"],
        "nosql": ["nosql", "mongodb", "document database", "non-relational"],
        "indexing": ["index", "indexing", "b-tree", "hash index"],
        "constraints": ["constraint", "integrity", "foreign key", "primary key", "unique"],
        "views": ["view", "virtual table"],
        "triggers": ["trigger", "stored procedure"],
        "replication": ["replication", "sharding", "distributed"],
        "optimization": ["optimization", "query optimization", "performance"],
        "relational algebra": ["relational algebra", "join", "union", "intersection"],
        "database": ["database", "dbms", "rdbms"],
    }
    
    for concept, patterns in tech_terms.items():
        if any(pattern in content_lower for pattern in patterns):
            concepts.append(concept)
    
    # Extract major topic headings
    lines = content.split('\n')
    for line in lines[:100]:
        line_stripped = line.strip()
        if (len(line_stripped) > 10 and len(line_stripped) < 150 and 
            line_stripped[0].isupper() and 
            not line_stripped.endswith('.') and
            line_stripped.count(' ') < 15):
            if any(word in line_stripped.lower() for word in ['database', 'sql', 'design', 'normalization', 'transaction', 'query', 'schema']):
                topics.append(line_stripped)
                if len(topics) >= 10:
                    break
    
    return topics[:8], list(set(concepts))[:10]

def generate_descriptive_co(co_num, level, concepts, topics, tools, used_concepts, content_lower):
    """Generate a descriptive CO with 15-20 words based on level and content"""
    
    # Get unused concepts
    available_concepts = [c for c in concepts if c.lower() not in used_concepts]
    available_topics = [t for t in topics if t.lower() not in used_concepts]
    
    if level == "Apply":
        if "SQL" in available_concepts or "relational algebra" in available_concepts:
            used_concepts.add("sql")
            return f"CO{co_num} Demonstrate the various SQL & Relational algebra query processing techniques to retrieve and manipulate data from database systems"
        elif "design" in available_concepts or "schema" in available_concepts:
            used_concepts.add("design")
            return f"CO{co_num} Apply DBMS concepts to design and create databases that address specific real-world scenarios using proper schema design principles"
        elif "normalization" in available_concepts:
            used_concepts.add("normalization")
            return f"CO{co_num} Apply normalization techniques and database design principles to create efficient database structures for real-world applications"
        elif "indexing" in available_concepts:
            used_concepts.add("indexing")
            return f"CO{co_num} Apply indexing strategies and query optimization techniques to improve database performance and efficiency in real-world applications"
        elif available_topics:
            topic = available_topics[0]
            used_concepts.add(topic.lower())
            return f"CO{co_num} Apply concepts and techniques related to {topic} to solve practical problems and address real-world database scenarios"
        else:
            return f"CO{co_num} Apply DBMS concepts to design and create databases that address specific real-world scenarios using database management principles"
    
    elif level == "Analyze":
        if "transaction" in available_concepts:
            used_concepts.add("transaction")
            return f"CO{co_num} Analyse a given scenario involving database transaction management and concurrency control mechanisms to use suitable database techniques"
        elif "nosql" in available_concepts:
            used_concepts.add("nosql")
            return f"CO{co_num} Analyse and compare relational and non-relational database systems to determine their suitability for different real-world scenarios"
        elif "optimization" in available_concepts:
            used_concepts.add("optimization")
            return f"CO{co_num} Analyse query optimization techniques and their impact on database performance to identify the most suitable approach for given scenarios"
        elif "replication" in available_concepts:
            used_concepts.add("replication")
            return f"CO{co_num} Analyse database replication and sharding strategies for scalability to determine the best approach for distributed database systems"
        elif available_topics:
            topic = available_topics[0]
            used_concepts.add(topic.lower())
            return f"CO{co_num} Analyse different aspects of {topic} and their applications to solve complex database problems and address real-world scenarios"
        else:
            return f"CO{co_num} Analyse a given scenario and use suitable database technique to address real-world database problems and challenges"
    
    elif level == "Evaluate":
        if tools:
            tools_str = " and ".join(tools)
            return f"CO{co_num} Ability to conduct experiments as individual or team to using modern tools like {tools_str} for database management and operations"
        elif "nosql" in concepts or "mongodb" in content_lower:
            return f"CO{co_num} Ability to conduct experiments as individual or team to using modern database tools like MySQL and MongoDB for database management"
        else:
            return f"CO{co_num} Ability to conduct experiments as individual or team to using modern database tools for database management and operations"
    
    else:  # Create
        if available_topics:
            topic = available_topics[0]
            return f"CO{co_num} Write clear and concise experiment reports that detail the methods, results, and conclusions of {topic} experiments in database management systems"
        else:
            return f"CO{co_num} Write clear and concise experiment reports that detail the methods, results, and conclusions of DBMS experiment"

def generate_cos_from_content(content, num_apply=2, num_analyze=2):
    """
    Generate 6 descriptive COs (15-20 words each) based on ACTUAL CONTENT from syllabus/notes.
    """
    topics, concepts = extract_key_topics(content)
    content_lower = content.lower()
    
    # Extract tools
    tools = []
    if "mysql" in content_lower:
        tools.append("MySQL")
    if "mongodb" in content_lower:
        tools.append("MongoDB")
    if "postgresql" in content_lower or "postgres" in content_lower:
        tools.append("PostgreSQL")
    if "oracle" in content_lower:
        tools.append("Oracle")
    
    cos = []
    apply_count = 0
    analyze_count = 0
    used_concepts = set()
    
    # Build Bloom taxonomy structure
    bloom_levels = []
    for i in range(num_apply):
        bloom_levels.append("Apply")
    for i in range(num_analyze):
        bloom_levels.append("Analyze")
    bloom_levels.append("Evaluate")  # CO5
    bloom_levels.append("Create")     # CO6
    
    # Generate CO1-CO4
    for i in range(4):
        co_num = i + 1
        level = bloom_levels[i]
        co_text = generate_descriptive_co(co_num, level, concepts, topics, tools, used_concepts, content_lower)
        cos.append(co_text)
        if level == "Apply":
            apply_count += 1
        else:
            analyze_count += 1
    
    # CO5: Evaluate
    co5 = generate_descriptive_co(5, "Evaluate", concepts, topics, tools, used_concepts, content_lower)
    cos.append(co5)
    
    # CO6: Create
    co6 = generate_descriptive_co(6, "Create", concepts, topics, tools, used_concepts, content_lower)
    cos.append(co6)
    
    return "\n".join(cos)

def build_jsonl():
    """Build high-quality JSONL training data with descriptive COs"""
    files = list(Path(EXTRACTED_DIR).glob("*.txt"))
    data = []

    print(f"📚 Found {len(files)} files to process...")
    
    for file_idx, file in enumerate(files, 1):
        print(f"Processing {file_idx}/{len(files)}: {file.name}")
        raw = file.read_text(encoding="utf-8")
        
        # Use more content for better context (5000-8000 chars)
        # Split content into chunks to create multiple examples per file
        chunk_size = 6000
        chunks = []
        
        if len(raw) > chunk_size:
            # Create overlapping chunks for better coverage
            for i in range(0, len(raw), chunk_size // 2):
                chunk = raw[i:i + chunk_size]
                if len(chunk) > 2000:  # Only use substantial chunks
                    chunks.append(chunk)
                if len(chunks) >= 3:  # Max 3 chunks per file
                    break
        else:
            chunks = [raw]
        
        # Generate variations for each chunk
        variations = [
            (2, 2),  # 2 Apply, 2 Analyze
            (3, 1),  # 3 Apply, 1 Analyze
            (1, 3),  # 1 Apply, 3 Analyze
            (4, 0),  # 4 Apply, 0 Analyze
            (0, 4),  # 0 Apply, 4 Analyze
        ]
        
        for chunk_idx, chunk in enumerate(chunks):
            for num_apply, num_analyze in variations:
                # Generate descriptive COs based on actual content
                cos_output = generate_cos_from_content(chunk, num_apply, num_analyze)
                
                # Create instruction with better context
                instruction = f"""Generate 6 comprehensive Course Outcomes (COs) from this syllabus content. Each CO must be a complete statement with 15-20 words covering major topics.

Syllabus Content:
{chunk[:4000]}

Requirements:
- CO1-CO4: Mix of {num_apply} Apply and {num_analyze} Analyze levels
- CO5: Evaluate level (experiments/tools)
- CO6: Create level (reports/writing)
- Each CO must be 15-20 words and cover major syllabus topics
- Format: CO1 [action verb] [detailed statement]"""
                
                entry = {
                    "instruction": instruction,
                    "output": cos_output
                }
                data.append(entry)

    # Shuffle data for better training
    import random
    random.shuffle(data)

    with open(TRAIN_PATH, "w", encoding="utf-8") as f:
        for d in data:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")

    print(f"\n✅ JSONL created at: {TRAIN_PATH}")
    print(f"✅ Total samples: {len(data)}")
    print(f"✅ Average samples per file: {len(data) / len(files):.1f}")
    
    print("\n📋 Sample entries:")
    for i, sample in enumerate(data[:3], 1):
        print(f"\n--- Sample {i} ---")
        print(f"Instruction length: {len(sample['instruction'])} chars")
        print(f"Output:\n{sample['output']}")
        print(f"CO word counts:")
        for co in sample['output'].split('\n'):
            if co.strip():
                word_count = len(co.split())
                print(f"  {co[:50]}... ({word_count} words)")


if __name__ == "__main__":
    build_jsonl()
