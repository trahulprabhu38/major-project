"""
Database connection and table management utilities for PostgreSQL.
"""
from sqlalchemy import create_engine, text, inspect, MetaData, Table, Column
from sqlalchemy.exc import SQLAlchemyError
import pandas as pd
import os
import logging

logger = logging.getLogger(__name__)

# Database configuration from environment variables
DB_USER = os.getenv("POSTGRES_USER", "admin")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
DB_HOST = os.getenv("POSTGRES_HOST", "postgres")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "edu")

# Construct database URL
DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Global engine instance
_engine = None


def get_engine():
    """
    Get or create SQLAlchemy engine instance (singleton pattern).

    Returns:
        Engine: SQLAlchemy engine connected to PostgreSQL
    """
    global _engine
    if _engine is None:
        try:
            _engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,  # Verify connections before using
                pool_size=5,
                max_overflow=10,
                echo=False  # Set to True for SQL query logging
            )
            logger.info(f"Database engine created: {DB_HOST}:{DB_PORT}/{DB_NAME}")
        except Exception as e:
            logger.error(f"Failed to create database engine: {str(e)}")
            raise
    return _engine


def test_connection():
    """
    Test database connection by executing a simple query.

    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {str(e)}")
        return False


def get_sqlalchemy_type(pandas_dtype):
    """
    Map pandas dtype to SQLAlchemy column type.

    Args:
        pandas_dtype: Pandas data type

    Returns:
        str: SQLAlchemy column type as string
    """
    from sqlalchemy import Integer, Float, Boolean, Text, DateTime, Date

    dtype_str = str(pandas_dtype)

    # Integer types
    if 'int' in dtype_str.lower():
        return 'INTEGER'
    # Float types
    elif 'float' in dtype_str.lower():
        return 'DOUBLE PRECISION'
    # Boolean types
    elif 'bool' in dtype_str.lower():
        return 'BOOLEAN'
    # Datetime types
    elif 'datetime' in dtype_str.lower():
        return 'TIMESTAMP'
    elif 'date' in dtype_str.lower():
        return 'DATE'
    # Default to TEXT for strings and unknown types
    else:
        return 'TEXT'


def create_table_from_dataframe(df, table_name, engine, if_exists='replace'):
    """
    Create a PostgreSQL table based on DataFrame schema.
    This function uses pandas' to_sql with the appropriate if_exists behavior.

    Args:
        df: Pandas DataFrame
        table_name: Name of the table to create
        engine: SQLAlchemy engine
        if_exists: What to do if table exists ('fail', 'replace', 'append')

    Returns:
        bool: True if successful

    Raises:
        ValueError: If if_exists parameter is invalid
        SQLAlchemyError: If table creation fails
    """
    if if_exists not in ['fail', 'replace', 'append']:
        raise ValueError("if_exists must be 'fail', 'replace', or 'append'")

    try:
        # Check if table exists
        inspector = inspect(engine)
        table_exists = inspector.has_table(table_name)

        if table_exists:
            if if_exists == 'fail':
                raise ValueError(f"Table '{table_name}' already exists and if_exists='fail'")
            elif if_exists == 'replace':
                logger.info(f"Table '{table_name}' exists - will be replaced")
            elif if_exists == 'append':
                logger.info(f"Table '{table_name}' exists - data will be appended")
        else:
            logger.info(f"Creating new table '{table_name}'")

        # Create table (pandas handles the SQL DDL)
        # Use head(0) to create structure without inserting data yet
        df.head(0).to_sql(
            table_name,
            con=engine,
            if_exists=if_exists,
            index=False
        )

        logger.info(f"Table '{table_name}' structure created successfully")
        return True

    except SQLAlchemyError as e:
        logger.error(f"Failed to create table '{table_name}': {str(e)}")
        raise


def insert_dataframe_to_table(df, table_name, engine, if_exists='append', chunksize=1000):
    """
    Insert DataFrame data into PostgreSQL table.

    Args:
        df: Pandas DataFrame with data to insert
        table_name: Name of the target table
        engine: SQLAlchemy engine
        if_exists: What to do if data exists ('replace' or 'append')
        chunksize: Number of rows to insert per batch

    Returns:
        int: Number of rows inserted

    Raises:
        SQLAlchemyError: If insertion fails
    """
    try:
        # Insert data in chunks for better performance
        df.to_sql(
            table_name,
            con=engine,
            if_exists=if_exists,
            index=False,
            method='multi',
            chunksize=chunksize
        )

        row_count = len(df)
        logger.info(f"Inserted {row_count} rows into table '{table_name}'")
        return row_count

    except SQLAlchemyError as e:
        logger.error(f"Failed to insert data into '{table_name}': {str(e)}")
        raise


def get_table_info(table_name, engine):
    """
    Get information about a specific table.

    Args:
        table_name: Name of the table
        engine: SQLAlchemy engine

    Returns:
        dict: Table information including columns and types
    """
    try:
        inspector = inspect(engine)

        if not inspector.has_table(table_name):
            return None

        columns = inspector.get_columns(table_name)
        pk_constraint = inspector.get_pk_constraint(table_name)

        return {
            'table_name': table_name,
            'columns': [
                {
                    'name': col['name'],
                    'type': str(col['type']),
                    'nullable': col['nullable'],
                    'default': col.get('default')
                }
                for col in columns
            ],
            'primary_key': pk_constraint.get('constrained_columns', [])
        }

    except Exception as e:
        logger.error(f"Failed to get info for table '{table_name}': {str(e)}")
        return None


def list_all_tables(engine):
    """
    List all tables in the database.

    Args:
        engine: SQLAlchemy engine

    Returns:
        list: List of table names
    """
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        logger.info(f"Found {len(tables)} tables in database")
        return tables
    except Exception as e:
        logger.error(f"Failed to list tables: {str(e)}")
        return []


def execute_query(query_str, engine):
    """
    Execute a raw SQL query and return results.

    Args:
        query_str: SQL query string
        engine: SQLAlchemy engine

    Returns:
        list: Query results as list of dictionaries
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query_str))
            # Convert to list of dicts
            columns = result.keys()
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
            return rows
    except Exception as e:
        logger.error(f"Query execution failed: {str(e)}")
        raise
