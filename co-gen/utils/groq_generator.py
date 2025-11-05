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

    def generate_cos_from_contexts(
        self,
        contexts: List[Dict],
        course_name: str,
        num_cos: int = 5,
        temperature: float = None
    ) -> List[Dict]:
        """
        Generate Course Outcomes from retrieved contexts using Groq
        """
        temperature = temperature or settings.DEFAULT_TEMPERATURE

        # Combine contexts into syllabus text
        syllabus_text = "\n\n".join([
            f"[Context {i+1}]: {ctx['document']}"
            for i, ctx in enumerate(contexts[:10])  # Use top 10 contexts
        ])

        # Create the prompt
        system_prompt = self._create_system_prompt(num_cos)
        user_prompt = self._create_user_prompt(course_name, syllabus_text, num_cos)

        try:
            logger.info(f"Generating {num_cos} COs using Groq API")

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=2048,
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

            logger.info(f"Successfully generated {len(cos)} COs")
            return cos

        except Exception as e:
            logger.error(f"Failed to generate COs with Groq: {e}")
            # Return fallback COs
            return self._generate_fallback_cos(num_cos, course_name)

    def _create_system_prompt(self, num_cos: int) -> str:
        """Create system prompt for CO generation"""
        return f"""You are an expert curriculum designer specializing in Outcome-Based Education (OBE).

Your task is to generate exactly {num_cos} high-quality Course Outcomes (COs) based on the provided syllabus content.

Requirements for each CO:
1. Use Bloom's Taxonomy levels (Apply, Analyze, Evaluate, or Create preferred)
2. Each CO should be 1-2 clear, concise sentences
3. Start with action verbs appropriate to the Bloom level
4. Be specific and measurable
5. Cover different aspects of the course content

Output format - Return ONLY a JSON array:
[
  {{"CO1": "Students will be able to...", "bloom_level": "Apply"}},
  {{"CO2": "Students will be able to...", "bloom_level": "Analyze"}},
  ...
]

Use these Bloom's Taxonomy levels and appropriate verbs:
- Remember: recall, recognize, identify
- Understand: explain, describe, summarize
- Apply: implement, execute, use, demonstrate
- Analyze: compare, contrast, examine, differentiate
- Evaluate: assess, judge, critique, justify
- Create: design, develop, construct, formulate"""

    def _create_user_prompt(self, course_name: str, syllabus_text: str, num_cos: int) -> str:
        """Create user prompt with syllabus context"""
        return f"""Course: {course_name}

Syllabus Content:
{syllabus_text}

Based on the above syllabus content, generate exactly {num_cos} Course Outcomes that:
- Cover the main topics and concepts from the syllabus
- Use appropriate Bloom's Taxonomy levels (prefer Apply and above)
- Are specific, measurable, and achievable
- Progress from foundational to advanced concepts

Return ONLY the JSON array, no additional text."""

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
