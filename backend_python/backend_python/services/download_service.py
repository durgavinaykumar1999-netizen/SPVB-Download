from .mongodb_service import MongoDBService
from .download_queue import DownloadQueue
from ..providers.provider_factory import get_provider
from ..utils.logger import setup_logger

logger = setup_logger()

class DownloadService:
    def __init__(self):
        self.db = MongoDBService()
        self.queue = DownloadQueue()

    async def get_metadata(self, url: str, user_cookies: str = None):
        try:
            provider = get_provider(url)
            # YouTube provider accepts user_cookies, others ignore it
            if hasattr(provider, 'get_metadata'):
                metadata = await provider.get_metadata(url, user_cookies=user_cookies) if 'youtube' in url.lower() else await provider.get_metadata(url)
            return metadata
        except Exception as e:
            logger.error(f"Metadata fetch error: {str(e)}")
            raise

    async def queue_download(self, download_id: str, session_id: str, url: str, quality: str, user_cookies: str = None):
        try:
            download = await self.db.create_download(download_id, session_id, url, quality)

            self.queue.add_download({
                "download_id": download_id,
                "session_id": session_id,
                "url": url,
                "quality": quality,
                "user_cookies": user_cookies
            })

            return download
        except Exception as e:
            logger.error(f"Queue download error: {str(e)}")
            raise

    async def get_download_status(self, download_id: str, session_id: str):
        try:
            download = await self.db.get_download(download_id)

            if download["session_id"] != session_id:
                raise ValueError("Unauthorized access to download")

            return download
        except Exception as e:
            logger.error(f"Get download status error: {str(e)}")
            raise

    async def list_downloads(self, session_id: str):
        try:
            downloads = await self.db.list_downloads(session_id)
            return downloads
        except Exception as e:
            logger.error(f"List downloads error: {str(e)}")
            raise

    async def get_download_file(self, download_id: str, session_id: str):
        try:
            download = await self.get_download_status(download_id, session_id)

            if download["status"] != "completed":
                raise ValueError(f"Download not completed: {download['status']}")

            return download.get("file_url", "")
        except Exception as e:
            logger.error(f"Get download file error: {str(e)}")
            raise
