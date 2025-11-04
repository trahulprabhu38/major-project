"""
Prompt builder for CO generation
"""
import logging
from typing import List
import random

logger = logging.getLogger(__name__)


class PromptBuilder:
    """Build prompts for CO generation using Bloom's taxonomy"""

    def __init__(self, bloom_data: dict):
        """
        Initialize prompt builder

        Args:
            bloom_data: Bloom's taxonomy data dictionary
        """
        self.bloom_data = bloom_data
        self.bloom_levels = list(bloom_data.keys())

    def build_co_generation_prompt(
        self,
        context: str,
        n_co: int = 5,
        include_bloom_distribution: bool = True
    ) -> str:
        """
        Build prompt for CO generation

        Args:
            context: Retrieved syllabus context
            n_co: Number of COs to generate
            include_bloom_distribution: Whether to suggest Bloom level distribution

        Returns:
            Formatted prompt string
        """
        # Get sample verbs from each level
        bloom_examples = self._get_bloom_examples()

        # Build Bloom distribution suggestion
        if include_bloom_distribution and n_co >= 3:
            distribution = self._suggest_bloom_distribution(n_co)
            bloom_instruction = f"\n\nDistribute the COs across Bloom levels: {distribution}"
        else:
            bloom_instruction = ""

        prompt = f"""Based on the following syllabus content, generate {n_co} Course Outcomes (COs) that represent measurable learning objectives.

Each CO must:
1. Start with an action verb from Bloom's Taxonomy
2. Be a single, clear, measurable sentence
3. Reflect unique learning objectives from the syllabus
4. Be specific and achievable by students

Bloom's Taxonomy Levels and Example Verbs:
{bloom_examples}
{bloom_instruction}

Syllabus Content:
{context}

Generate {n_co} Course Outcomes in this format:
CO1: [Action verb] [learning objective]
CO2: [Action verb] [learning objective]
...

Ensure each CO is distinct and covers different aspects of the syllabus."""

        return prompt

    def _get_bloom_examples(self) -> str:
        """Get example verbs from each Bloom level"""
        examples = []
        for level, data in self.bloom_data.items():
            verbs = data.get("verbs", [])
            sample_verbs = random.sample(verbs, min(5, len(verbs)))
            examples.append(f"- {level}: {', '.join(sample_verbs)}")

        return "\n".join(examples)

    def _suggest_bloom_distribution(self, n_co: int) -> str:
        """
        Suggest distribution of COs across Bloom levels

        Args:
            n_co: Total number of COs

        Returns:
            Distribution string
        """
        # Default distribution strategy:
        # - Lower levels (Remember, Understand): 20-30%
        # - Middle levels (Apply, Analyze): 40-50%
        # - Higher levels (Evaluate, Create): 20-30%

        if n_co <= 3:
            return "Apply (1), Analyze (1), Create (1)"

        elif n_co == 4:
            return "Understand (1), Apply (1), Analyze (1), Evaluate (1)"

        elif n_co == 5:
            return "Understand (1), Apply (2), Analyze (1), Evaluate (1)"

        elif n_co == 6:
            return "Remember (1), Understand (1), Apply (2), Analyze (1), Create (1)"

        else:
            # For larger numbers, distribute proportionally
            lower = max(1, int(n_co * 0.25))
            middle = int(n_co * 0.50)
            higher = n_co - lower - middle

            return f"Lower levels (Remember/Understand): {lower}, Middle levels (Apply/Analyze): {middle}, Higher levels (Evaluate/Create): {higher}"

    def build_refinement_prompt(self, co_text: str, issue: str) -> str:
        """
        Build prompt for refining a CO

        Args:
            co_text: Original CO text
            issue: Description of what needs refinement

        Returns:
            Refinement prompt
        """
        bloom_examples = self._get_bloom_examples()

        prompt = f"""Refine the following Course Outcome to address this issue: {issue}

Current CO: {co_text}

Requirements:
1. Must start with a Bloom's Taxonomy action verb
2. Must be clear, measurable, and specific
3. Should be a single sentence
4. Should address the identified issue

Bloom's Taxonomy Verbs:
{bloom_examples}

Provide the refined CO:"""

        return prompt

    def build_context_query(self, n_co: int) -> str:
        """
        Build query for retrieving relevant context

        Args:
            n_co: Number of COs to generate

        Returns:
            Query string for vector search
        """
        query = f"course objectives learning outcomes topics covered {' '.join(self.bloom_levels)}"
        return query

    def extract_cos_from_response(self, response_text: str) -> List[str]:
        """
        Extract individual COs from model response

        Args:
            response_text: Raw model output

        Returns:
            List of CO strings
        """
        cos = []
        lines = response_text.split('\n')

        for line in lines:
            line = line.strip()

            # Look for CO patterns: "CO1:", "1.", "- CO", etc.
            if line.startswith(('CO', 'co', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-')):
                # Clean up the line
                # Remove prefixes like "CO1:", "1.", etc.
                cleaned = line
                for prefix in ['CO1:', 'CO2:', 'CO3:', 'CO4:', 'CO5:',
                              'CO6:', 'CO7:', 'CO8:', 'CO9:', 'CO10:',
                              'co1:', 'co2:', 'co3:', 'co4:', 'co5:',
                              '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.',
                              '- ', '* ']:
                    if cleaned.startswith(prefix):
                        cleaned = cleaned[len(prefix):].strip()

                # Skip if too short or doesn't contain action verb
                if len(cleaned) > 20 and any(verb in cleaned.lower() for verb in ['understand', 'apply', 'analyze', 'evaluate', 'create', 'explain', 'describe', 'develop', 'design']):
                    cos.append(cleaned)

        # If no COs found with pattern matching, try to split by periods
        if not cos and '.' in response_text:
            sentences = response_text.split('.')
            for sent in sentences:
                sent = sent.strip()
                if len(sent) > 20:
                    cos.append(sent + '.')

        logger.info(f"Extracted {len(cos)} COs from response")
        return cos
