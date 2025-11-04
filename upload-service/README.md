# FastAPI CSV/XLSX Upload Service

A production-ready FastAPI microservice for uploading CSV and XLSX files and automatically creating PostgreSQL tables.

## Features

- 📤 Upload CSV and XLSX files via REST API
- 🗄️ Automatically create PostgreSQL tables from file structure
- 🔄 Support for multiple file formats (CSV, XLSX, XLS)
- 🛡️ Robust error handling and validation
- 📊 Data preview in API response
- 🐳 Fully containerized with Docker
- 📝 Auto-generated API documentation (Swagger/ReDoc)
- 🔍 Health check endpoints

## API Endpoints

### `POST /upload`
Upload a single CSV or XLSX file.

**Request:**
- Content-Type: multipart/form-data
- Body: file (CSV or XLSX)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "table_name": "student_marks",
  "row_count": 150,
  "column_count": 5,
  "columns": ["student_id", "name", "subject", "marks", "semester"],
  "data_types": {...},
  "preview": [...]
}
```

### `POST /upload/batch`
Upload multiple files at once.

### `GET /health`
Health check endpoint.

### `GET /docs`
Interactive API documentation (Swagger UI).

## Environment Variables

```env
POSTGRES_USER=admin
POSTGRES_PASSWORD=password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=edu
```

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8001
```

## Docker Deployment

```bash
# Build image
docker build -t upload-service .

# Run container
docker run -p 8001:8001 \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  upload-service
```

## Integration with Frontend

```javascript
const formData = new FormData();
formData.append("file", file);

const response = await axios.post("http://localhost:8001/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" }
});

console.log(response.data.table_name);
console.log(response.data.row_count);
```

## Architecture

- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: SQL toolkit and ORM
- **Pandas**: Data manipulation and analysis
- **PostgreSQL**: Relational database
- **Uvicorn**: ASGI server

## Security Notes

- File uploads are temporarily stored and cleaned up after processing
- Table names are sanitized to prevent SQL injection
- CORS is configured (update for production)
- File size limits should be configured at reverse proxy level
