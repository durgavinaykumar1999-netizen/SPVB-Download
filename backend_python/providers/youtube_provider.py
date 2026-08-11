import asyncio
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import yt_dlp

from ..utils.logger import setup_logger

logger = setup_logger()


class YouTubeProvider:
    """Production-grade YouTube video provider with Shorts support."""

    def __init__(self):
        self.platform = "youtube"
        self.node_path = self._find_node()
        self.ffmpeg_path = self._find_ffmpeg()
        self._log_diagnostics()

    def _find_node(self) -> str | None:
        """Find Node.js executable with this priority:
        1. YTDLP_NODE_PATH environment variable
        2. /opt/nodejs/bin/node
        3. /usr/bin/node
        4. /usr/bin/nodejs
        5. shutil.which("node")
        6. shutil.which("nodejs")
        """
        # Environment variable override
        env_path = os.getenv("YTDLP_NODE_PATH")
        if env_path and os.path.isfile(env_path) and os.access(env_path, os.X_OK):
            return env_path

        candidates = [
            "/opt/nodejs/bin/node",
            "/usr/bin/node",
            "/usr/bin/nodejs",
        ]

        for path in candidates:
            if os.path.isfile(path) and os.access(path, os.X_OK):
                return path

        # Fallback to which
        for name in ["node", "nodejs"]:
            path = shutil.which(name)
            if path:
                return path

        return None

    def _get_node_version(self) -> str | None:
        """Get Node.js version string."""
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

    def _find_ffmpeg(self) -> str | None:
        """Find FFmpeg executable with this priority:
        1. YTDLP_FFMPEG_PATH environment variable
        2. /usr/bin/ffmpeg
        3. /usr/local/bin/ffmpeg
        4. shutil.which("ffmpeg")
        """
        env_path = os.getenv("YTDLP_FFMPEG_PATH")
        if env_path and os.path.isfile(env_path) and os.access(env_path, os.X_OK):
            return env_path

        candidates = [
            "/usr/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
        ]

        for path in candidates:
            if os.path.isfile(path) and os.access(path, os.X_OK):
                return path

        return shutil.which("ffmpeg")

    def _log_diagnostics(self):
        """Log diagnostic information on startup."""
        logger.info("YouTube Provider Initialization")
        logger.info(f"  yt-dlp version: {yt_dlp.version.__version__}")
        logger.info(f"  Python: {sys.executable}")
        logger.info(f"  Node.js: {self.node_path or 'NOT FOUND'}")

        if self.node_path:
            node_version = self._get_node_version()
            logger.info(f"  Node version: {node_version or 'unknown'}")

        logger.info(f"  FFmpeg: {self.ffmpeg_path or 'NOT FOUND'}")

    def diagnostics(self) -> dict:
        """Return runtime diagnostics without contacting YouTube."""
        return {
            "yt_dlp_version": yt_dlp.version.__version__,
            "python": sys.executable,
            "node_path": self.node_path,
            "node_version": self._get_node_version(),
            "ffmpeg_path": self.ffmpeg_path,
            "ffmpeg_available": self.ffmpeg_path is not None,
        }

    def detect_url_type(self, url: str) -> str:
        """Detect YouTube URL type: video, short, embed, live, or unknown."""
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

    def normalize_url(self, url: str) -> str:
        """Normalize all supported YouTube URL formats to watch?v=ID.
        Preserves v parameter, removes tracking parameters (si, feature, fbclid, utm_*).
        """
        if not url:
            raise ValueError("YouTube URL cannot be empty")

        url = url.strip()
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        path = parsed.path

        # youtu.be/VIDEO_ID → standard watch URL
        if "youtu.be" in host:
            video_id = path.strip("/").split("/")[0]
            if video_id:
                return f"https://www.youtube.com/watch?v={video_id}"

        # /shorts/VIDEO_ID → standard watch URL
        match = re.search(r"/shorts/([A-Za-z0-9_-]+)", path)
        if match:
            return f"https://www.youtube.com/watch?v={match.group(1)}"

        # /embed/VIDEO_ID → standard watch URL
        match = re.search(r"/embed/([A-Za-z0-9_-]+)", path)
        if match:
            return f"https://www.youtube.com/watch?v={match.group(1)}"

        # /live/VIDEO_ID → standard watch URL
        match = re.search(r"/live/([A-Za-z0-9_-]+)", path)
        if match:
            return f"https://www.youtube.com/watch?v={match.group(1)}"

        # Already watch?v=... → keep the v parameter, remove tracking
        query = parse_qs(parsed.query)
        if "v" in query:
            video_id = query["v"][0]
            return f"https://www.youtube.com/watch?v={video_id}"

        return url

    def is_youtube_url(self, url: str) -> bool:
        """Validate that URL is a YouTube URL."""
        try:
            parsed = urlparse(url)
            host = parsed.netloc.lower()

            allowed_hosts = [
                "youtube.com",
                "www.youtube.com",
                "m.youtube.com",
                "music.youtube.com",
                "youtu.be",
                "www.youtu.be",
            ]

            return any(
                host == h or host.endswith("." + h) for h in allowed_hosts
            )
        except Exception:
            return False

    def _create_cookie_file(self, user_cookies: str) -> str | None:
        """Create temporary Netscape cookie file for yt-dlp.
        Must be cleaned up in finally block.
        """
        if not user_cookies:
            return None

        user_cookies = user_cookies.strip()
        if not user_cookies:
            return None

        if "Netscape HTTP Cookie File" not in user_cookies:
            logger.warning("Cookie data not in Netscape format. Ignoring.")
            return None

        try:
            temp_file = tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".txt",
                delete=False,
                encoding="utf-8",
            )
            temp_file.write(user_cookies)
            temp_file.close()

            logger.info("Temporary cookie file created for yt-dlp")
            return temp_file.name

        except Exception as e:
            logger.warning(f"Could not create cookie file: {e}")
            return None

    def _get_ydl_opts(
        self,
        download: bool = False,
        save_path: str | None = None,
        user_cookies: str | None = None,
        quality: str = "best",
    ) -> dict:
        """Build yt-dlp options dictionary.

        Always sets js_runtimes as a dictionary to avoid format errors.
        Includes proper retry logic and timeout configuration.
        """
        opts = {
            "quiet": False,
            "no_warnings": False,
            "noplaylist": True,
            "ffmpeg_location": self.ffmpeg_path,
            "socket_timeout": 60,
            "retries": 10,
            "fragment_retries": 10,
            "file_access_retries": 10,
            "extractor_retries": 5,
            "sleep_interval": 2,
            "max_sleep_interval": 5,
            "http_headers": {
                "User-Agent": (
                    "Mozilla/5.0 "
                    "(Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 "
                    "(KHTML, like Gecko) "
                    "Chrome/131.0.0.0 "
                    "Safari/537.36"
                ),
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            "force_ipv4": True,
            "impersonate": "Chrome120",
        }

        # JavaScript runtime configuration - must be dictionary format
        if self.node_path:
            opts["js_runtimes"] = {"node": {}}
            opts["js_runtimes"]["node"]["args"] = "--max-old-space-size=2048"
        else:
            logger.warning("Node.js not found - YouTube extraction may fail for some content")

        # Cookies (if provided)
        cookie_file = self._create_cookie_file(user_cookies)
        if cookie_file:
            opts["cookiefile"] = cookie_file
            opts["_temporary_cookie_file"] = cookie_file

        # Download-specific options
        if download:
            if not save_path:
                raise ValueError("save_path required for download")

            os.makedirs(save_path, exist_ok=True)
            opts.update({
                "format": self._get_format(quality),
                "merge_output_format": "mp4",
                "outtmpl": os.path.join(save_path, "%(title).200s.%(ext)s"),
                "keep_fragments": False,
                "continuedl": True,
                "overwrites": False,
            })

        return opts

    def _get_format(self, quality: str) -> str:
        """Get yt-dlp format string for requested quality.

        Always includes /b fallback for compatibility.
        """
        if not quality or quality == "best":
            return "bv*+ba/b"

        try:
            height = int(quality)
            return f"bv*[height<={height}]+ba/b[height<={height}]"
        except (ValueError, TypeError):
            return "bv*+ba/b"

    def _cleanup_opts(self, opts: dict):
        """Remove temporary cookie file created by _create_cookie_file."""
        cookie_file = opts.get("_temporary_cookie_file")
        if cookie_file:
            try:
                if os.path.exists(cookie_file):
                    os.unlink(cookie_file)
                    logger.info("Temporary cookie file cleaned up")
            except Exception as e:
                logger.warning(f"Could not remove temporary cookie file: {e}")

    def _find_downloaded_file(
        self, save_path: str, expected_name: str, info: dict
    ) -> str | None:
        """Find actual downloaded file in save_path.

        1. Check prepared filename
        2. Check .mp4 variant
        3. Look for newest file by mtime
        4. Verify file size > 0
        """
        candidates = [
            expected_name,
            os.path.splitext(expected_name)[0] + ".mp4",
            os.path.splitext(expected_name)[0] + ".mkv",
            os.path.splitext(expected_name)[0] + ".webm",
        ]

        for candidate in candidates:
            if os.path.exists(candidate) and os.path.getsize(candidate) > 0:
                return candidate

        # Fallback: newest file by mtime
        try:
            files = sorted(
                Path(save_path).glob("*"),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )
            if files and files[0].is_file() and files[0].stat().st_size > 0:
                return str(files[0])
        except Exception:
            pass

        return None

    async def get_metadata(
        self, url: str, user_cookies: str | None = None
    ) -> dict:
        """Async wrapper for synchronous metadata extraction."""
        return await asyncio.to_thread(
            self._get_metadata_sync, url, user_cookies
        )

    def _get_metadata_sync(
        self, url: str, user_cookies: str | None = None
    ) -> dict:
        """Extract metadata from YouTube video without downloading.

        Handles both long videos and Shorts with same code path.
        """
        original_url = url
        url_type = self.detect_url_type(url)
        normalized_url = self.normalize_url(url)

        logger.info(f"Metadata request for: {original_url[:60]}...")
        logger.info(f"  URL type: {url_type}")

        if not self.is_youtube_url(original_url):
            raise ValueError("Not a valid YouTube URL")

        opts = self._get_ydl_opts(download=False, user_cookies=user_cookies)

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(normalized_url, download=False)

            # Extract and deduplicate video qualities
            formats = info.get("formats", [])
            qualities = {}

            for fmt in formats:
                height = fmt.get("height")
                if not height:
                    continue
                vcodec = fmt.get("vcodec")
                if not vcodec or vcodec == "none":
                    continue

                height = int(height)
                qualities[height] = {
                    "label": f"{height}p",
                    "value": height,
                }

            sorted_qualities = sorted(
                qualities.values(),
                key=lambda x: x["value"],
                reverse=True,
            )

            if not sorted_qualities:
                sorted_qualities = [{"label": "best", "value": "best"}]

            result = {
                "success": True,
                "platform": self.platform,
                "url": original_url,
                "normalized_url": normalized_url,
                "url_type": url_type,
                "id": info.get("id"),
                "title": info.get("title", "Unknown"),
                "description": info.get("description", ""),
                "duration": info.get("duration", 0),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", ""),
                "channel": info.get("channel", ""),
                "channel_id": info.get("channel_id", ""),
                "view_count": info.get("view_count", 0),
                "like_count": info.get("like_count"),
                "upload_date": info.get("upload_date"),
                "categories": info.get("categories", []),
                "tags": info.get("tags", []),
                "webpage_url": info.get("webpage_url", original_url),
                "duration_string": info.get("duration_string"),
                "age_limit": info.get("age_limit", 0),
                "is_age_restricted": info.get("age_limit", 0) > 0,
                "is_live": info.get("is_live", False),
                "qualities": sorted_qualities,
                "format_count": len(formats),
            }

            logger.info(f"Metadata extracted: {result['title'][:50]}...")
            return result

        except yt_dlp.utils.DownloadError as e:
            error_msg = self._friendly_error(str(e))
            logger.error(f"YouTube metadata error: {error_msg}")
            raise RuntimeError(error_msg) from e

        finally:
            self._cleanup_opts(opts)

    async def download(
        self,
        url: str,
        quality: str,
        save_path: str,
        user_cookies: str | None = None,
    ) -> dict:
        """Async wrapper for synchronous download."""
        return await asyncio.to_thread(
            self._download_sync, url, quality, save_path, user_cookies
        )

    def _download_sync(
        self,
        url: str,
        quality: str,
        save_path: str,
        user_cookies: str | None = None,
    ) -> dict:
        """Download YouTube video (long or Short) to MP4 file.

        Uses same code path for both video types.
        """
        original_url = url
        url_type = self.detect_url_type(url)
        normalized_url = self.normalize_url(url)

        logger.info(f"Starting download: {original_url[:60]}...")
        logger.info(f"  URL type: {url_type}")
        logger.info(f"  Quality: {quality}")

        format_string = self._get_format(quality)
        logger.info(f"  Format: {format_string}")

        os.makedirs(save_path, exist_ok=True)

        opts = self._get_ydl_opts(
            download=True,
            save_path=save_path,
            user_cookies=user_cookies,
            quality=quality,
        )

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(normalized_url, download=True)
                filename = ydl.prepare_filename(info)

            # Find actual output file
            final_file = self._find_downloaded_file(save_path, filename, info)

            if not final_file:
                raise RuntimeError(
                    "Download completed but output file could not be found"
                )

            file_size = os.path.getsize(final_file)

            logger.info(f"Download complete: {os.path.basename(final_file)}")
            logger.info(f"  File size: {file_size / (1024*1024):.2f} MB")

            return {
                "success": True,
                "platform": self.platform,
                "url": original_url,
                "normalized_url": normalized_url,
                "url_type": url_type,
                "id": info.get("id"),
                "title": info.get("title", ""),
                "filename": final_file,
                "filepath": final_file,
                "file_size": file_size,
                "format": "mp4",
                "duration": info.get("duration", 0),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", ""),
            }

        except yt_dlp.utils.DownloadError as e:
            error_msg = self._friendly_error(str(e))
            logger.error(f"YouTube download error: {error_msg}")
            raise RuntimeError(error_msg) from e

        finally:
            self._cleanup_opts(opts)

    def _friendly_error(self, message: str) -> str:
        """Convert yt-dlp errors to user-friendly messages.

        Distinguishes between auth errors, format errors, and unavailable content.
        """
        lower = message.lower()

        if "this video is not available" in lower:
            return (
                "This video is not available. It may be deleted, private, "
                "region-restricted, age-restricted without authentication, "
                "or unavailable to the current client."
            )

        if "sign in" in lower or "confirm you're not a bot" in lower:
            return (
                "YouTube requires authentication for this video. "
                "This is typically needed for age-restricted or limited content. "
                "Please provide YouTube cookies for authenticated access."
            )

        if "login required" in lower or "403" in lower or "forbidden" in lower:
            return (
                "Access denied. This video may require authentication, "
                "be region-restricted, or have other access limitations. "
                "Try providing YouTube cookies for authenticated access."
            )

        if "requested format is not available" in lower:
            return "The requested video quality is not available. Try quality='best'."

        if "no supported javascript runtime" in lower:
            return (
                "YouTube extraction requires a JavaScript runtime (Node.js). "
                "Ensure Node.js is installed and YTDLP_NODE_PATH is configured correctly."
            )

        if "ffmpeg" in lower:
            return (
                "FFmpeg is required to merge video and audio streams. "
                "Ensure FFmpeg is installed and YTDLP_FFMPEG_PATH is configured correctly."
            )

        if "429" in lower or "too many requests" in lower:
            return (
                "Too many requests from this server. YouTube is rate-limiting. "
                "Please wait before retrying. This is temporary."
            )

        if "bot" in lower or "captcha" in lower:
            return (
                "YouTube detected suspicious activity. This may indicate: "
                "(1) Too many rapid requests, (2) Age-restricted content requiring authentication, "
                "(3) Region-restricted content. Try providing YouTube cookies or wait before retrying."
            )

        return message

    def close(self):
        """Clean up resources (no-op for this provider)."""
        pass
