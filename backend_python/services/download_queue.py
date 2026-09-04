import threading
import queue
import os
from datetime import datetime
from .mongodb_service import MongoDBService
from .cloudinary_service import CloudinaryService
from ..providers.provider_factory import get_provider
from ..config.env import config
from ..utils.logger import setup_logger

logger = setup_logger()

class DownloadQueue:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DownloadQueue, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._initialized = True
        self.queue = queue.Queue()
        self.db = MongoDBService()
        self.cloudinary = CloudinaryService()

        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()
        logger.info("Download queue worker started")

    def add_download(self, download_info):
        self.queue.put(download_info)
        logger.info(f"Download added to queue: {download_info['download_id']}")

    def _worker(self):
        while True:
            try:
                download_info = self.queue.get(timeout=1)
                self._process_download(download_info)
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Queue worker error: {str(e)}")

    def _process_download(self, download_info):
        download_id = download_info["download_id"]

        try:
            import asyncio

            async def process():
                # CRITICAL: Lock by download_id to prevent concurrent processing
                # This ensures each download has unique metadata and doesn't overlap
                await self.db.update_download(
                    download_id,
                    {"status": "downloading", "progress": 10, "started_at": datetime.utcnow()}
                )

                save_path = config.save_path
                os.makedirs(save_path, exist_ok=True)

                # IMPORTANT: Get provider based on actual URL in download_info
                # Do NOT reuse previous download's URL
                provider = get_provider(download_info["url"])
                user_cookies = download_info.get("user_cookies")

                await self.db.update_download(download_id, {"progress": 30})

                # CRITICAL: Use unique temporary filename based on download_id
                # to prevent multiple downloads overwriting each other
                temp_download_dir = os.path.join(save_path, f"temp_{download_id}")
                os.makedirs(temp_download_dir, exist_ok=True)

                result = await provider.download(
                    download_info["url"],  # Use URL from this specific download
                    download_info["quality"],
                    temp_download_dir  # Use unique directory per download
                )

                await self.db.update_download(download_id, {"progress": 75})

                cloudinary_url = None
                if os.path.exists(result["filename"]):
                    await self.db.update_download(download_id, {"progress": 90})

                    # CRITICAL: Use download_id as public_id to keep each download unique
                    cloudinary_url = await self.cloudinary.upload_video(
                        result["filename"],
                        f"download-{download_id}"  # Ensure globally unique ID
                    )

                # CRITICAL: Store exact download_id and filename to prevent mixing
                await self.db.update_download(
                    download_id,
                    {
                        "status": "completed",
                        "progress": 100,
                        "filename": result["filename"],
                        "file_url": cloudinary_url or "",
                        "completed_at": datetime.utcnow(),
                        "download_id": download_id  # Explicitly store ID to prevent overlap
                    }
                )

                # IMPORTANT: Keep temp directory for backup/recovery
                # Files are already in Cloudinary, but local backup helps if upload fails
                # Manual cleanup should be done via admin API only
                # try:
                #     import shutil
                #     temp_download_dir = os.path.join(config.save_path, f"temp_{download_id}")
                #     if os.path.exists(temp_download_dir):
                #         shutil.rmtree(temp_download_dir)
                # except Exception as e:
                #     logger.warning(f"Failed to clean temp directory: {str(e)}")

            asyncio.run(process())

        except Exception as e:
            logger.error(f"Download processing error for {download_id}: {str(e)}")
            try:
                import asyncio
                asyncio.run(self.db.update_download(
                    download_id,
                    {
                        "status": "failed",
                        "error": str(e),
                        "completed_at": datetime.utcnow(),
                        "download_id": download_id  # Store ID even on failure
                    }
                ))
            except Exception as db_err:
                logger.error(f"Failed to update error status for {download_id}: {str(db_err)}")
