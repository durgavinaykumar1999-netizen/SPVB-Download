import cloudinary
from cloudinary import uploader
from ..config.env import config
from ..utils.logger import setup_logger

logger = setup_logger()

class CloudinaryService:
    def __init__(self):
        cloudinary.config(
            cloud_name=config.cloudinary_cloud_name,
            api_key=config.cloudinary_api_key,
            api_secret=config.cloudinary_api_secret
        )

    async def upload_video(self, file_path: str, filename: str):
        try:
            result = uploader.upload(
                file_path,
                resource_type="video",
                folder="spvb-downloader",
                public_id=filename,
                overwrite=True
            )

            url = result.get("secure_url", result.get("url", ""))
            logger.info(f"Video uploaded to Cloudinary: {url}")

            return url
        except Exception as e:
            logger.error(f"Cloudinary upload error: {str(e)}")
            raise

    async def delete_video(self, public_id: str):
        try:
            result = uploader.destroy(
                f"spvb-downloader/{public_id}",
                resource_type="video"
            )

            logger.info(f"Video deleted from Cloudinary: {public_id}")
            return True
        except Exception as e:
            logger.error(f"Cloudinary delete error: {str(e)}")
            raise
