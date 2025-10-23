from fastapi import FastAPI
from app.routes import upload, query

app = FastAPI(title="CO-PO Mapping Local API")

app.include_router(upload.router)
app.include_router(query.router)
