from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans

# Load local embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')

def generate_cos(texts, num_cos=5):
    """
    texts: list of syllabus/module text
    num_cos: how many COs to generate
    """
    embeddings = model.encode(texts)
    
    # Cluster into num_cos COs
    kmeans = KMeans(n_clusters=num_cos, random_state=42)
    kmeans.fit(embeddings)
    
    cos_dict = {}
    for idx, label in enumerate(kmeans.labels_):
        co_key = f"CO{label+1}"
        if co_key not in cos_dict:
            cos_dict[co_key] = []
        cos_dict[co_key].append(texts[idx])
    
    # Concatenate text per CO
    for co in cos_dict:
        cos_dict[co] = " ".join(cos_dict[co])
    
    return cos_dict
