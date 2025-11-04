"""
Utility functions for file processing and validation.
"""
import re
import os
from typing import Dict, List, Any
import pandas as pd
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

# Supported file extensions
SUPPORTED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}


def sanitize_table_name(filename: str) -> str:
    """
    Sanitize filename to create a valid PostgreSQL table name.

    Rules:
    - Remove file extension
    - Convert to lowercase
    - Replace spaces and special characters with underscores
    - Remove consecutive underscores
    - Ensure it starts with a letter or underscore
    - Limit length to 63 characters (PostgreSQL limit)

    Args:
        filename: Original filename

    Returns:
        str: Sanitized table name

    Examples:
        >>> sanitize_table_name("Student Marks 2024.csv")
        'student_marks_2024'
        >>> sanitize_table_name("Course-Data (Final).xlsx")
        'course_data_final'
    """
    # Remove file extension
    name = os.path.splitext(filename)[0]

    # Convert to lowercase
    name = name.lower()

    # Replace spaces and special characters with underscores
    name = re.sub(r'[^a-z0-9_]', '_', name)

    # Remove consecutive underscores
    name = re.sub(r'_+', '_', name)

    # Remove leading/trailing underscores
    name = name.strip('_')

    # Ensure it starts with a letter or underscore (not a number)
    if name and name[0].isdigit():
        name = 'tbl_' + name

    # Limit length to 63 characters (PostgreSQL table name limit)
    if len(name) > 63:
        name = name[:63]

    # Ensure we have a valid name
    if not name:
        name = 'uploaded_table'

    return name


def validate_file_extension(filename: str) -> str:
    """
    Validate that the uploaded file has a supported extension.

    Args:
        filename: Name of the uploaded file

    Returns:
        str: File extension (e.g., '.csv', '.xlsx')

    Raises:
        HTTPException: If file extension is not supported
    """
    if not filename:
        raise HTTPException(
            status_code=400,
            detail="Filename cannot be empty"
        )

    _, ext = os.path.splitext(filename.lower())

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported types: {', '.join(SUPPORTED_EXTENSIONS)}"
        )

    return ext


def get_file_preview(df: pd.DataFrame, max_rows: int = 5) -> List[Dict[str, Any]]:
    """
    Get a preview of the DataFrame as a list of dictionaries.

    Args:
        df: Pandas DataFrame
        max_rows: Maximum number of rows to include in preview

    Returns:
        List[Dict]: List of row dictionaries
    """
    try:
        # Get first N rows
        preview_df = df.head(max_rows)

        # Convert to list of dicts, handling various data types
        preview = preview_df.to_dict('records')

        # Clean up any NaN or None values for JSON serialization
        cleaned_preview = []
        for row in preview:
            cleaned_row = {}
            for key, value in row.items():
                # Handle pandas NaN, None, NaT
                if pd.isna(value):
                    cleaned_row[key] = None
                # Handle pandas Timestamp
                elif isinstance(value, pd.Timestamp):
                    cleaned_row[key] = value.isoformat()
                # Handle numpy types
                elif hasattr(value, 'item'):
                    cleaned_row[key] = value.item()
                else:
                    cleaned_row[key] = value
            cleaned_preview.append(cleaned_row)

        return cleaned_preview

    except Exception as e:
        logger.warning(f"Failed to generate preview: {str(e)}")
        return []


def validate_dataframe(df: pd.DataFrame) -> tuple[bool, str]:
    """
    Validate DataFrame for upload.

    Args:
        df: Pandas DataFrame to validate

    Returns:
        tuple: (is_valid, error_message)
    """
    # Check if empty
    if df.empty:
        return False, "DataFrame is empty"

    # Check if has columns
    if len(df.columns) == 0:
        return False, "DataFrame has no columns"

    # Check for duplicate column names
    if df.columns.duplicated().any():
        duplicates = df.columns[df.columns.duplicated()].tolist()
        return False, f"Duplicate column names found: {duplicates}"

    # Check for invalid column names (empty strings)
    if any(col == '' or col is None for col in df.columns):
        return False, "Some columns have empty names"

    # All checks passed
    return True, ""


def get_dataframe_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Get statistical information about a DataFrame.

    Args:
        df: Pandas DataFrame

    Returns:
        dict: Statistics about the DataFrame
    """
    stats = {
        "row_count": len(df),
        "column_count": len(df.columns),
        "columns": df.columns.tolist(),
        "data_types": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "memory_usage_mb": df.memory_usage(deep=True).sum() / (1024 * 1024),
        "has_null_values": df.isnull().any().any(),
        "null_counts": df.isnull().sum().to_dict()
    }

    return stats


def clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean DataFrame column names to be PostgreSQL-friendly.

    Args:
        df: Pandas DataFrame

    Returns:
        DataFrame: DataFrame with cleaned column names
    """
    # Create a copy to avoid modifying original
    df = df.copy()

    # Clean each column name
    new_columns = []
    for col in df.columns:
        # Convert to string
        col_str = str(col)

        # Lowercase
        col_str = col_str.lower()

        # Replace spaces and special chars with underscores
        col_str = re.sub(r'[^a-z0-9_]', '_', col_str)

        # Remove consecutive underscores
        col_str = re.sub(r'_+', '_', col_str)

        # Remove leading/trailing underscores
        col_str = col_str.strip('_')

        # Ensure not empty
        if not col_str:
            col_str = f'column_{len(new_columns)}'

        # Ensure doesn't start with number
        if col_str[0].isdigit():
            col_str = 'col_' + col_str

        new_columns.append(col_str)

    # Handle duplicates by appending numbers
    seen = {}
    final_columns = []
    for col in new_columns:
        if col in seen:
            seen[col] += 1
            final_columns.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            final_columns.append(col)

    df.columns = final_columns
    return df


def format_bytes(bytes_value: int) -> str:
    """
    Format bytes into human-readable string.

    Args:
        bytes_value: Size in bytes

    Returns:
        str: Formatted string (e.g., "1.5 MB")
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.2f} {unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.2f} PB"
