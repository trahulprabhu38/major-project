from fastapi import APIRouter, UploadFile
import os
from app.services.extractor import extract_text
from app.services.embeddings import add_to_db

router = APIRouter()
UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload/")
async def upload_file(file: UploadFile):
    path = os.path.join(UPLOAD_DIR, file.filename)
    with open(path, "wb") as f:
        f.write(await file.read())

    text = extract_text(path)
    add_to_db(file.filename, text)

    return {"filename": file.filename, "status": "added_to_chromadb"}
