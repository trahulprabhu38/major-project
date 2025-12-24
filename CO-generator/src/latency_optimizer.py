"""
Latency Optimizer & Benchmarking System
========================================
Optimizations for CO Generator Pipeline:
- Model quantization for faster inference
- Embedding caching with LRU
- Batch processing utilities
- Pipeline profiling
- Async operations where possible
"""

import time
import hashlib
import json
from functools import lru_cache, wraps
from typing import List, Dict, Optional, Callable, Any
from dataclasses import dataclass, field
from pathlib import Path
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

# ============================================================================
# PROFILING DECORATOR & CONTEXT MANAGER
# ============================================================================

class LatencyProfiler:
    """Context manager and decorator for profiling latency"""
    
    def __init__(self):
        self.timings = {}
        self.call_counts = {}
        self._lock = threading.Lock()
    
    def profile(self, name: str):
        """Decorator for profiling function latency"""
        def decorator(func: Callable):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start = time.perf_counter()
                result = func(*args, **kwargs)
                elapsed = (time.perf_counter() - start) * 1000
                
                with self._lock:
                    if name not in self.timings:
                        self.timings[name] = []
                        self.call_counts[name] = 0
                    self.timings[name].append(elapsed)
                    self.call_counts[name] += 1
                
                return result
            return wrapper
        return decorator
    
    def __enter__(self):
        self._start = time.perf_counter()
        return self
    
    def __exit__(self, *args):
        self._elapsed = (time.perf_counter() - self._start) * 1000
    
    @property
    def elapsed_ms(self):
        return getattr(self, '_elapsed', 0)
    
    def get_stats(self) -> Dict:
        """Get comprehensive profiling statistics"""
        stats = {}
        for name, times in self.timings.items():
            if times:
                stats[name] = {
                    'count': self.call_counts[name],
                    'total_ms': round(sum(times), 2),
                    'mean_ms': round(np.mean(times), 2),
                    'min_ms': round(min(times), 2),
                    'max_ms': round(max(times), 2),
                    'std_ms': round(np.std(times), 2) if len(times) > 1 else 0
                }
        return stats
    
    def reset(self):
        """Reset all timings"""
        with self._lock:
            self.timings.clear()
            self.call_counts.clear()
    
    def report(self) -> str:
        """Generate a formatted report"""
        stats = self.get_stats()
        lines = ["\n" + "=" * 60]
        lines.append("LATENCY PROFILER REPORT")
        lines.append("=" * 60)
        
        total_time = sum(s['total_ms'] for s in stats.values())
        
        for name, s in sorted(stats.items(), key=lambda x: -x[1]['total_ms']):
            pct = (s['total_ms'] / total_time * 100) if total_time > 0 else 0
            lines.append(f"\n{name}:")
            lines.append(f"  Calls: {s['count']}")
            lines.append(f"  Total: {s['total_ms']:.2f} ms ({pct:.1f}%)")
            lines.append(f"  Mean:  {s['mean_ms']:.2f} ms")
            lines.append(f"  Range: {s['min_ms']:.2f} - {s['max_ms']:.2f} ms")
        
        lines.append("\n" + "-" * 60)
        lines.append(f"TOTAL TIME: {total_time:.2f} ms")
        lines.append("=" * 60)
        
        return "\n".join(lines)


# Global profiler instance
PROFILER = LatencyProfiler()

# ============================================================================
# EMBEDDING CACHE
# ============================================================================

class EmbeddingCache:
    """
    LRU cache for embeddings with persistent storage option
    Reduces redundant embedding computations significantly
    """
    
    def __init__(self, max_size: int = 10000, cache_dir: Optional[str] = None):
        self.max_size = max_size
        self.cache_dir = Path(cache_dir) if cache_dir else None
        self._cache = {}
        self._access_order = []
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0
        
        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            self._load_persistent_cache()
    
    def _hash_text(self, text: str) -> str:
        """Create a hash key for text"""
        return hashlib.md5(text.encode()).hexdigest()
    
    def _load_persistent_cache(self):
        """Load cache from disk"""
        cache_file = self.cache_dir / "embedding_cache.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    self._cache = {k: np.array(v) for k, v in data.items()}
                    print(f"✅ Loaded {len(self._cache)} cached embeddings")
            except Exception as e:
                print(f"⚠️ Could not load cache: {e}")
    
    def _save_persistent_cache(self):
        """Save cache to disk"""
        if not self.cache_dir:
            return
        cache_file = self.cache_dir / "embedding_cache.json"
        try:
            with open(cache_file, 'w') as f:
                data = {k: v.tolist() for k, v in self._cache.items()}
                json.dump(data, f)
        except Exception as e:
            print(f"⚠️ Could not save cache: {e}")
    
    def get(self, text: str) -> Optional[np.ndarray]:
        """Get embedding from cache"""
        key = self._hash_text(text)
        with self._lock:
            if key in self._cache:
                self._hits += 1
                # Update access order
                if key in self._access_order:
                    self._access_order.remove(key)
                self._access_order.append(key)
                return self._cache[key]
            self._misses += 1
            return None
    
    def set(self, text: str, embedding: np.ndarray):
        """Store embedding in cache"""
        key = self._hash_text(text)
        with self._lock:
            # Evict if at capacity
            while len(self._cache) >= self.max_size and self._access_order:
                oldest = self._access_order.pop(0)
                self._cache.pop(oldest, None)
            
            self._cache[key] = embedding
            self._access_order.append(key)
    
    def get_or_compute(self, text: str, compute_fn: Callable[[str], np.ndarray]) -> np.ndarray:
        """Get from cache or compute and cache"""
        cached = self.get(text)
        if cached is not None:
            return cached
        
        embedding = compute_fn(text)
        self.set(text, embedding)
        return embedding
    
    @property
    def hit_rate(self) -> float:
        total = self._hits + self._misses
        return self._hits / total if total > 0 else 0.0
    
    def stats(self) -> Dict:
        return {
            'size': len(self._cache),
            'max_size': self.max_size,
            'hits': self._hits,
            'misses': self._misses,
            'hit_rate': f"{self.hit_rate:.1%}"
        }
    
    def save(self):
        """Persist cache to disk"""
        self._save_persistent_cache()


# ============================================================================
# MODEL OPTIMIZER
# ============================================================================

class ModelOptimizer:
    """
    Optimizations for LLM inference:
    - Quantization (int8, int4)
    - KV-cache management
    - Batch inference
    - Device optimization
    """
    
    def __init__(self):
        self.device = self._get_optimal_device()
        self.quantization_enabled = False
        self._model_cache = {}
    
    def _get_optimal_device(self) -> str:
        """Determine optimal device for inference"""
        if not TORCH_AVAILABLE:
            return "cpu"
        
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return "mps"
        return "cpu"
    
    def optimize_model_for_inference(self, model):
        """
        Apply inference optimizations to model
        """
        if not TORCH_AVAILABLE:
            return model
        
        # Set evaluation mode
        model.eval()
        
        # Enable inference optimizations
        if hasattr(model, 'config'):
            model.config.use_cache = True
        
        # Compile with torch.compile if available (PyTorch 2.0+)
        if hasattr(torch, 'compile') and self.device != 'mps':
            try:
                model = torch.compile(model, mode='reduce-overhead')
                print("✅ Model compiled with torch.compile")
            except Exception:
                pass  # Compilation not supported for this model
        
        return model
    
    def quantize_model_int8(self, model):
        """
        Apply dynamic int8 quantization for faster CPU inference
        """
        if not TORCH_AVAILABLE:
            return model
        
        if self.device == "cpu":
            try:
                model = torch.quantization.quantize_dynamic(
                    model, 
                    {torch.nn.Linear}, 
                    dtype=torch.qint8
                )
                self.quantization_enabled = True
                print("✅ Model quantized to int8")
            except Exception as e:
                print(f"⚠️ Quantization failed: {e}")
        
        return model
    
    def get_inference_config(self) -> Dict:
        """Get optimal inference configuration"""
        config = {
            'device': self.device,
            'torch_dtype': 'float32',
            'use_cache': True,
            'pad_token_id': None,  # Set to tokenizer.eos_token_id
        }
        
        if TORCH_AVAILABLE:
            if self.device == "cuda":
                config['torch_dtype'] = 'float16'
            elif self.device == "mps":
                config['torch_dtype'] = 'float32'  # MPS works best with float32
        
        return config
    
    def estimate_inference_time(self, input_length: int, max_new_tokens: int) -> float:
        """
        Estimate inference time in milliseconds based on device and input
        """
        # Rough estimates based on typical performance
        tokens_per_second = {
            'cuda': 50,
            'mps': 20,
            'cpu': 5
        }
        
        tps = tokens_per_second.get(self.device, 5)
        estimated_time_ms = (max_new_tokens / tps) * 1000
        
        return estimated_time_ms


# ============================================================================
# BATCH PROCESSOR
# ============================================================================

class BatchProcessor:
    """
    Batch processing for parallel operations
    """
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
    
    def process_batch(self, items: List[Any], process_fn: Callable, 
                      show_progress: bool = False) -> List[Any]:
        """
        Process items in parallel
        """
        results = [None] * len(items)
        futures = {}
        
        for i, item in enumerate(items):
            future = self.executor.submit(process_fn, item)
            futures[future] = i
        
        completed = 0
        for future in as_completed(futures):
            idx = futures[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                results[idx] = {'error': str(e)}
            
            completed += 1
            if show_progress:
                print(f"  Progress: {completed}/{len(items)}", end='\r')
        
        if show_progress:
            print()
        
        return results
    
    def process_embeddings_batch(self, texts: List[str], 
                                 embedding_model,
                                 cache: Optional[EmbeddingCache] = None) -> List[np.ndarray]:
        """
        Batch process embeddings with caching
        """
        embeddings = []
        texts_to_encode = []
        text_indices = []
        
        # Check cache first
        for i, text in enumerate(texts):
            if cache:
                cached = cache.get(text)
                if cached is not None:
                    embeddings.append((i, cached))
                    continue
            texts_to_encode.append(text)
            text_indices.append(i)
        
        # Batch encode remaining
        if texts_to_encode and embedding_model:
            try:
                new_embeddings = embedding_model.encode(
                    texts_to_encode,
                    batch_size=32,
                    show_progress_bar=False
                )
                
                for i, (idx, text) in enumerate(zip(text_indices, texts_to_encode)):
                    emb = new_embeddings[i]
                    embeddings.append((idx, emb))
                    if cache:
                        cache.set(text, emb)
            except Exception as e:
                print(f"⚠️ Batch embedding error: {e}")
        
        # Sort by original index
        embeddings.sort(key=lambda x: x[0])
        return [emb for _, emb in embeddings]
    
    def shutdown(self):
        """Shutdown the executor"""
        self.executor.shutdown(wait=True)


# ============================================================================
# OPTIMIZED PIPELINE WRAPPER
# ============================================================================

class OptimizedPipeline:
    """
    Wrapper that applies all optimizations to the CO generation pipeline
    """
    
    def __init__(self, cache_dir: str = "data/cache"):
        self.profiler = PROFILER
        self.embedding_cache = EmbeddingCache(
            max_size=10000, 
            cache_dir=cache_dir
        )
        self.model_optimizer = ModelOptimizer()
        self.batch_processor = BatchProcessor(max_workers=4)
        
        print("=" * 60)
        print("OPTIMIZED PIPELINE INITIALIZED")
        print("=" * 60)
        print(f"✅ Device: {self.model_optimizer.device}")
        print(f"✅ Embedding Cache: {self.embedding_cache.max_size} entries")
        print(f"✅ Batch Workers: {self.batch_processor.max_workers}")
        print("=" * 60)
    
    @PROFILER.profile("document_processing")
    def process_documents(self, documents: List[str]) -> List[Dict]:
        """Optimized document processing"""
        # Use batch processing for multiple documents
        def process_single(doc):
            # Simplified processing - integrate with DocumentIntelligence
            return {'text': doc, 'processed': True}
        
        return self.batch_processor.process_batch(documents, process_single)
    
    @PROFILER.profile("embedding_generation")
    def generate_embeddings_optimized(self, texts: List[str], 
                                       embedding_model) -> List[np.ndarray]:
        """Optimized embedding generation with caching"""
        return self.batch_processor.process_embeddings_batch(
            texts, embedding_model, self.embedding_cache
        )
    
    @PROFILER.profile("llm_inference")
    def run_llm_inference(self, model, tokenizer, prompts: List[str], 
                          max_new_tokens: int = 150) -> List[str]:
        """Optimized LLM inference"""
        results = []
        
        for prompt in prompts:
            if not TORCH_AVAILABLE:
                results.append("[Mock output - PyTorch not available]")
                continue
            
            try:
                inputs = tokenizer(
                    prompt,
                    return_tensors="pt",
                    truncation=True,
                    max_length=1024
                ).to(self.model_optimizer.device)
                
                with torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_new_tokens=max_new_tokens,
                        temperature=0.8,
                        do_sample=True,
                        top_p=0.9,
                        repetition_penalty=1.5,
                        pad_token_id=tokenizer.eos_token_id,
                        use_cache=True  # Enable KV-cache
                    )
                
                decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)
                results.append(decoded)
                
            except Exception as e:
                results.append(f"[Error: {e}]")
        
        return results
    
    def get_optimization_report(self) -> Dict:
        """Get comprehensive optimization report"""
        return {
            'device': self.model_optimizer.device,
            'quantization_enabled': self.model_optimizer.quantization_enabled,
            'cache_stats': self.embedding_cache.stats(),
            'profiler_stats': self.profiler.get_stats()
        }
    
    def print_optimization_report(self):
        """Print formatted optimization report"""
        print(self.profiler.report())
        print("\n📊 Cache Statistics:")
        for k, v in self.embedding_cache.stats().items():
            print(f"  {k}: {v}")
    
    def cleanup(self):
        """Cleanup resources"""
        self.embedding_cache.save()
        self.batch_processor.shutdown()


# ============================================================================
# LATENCY BENCHMARK SUITE
# ============================================================================

class LatencyBenchmark:
    """
    Benchmark suite for measuring pipeline latency
    """
    
    def __init__(self):
        self.results = []
    
    def benchmark_embedding_model(self, model, texts: List[str], 
                                   iterations: int = 5) -> Dict:
        """Benchmark embedding generation"""
        times = []
        
        for _ in range(iterations):
            start = time.perf_counter()
            _ = model.encode(texts)
            elapsed = (time.perf_counter() - start) * 1000
            times.append(elapsed)
        
        return {
            'operation': 'embedding_generation',
            'texts_count': len(texts),
            'iterations': iterations,
            'mean_ms': round(np.mean(times), 2),
            'min_ms': round(min(times), 2),
            'max_ms': round(max(times), 2),
            'std_ms': round(np.std(times), 2),
            'throughput_texts_per_sec': round(len(texts) / (np.mean(times) / 1000), 2)
        }
    
    def benchmark_vector_search(self, collection, queries: List[str],
                                 n_results: int = 5, 
                                 iterations: int = 5) -> Dict:
        """Benchmark vector search"""
        times = []
        
        for _ in range(iterations):
            start = time.perf_counter()
            for query in queries:
                _ = collection.query(query_texts=[query], n_results=n_results)
            elapsed = (time.perf_counter() - start) * 1000
            times.append(elapsed)
        
        return {
            'operation': 'vector_search',
            'queries_count': len(queries),
            'n_results': n_results,
            'iterations': iterations,
            'mean_ms': round(np.mean(times), 2),
            'min_ms': round(min(times), 2),
            'max_ms': round(max(times), 2),
            'qps': round(len(queries) / (np.mean(times) / 1000), 2)  # Queries per second
        }
    
    def benchmark_llm_inference(self, model, tokenizer, 
                                 prompts: List[str],
                                 max_new_tokens: int = 150,
                                 iterations: int = 3) -> Dict:
        """Benchmark LLM inference"""
        if not TORCH_AVAILABLE:
            return {'error': 'PyTorch not available'}
        
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        times = []
        token_counts = []
        
        for prompt in prompts[:iterations]:
            inputs = tokenizer(
                prompt,
                return_tensors="pt",
                truncation=True,
                max_length=512
            ).to(device)
            
            input_tokens = inputs['input_ids'].shape[1]
            
            start = time.perf_counter()
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    do_sample=True,
                    temperature=0.8,
                    pad_token_id=tokenizer.eos_token_id
                )
            elapsed = (time.perf_counter() - start) * 1000
            
            output_tokens = outputs.shape[1] - input_tokens
            times.append(elapsed)
            token_counts.append(output_tokens)
        
        avg_tokens = np.mean(token_counts)
        avg_time = np.mean(times)
        
        return {
            'operation': 'llm_inference',
            'device': device,
            'max_new_tokens': max_new_tokens,
            'iterations': len(times),
            'mean_ms': round(avg_time, 2),
            'min_ms': round(min(times), 2),
            'max_ms': round(max(times), 2),
            'avg_tokens_generated': round(avg_tokens, 1),
            'tokens_per_second': round(avg_tokens / (avg_time / 1000), 2)
        }
    
    def run_full_benchmark(self, pipeline_components: Dict) -> Dict:
        """Run comprehensive benchmark suite"""
        results = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'benchmarks': {}
        }
        
        if 'embedding_model' in pipeline_components:
            test_texts = ["Sample text for embedding " * 10] * 10
            results['benchmarks']['embedding'] = self.benchmark_embedding_model(
                pipeline_components['embedding_model'],
                test_texts
            )
        
        if 'model' in pipeline_components and 'tokenizer' in pipeline_components:
            test_prompts = ["Generate a course outcome for database management: CO1"] * 3
            results['benchmarks']['llm_inference'] = self.benchmark_llm_inference(
                pipeline_components['model'],
                pipeline_components['tokenizer'],
                test_prompts
            )
        
        return results
    
    def format_benchmark_report(self, results: Dict) -> str:
        """Format benchmark results as a report"""
        lines = ["\n" + "=" * 70]
        lines.append("LATENCY BENCHMARK REPORT")
        lines.append("=" * 70)
        lines.append(f"Timestamp: {results.get('timestamp', 'N/A')}")
        
        for name, bench in results.get('benchmarks', {}).items():
            lines.append(f"\n📊 {name.upper()}")
            lines.append("-" * 40)
            for k, v in bench.items():
                lines.append(f"  {k}: {v}")
        
        lines.append("\n" + "=" * 70)
        return "\n".join(lines)


# ============================================================================
# QUICK TEST
# ============================================================================

if __name__ == "__main__":
    print("Testing Latency Optimizer Components...")
    
    # Test profiler
    profiler = LatencyProfiler()
    
    @profiler.profile("test_function")
    def test_fn():
        time.sleep(0.01)
        return "done"
    
    for _ in range(5):
        test_fn()
    
    print(profiler.report())
    
    # Test cache
    cache = EmbeddingCache(max_size=100)
    cache.set("test text", np.array([0.1, 0.2, 0.3]))
    cached = cache.get("test text")
    print(f"\n✅ Cache test: {cached is not None}")
    print(f"   Cache stats: {cache.stats()}")
    
    # Test model optimizer
    optimizer = ModelOptimizer()
    print(f"\n✅ Optimal device: {optimizer.device}")
    print(f"   Inference config: {optimizer.get_inference_config()}")

