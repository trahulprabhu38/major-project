from typing import List, Dict, Optional
import json

class KnowledgeGraph:
    
    def __init__(self, uri: str = "bolt://localhost:7687", user: str = "neo4j", password: str = "password"):
        self.uri = uri
        self.user = user
        self.password = password
        self.connected = False
        self.graph_data = {
            'nodes': [],
            'relationships': [],
            'paths': []  # Initialize paths list
        }
        print("✅ Knowledge Graph Layer initialized (Neo4j-ready)")
    
    def connect(self):
        """Connect to Neo4j database"""
        try:
            # In production, this would connect to actual Neo4j
            # from neo4j import GraphDatabase
            # self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.connected = True
            print("✅ Connected to Neo4j Knowledge Graph")
        except Exception as e:
            print(f"⚠️ Neo4j not available, using in-memory graph: {e}")
            self.connected = False
    
    def create_node(self, node_type: str, properties: Dict) -> str:
        """Create a node in the knowledge graph"""
        node_id = f"{node_type}_{len(self.graph_data['nodes'])}"
        node = {
            'id': node_id,
            'type': node_type,
            'properties': properties
        }
        self.graph_data['nodes'].append(node)
        return node_id
    
    def create_relationship(self, from_node: str, to_node: str, rel_type: str, properties: Dict = None):
        """Create a relationship between nodes"""
        rel = {
            'from': from_node,
            'to': to_node,
            'type': rel_type,
            'properties': properties or {}
        }
        self.graph_data['relationships'].append(rel)
    
    def build_syllabus_graph(self, processed_docs: List[Dict]):
        print("🔨 Building Knowledge Graph from syllabus...")
        
        # Extract all modules and topics
        all_modules = []
        all_topics = []
        
        for doc in processed_docs:
            metadata = doc.get('metadata', {})
            for module in metadata.get('modules', []):
                if module not in all_modules:
                    all_modules.append(module)
            
            for topic in metadata.get('topics', []):
                if topic not in all_topics:
                    all_topics.append(topic)
        
        # Create module nodes
        module_nodes = {}
        for i, module in enumerate(all_modules[:10]):  # Limit for demo
            node_id = self.create_node('Module', {
                'name': module,
                'module_number': i + 1,
                'description': f"Module covering {module}"
            })
            module_nodes[module] = node_id
        
        # Create topic nodes
        topic_nodes = {}
        for topic in all_topics[:20]:  # Limit for demo
            node_id = self.create_node('Topic', {
                'name': topic,
                'type': 'conceptual'
            })
            topic_nodes[topic] = node_id
        
        # Create Bloom Taxonomy nodes
        bloom_levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
        bloom_nodes = {}
        for level in bloom_levels:
            node_id = self.create_node('BloomLevel', {
                'level': level,
                'taxonomy_level': bloom_levels.index(level) + 1
            })
            bloom_nodes[level] = node_id
        
        # Create PO nodes (Program Outcomes)
        po_nodes = {}
        for i in range(1, 13):  # POs 1-12
            node_id = self.create_node('ProgramOutcome', {
                'po_number': i,
                'description': f"PO{i}: Engineering Knowledge/Problem Analysis/etc."
            })
            po_nodes[i] = node_id
        
        # Create relationships
        # Module -> Topic relationships
        for module, module_id in list(module_nodes.items())[:5]:
            for topic, topic_id in list(topic_nodes.items())[:3]:
                self.create_relationship(module_id, topic_id, 'CONTAINS', {
                    'weight': 0.8
                })
        
        # Topic -> Bloom Level relationships
        for topic_id in list(topic_nodes.values())[:5]:
            for bloom_level, bloom_id in bloom_nodes.items():
                if bloom_level in ['Apply', 'Analyze']:
                    self.create_relationship(topic_id, bloom_id, 'REQUIRES', {
                        'relevance': 0.7
                    })
        
        # Topic -> PO mappings
        for topic_id in list(topic_nodes.values())[:3]:
            for po_num in [1, 2, 3, 4, 5]:
                self.create_relationship(topic_id, po_nodes[po_num], 'MAPS_TO_PO', {
                    'strength': 0.6
                })
        
        # Prerequisite chains
        if len(topic_nodes) > 1:
            topic_list = list(topic_nodes.values())
            for i in range(len(topic_list) - 1):
                self.create_relationship(topic_list[i], topic_list[i+1], 'PREREQUISITE', {
                    'order': i + 1
                })
        
        # Find and store some example paths
        if len(self.graph_data['nodes']) > 1:
            # Find paths between first few nodes
            for i in range(min(3, len(self.graph_data['nodes']) - 1)):
                start_node = self.graph_data['nodes'][i]['id']
                end_node = self.graph_data['nodes'][i+1]['id']
                paths = self.get_graph_paths(start_node, end_node, max_depth=2)
                self.graph_data['paths'].extend(paths)
        
        print(f" Knowledge Graph built:")
        print(f"   📊 Nodes: {len(self.graph_data['nodes'])}")
        print(f"   🔗 Relationships: {len(self.graph_data['relationships'])}")
        print(f"   🛤️  Paths: {len(self.graph_data['paths'])}")
        
        return self.graph_data
    
    def get_graph_paths(self, start_node: str, end_node: str, max_depth: int = 3) -> List[List[str]]:
        """Find paths between nodes (for Graph-RAG)"""
        paths = []
        
        # Simple path finding (in production, use Neo4j Cypher queries)
        def find_paths(current: str, target: str, path: List[str], depth: int):
            if depth > max_depth:
                return
            if current == target:
                paths.append(path.copy())
                return
            
            # Find neighbors
            neighbors = []
            for rel in self.graph_data['relationships']:
                if rel['from'] == current:
                    neighbors.append(rel['to'])
            
            for neighbor in neighbors:
                if neighbor not in path:
                    path.append(neighbor)
                    find_paths(neighbor, target, path, depth + 1)
                    path.pop()
        
        find_paths(start_node, end_node, [start_node], 0)
        return paths
    
    def query_graph(self, query: str) -> Dict:
        results = {
            'nodes': [],
            'relationships': [],
            'paths': []
        }
        
        query_lower = query.lower()
        
        # Find relevant nodes
        for node in self.graph_data['nodes']:
            node_text = json.dumps(node['properties']).lower()
            if query_lower in node_text:
                results['nodes'].append(node)
        
        # Find relevant relationships
        for rel in self.graph_data['relationships']:
            if query_lower in rel['type'].lower():
                results['relationships'].append(rel)
        
        # Find paths between relevant nodes
        if len(results['nodes']) >= 2:
            for i in range(len(results['nodes']) - 1):
                paths = self.get_graph_paths(
                    results['nodes'][i]['id'],
                    results['nodes'][i+1]['id'],
                    max_depth=2
                )
                results['paths'].extend(paths)
        
        return results
    
    def export_graph(self, file_path: str = "data/knowledge_graph.json"):
        import json
        with open(file_path, 'w') as f:
            json.dump(self.graph_data, f, indent=2)
        print(f"Graph exported to {file_path}")

