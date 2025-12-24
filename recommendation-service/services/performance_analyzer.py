"""
Performance analysis service - analyzes student marks and detects weak areas
"""

import pandas as pd
import numpy as np
import logging
from typing import List, Dict, Any
from core.config import settings

logger = logging.getLogger(__name__)


class PerformanceAnalyzer:
    """Analyzes student performance to identify weak questions"""
    
    def __init__(self):
        self.internal_co_map = settings.INTERNAL_CO_MAP
        self.or_pairs = settings.OR_PAIRS
    
    def analyze_from_csv(
        self,
        marks_file: str,
        student_id: str,
        internal_no: int,
        threshold: int
    ) -> List[str]:
        """Analyze performance from local CSV file"""
        try:
            # Load marks file
            if marks_file.lower().endswith(".csv"):
                df = pd.read_csv(marks_file, dtype=object, skiprows=2)
            else:
                df = pd.read_excel(marks_file, dtype=object, skiprows=2)
            
            # Find student row
            id_cols = ["USN", "usn", "student_id", "id", "roll", "rollno", "student"]
            id_col = next((c for c in df.columns if c in id_cols), None)
            
            if id_col is None and len(df.columns) > 1:
                id_col = df.columns[1]
            
            if id_col is None:
                logger.error("Could not find student ID column")
                return []
            
            # Find student
            mask = df[id_col].astype(str).str.strip().str.upper() == student_id.strip().upper()
            
            if mask.sum() == 0:
                mask = df[id_col].astype(str).str.upper().str.contains(
                    student_id.strip().upper(), na=False
                )
            
            if mask.sum() == 0:
                logger.warning(f"Student {student_id} not found in marks file")
                return []
            
            row = df[mask].iloc[0]
            
            # Analyze questions
            return self._analyze_questions(row, df, internal_no, threshold)
            
        except Exception as e:
            logger.error(f"Error analyzing from CSV: {str(e)}", exc_info=True)
            return []
    
    def analyze_from_backend_data(
        self,
        marks_data: List[Dict[str, Any]],
        internal_no: int,
        threshold: int
    ) -> List[str]:
        """Analyze performance from backend API data"""
        try:
            if not marks_data:
                return []
            
            # Backend data should have CO-level performance
            # We need to infer weak questions from CO performance
            weak_questions = []
            
            q_map = self.internal_co_map.get(internal_no, {})
            
            for record in marks_data:
                # If percentage < threshold*10 (converting to percentage)
                # mark the CO as weak and add its questions
                percentage = float(record.get("percentage", 0))
                co_number = record.get("co_number")
                
                if percentage < (threshold * 10):  # threshold is out of 10, percentage is out of 100
                    # Find questions mapped to this CO
                    for q, co in q_map.items():
                        if co == f"CO{co_number}":
                            weak_questions.append(q)
            
            return sorted(list(set(weak_questions)), key=lambda x: int(x))
            
        except Exception as e:
            logger.error(f"Error analyzing from backend data: {str(e)}", exc_info=True)
            return []
    
    def _analyze_questions(
        self,
        student_row: pd.Series,
        marks_df: pd.DataFrame,
        internal_no: int,
        threshold: int
    ) -> List[str]:
        """Analyze individual questions for weak areas"""
        q_map = self.internal_co_map.get(internal_no, {})
        question_flags = {}
        
        # Analyze each question
        for qtoken in q_map.keys():
            cols = self._find_question_columns(marks_df, qtoken)
            
            if not cols:
                # No columns found - treat as unanswered
                question_flags[int(qtoken)] = np.nan
            else:
                # Get scores from all parts (A, B, etc.)
                scores = []
                for col in cols:
                    raw = student_row[col]
                    if pd.isna(raw) or str(raw).strip() in ["", "nan", "na", "none", "None"]:
                        scores.append(np.nan)
                    else:
                        try:
                            scores.append(float(raw))
                        except:
                            scores.append(0.0)
                
                # Take max score across parts
                valid_scores = [s for s in scores if not pd.isna(s)]
                if valid_scores:
                    question_flags[int(qtoken)] = max(valid_scores)
                else:
                    question_flags[int(qtoken)] = np.nan
        
        # Apply OR pair logic
        weak_questions = set()
        
        # Compulsory questions (1 and 2)
        for q in [1, 2]:
            if q in question_flags:
                val = question_flags[q]
                if pd.isna(val) or val < threshold:
                    weak_questions.add(str(q))
        
        # OR pairs: if both are weak, mark both
        for a, b in self.or_pairs:
            a_val = question_flags.get(a, np.nan)
            b_val = question_flags.get(b, np.nan)
            
            a_ok = (not pd.isna(a_val)) and (a_val >= threshold)
            b_ok = (not pd.isna(b_val)) and (b_val >= threshold)
            
            if not (a_ok or b_ok):
                # Neither answered well
                if str(a) in q_map:
                    weak_questions.add(str(a))
                if str(b) in q_map:
                    weak_questions.add(str(b))
        
        return sorted(list(weak_questions), key=lambda x: int(x))
    
    def _find_question_columns(
        self,
        df: pd.DataFrame,
        question_token: str
    ) -> List[str]:
        """Find columns corresponding to a question (e.g., Q1A, Q1B)"""
        q = str(question_token).strip()
        cols = list(df.columns)
        matching = []
        
        patterns = [
            f"Q{q}A", f"Q{q}B", f"Q{q}a", f"Q{q}b",
            f"q{q}a", f"q{q}b", f"q{q}A", f"q{q}B"
        ]
        
        for col in cols:
            col_str = str(col).strip()
            if col_str in patterns:
                matching.append(col)
            elif col_str in [f"{q}A", f"{q}B", f"{q}a", f"{q}b"]:
                matching.append(col)
        
        return matching



