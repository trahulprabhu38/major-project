from fastapi import APIRouter, Query
from app.services.embeddings import search_in_db

router = APIRouter()

@router.get("/search/")
def search_docs(query: str = Query(...)):
    results = search_in_db(query)
    return results
