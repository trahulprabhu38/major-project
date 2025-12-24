"""
Schema Validator for Marksheet Files
Validates file structure, columns, and data types
"""

import pandas as pd
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class SchemaValidator:
    """Validate marksheet schema and structure"""
    
    REQUIRED_COLUMNS = ['USN']  # Minimum required columns
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MIN_STUDENTS = 1
    MAX_STUDENTS = 500
    
    @classmethod
    def validate_file_size(cls, file_size: int) -> Tuple[bool, str]:
        """Validate file size"""
        if file_size > cls.MAX_FILE_SIZE:
            return False, f"File size exceeds maximum allowed size of {cls.MAX_FILE_SIZE / (1024*1024)}MB"
        return True, ""
    
    @classmethod
    def validate_columns(cls, df: pd.DataFrame) -> Tuple[bool, str]:
        """Validate required columns exist"""
        columns_upper = [col.upper().strip() for col in df.columns]
        
        # Check for USN column
        has_usn = any(
            usn_variant in columns_upper
            for usn_variant in ['USN', 'STUDENT USN', 'ROLL NO', 'ROLL NUMBER']
        )
        
        if not has_usn:
            return False, "Missing required column: USN (or equivalent)"
        
        return True, ""
    
    @classmethod
    def validate_student_count(cls, df: pd.DataFrame) -> Tuple[bool, str]:
        """Validate number of students"""
        count = len(df)
        
        if count < cls.MIN_STUDENTS:
            return False, f"File must contain at least {cls.MIN_STUDENTS} student(s)"
        
        if count > cls.MAX_STUDENTS:
            return False, f"File contains too many students (max: {cls.MAX_STUDENTS})"
        
        return True, ""
    
    @classmethod
    def validate_q_columns(cls, q_columns: List[str]) -> Tuple[bool, str]:
        """Validate question columns"""
        if not q_columns:
            return False, "No question columns (Q1, Q2, etc.) found in file"
        
        if len(q_columns) > 50:
            return False, f"Too many question columns ({len(q_columns)}), max allowed: 50"
        
        return True, ""
    
    @classmethod
    def validate_marks_data(cls, df: pd.DataFrame, q_columns: List[str]) -> Tuple[bool, str]:
        """Validate marks data in Q-columns"""
        for col in q_columns:
            # Check if column has any numeric data
            non_null = df[col].dropna()
            
            if len(non_null) == 0:
                continue  # Empty column is OK
            
            # Try converting to numeric
            try:
                pd.to_numeric(non_null, errors='coerce')
            except Exception as e:
                return False, f"Invalid marks data in column {col}: {e}"
        
        return True, ""
    
    @classmethod
    def validate_marksheet(
        cls,
        df: pd.DataFrame,
        q_columns: List[str],
        file_size: int
    ) -> Tuple[bool, List[str]]:
        """
        Validate complete marksheet
        Returns: (is_valid, list_of_errors)
        """
        errors = []
        
        # File size check
        is_valid, error = cls.validate_file_size(file_size)
        if not is_valid:
            errors.append(error)
        
        # Column check
        is_valid, error = cls.validate_columns(df)
        if not is_valid:
            errors.append(error)
        
        # Student count check
        is_valid, error = cls.validate_student_count(df)
        if not is_valid:
            errors.append(error)
        
        # Q-columns check
        is_valid, error = cls.validate_q_columns(q_columns)
        if not is_valid:
            errors.append(error)
        
        # Marks data check
        is_valid, error = cls.validate_marks_data(df, q_columns)
        if not is_valid:
            errors.append(error)
        
        is_valid = len(errors) == 0
        return is_valid, errors


# Singleton instance
schema_validator = SchemaValidator()
