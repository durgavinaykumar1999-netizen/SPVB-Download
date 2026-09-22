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
        """Delete all data related to a session including Cloudinary files and temp directories"""
        try:
            self.db._ensure_connected()
            logger.info(f"Starting cleanup for session: {session_id}")
            from ..config.env import config
            import os
            import shutil

            # Get all downloads for this session
            downloads = list(self.db.downloads.find({"session_id": session_id}))

            # Delete Cloudinary files and temp directories
            cloudinary_count = 0
            temp_dir_count = 0

            for download in downloads:
                download_id = download.get("download_id")

                # Delete Cloudinary files for this download
                try:
                    # Prefer stored public_id, otherwise derive it from download_id
                    public_id = download.get("cloudinary_public_id")
                    if not public_id and download_id:
                        public_id = f"download-{download_id}"
                    if public_id:
                        await self.cloudinary.delete_video(public_id)
                        cloudinary_count += 1
                        logger.info(f"Deleted Cloudinary file: {public_id}")
                except Exception as e:
                    logger.error(f"Error deleting Cloudinary file: {str(e)}")

                # Delete temp directory for this download
                try:
                    if download_id:
                        temp_dir = os.path.join(config.save_path, f"temp_{download_id}")
                        if os.path.exists(temp_dir):
                            shutil.rmtree(temp_dir)
                            temp_dir_count += 1
                            logger.info(f"Deleted temp directory: {temp_dir}")
                except Exception as e:
                    logger.warning(f"Error deleting temp directory for {download_id}: {str(e)}")

            # Delete all downloads from MongoDB
            self.db.downloads.delete_many({"session_id": session_id})
            logger.info(f"Deleted {len(downloads)} downloads from MongoDB, {cloudinary_count} from Cloudinary, {temp_dir_count} temp dirs")

            # Delete session from MongoDB
            self.db.sessions.delete_one({"session_id": session_id})
            logger.info(f"Session cleanup completed: {session_id}")

        except Exception as e:
            logger.error(f"Error in delete_session_data: {str(e)}")

    async def cleanup_session_immediate(self, session_id: str):
        """Immediately cleanup a session (called when user ends session)"""
        await self._delete_session_data(session_id)
