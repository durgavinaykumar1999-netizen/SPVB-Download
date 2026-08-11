import asyncio
import threading
import time
from datetime import datetime
from .mongodb_service import MongoDBService
from .cloudinary_service import CloudinaryService
from ..utils.logger import setup_logger

logger = setup_logger()

class CleanupService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CleanupService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._initialized = True
        self.db = MongoDBService()
        self.cloudinary = CloudinaryService()
        self.cleanup_thread = threading.Thread(target=self._cleanup_worker, daemon=True)
        self.cleanup_thread.start()
        logger.info("Cleanup service started - runs every 5 minutes")

    def _cleanup_worker(self):
        """Run cleanup every 5 minutes to delete expired sessions"""
        while True:
            try:
                asyncio.run(self._cleanup_expired_sessions())
            except Exception as e:
                logger.error(f"Cleanup worker error: {str(e)}")

            # Sleep for 5 minutes before next cleanup
            time.sleep(300)

    async def _cleanup_expired_sessions(self):
        """Find and delete inactive sessions with their downloads and files"""
        try:
            self.db._ensure_connected()
            from ..config.env import config

            # Get all sessions
            sessions = list(self.db.sessions.find({}))
            now = datetime.utcnow()

            for session in sessions:
                # Check if session is inactive for too long
                last_activity = session.get("last_activity", session.get("created_at"))
                inactivity_duration = (now - last_activity).total_seconds()

                # Cleanup if inactive for more than session_inactivity_timeout
                if inactivity_duration > config.session_inactivity_timeout:
                    session_id = session.get("session_id")
                    logger.info(f"Session {session_id} inactive for {int(inactivity_duration)}s, cleaning up...")
                    await self._delete_session_data(session_id)
        except Exception as e:
            logger.error(f"Error in cleanup_expired_sessions: {str(e)}")

    async def _delete_session_data(self, session_id: str):
        """Delete all data related to a session"""
        try:
            self.db._ensure_connected()
            logger.info(f"Starting cleanup for session: {session_id}")

            # Get all downloads for this session
            downloads = list(self.db.downloads.find({"session_id": session_id}))

            # Delete files from Cloudinary
            for download in downloads:
                file_url = download.get("file_url")
                if file_url:
                    try:
                        # Extract public_id from Cloudinary URL
                        # URL format: https://res.cloudinary.com/.../upload/vXXXX/spvb-downloader/filename.mp4
                        if "spvb-downloader/" in file_url:
                            public_id = file_url.split("spvb-downloader/")[1].replace(".mp4", "")
                            full_public_id = f"spvb-downloader/{public_id}"

                            logger.info(f"Deleting file from Cloudinary: {full_public_id}")
                            await self.cloudinary.delete_video(full_public_id)
                    except Exception as e:
                        logger.error(f"Error deleting file from Cloudinary: {str(e)}")

            # Delete all downloads from MongoDB
            self.db.downloads.delete_many({"session_id": session_id})
            logger.info(f"Deleted {len(downloads)} downloads from MongoDB")

            # Delete session from MongoDB
            self.db.sessions.delete_one({"session_id": session_id})
            logger.info(f"Session cleanup completed: {session_id}")

        except Exception as e:
            logger.error(f"Error in delete_session_data: {str(e)}")

    async def cleanup_session_immediate(self, session_id: str):
        """Immediately cleanup a session (called when user ends session)"""
        await self._delete_session_data(session_id)
