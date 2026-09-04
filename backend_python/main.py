import os
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from dotenv import load_dotenv

from .config.env import config
from .routes.public_routes import router as public_router
from .routes.admin_routes import router as admin_router
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

# Get absolute path to frontend build directory
def get_frontend_path():
    # Get the absolute path to the backend_python directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up to project root, then into frontend/build
    project_root = os.path.dirname(backend_dir)
    return os.path.join(project_root, "frontend", "build")

FRONTEND_PATH = get_frontend_path()
logger.info(f"Frontend path: {FRONTEND_PATH}, exists: {os.path.exists(FRONTEND_PATH)}")

# Include routes (must be BEFORE catch-all)
app.include_router(public_router)
app.include_router(admin_router)

# Root path
@app.get("/", name="root")
async def serve_root():
    """Serve React app root"""
    index_path = os.path.join(FRONTEND_PATH, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path, media_type="text/html")
    return JSONResponse(
        status_code=404,
        content={"success": False, "message": f"Frontend not found at {FRONTEND_PATH}", "code": 404}
    )

# Catch-all route for serving React app (SPA fallback) - MUST BE LAST
@app.get("/{full_path:path}", name="spa_fallback")
async def serve_spa(full_path: str):
    """Serve React app for all non-API routes"""
    # Try to serve static file first
    file_path = os.path.join(FRONTEND_PATH, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    # Fallback to index.html for SPA routing
    index_path = os.path.join(FRONTEND_PATH, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path, media_type="text/html")

    return JSONResponse(
        status_code=404,
        content={"success": False, "message": "Not found", "code": 404}
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
