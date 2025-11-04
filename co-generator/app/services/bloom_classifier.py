"""
Bloom's Taxonomy Classifier for Course Outcomes
"""
import json
import os
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class BloomClassifier:
    """Classify course outcomes by Bloom's Taxonomy level"""

    def __init__(self, bloom_file_path: str = None):
        """
        Initialize classifier with Bloom's taxonomy data

        Args:
            bloom_file_path: Path to bloom_levels.json file
        """
        if bloom_file_path is None:
            # Default path relative to project root
            bloom_file_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "bloom_levels.json"
            )

        self.bloom_data = self._load_bloom_data(bloom_file_path)
        self.verb_to_level = self._create_verb_mapping()

    def _load_bloom_data(self, file_path: str) -> Dict:
        """Load Bloom's taxonomy data from JSON file"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            logger.info(f"Loaded Bloom's taxonomy data from {file_path}")
            return data
        except Exception as e:
            logger.error(f"Failed to load Bloom's data: {str(e)}")
            # Return default structure
            return {
                "Remember": {"verbs": ["recall", "list", "define", "identify"]},
                "Understand": {"verbs": ["explain", "describe", "discuss", "summarize"]},
                "Apply": {"verbs": ["apply", "use", "implement", "demonstrate"]},
                "Analyze": {"verbs": ["analyze", "compare", "examine", "distinguish"]},
                "Evaluate": {"verbs": ["evaluate", "judge", "critique", "assess"]},
                "Create": {"verbs": ["design", "create", "develop", "synthesize"]}
            }

    def _create_verb_mapping(self) -> Dict[str, str]:
        """
        Create a dictionary mapping verbs to Bloom levels

        Returns:
            Dictionary with verb: level mappings
        """
        verb_map = {}
        for level, data in self.bloom_data.items():
            verbs = data.get("verbs", [])
            for verb in verbs:
                verb_map[verb.lower()] = level

        logger.info(f"Created verb mapping with {len(verb_map)} verbs")
        return verb_map

    def classify(self, co_text: str) -> Tuple[str, float]:
        """
        Classify a course outcome by its Bloom level

        Args:
            co_text: Course outcome text

        Returns:
            Tuple of (bloom_level, confidence)
        """
        if not co_text:
            return "Unknown", 0.0

        # Convert to lowercase for matching
        text_lower = co_text.lower()

        # Split into words
        words = text_lower.split()

        # Find matching verbs
        matches = []
        for word in words:
            # Remove punctuation
            clean_word = word.strip('.,;:!?"\'')
            if clean_word in self.verb_to_level:
                level = self.verb_to_level[clean_word]
                matches.append((level, clean_word))

        if not matches:
            # No direct verb match - try partial matching
            for verb, level in self.verb_to_level.items():
                if verb in text_lower:
                    matches.append((level, verb))

        if not matches:
            logger.warning(f"No Bloom verb found in: {co_text[:50]}...")
            return "Apply", 0.5  # Default to Apply with low confidence

        # If multiple matches, use the first one (typically the action verb)
        # and give higher confidence
        level, verb = matches[0]
        confidence = 0.9 if len(matches) == 1 else 0.7

        logger.debug(f"Classified '{co_text[:50]}...' as {level} (verb: {verb})")
        return level, confidence

    def classify_batch(self, co_list: List[str]) -> List[Dict]:
        """
        Classify multiple course outcomes

        Args:
            co_list: List of CO texts

        Returns:
            List of dictionaries with co_text, bloom_level, confidence
        """
        results = []
        for co_text in co_list:
            level, confidence = self.classify(co_text)
            results.append({
                "co_text": co_text,
                "bloom_level": level,
                "confidence": confidence
            })

        return results

    def get_level_description(self, level: str) -> str:
        """
        Get description for a Bloom level

        Args:
            level: Bloom level name

        Returns:
            Description string
        """
        return self.bloom_data.get(level, {}).get("description", "")

    def get_level_verbs(self, level: str) -> List[str]:
        """
        Get verbs for a specific Bloom level

        Args:
            level: Bloom level name

        Returns:
            List of verbs
        """
        return self.bloom_data.get(level, {}).get("verbs", [])

    def get_all_levels(self) -> List[str]:
        """Get list of all Bloom levels"""
        return list(self.bloom_data.keys())

    def suggest_verbs_for_level(self, level: str, count: int = 5) -> List[str]:
        """
        Suggest action verbs for a given Bloom level

        Args:
            level: Bloom level
            count: Number of verbs to return

        Returns:
            List of suggested verbs
        """
        verbs = self.get_level_verbs(level)
        return verbs[:count] if verbs else []
