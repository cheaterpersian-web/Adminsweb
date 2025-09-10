#!/usr/bin/env python3
"""
Simple FastAPI app for testing
"""
import os
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

# Set environment variables for development
os.environ.setdefault("DATABASE_URL", "sqlite:///./dev.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SECRET_KEY", "dev-secret-key-change-in-production")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("API_PREFIX", "/api")
os.environ.setdefault("ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("ADMIN_PASSWORD", "admin123")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.core.config import get_settings
import simple_auth as auth

settings = get_settings()

app = FastAPI(
    title=settings.project_name,
    default_response_class=ORJSONResponse,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include only auth router for now
app.include_router(auth.router, prefix=settings.api_prefix, tags=["auth"])

@app.get("/")
async def root():
    return {"message": "Marzban Admin Panel API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "simple_main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )