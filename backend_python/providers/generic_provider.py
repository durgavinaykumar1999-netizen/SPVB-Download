import subprocess
import os
import re
from datetime import datetime
from ..utils.logger import setup_logger
from .download_opts import build_download_opts, download_with_audio

logger = setup_logger()

class GenericProvider:
    """Generic provider using yt-dlp for any supported platform"""

    async def get_metadata(self, url: str, user_cookies: str = None):
        """Extract metadata using yt-dlp"""
        try:
            cmd = [
                "yt-dlp",
                "--dump-json",
                "--no-warnings",
                url
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                raise ValueError(f"yt-dlp error: {result.stderr}")

            import json
            data = json.loads(result.stdout)

            metadata = {
                "title": data.get("title", "Unknown"),
                "duration": data.get("duration", 0),
                "thumbnail": data.get("thumbnail", ""),
                "uploader": data.get("uploader", "Unknown"),
                "platform": data.get("extractor", "Unknown"),
                "is_age_restricted": data.get("age_limit", 0) > 0,
                "qualities": self._extract_qualities(data)
            }

            return metadata

        except Exception as e:
            logger.error(f"Generic metadata extraction error: {str(e)}")
            raise

    def _extract_qualities(self, data):
        """Extract available quality options from yt-dlp data"""
        qualities = []

        formats = data.get("formats", [])
        seen_heights = set()

        for fmt in sorted(formats, key=lambda x: x.get("height", 0) or 0, reverse=True):
            height = fmt.get("height")
            if height and height not in seen_heights and height > 0:
                seen_heights.add(height)
                qualities.append({
                    "label": f"{height}p",
                    "value": height
                })

        if not qualities:
            qualities = [
                {"label": "best", "value": "best"},
                {"label": "worst", "value": "worst"}
            ]

        return qualities[:5]  # Return top 5 qualities

    async def download(self, url: str, quality: str, save_path: str):
        """Download video using yt-dlp with audio support"""
        try:
            os.makedirs(save_path, exist_ok=True)

            # Parse quality (e.g., "360" or "best")
            if quality.endswith("p"):
                quality_value = quality[:-1]  # Remove 'p' suffix
            else:
                quality_value = quality

            logger.info(f"Downloading: {url} with quality: {quality_value}")

            # Build yt-dlp options
            ydl_opts = build_download_opts(save_path, quality_value)

            # Download with audio guarantee
            info, filepath = download_with_audio(ydl_opts, url)

            if not os.path.exists(filepath):
                raise ValueError(f"Downloaded file not found: {filepath}")

            logger.info(f"Download completed: {filepath}")

            return {
                "filename": filepath,
                "title": os.path.basename(filepath),
                "success": True
            }

        except Exception as e:
            logger.error(f"Generic download error: {str(e)}")
            raise
