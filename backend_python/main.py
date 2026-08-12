import os
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv

from .config.env import config
from .routes.public_routes import router as public_router
from .utils.logger import setup_logger
from .services.cleanup_service import CleanupService

# Load environment variables
load_dotenv()

# Setup logger
logger = setup_logger()

# Create FastAPI app
app = FastAPI(
    title="Social Media Downloader",
    description="Download videos from Instagram, Facebook, Twitter, TikTok",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    logger.info(f"Server started on port {config.port} in {config.node_env} mode")

    # Initialize cleanup service for auto-deletion
    CleanupService()

    print(f"""
====================================================================
  Social Media Downloader Backend - Started Successfully
====================================================================
  Server: http://localhost:{config.port}
  Environment: {config.node_env}
  API Documentation:
    - Session: GET /api/session
    - Metadata: POST /api/metadata
    - Download: POST /api/download
    - Get Downloads: GET /api/downloads
    - Health: GET /api/health

  All downloads are session-based - No login required
  Auto-cleanup after 30 minutes - MongoDB & Cloudinary
  Cleanup runs every 5 minutes
====================================================================
    """)

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Server shutting down...")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} - {response.status_code}")
    return response

# Include routes
app.include_router(public_router)

# 404 handler
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "message": "Route not found",
            "code": 404
        }
    )

# Exception handler
@app.exception_handler(Exception)
async def exception_handler(request, exc):
    logger.error(f"Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": str(exc),
            "code": 500
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=config.port,
        reload=config.node_env == "development"
    )
