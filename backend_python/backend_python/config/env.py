import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MongoDB Configuration - REQUIRED from environment
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        raise ValueError("MONGODB_URI environment variable is required")
    mongodb_db_name = "spvb-downloader"

    # Cloudinary Configuration - REQUIRED from environment
    cloudinary_cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key = os.getenv("CLOUDINARY_API_KEY")
    cloudinary_api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not cloudinary_cloud_name or not cloudinary_api_key or not cloudinary_api_secret:
        raise ValueError("Cloudinary credentials are required in environment variables")

    # Server Configuration
    node_env = os.getenv("NODE_ENV", "development")
    port = int(os.getenv("PORT", 8000))
    log_level = os.getenv("LOG_LEVEL", "info")

    # Session Configuration
    session_secret = os.getenv("SESSION_SECRET")
    if not session_secret:
        raise ValueError("SESSION_SECRET environment variable is required")
    session_timeout = 30 * 60  # 30 minutes in seconds

    # Download Configuration
    download_timeout = int(os.getenv("DOWNLOAD_TIMEOUT", 900000))  # 15 minutes in milliseconds
    download_quality = os.getenv("DOWNLOAD_QUALITY", "best")
    video_format = os.getenv("VIDEO_FORMAT", "mp4")

    # Paths
    if node_env == "production":
        save_path = "/tmp"
    else:
        save_path = os.getenv("SAVE_PATH", os.path.expanduser("~/Downloads/SPVB-Downloads"))

config = Config()
