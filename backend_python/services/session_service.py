from .mongodb_service import MongoDBService
from ..config.env import config
from ..utils.logger import setup_logger

logger = setup_logger()

class SessionService:
    def __init__(self):
        self.db = MongoDBService()

    async def create_session(self, session_id: str):
        try:
            session = await self.db.create_session(session_id)
            return session
        except Exception as e:
            logger.error(f"Session creation error: {str(e)}")
            raise

    async def get_session(self, session_id: str):
        try:
            session = await self.db.get_session(session_id)
            return session
        except Exception as e:
            logger.error(f"Get session error: {str(e)}")
            raise

    async def set_save_path(self, session_id: str, path: str):
        if config.node_env == "production":
            logger.warning("Save path changes not allowed in production")
            return

        try:
            await self.db.update_session(session_id, {"save_path": path})
        except Exception as e:
            logger.error(f"Set save path error: {str(e)}")
            raise

    async def delete_session(self, session_id: str):
        try:
            await self.db.delete_session(session_id)
        except Exception as e:
            logger.error(f"Delete session error: {str(e)}")
            raise
