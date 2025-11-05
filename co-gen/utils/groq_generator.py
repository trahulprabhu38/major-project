"""
Groq API integration for CO generation using RAG
"""
import json
import re
import logging
from typing import List, Dict, Optional
from groq import Groq

from config import settings

logger = logging.getLogger(__name__)


class GroqCOGenerator:
    """Generate Course Outcomes using Groq LLM with RAG"""

    def __init__(self):
        """Initialize Groq client"""
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL
        logger.info(f"Initialized Groq client with model: {self.model}")

    def generate_cos_from_full_syllabus(
        self,
        syllabus_text: str,
        course_name: str,
        num_cos: int = 5,
        temperature: float = None
    ) -> List[Dict]:
        """
        Generate Course Outcomes from FULL syllabus text using Groq.
        This is the accurate method that matches the original CO folder logic.
        """
        temperature = temperature or settings.DEFAULT_TEMPERATURE

        # Create the prompt (matching original CO folder exactly)
        system_prompt = self._create_system_prompt(num_cos)
        user_prompt = self._create_user_prompt(course_name, syllabus_text, num_cos)

        try:
            logger.info(f"Generating {num_cos} COs using Groq API with full syllabus")

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=1024,
                seed=settings.DEFAULT_SEED
            )

            raw_output = response.choices[0].message.content
            logger.info("Received response from Groq API")

            # Parse the output
            cos = self._parse_co_output(raw_output, num_cos)

            # Add metadata
            for i, co in enumerate(cos):
                co['co_number'] = i + 1
                co['source'] = 'groq_generated'
                co['model'] = self.model
                co['verified'] = False  # COs start as unverified

            logger.info(f"Successfully generated {len(cos)} COs from full syllabus")
            return cos

        except Exception as e:
            logger.error(f"Failed to generate COs with Groq: {e}")
            # Return fallback COs
            return self._generate_fallback_cos(num_cos, course_name)

    def generate_cos_from_contexts(
        self,
        contexts: List[Dict],
        course_name: str,
        num_cos: int = 5,
        temperature: float = None
    ) -> List[Dict]:
        """
        Generate Course Outcomes from retrieved contexts using Groq.
        DEPRECATED: Use generate_cos_from_full_syllabus for accurate results.
        """
        temperature = temperature or settings.DEFAULT_TEMPERATURE

        # Combine contexts into syllabus text
        syllabus_text = "\n\n".join([
            f"{ctx['document']}"
            for ctx in contexts[:10]  # Use top 10 contexts
        ])

        # Delegate to the full syllabus method
        return self.generate_cos_from_full_syllabus(
            syllabus_text=syllabus_text,
            course_name=course_name,
            num_cos=num_cos,
            temperature=temperature
        )

    def _create_system_prompt(self, num_cos: int) -> str:
        """Create system prompt for CO generation - matches original CO folder exactly"""
        return f"""You are an expert curriculum designer. Given only the Syllabus text, produce exactly {num_cos} Course Outcomes (COs). Return them as a JSON array of objects like [{{"CO1": "..."}}, {{"CO2": "..."}}, ...]. Each CO must be 2 sentences and progressively higher Bloom levels(Level 4-6)."""

    def _create_user_prompt(self, course_name: str, syllabus_text: str, num_cos: int) -> str:
        """Create user prompt with syllabus context"""
        return f"""Syllabus:
{syllabus_text}

Now produce the COs as described (JSON array only)."""

    def _parse_co_output(self, raw_output: str, expected_count: int) -> List[Dict]:
        """Parse Groq output to extract COs"""
        try:
            # Try to extract JSON array
            json_match = self._extract_json_array(raw_output)

            if json_match:
                parsed = json.loads(json_match)

                # Normalize the parsed output
                cos = []
                for item in parsed:
                    if isinstance(item, dict):
                        # Extract CO text and bloom level
                        keys = list(item.keys())

                        # Find CO text
                        co_text = None
                        bloom_level = item.get('bloom_level', 'Apply')

                        for key in keys:
                            if key.startswith('CO') or key.isdigit():
                                co_text = item[key]
                                break

                        if co_text:
                            cos.append({
                                'co_text': co_text.strip(),
                                'bloom_level': bloom_level,
                                'verified': False
                            })

                if len(cos) >= expected_count:
                    return cos[:expected_count]
                elif cos:
                    # Pad with generic COs if needed
                    while len(cos) < expected_count:
                        cos.append({
                            'co_text': f"Students will be able to apply concepts from topic {len(cos) + 1} effectively.",
                            'bloom_level': 'Apply',
                            'verified': False
                        })
                    return cos

        except Exception as e:
            logger.warning(f"JSON parsing failed: {e}")

        # Fallback: Try to extract COs using regex
        return self._extract_cos_with_regex(raw_output, expected_count)

    def _extract_json_array(self, text: str) -> Optional[str]:
        """Extract first balanced JSON array from text"""
        start = text.find('[')
        if start == -1:
            return None

        depth = 0
        for i in range(start, len(text)):
            if text[i] == '[':
                depth += 1
            elif text[i] == ']':
                depth -= 1
                if depth == 0:
                    return text[start:i+1]

        return None

    def _extract_cos_with_regex(self, text: str, expected_count: int) -> List[Dict]:
        """Extract COs using regex patterns"""
        cos = []

        # Pattern: CO1: text or CO1. text or CO1) text
        pattern = r'CO\s*(\d+)\s*[:\.\)]\s*(.+?)(?=CO\s*\d+\s*[:\.\)]|\Z)'
        matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)

        for match in matches:
            co_text = match.group(2).strip()
            # Clean up
            co_text = re.sub(r'\n+', ' ', co_text)
            co_text = re.sub(r'\s+', ' ', co_text)

            cos.append({
                'co_text': co_text,
                'bloom_level': self._infer_bloom_level(co_text),
                'verified': False
            })

        if cos and len(cos) >= expected_count:
            return cos[:expected_count]

        # Last resort: split by lines
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        for i, line in enumerate(lines[:expected_count]):
            # Remove numbering
            line = re.sub(r'^[\d\.\)\-\*]+\s*', '', line)
            if len(line) > 20:  # Meaningful content
                cos.append({
                    'co_text': line,
                    'bloom_level': self._infer_bloom_level(line),
                    'verified': False
                })

        # Ensure we have expected count
        while len(cos) < expected_count:
            cos.append({
                'co_text': f"Students will be able to understand and apply key concepts from section {len(cos) + 1}.",
                'bloom_level': 'Apply',
                'verified': False
            })

        return cos[:expected_count]

    def _infer_bloom_level(self, text: str) -> str:
        """Infer Bloom's level from CO text based on action verbs"""
        text_lower = text.lower()

        # Bloom's taxonomy verb mapping
        bloom_verbs = {
            'Remember': ['recall', 'recognize', 'identify', 'define', 'list', 'name', 'state'],
            'Understand': ['explain', 'describe', 'summarize', 'interpret', 'classify', 'discuss'],
            'Apply': ['apply', 'implement', 'execute', 'use', 'demonstrate', 'solve', 'operate'],
            'Analyze': ['analyze', 'compare', 'contrast', 'examine', 'differentiate', 'investigate'],
            'Evaluate': ['evaluate', 'assess', 'judge', 'critique', 'justify', 'argue', 'defend'],
            'Create': ['create', 'design', 'develop', 'construct', 'formulate', 'compose', 'plan']
        }

        # Check for verbs in order of preference (higher levels first)
        for level in ['Create', 'Evaluate', 'Analyze', 'Apply', 'Understand', 'Remember']:
            for verb in bloom_verbs[level]:
                if verb in text_lower:
                    return level

        return 'Apply'  # Default

    def _generate_fallback_cos(self, num_cos: int, course_name: str) -> List[Dict]:
        """Generate fallback COs if Groq fails"""
        logger.warning("Using fallback CO generation")

        bloom_levels = ['Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
        fallback_templates = [
            f"Students will be able to understand fundamental concepts of {course_name}.",
            f"Students will be able to apply key principles and techniques in {course_name}.",
            f"Students will be able to analyze complex problems in the domain of {course_name}.",
            f"Students will be able to evaluate different approaches and solutions in {course_name}.",
            f"Students will be able to design and develop innovative solutions in {course_name}."
        ]

        cos = []
        for i in range(num_cos):
            cos.append({
                'co_text': fallback_templates[i % len(fallback_templates)],
                'bloom_level': bloom_levels[i % len(bloom_levels)],
                'verified': False,
                'source': 'fallback'
            })

        return cos


# Singleton instance
_groq_generator: Optional[GroqCOGenerator] = None


def get_groq_generator() -> GroqCOGenerator:
    """Get or create Groq generator singleton"""
    global _groq_generator
    if _groq_generator is None:
        _groq_generator = GroqCOGenerator()
    return _groq_generator
