from fastapi import Header, HTTPException
from typing import Optional
from ..services.mongodb_service import MongoDBService
from ..utils.logger import setup_logger

logger = setup_logger()

class DeviceVerificationMiddleware:
    """Verify device fingerprint to ensure one session = one device"""

    def __init__(self):
        self.db = MongoDBService()

    async def verify_device(
        self,
        session_id: str,
        device_fingerprint: Optional[str] = Header(None, alias="X-Device-Fingerprint"),
    ) -> bool:
        """
        Verify device fingerprint matches session device
        Returns True if device matches, False if mismatch
        """
        try:
            if not device_fingerprint:
                logger.warning(f"No device fingerprint provided for session: {session_id}")
                raise HTTPException(status_code=401, detail="Device fingerprint missing")

            # Get session from database
            session = await self.db.get_session(session_id)

            if not session:
                logger.warning(f"Session not found: {session_id}")
                raise HTTPException(status_code=401, detail="Session not found")

            # Get stored device fingerprint
            stored_fingerprint = session.get("device_fingerprint")

            if not stored_fingerprint:
                # First request with this session - store the fingerprint
                await self.db.update_session(
                    session_id,
                    {"device_fingerprint": device_fingerprint}
                )
                logger.info(f"Device fingerprint stored for session: {session_id}")
                return True

            # Verify fingerprint matches
            if device_fingerprint != stored_fingerprint:
                logger.warning(
                    f"Device mismatch for session {session_id}. "
                    f"Expected: {stored_fingerprint[:16]}..., "
                    f"Got: {device_fingerprint[:16]}..."
                )
                raise HTTPException(
                    status_code=401,
                    detail="Device changed - session invalidated for security",
                )

            logger.debug(f"Device verified for session: {session_id}")
            return True

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Device verification error: {str(e)}")
            raise HTTPException(status_code=401, detail="Device verification failed")


async def verify_device_fingerprint(
    session_id: str,
    device_fingerprint: Optional[str],
) -> bool:
    """
    Verify device fingerprint matches session device
    """
    middleware = DeviceVerificationMiddleware()
    return await middleware.verify_device(session_id, device_fingerprint)
