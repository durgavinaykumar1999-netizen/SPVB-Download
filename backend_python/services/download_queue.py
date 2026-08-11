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
                await self.db.update_download(
                    download_id,
                    {"status": "downloading", "progress": 10, "started_at": datetime.utcnow()}
                )

                save_path = config.save_path
                os.makedirs(save_path, exist_ok=True)

                provider = get_provider(download_info["url"])
                user_cookies = download_info.get("user_cookies")

                await self.db.update_download(download_id, {"progress": 30})

                result = await provider.download(
                    download_info["url"],
                    download_info["quality"],
                    save_path,
                    user_cookies=user_cookies if 'youtube' in download_info["url"].lower() else None
                )

                await self.db.update_download(download_id, {"progress": 75})

                cloudinary_url = None
                if os.path.exists(result["filename"]):
                    await self.db.update_download(download_id, {"progress": 90})
                    cloudinary_url = await self.cloudinary.upload_video(
                        result["filename"],
                        f"{download_id}.mp4"
                    )

                await self.db.update_download(
                    download_id,
                    {
                        "status": "completed",
                        "progress": 100,
                        "filename": result["filename"],
                        "file_url": cloudinary_url or "",
                        "completed_at": datetime.utcnow()
                    }
                )

            asyncio.run(process())

        except Exception as e:
            logger.error(f"Download processing error: {str(e)}")
            try:
                import asyncio
                asyncio.run(self.db.update_download(
                    download_id,
                    {
                        "status": "failed",
                        "error": str(e),
                        "completed_at": datetime.utcnow()
                    }
                ))
            except:
                pass
