"""
FastAPI microservice for CSV/XLSX file upload and PostgreSQL table creation.
Replaces the Streamlit app with a production-ready API service.
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import os
import tempfile
from typing import Optional
import logging
from datetime import datetime

from app.db import get_engine, test_connection, create_table_from_dataframe, insert_dataframe_to_table
from app.utils import sanitize_table_name, validate_file_extension, get_file_preview
from app.models import UploadResponse, HealthResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Flames.Blue CSV Upload API",
    description="Microservice for uploading CSV/XLSX files and creating PostgreSQL tables dynamically",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration - allow frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - health check"""
    return HealthResponse(
        status="healthy",
        message="Flames.Blue Upload Service is running",
        timestamp=datetime.utcnow()
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with database connection test"""
    try:
        db_connected = test_connection()
        if not db_connected:
            raise HTTPException(status_code=503, detail="Database connection failed")

        return HealthResponse(
            status="healthy",
            message="Service and database connection are healthy",
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")


@app.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    table_name: Optional[str] = None,
    if_exists: str = "replace"
):
    """
    Upload CSV or XLSX file and create a PostgreSQL table dynamically.

    Args:
        file: The CSV or XLSX file to upload
        table_name: Optional custom table name (defaults to sanitized filename)
        if_exists: What to do if table exists ('replace', 'append', 'fail')

    Returns:
        UploadResponse with success status, table details, and statistics
    """
    temp_file_path = None

    try:
        # Validate file extension
        file_ext = validate_file_extension(file.filename)
        logger.info(f"Processing file: {file.filename} (type: {file_ext})")

        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Read file into DataFrame
        if file_ext == '.csv':
            df = pd.read_csv(temp_file_path)
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(temp_file_path)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext}"
            )

        # Check if DataFrame is empty
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty or contains no valid data"
            )

        # Sanitize table name
        final_table_name = sanitize_table_name(table_name or file.filename)
        logger.info(f"Using table name: {final_table_name}")

        # Get database engine
        engine = get_engine()

        # Create table and insert data
        create_table_from_dataframe(df, final_table_name, engine, if_exists=if_exists)
        rows_inserted = insert_dataframe_to_table(df, final_table_name, engine, if_exists=if_exists)

        # Get preview data
        preview = get_file_preview(df, max_rows=5)

        # Build response
        response = UploadResponse(
            success=True,
            message=f"File uploaded successfully and table '{final_table_name}' created in PostgreSQL",
            table_name=final_table_name,
            row_count=len(df),
            column_count=len(df.columns),
            columns=df.columns.tolist(),
            data_types={col: str(dtype) for col, dtype in df.dtypes.items()},
            preview=preview,
            if_exists_action=if_exists
        )

        logger.info(f"Successfully created table '{final_table_name}' with {rows_inserted} rows")
        return response

    except pd.errors.EmptyDataError:
        logger.error("Empty or invalid file uploaded")
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty or invalid"
        )
    except pd.errors.ParserError as e:
        logger.error(f"File parsing error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse file: {str(e)}"
        )
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.debug(f"Cleaned up temp file: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temp file: {str(e)}")


@app.post("/upload/batch")
async def upload_multiple_files(files: list[UploadFile] = File(...)):
    """
    Upload multiple CSV/XLSX files at once.
    Each file will be processed independently and create its own table.

    Args:
        files: List of CSV or XLSX files to upload

    Returns:
        Dictionary with results for each file
    """
    results = []
    errors = []

    for file in files:
        try:
            result = await upload_file(file)
            results.append({
                "filename": file.filename,
                "status": "success",
                "data": result.dict()
            })
        except HTTPException as e:
            errors.append({
                "filename": file.filename,
                "status": "error",
                "error": e.detail
            })
        except Exception as e:
            errors.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e)
            })

    return JSONResponse(
        content={
            "total_files": len(files),
            "successful": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors
        },
        status_code=200 if not errors else 207  # 207 Multi-Status
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
