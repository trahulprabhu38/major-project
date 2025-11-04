"""
Model runner for CO generation using HuggingFace models
"""
import os
import logging
from typing import List, Optional, AsyncGenerator
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
import asyncio

logger = logging.getLogger(__name__)


class ModelRunner:
    """Run ML models for CO generation"""

    def __init__(self, model_name: str = None):
        """
        Initialize model runner

        Args:
            model_name: HuggingFace model name
        """
        if model_name is None:
            model_name = os.getenv("MODEL_PATH", "google/flan-t5-base")

        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self.tokenizer = None
        self.pipeline = None
        self.loaded = False

        logger.info(f"Initializing model runner with {model_name} on {self.device}")

    def load_model(self):
        """Load the model and tokenizer"""
        if self.loaded:
            logger.info("Model already loaded")
            return True

        try:
            logger.info(f"Loading model: {self.model_name}")

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

            # Load model
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None
            )

            if self.device == "cpu":
                self.model = self.model.to(self.device)

            # Create pipeline
            self.pipeline = pipeline(
                "text2text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self.device == "cuda" else -1
            )

            self.loaded = True
            logger.info(f"Model loaded successfully on {self.device}")
            return True

        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            self.loaded = False
            return False

    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.loaded

    async def generate(
        self,
        prompt: str,
        max_new_tokens: int = 512,
        temperature: float = 0.2,
        num_return_sequences: int = 1
    ) -> str:
        """
        Generate text from prompt (async) with deterministic parameters

        Args:
            prompt: Input prompt
            max_new_tokens: Maximum NEW tokens to generate (not total length)
            temperature: Sampling temperature (0.2 for more deterministic)
            num_return_sequences: Number of sequences to generate

        Returns:
            Generated text
        """
        if not self.loaded:
            if not self.load_model():
                raise RuntimeError("Model not loaded")

        try:
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self._generate_sync,
                prompt,
                max_new_tokens,
                temperature,
                num_return_sequences
            )

            return result

        except Exception as e:
            logger.error(f"Generation error: {str(e)}")
            raise

    def _generate_sync(
        self,
        prompt: str,
        max_new_tokens: int,
        temperature: float,
        num_return_sequences: int
    ) -> str:
        """
        Synchronous generation with deterministic settings

        Uses max_new_tokens instead of max_length to preserve context.
        Temperature set to 0.2 for more focused, deterministic outputs.
        """
        try:
            # Tokenize
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                truncation=True,
                max_length=1024  # Keep input truncation
            ).to(self.device)

            # Generate with deterministic parameters
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,  # Use max_new_tokens, not max_length
                temperature=temperature,  # Lower temp for determinism
                num_return_sequences=num_return_sequences,
                do_sample=True,
                top_p=0.9,
                no_repeat_ngram_size=3,
                early_stopping=True,  # Stop when done
                pad_token_id=self.tokenizer.pad_token_id or self.tokenizer.eos_token_id
            )

            # Decode
            generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

            return generated_text

        except Exception as e:
            logger.error(f"Synchronous generation error: {str(e)}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        max_length: int = 512,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """
        Generate text with streaming (async generator)

        Args:
            prompt: Input prompt
            max_length: Maximum output length
            temperature: Sampling temperature

        Yields:
            Generated text chunks
        """
        if not self.loaded:
            if not self.load_model():
                raise RuntimeError("Model not loaded")

        try:
            # For T5 models, streaming is simulated since they don't support native streaming
            # Generate full text and yield in chunks
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self._generate_sync,
                prompt,
                max_length,
                temperature,
                1
            )

            # Yield in word chunks for streaming effect
            words = result.split()
            chunk_size = 3  # Words per chunk

            for i in range(0, len(words), chunk_size):
                chunk = ' '.join(words[i:i+chunk_size])
                yield chunk + ' '
                await asyncio.sleep(0.1)  # Small delay for streaming effect

        except Exception as e:
            logger.error(f"Streaming generation error: {str(e)}")
            raise

    def generate_cos_batch(
        self,
        prompts: List[str],
        max_new_tokens: int = 512
    ) -> List[str]:
        """
        Generate COs for multiple prompts (batch processing)

        Args:
            prompts: List of prompts
            max_new_tokens: Maximum new tokens to generate

        Returns:
            List of generated texts
        """
        if not self.loaded:
            if not self.load_model():
                raise RuntimeError("Model not loaded")

        try:
            results = []

            for prompt in prompts:
                result = self._generate_sync(prompt, max_new_tokens, 0.2, 1)
                results.append(result)

            logger.info(f"Generated {len(results)} CO batches")
            return results

        except Exception as e:
            logger.error(f"Batch generation error: {str(e)}")
            raise

    def unload_model(self):
        """Unload model to free memory"""
        if self.loaded:
            del self.model
            del self.tokenizer
            del self.pipeline

            if torch.cuda.is_available():
                torch.cuda.empty_cache()

            self.loaded = False
            logger.info("Model unloaded")


# Global model instance
_model_runner = None


def get_model_runner() -> ModelRunner:
    """Get or create global model runner"""
    global _model_runner
    if _model_runner is None:
        _model_runner = ModelRunner()
        # Pre-load model on startup
        _model_runner.load_model()
    return _model_runner
