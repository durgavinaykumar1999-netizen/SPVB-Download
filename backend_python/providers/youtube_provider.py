#!/usr/bin/env python3
"""
Production-grade YouTube provider with Shorts, Embeds, and Live support.
Works without cookies or login. No hardcoded paths.
"""

import asyncio
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import yt_dlp

from ..utils.logger import setup_logger
from ..config.env import config

logger = setup_logger()


class YouTubeProvider:
    """YouTube video provider supporting Shorts, Embeds, and Live videos."""

    def __init__(self):
        self.platform = "youtube"
        self.ffmpeg_path = self._find_ffmpeg()
        self.node_path = self._find_node()
        self._log_diagnostics()

    def _find_ffmpeg(self):
        """Find FFmpeg executable."""
        # Check environment variable first
        env_path = os.getenv("YTDLP_FFMPEG_PATH")
        if env_path and os.path.isfile(env_path) and os.access(env_path, os.X_OK):
            return env_path

        # Common paths
        candidates = [
            "/usr/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
            "/opt/ffmpeg/bin/ffmpeg",
        ]

        for path in candidates:
            if os.path.isfile(path) and os.access(path, os.X_OK):
                return path

        # Fallback to which
        return shutil.which("ffmpeg")

    def _find_node(self):
        """Find Node.js executable."""
        # Check environment variable first
        env_path = os.getenv("YTDLP_NODE_PATH")
        if env_path and os.path.isfile(env_path) and os.access(env_path, os.X_OK):
            return env_path

        # Common paths
        candidates = [
            "/usr/bin/node",
            "/usr/bin/nodejs",
            "/opt/nodejs/bin/node",
            "/usr/local/bin/node",
        ]

        for path in candidates:
            if os.path.isfile(path) and os.access(path, os.X_OK):
                return path

        # Fallback to which
        return shutil.which("node") or shutil.which("nodejs")

    def _get_node_version(self):
        """Get Node.js version."""
        if not self.node_path:
            return None

        try:
            result = subprocess.run(
                [self.node_path, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass

        return None

    def _log_diagnostics(self):
        """Log system diagnostics."""
        logger.info("YouTube Provider Initialization")
        logger.info(f"  yt-dlp version: {yt_dlp.version.__version__}")
        logger.info(f"  Python: {sys.executable}")
        logger.info(f"  Node.js: {self.node_path or 'NOT FOUND'}")
        logger.info(f"  FFmpeg: {self.ffmpeg_path or 'NOT FOUND'}")
        if self.node_path:
            logger.info(f"  Node version: {self._get_node_version() or 'unknown'}")

    # ========================================================
    # URL VALIDATION
    # ========================================================

    def is_youtube_url(self, url: str) -> bool:
        """Check if URL is a valid YouTube URL."""
        if not url:
            return False

        try:
            parsed = urlparse(url)
            host = parsed.netloc.lower().split(":")[0]

            allowed_hosts = {
                "youtube.com",
                "www.youtube.com",
                "m.youtube.com",
                "music.youtube.com",
                "youtu.be",
                "www.youtu.be",
            }

            return host in allowed_hosts
        except Exception:
            return False

    # ========================================================
    # URL TYPE DETECTION
    # ========================================================

    def detect_url_type(self, url: str) -> str:
        """Detect YouTube URL type: video, short, embed, or live."""
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        path = parsed.path.lower()

        if "youtu.be" in host:
            return "video"

        if "/shorts/" in path:
            return "short"

        if "/embed/" in path:
            return "embed"

        if "/live/" in path:
            return "live"

        query = parse_qs(parsed.query)
        if "v" in query:
            return "video"

        return "unknown"

    # ========================================================
    # VIDEO ID EXTRACTION
    # ========================================================

    def extract_video_id(self, url: str):
        """Extract video ID from YouTube URL."""
        parsed = urlparse(url)
        path = parsed.path

        # youtu.be/<id>
        if "youtu.be" in parsed.netloc.lower():
            video_id = path.strip("/").split("/")[0]
            if video_id:
                return video_id

        # /shorts/<id>
        match = re.search(r"/shorts/([A-Za-z0-9_-]{6,})", path)
        if match:
            return match.group(1)

        # /embed/<id>
        match = re.search(r"/embed/([A-Za-z0-9_-]{6,})", path)
        if match:
            return match.group(1)

        # /live/<id>
        match = re.search(r"/live/([A-Za-z0-9_-]{6,})", path)
        if match:
            return match.group(1)

        # watch?v=<id>
        query = parse_qs(parsed.query)
        if "v" in query:
            return query["v"][0]

        return None

    # ========================================================
    # URL NORMALIZATION
    # ========================================================

    def normalize_url(self, url: str):
        """Normalize YouTube URL to standard format."""
        if not url:
            raise ValueError("YouTube URL cannot be empty.")

        url = url.strip()

        if not self.is_youtube_url(url):
            raise ValueError("Invalid YouTube URL.")

        video_id = self.extract_video_id(url)
        if not video_id:
            raise ValueError("Unable to extract YouTube video ID.")

        return f"https://www.youtube.com/watch?v={video_id}"

    # ========================================================
    # YT-DLP OPTIONS
    # ========================================================

    def _get_base_options(self):
        """Get base yt-dlp options."""
        opts = {
            "quiet": False,
            "no_warnings": False,
            "noplaylist": True,
            "socket_timeout": 60,
            "retries": 10,
            "fragment_retries": 10,
            "file_access_retries": 10,
            "extractor_retries": 5,
            "sleep_interval": 2,
            "max_sleep_interval": 5,
            "http_headers": {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                ),
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            "force_ipv4": True,
            "impersonate": "Chrome120",
        }

        # JavaScript runtime
        if self.node_path:
            opts["js_runtimes"] = {"node": {}}
            logger.debug("Using Node.js for JavaScript extraction")

        # FFmpeg
        if self.ffmpeg_path:
            opts["ffmpeg_location"] = self.ffmpeg_path

        return opts

    # ========================================================
    # FORMAT SELECTION
    # ========================================================

    def _get_format(self, quality="best"):
        """Get yt-dlp format string."""
        if not quality or quality == "best":
            return (
                "bv*[ext=mp4]+ba[ext=m4a]/"
                "bv*+ba/"
                "b[ext=mp4]/"
                "b"
            )

        try:
            height = int(quality)
            # Remove 'p' suffix if present
            if str(quality).endswith('p'):
                height = int(str(quality)[:-1])

            return (
                f"bv*[height<={height}][ext=mp4]+"
                f"ba[ext=m4a]/"
                f"bv*[height<={height}]+"
                f"ba/"
                f"b[height<={height}]"
            )
        except (ValueError, TypeError):
            return (
                "bv*[ext=mp4]+ba[ext=m4a]/"
                "bv*+ba/"
                "b[ext=mp4]/"
                "b"
            )

    # ========================================================
    # METADATA
    # ========================================================

    async def get_metadata(self, url: str):
        """Get video metadata asynchronously."""
        return await asyncio.to_thread(self._get_metadata_sync, url)

    def _get_metadata_sync(self, url: str):
        """Get video metadata synchronously."""
        original_url = url

        if not self.is_youtube_url(original_url):
            raise ValueError("URL is not a valid YouTube URL.")

        url_type = self.detect_url_type(original_url)
        normalized_url = self.normalize_url(original_url)

        logger.info(f"Metadata request for: {original_url}...")
        logger.info(f"  URL type: {url_type}")

        opts = self._get_base_options()

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(normalized_url, download=False)

            if not info:
                raise RuntimeError("YouTube returned no metadata.")

            # Extract qualities
            formats = info.get("formats", [])
            qualities = {}

            for fmt in formats:
                height = fmt.get("height")
                if not height:
                    continue

                vcodec = fmt.get("vcodec")
                if not vcodec or vcodec == "none":
                    continue

                try:
                    height = int(height)
                except (ValueError, TypeError):
                    continue

                if height not in qualities:
                    qualities[height] = {
                        "label": f"{height}p",
                        "value": height,
                    }

            sorted_qualities = sorted(
                qualities.values(),
                key=lambda item: item["value"],
                reverse=True,
            )

            if not sorted_qualities:
                sorted_qualities = [{"label": "Best", "value": "best"}]

            result = {
                "success": True,
                "platform": "youtube",
                "url": original_url,
                "id": info.get("id"),
                "title": info.get("title", ""),
                "description": info.get("description", ""),
                "duration": info.get("duration", 0),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", ""),
                "channel": info.get("channel", ""),
                "view_count": info.get("view_count", 0),
                "upload_date": info.get("upload_date"),
                "age_limit": info.get("age_limit", 0),
                "is_live": info.get("is_live", False),
                "qualities": sorted_qualities,
            }

            logger.info(f"Metadata extracted: {result['title'][:50]}...")
            return result

        except yt_dlp.utils.DownloadError as exc:
            message = str(exc)
            logger.error(f"YouTube metadata error: {message}")
            raise RuntimeError(self._friendly_error(message)) from exc

    # ========================================================
    # DOWNLOAD
    # ========================================================

    async def download(
        self,
        url: str,
        quality: str = "best",
        save_path: str = "./downloads",
    ):
        """Download video asynchronously."""
        return await asyncio.to_thread(self._download_sync, url, quality, save_path)

    def _download_sync(
        self,
        url: str,
        quality: str = "best",
        save_path: str = "./downloads",
    ):
        """Download video synchronously."""
        original_url = url

        if not self.is_youtube_url(original_url):
            raise ValueError("URL is not a valid YouTube URL.")

        url_type = self.detect_url_type(original_url)
        normalized_url = self.normalize_url(original_url)
        format_string = self._get_format(quality)

        logger.info(f"Starting download: {original_url}...")
        logger.info(f"  URL type: {url_type}")
        logger.info(f"  Quality: {quality}")
        logger.info(f"  Format: {format_string}")

        # Create directory
        save_path = os.path.abspath(os.path.expanduser(save_path))
        os.makedirs(save_path, exist_ok=True)

        # yt-dlp options
        opts = self._get_base_options()
        opts.update({
            "format": format_string,
            "merge_output_format": "mp4",
            "outtmpl": os.path.join(save_path, "%(title).200s.%(ext)s"),
            "noplaylist": True,
            "continuedl": True,
            "keep_fragments": False,
            "concurrent_fragment_downloads": 4,
        })

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(normalized_url, download=True)
                filename = ydl.prepare_filename(info)

            # Find final file
            base_name = os.path.splitext(filename)[0]
            possible_files = [
                filename,
                base_name + ".mp4",
                base_name + ".mkv",
                base_name + ".webm",
            ]

            final_file = None
            for candidate in possible_files:
                if os.path.isfile(candidate):
                    final_file = candidate
                    break

            # Fallback: newest media file
            if not final_file:
                media_extensions = {".mp4", ".mkv", ".webm", ".mov", ".m4v"}
                candidates = []

                for item in Path(save_path).iterdir():
                    if item.is_file() and item.suffix.lower() in media_extensions:
                        candidates.append(item)

                if candidates:
                    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                    final_file = str(candidates[0])

            if not final_file:
                raise RuntimeError("Downloaded file could not be located.")

            file_size = os.path.getsize(final_file)
            if file_size <= 0:
                raise RuntimeError("Downloaded file is empty.")

            logger.info(f"Download complete: {os.path.basename(final_file)}")
            logger.info(f"  File size: {file_size / (1024 * 1024):.2f} MB")

            return {
                "success": True,
                "platform": "youtube",
                "url": original_url,
                "id": info.get("id"),
                "title": info.get("title", ""),
                "filename": os.path.basename(final_file),
                "filepath": final_file,
                "file_size": file_size,
                "format": Path(final_file).suffix.lstrip("."),
                "duration": info.get("duration", 0),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", ""),
            }

        except yt_dlp.utils.DownloadError as exc:
            message = str(exc)
            logger.error(f"YouTube download error: {message}")
            raise RuntimeError(self._friendly_error(message)) from exc

    # ========================================================
    # ERROR HANDLING
    # ========================================================

    def _friendly_error(self, message: str):
        """Convert yt-dlp errors to friendly messages."""
        lower = message.lower()

        if "video is not available" in lower:
            return (
                "This video is not available. It may be deleted, private, "
                "region-restricted, age-restricted, or unavailable."
            )

        if "sign in" in lower or "confirm you're not a bot" in lower:
            return (
                "YouTube requires authentication for this video. "
                "Try providing YouTube cookies for authenticated access."
            )

        if "requested format is not available" in lower:
            return (
                "The requested quality is not available for this video. "
                "Try quality='best'."
            )

        if "javascript runtime" in lower:
            return (
                "YouTube extraction requires Node.js. "
                "Make sure Node.js is installed."
            )

        if "ffmpeg" in lower:
            return (
                "FFmpeg is required to merge video and audio streams. "
                "Make sure FFmpeg is installed."
            )

        if "403" in lower or "forbidden" in lower:
            return (
                "Access denied. The video may require authentication "
                "or the server may be rate-limited."
            )

        if "429" in lower or "too many requests" in lower:
            return (
                "YouTube is rate-limiting the server. "
                "Please try again later."
            )

        if "captcha" in lower or "bot" in lower:
            return (
                "YouTube detected automated activity. "
                "The server may be rate-limited. Try again later."
            )

        return message
