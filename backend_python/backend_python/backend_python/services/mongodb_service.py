from pymongo import MongoClient
from datetime import datetime, timedelta
from bson import ObjectId
from ..config.env import config
from ..utils.logger import setup_logger

logger = setup_logger()

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == "_id":
                result["id"] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
            else:
                result[key] = value
        return result
    return doc

class MongoDBService:
    def __init__(self):
        self.client = MongoClient(config.mongodb_uri)
        self.db = self.client[config.mongodb_db_name]
        self.sessions = self.db["sessions"]
        self.downloads = self.db["downloads"]
        self._create_indexes()

    def _create_indexes(self):
        try:
            self.sessions.create_index("session_id", unique=True)
            self.sessions.create_index("expires_at", expireAfterSeconds=0)
            self.downloads.create_index("download_id", unique=True)
            self.downloads.create_index("session_id")
            logger.info("MongoDB indexes created")
        except Exception as e:
            logger.error(f"Index creation error: {str(e)}")

    async def create_session(self, session_id: str):
        try:
            expires_at = datetime.utcnow() + timedelta(seconds=config.session_timeout)

            session = {
                "session_id": session_id,
                "created_at": datetime.utcnow(),
                "expires_at": expires_at,
                "save_path": config.save_path,
                "downloads": []
            }

            self.sessions.insert_one(session)
            logger.info(f"Session created: {session_id}")

            return serialize_doc(session)
        except Exception as e:
            logger.error(f"Session creation error: {str(e)}")
            raise

    async def get_session(self, session_id: str):
        try:
            session = self.sessions.find_one({"session_id": session_id})

            if not session:
                raise ValueError(f"Session not found: {session_id}")

            if datetime.utcnow() > session.get("expires_at"):
                await self.delete_session(session_id)
                raise ValueError(f"Session expired: {session_id}")

            return serialize_doc(session)
        except Exception as e:
            logger.error(f"Get session error: {str(e)}")
            raise

    async def update_session(self, session_id: str, data: dict):
        try:
            self.sessions.update_one(
                {"session_id": session_id},
                {"$set": data}
            )
            logger.info(f"Session updated: {session_id}")
        except Exception as e:
            logger.error(f"Session update error: {str(e)}")
            raise

    async def delete_session(self, session_id: str):
        try:
            self.sessions.delete_one({"session_id": session_id})
            self.downloads.delete_many({"session_id": session_id})
            logger.info(f"Session deleted: {session_id}")
        except Exception as e:
            logger.error(f"Session deletion error: {str(e)}")
            raise

    async def create_download(self, download_id: str, session_id: str, url: str, quality: str):
        try:
            download = {
                "download_id": download_id,
                "session_id": session_id,
                "url": url,
                "quality": quality,
                "status": "queued",
                "progress": 0,
                "filename": "",
                "file_url": "",
                "error": "",
                "created_at": datetime.utcnow(),
                "started_at": None,
                "completed_at": None
            }

            self.downloads.insert_one(download)
            logger.info(f"Download created: {download_id}")

            return serialize_doc(download)
        except Exception as e:
            logger.error(f"Download creation error: {str(e)}")
            raise

    async def get_download(self, download_id: str):
        try:
            download = self.downloads.find_one({"download_id": download_id})

            if not download:
                raise ValueError(f"Download not found: {download_id}")

            return serialize_doc(download)
        except Exception as e:
            logger.error(f"Get download error: {str(e)}")
            raise

    async def update_download(self, download_id: str, data: dict):
        try:
            self.downloads.update_one(
                {"download_id": download_id},
                {"$set": data}
            )
            logger.info(f"Download updated: {download_id}")
        except Exception as e:
            logger.error(f"Download update error: {str(e)}")
            raise

    async def list_downloads(self, session_id: str):
        try:
            downloads = list(self.downloads.find({"session_id": session_id}))
            return [serialize_doc(d) for d in downloads]
        except Exception as e:
            logger.error(f"List downloads error: {str(e)}")
            raise
