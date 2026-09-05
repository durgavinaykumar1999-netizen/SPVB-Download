import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Server Configuration
    node_env = os.getenv("NODE_ENV", "development")
    port = int(os.getenv("PORT", 8000))
    log_level = os.getenv("LOG_LEVEL", "info")

    # MongoDB Configuration
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db_name = "spvb-downloader"

    # Admin Configuration
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")

    # Cloudinary Configuration
    cloudinary_cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    cloudinary_api_key = os.getenv("CLOUDINARY_API_KEY", "")
    cloudinary_api_secret = os.getenv("CLOUDINARY_API_SECRET", "")

    # Session Configuration
    session_secret = os.getenv("SESSION_SECRET", "dev-secret-key-change-in-production")
    session_timeout = 30 * 60  # 30 minutes initial session lifetime
    session_inactivity_timeout = 10 * 60  # 10 minutes of inactivity before cleanup

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
