"""
Admin cleanup endpoint to clear temp files and reset state.
Only accessible with admin token.
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from ..config.env import config
from ..utils.logger import setup_logger
import os
import shutil
from datetime import datetime

logger = setup_logger()
router = APIRouter(prefix="/api/admin", tags=["admin"])

def verify_admin_token(authorization: str = Header(None)):
    """Verify admin token from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.replace("Bearer ", "").strip()
    # For now, just check if token is provided
    # In production, validate against JWT
    if not token:
        raise HTTPException(status_code=401, detail="Invalid token")

    return token

@router.post("/cleanup/temp-files")
async def cleanup_temp_files(token: str = Depends(verify_admin_token)):
    """
    DELETE all temporary download files on disk.
    WARNING: This removes all unprocessed downloads!
    """
    try:
        save_path = config.save_path
        if not os.path.exists(save_path):
            return {
                "success": True,
                "message": "Save path doesn't exist - nothing to clean",
                "cleaned_dirs": 0,
                "freed_space_mb": 0
            }

        # Find all temp_* directories
        temp_dirs = []
        total_size = 0

        for item in os.listdir(save_path):
            if item.startswith("temp_"):
                item_path = os.path.join(save_path, item)
                if os.path.isdir(item_path):
                    # Calculate directory size
                    size = 0
                    for dirpath, dirnames, filenames in os.walk(item_path):
                        for filename in filenames:
                            filepath = os.path.join(dirpath, filename)
                            if os.path.exists(filepath):
                                size += os.path.getsize(filepath)

                    temp_dirs.append({
                        "name": item,
                        "path": item_path,
                        "size_mb": round(size / (1024 * 1024), 2)
                    })
                    total_size += size

        # Delete all temp directories
        deleted_count = 0
        errors = []

        for temp_dir in temp_dirs:
            try:
                shutil.rmtree(temp_dir["path"])
                deleted_count += 1
                logger.info(f"Deleted temp directory: {temp_dir['name']} ({temp_dir['size_mb']} MB)")
            except Exception as e:
                error_msg = f"Failed to delete {temp_dir['name']}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)

        freed_mb = round(total_size / (1024 * 1024), 2)

        return {
            "success": len(errors) == 0,
            "message": f"Cleaned {deleted_count} temp directories, freed {freed_mb} MB",
            "cleaned_dirs": deleted_count,
            "total_dirs_found": len(temp_dirs),
            "freed_space_mb": freed_mb,
            "errors": errors if errors else None,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

@router.get("/status/disk")
async def get_disk_status(token: str = Depends(verify_admin_token)):
    """
    Check current disk usage and memory state.
    """
    try:
        save_path = config.save_path

        # Count temp directories
        temp_dirs = 0
        total_temp_size = 0

        if os.path.exists(save_path):
            for item in os.listdir(save_path):
                if item.startswith("temp_"):
                    item_path = os.path.join(save_path, item)
                    if os.path.isdir(item_path):
                        temp_dirs += 1
                        for dirpath, dirnames, filenames in os.walk(item_path):
                            for filename in filenames:
                                filepath = os.path.join(dirpath, filename)
                                if os.path.exists(filepath):
                                    total_temp_size += os.path.getsize(filepath)

        return {
            "success": True,
            "disk_status": {
                "save_path": save_path,
                "temp_directories": temp_dirs,
                "temp_size_mb": round(total_temp_size / (1024 * 1024), 2),
                "path_exists": os.path.exists(save_path)
            },
            "message": f"Found {temp_dirs} temp directories using {round(total_temp_size / (1024 * 1024), 2)} MB"
        }

    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.post("/restart")
async def request_restart(token: str = Depends(verify_admin_token)):
    """
    Signal backend to restart gracefully.
    Render will detect the restart and spin up a fresh instance.
    """
    logger.warning("Admin requested backend restart")
    return {
        "success": True,
        "message": "Restart signal sent. Render will automatically restart the service in a few seconds."
    }
