from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from env import settings
from db import Base, engine, seed_if_needed
from routes.campaigns import router as campaigns_router

app = FastAPI(title="Massaging Queue Demo API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGINS] if settings.CORS_ORIGINS != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    if settings.SEED_ON_START:
        seed_if_needed()

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(campaigns_router, prefix="/campaigns", tags=["campaigns"])