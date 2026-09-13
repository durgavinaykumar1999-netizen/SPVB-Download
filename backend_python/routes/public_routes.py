from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
import uuid
import aiohttp
import os
from datetime import datetime, timedelta
from ..services.session_service import SessionService
from ..services.download_service import DownloadService
from ..services.cleanup_service import CleanupService
from ..services.mongodb_service import MongoDBService
from ..utils.logger import setup_logger
from ..config.env import config

logger = setup_logger()
router = APIRouter(prefix="/api", tags=["public"])

session_service = SessionService()
download_service = DownloadService()
cleanup_service = CleanupService()
db = MongoDBService()

def _get_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return (request.client.host if request.client else "") or ""

def _is_private_ip(ip: str) -> bool:
    if not ip or ip in ("127.0.0.1", "::1", "localhost"):
        return True
    return ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172.1") or ip.startswith("169.254.")

async def _geo_lookup(ip: str):
    try:
        clean = str(ip or "").replace("::ffff:", "").strip()
        if _is_private_ip(clean):
            return {"country": "Local", "region": "Local", "city": "Local"}
        timeout = aiohttp.ClientTimeout(total=2.5)
        async with aiohttp.ClientSession(timeout=timeout) as sess:
            async with sess.get(
                f"http://ip-api.com/json/{clean}?fields=status,country,regionName,city,lat,lon,isp,org,query"
            ) as res:
                if res.status != 200:
                    return None
                j = await res.json()
                if j.get("status") != "success":
                    return None
                return {
                    "country": j.get("country", ""),
                    "region": j.get("regionName", ""),
                    "city": j.get("city", ""),
                    "lat": j.get("lat", 0),
                    "lon": j.get("lon", 0),
                    "isp": j.get("isp", ""),
                    "org": j.get("org", ""),
                    "ip": j.get("query", clean)
                }
    except Exception as e:
        logger.warning(f"Geo lookup failed for {ip}: {str(e)}")
        return None

class SessionRequest(BaseModel):
    pass

class MetadataRequest(BaseModel):
    url: str
    session_id: str
    user_cookies: Optional[str] = None

class DownloadRequest(BaseModel):
    url: str
    session_id: str
    quality: str = "best"
    user_cookies: Optional[str] = None

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
async def get_session(request: Request):
    try:
        qp = request.query_params
        sid = (qp.get("sid") or qp.get("session_id") or "").strip()
        fingerprint = (qp.get("fingerprint") or "").strip()
        ip = _get_client_ip(request)
        now = datetime.utcnow()

        def expires_iso():
            return (datetime.utcnow() + timedelta(seconds=config.session_inactivity_timeout)).isoformat()

        def reused_response(session_id):
            return {"success": True, "session_id": session_id, "expires_at": expires_iso(), "reused": True}

        # Reuse an existing live session if the client passes its session id
        if sid:
            existing = await db.find_active_session(sid)
            if existing:
                await db.refresh_session_activity(sid)
                return reused_response(sid)

        # Reuse the most recent live session with the same fingerprint (browser refresh)
        if fingerprint:
            reused = await db.find_active_session_by_fingerprint(fingerprint)
            if reused:
                await db.refresh_session_activity(reused)
                return reused_response(reused)

        # Flood guard: reuse the most recent live session from the same public IP,
        # or from any IP when no fingerprint was sent (crawlers)
        if not _is_private_ip(ip) or not fingerprint:
            reused_ip = await db.find_active_session_by_ip(ip)
            if reused_ip:
                await db.refresh_session_activity(reused_ip)
                return reused_response(reused_ip)

        # Genuinely new session - create it and record a visit
        session_id = str(uuid.uuid4())
        session = await session_service.create_session(session_id)
        location = await _geo_lookup(ip) if not _is_private_ip(ip) else {"country": "Local", "region": "Local", "city": "Local"}
        visit = {
            "visit_id": session_id,
            "session_id": session_id,
            "fingerprint": fingerprint,
            "device_type": qp.get("device") or "",
            "browser": qp.get("browser") or "",
            "os": qp.get("os") or "",
            "screen": qp.get("screen") or "",
            "language": qp.get("language") or "",
            "timezone": qp.get("timezone") or "",
            "platform": qp.get("platform") or "",
            "page": qp.get("page") or "",
            "referrer": qp.get("referrer") or request.headers.get("referer") or "",
            "user_agent": (qp.get("user_agent") or request.headers.get("user-agent") or "")[:300],
            "ip": ip,
            "location": location,
            "visit_count": 1,
            "first_seen": now,
            "last_seen": now,
            "created_at": now
        }
        await db.record_visit(visit)
        return {"success": True, "session_id": session_id, "expires_at": session.get("expires_at"), "reused": False}
    except Exception as e:
        logger.error(f"Session creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/heartbeat")
async def session_heartbeat(request: Request):
    try:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        session_id = (payload or {}).get("session_id") or request.query_params.get("session_id")
        if not session_id:
            return {"success": False, "message": "session_id required"}
        existing = await db.find_active_session(session_id)
        if existing:
            await db.refresh_session_activity(session_id)
            return {"success": True, "session_id": session_id}
        return {"success": False, "session_id": session_id}
    except Exception as e:
        logger.error(f"Heartbeat error: {str(e)}")
        return {"success": False, "message": str(e)}

@router.post("/metadata")
async def get_metadata(request: MetadataRequest):
    try:
        metadata = await download_service.get_metadata(request.url, user_cookies=request.user_cookies)

        return {
            "success": True,
            "metadata": metadata
        }
    except Exception as e:
        logger.error(f"Metadata fetch error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/download")
async def start_download(request: DownloadRequest):
    try:
        download_id = str(uuid.uuid4())

        download = await download_service.queue_download(
            download_id=download_id,
            session_id=request.session_id,
            url=request.url,
            quality=request.quality,
            user_cookies=request.user_cookies
        )

        return {
            "success": True,
            "download_id": download_id,
            "status": "queued"
        }
    except Exception as e:
        logger.error(f"Download queue error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/downloads")
async def list_downloads(session_id: str = Query(...)):
    try:
        downloads = await download_service.list_downloads(session_id)

        return {
            "success": True,
            "downloads": downloads
        }
    except Exception as e:
        logger.error(f"Downloads list error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# NOTE: These routes MUST come BEFORE the generic /download/{id} route
# FastAPI matches path parameters greedily, so /download/auto-download could match /{id}
# Register with explicit route paths to ensure proper matching

@router.get("/download/auto-download")
async def auto_download_file_alt(download_id: str = Query(...), session_id: str = Query(...)):
    """Fallback endpoint for auto-download with query params"""
    try:
        logger.info(f"Auto-download request (alt): {download_id}")

        download = await download_service.get_download_status(download_id, session_id)
        logger.info(f"Download record retrieved: status={download.get('status')}")

        if download["status"] != "completed":
            error_msg = f"Download not completed: {download['status']}"
            logger.warning(error_msg)
            raise ValueError(error_msg)

        file_path = download.get("filename")
        logger.info(f"File path from DB: {file_path}")

        if not file_path:
            raise ValueError("No filename stored in database")

        if not os.path.exists(file_path):
            logger.error(f"File does not exist at path: {file_path}")
            raise ValueError(f"File not found at: {file_path}")

        file_size = os.path.getsize(file_path)
        filename = os.path.basename(file_path)

        logger.info(f"Serving file: {filename} ({file_size / (1024*1024):.2f} MB)")

        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='video/mp4',
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
    except Exception as e:
        logger.error(f"Auto download error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/download/{download_id}/auto-download")
async def auto_download_file(download_id: str, session_id: str = Query(...)):
    """Primary endpoint for auto-download with path param"""
    return await auto_download_file_alt(download_id, session_id)

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

@router.get("/download/{download_id}", name="get_download_status")
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

# ============ PUBLIC GAMES & MOVIES LIST ============

@router.get("/games/list")
async def get_games_list():
    """Get public list of games"""
    try:
        db._ensure_connected()
        games = list(db.games.find({}))
        for game in games:
            game.pop("_id", None)
        return {"success": True, "games": games}
    except Exception as e:
        logger.error(f"Failed to fetch games: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch games: {str(e)}")

@router.get("/movies/list")
async def get_movies_list():
    """Get public list of movies"""
    try:
        db._ensure_connected()
        movies = list(db.movies.find({}))
        for movie in movies:
            movie.pop("_id", None)
        return {"success": True, "movies": movies}
    except Exception as e:
        logger.error(f"Failed to fetch movies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch movies: {str(e)}")
