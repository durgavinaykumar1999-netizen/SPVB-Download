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
                # Mark task as done to prevent queue from growing
                self.queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Queue worker error: {str(e)}")
                try:
                    self.queue.task_done()
                except ValueError:
                    pass  # Already marked done

    def _process_download(self, download_info):
        """Process download in background thread - MUST NOT BLOCK"""
        download_id = download_info["download_id"]

        # Spawn worker thread for this download
        # This prevents blocking the queue worker
        worker = threading.Thread(
            target=self._download_worker,
            args=(download_id, download_info),
            daemon=True
        )
        worker.start()
        # Don't wait - return immediately to process next queue item

    def _download_worker(self, download_id, download_info):
        """Background worker thread for actual download processing"""
        try:
            import asyncio

            async def process():
                await self.db.update_download(
                    download_id,
                    {"status": "downloading", "progress": 10, "started_at": datetime.utcnow()}
                )

                save_path = config.save_path
                os.makedirs(save_path, exist_ok=True)

                provider = get_provider(download_info["url"])
                user_cookies = download_info.get("user_cookies")

                await self.db.update_download(download_id, {"progress": 30})

                temp_download_dir = os.path.join(save_path, f"temp_{download_id}")
                os.makedirs(temp_download_dir, exist_ok=True)

                result = await provider.download(
                    download_info["url"],
                    download_info["quality"],
                    temp_download_dir
                )

                await self.db.update_download(download_id, {"progress": 75})

                cloudinary_url = None
                if os.path.exists(result["filename"]):
                    await self.db.update_download(download_id, {"progress": 90})

                    cloudinary_url = await self.cloudinary.upload_video(
                        result["filename"],
                        f"download-{download_id}"
                    )

                    await self.db.update_download(
                        download_id,
                        {
                            "status": "completed",
                            "progress": 100,
                            "filename": result["filename"],
                            "file_url": cloudinary_url or "",
                            "cloudinary_public_id": f"download-{download_id}" if cloudinary_url else "",
                            "completed_at": datetime.utcnow(),
                            "download_id": download_id
                        }
                    )

                # DELETE temp directory immediately
                try:
                    import shutil
                    if os.path.exists(temp_download_dir):
                        shutil.rmtree(temp_download_dir)
                        logger.info(f"Cleaned temp directory: {temp_download_dir}")
                except Exception as e:
                    logger.warning(f"Failed to clean temp directory: {str(e)}")

            asyncio.run(process())

        except Exception as e:
            logger.error(f"Download worker error for {download_id}: {str(e)}")
            # Clean up temp directory on failure
            try:
                import shutil
                temp_download_dir = os.path.join(config.save_path, f"temp_{download_id}")
                if os.path.exists(temp_download_dir):
                    shutil.rmtree(temp_download_dir)
            except Exception as cleanup_err:
                logger.warning(f"Cleanup error: {str(cleanup_err)}")

            # Update status to failed
            try:
                import asyncio
                asyncio.run(self.db.update_download(
                    download_id,
                    {
                        "status": "failed",
                        "error": str(e),
                        "completed_at": datetime.utcnow(),
                        "download_id": download_id
                    }
                ))
            except Exception as db_err:
                logger.error(f"Failed to update error status: {str(db_err)}")
