from fastapi import APIRouter, HTTPException, Query, Depends, Header
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
import uuid
import aiohttp
import os
from ..services.session_service import SessionService
from ..services.download_service import DownloadService
from ..services.cleanup_service import CleanupService
from ..middleware.device_verification import verify_device_fingerprint
from ..utils.logger import setup_logger
from ..config.env import config

logger = setup_logger()
router = APIRouter(prefix="/api", tags=["public"])

session_service = SessionService()
download_service = DownloadService()
cleanup_service = CleanupService()

class SessionRequest(BaseModel):
    pass

class MetadataRequest(BaseModel):
    url: str
    session_id: str

class DownloadRequest(BaseModel):
    url: str
    session_id: str
    quality: str = "best"

class SavePathRequest(BaseModel):
    session_id: str
    path: str

@router.get("/health")
async def health_check():
    return {
        "success": True,
        "message": "Backend is running",
        "environment": config.node_env
    }

@router.get("/session")
async def get_session():
    try:
        session_id = str(uuid.uuid4())
        session = await session_service.create_session(session_id)

        return {
            "success": True,
            "session_id": session_id,
            "expires_at": session.get("expires_at")
        }
    except Exception as e:
        logger.error(f"Session creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/metadata")
async def get_metadata(
    request: MetadataRequest,
    x_device_fingerprint: str = Header(None, alias="X-Device-Fingerprint"),
):
    try:
        # Verify device fingerprint
        await verify_device_fingerprint(request.session_id, x_device_fingerprint)

        metadata = await download_service.get_metadata(request.url)

        return {
            "success": True,
            "metadata": metadata
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Metadata fetch error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/download")
async def start_download(
    request: DownloadRequest,
    x_device_fingerprint: str = Header(None, alias="X-Device-Fingerprint"),
):
    try:
        # Verify device fingerprint
        await verify_device_fingerprint(request.session_id, x_device_fingerprint)

        download_id = str(uuid.uuid4())

        download = await download_service.queue_download(
            download_id=download_id,
            session_id=request.session_id,
            url=request.url,
            quality=request.quality
        )

        return {
            "success": True,
            "download_id": download_id,
            "status": "queued"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download queue error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/download/{download_id}")
async def get_download_status(download_id: str, session_id: str = Query(...)):
    try:
        download = await download_service.get_download_status(download_id, session_id)

        return {
            "success": True,
            "download": download
        }
    except Exception as e:
        logger.error(f"Download status error: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/downloads")
async def list_downloads(
    session_id: str = Query(...),
    x_device_fingerprint: str = Header(None, alias="X-Device-Fingerprint"),
):
    try:
        # Verify device fingerprint
        await verify_device_fingerprint(session_id, x_device_fingerprint)

        downloads = await download_service.list_downloads(session_id)

        return {
            "success": True,
            "downloads": downloads
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Downloads list error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/download/{download_id}/file")
async def download_file(download_id: str, session_id: str = Query(...)):
    try:
        file_path = await download_service.get_download_file(download_id, session_id)

        return {
            "success": True,
            "file_url": file_path
        }
    except Exception as e:
        logger.error(f"Download file error: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/download/{download_id}/stream")
async def stream_download(download_id: str, session_id: str = Query(...)):
    try:
        file_url = await download_service.get_download_file(download_id, session_id)

        if not file_url:
            raise ValueError("File URL not found")

        async def generate():
            async with aiohttp.ClientSession() as session:
                async with session.get(file_url) as resp:
                    if resp.status == 200:
                        async for chunk in resp.content.iter_chunked(8192):
                            yield chunk
                    else:
                        raise ValueError(f"Failed to fetch file: {resp.status}")

        filename = f"{download_id}.mp4"
        return StreamingResponse(
            generate(),
            media_type="video/mp4",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error(f"Stream download error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/save-path")
async def set_save_path(request: SavePathRequest):
    if config.node_env == "production":
        return {
            "success": False,
            "message": "Folder selection not available in production",
            "path": "/tmp"
        }

    try:
        await session_service.set_save_path(request.session_id, request.path)

        return {
            "success": True,
            "message": "Save path updated",
            "path": request.path
        }
    except Exception as e:
        logger.error(f"Save path error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/session/end")
async def end_session(session_id: str = Query(...)):
    try:
        # Use cleanup service for immediate cleanup of session and related data
        await cleanup_service.cleanup_session_immediate(session_id)

        return {
            "success": True,
            "message": "Session ended and all data deleted"
        }
    except Exception as e:
        logger.error(f"Session end error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
