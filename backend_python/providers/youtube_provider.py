import asyncio
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import yt_dlp

from ..utils.logger import setup_logger

logger = setup_logger()


class YouTubeProvider:

    def __init__(self):
        self.platform = "youtube"

        self.ffmpeg_path = (
            shutil.which("ffmpeg")
            or "/usr/bin/ffmpeg"
        )

        # Detect Node.js
        self.node_path = self._find_node()

        logger.info(
            "yt-dlp version: %s",
            yt_dlp.version.__version__
        )

        logger.info(
            "Node.js: %s",
            self.node_path or "NOT FOUND"
        )

        logger.info(
            "FFmpeg: %s",
            self.ffmpeg_path or "NOT FOUND"
        )

        if self.node_path:
            node_version = self._get_node_version()
            logger.info(
                "Node.js version: %s",
                node_version or "unknown"
            )

    def _find_node(self):
        candidates = [
            "/usr/bin/node",
            "/usr/bin/nodejs",
            "/opt/nodejs/bin/node",
        ]

        for path in candidates:
            if os.path.isfile(path) and os.access(path, os.X_OK):
                return path

        return shutil.which("node") or shutil.which("nodejs")

    def _get_node_version(self):
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

    def detect_url_type(self, url: str) -> str:
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
        if not url:
            raise ValueError("YouTube URL cannot be empty")

        url = url.strip()
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        path = parsed.path

        if "youtu.be" in host:
            video_id = path.strip("/").split("/")[0]
            if video_id:
                return f"https://www.youtube.com/watch?v={video_id}"

        match = re.search(r"/shorts/([A-Za-z0-9_-]+)", path)
        if match:
            return f"https://www.youtube.com/watch?v={match.group(1)}"

        match = re.search(r"/embed/([A-Za-z0-9_-]+)", path)
        if match:
            return f"https://www.youtube.com/watch?v={match.group(1)}"

        match = re.search(r"/live/([A-Za-z0-9_-]+)", path)
        if match:
            return f"https://www.youtube.com/watch?v={match.group(1)}"

        query = parse_qs(parsed.query)
        if "v" in query:
            return f"https://www.youtube.com/watch?v={query['v'][0]}"

        return url

    def is_youtube_url(self, url: str) -> bool:
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
                host == h or host.endswith("." + h)
                for h in allowed_hosts
            )

        except Exception:
            return False

    def _create_cookie_file(self, user_cookies: str):
        if not user_cookies:
            return None

        user_cookies = user_cookies.strip()
        if not user_cookies:
            return None

        if "Netscape HTTP Cookie File" not in user_cookies:
            logger.warning("Cookie data is not in Netscape format. Ignoring cookies.")
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

            logger.info("Temporary YouTube cookie file created")
            return temp_file.name

        except Exception as e:
            logger.warning(f"Could not create cookie file: {e}")
            return None

    def _get_ydl_opts(
        self,
        download: bool = False,
        save_path: str = None,
        user_cookies: str = None,
        quality: str = "best",
    ):
        opts = {
            "quiet": False,
            "no_warnings": False,
            "noplaylist": True,
            "js_runtimes": {"node": {}},
            "ffmpeg_location": self.ffmpeg_path,
            "socket_timeout": 60,
            "retries": 3,
            "fragment_retries": 3,
            "file_access_retries": 5,
            "extractor_retries": 3,
            "http_headers": {
                "User-Agent": (
                    "Mozilla/5.0 "
                    "(X11; Linux x86_64) "
                    "AppleWebKit/537.36 "
                    "(KHTML, like Gecko) "
                    "Chrome/131.0.0.0 "
                    "Safari/537.36"
                ),
                "Accept-Language": "en-US,en;q=0.9",
            },
        }

        cookie_file = self._create_cookie_file(user_cookies)
        if cookie_file:
            opts["cookiefile"] = cookie_file
            opts["_temporary_cookie_file"] = cookie_file

        if download:
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

    def _get_format(self, quality: str):
        if not quality or quality == "best":
            return "bv*+ba/b"

        try:
            height = int(quality)
            return f"bv*[height<={height}]+ba/b[height<={height}]"
        except (ValueError, TypeError):
            return "bv*+ba/b"

    def _cleanup_opts(self, opts):
        cookie_file = opts.get("_temporary_cookie_file")
        if cookie_file:
            try:
                if os.path.exists(cookie_file):
                    os.unlink(cookie_file)
            except Exception as e:
                logger.warning(f"Could not remove temporary cookie file: {e}")

    async def get_metadata(self, url: str, user_cookies: str = None):
        return await asyncio.to_thread(
            self._get_metadata_sync,
            url,
            user_cookies
        )

    def _get_metadata_sync(self, url: str, user_cookies: str = None):
        original_url = url
        url_type = self.detect_url_type(url)
        normalized_url = self.normalize_url(url)

        logger.info(f"Original URL: {original_url}")
        logger.info(f"Normalized URL: {normalized_url}")
        logger.info(f"Input type: {url_type}")

        if not self.is_youtube_url(original_url):
            raise ValueError("URL is not a valid YouTube URL")

        opts = self._get_ydl_opts(download=False, user_cookies=user_cookies)

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(normalized_url, download=False)

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

            logger.info(f"YouTube metadata extracted: {result['title']}")
            return result

        except yt_dlp.utils.DownloadError as e:
            logger.error(f"YouTube metadata error: {str(e)}")
            raise RuntimeError(self._friendly_error(str(e))) from e

        finally:
            self._cleanup_opts(opts)

    async def download(
        self,
        url: str,
        quality: str,
        save_path: str,
        user_cookies: str = None
    ):
        return await asyncio.to_thread(
            self._download_sync,
            url,
            quality,
            save_path,
            user_cookies
        )

    def _download_sync(
        self,
        url: str,
        quality: str,
        save_path: str,
        user_cookies: str = None
    ):
        original_url = url
        url_type = self.detect_url_type(url)
        normalized_url = self.normalize_url(url)

        logger.info("Starting YouTube download")
        logger.info(f"Original URL: {original_url}")
        logger.info(f"Normalized URL: {normalized_url}")
        logger.info(f"Detected URL type: {url_type}")

        format_string = self._get_format(quality)
        logger.info(f"Format: {format_string}")

        os.makedirs(save_path, exist_ok=True)

        opts = self._get_ydl_opts(
            download=True,
            save_path=save_path,
            user_cookies=user_cookies,
            quality=quality
        )

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(normalized_url, download=True)
                filename = ydl.prepare_filename(info)

            base_name = os.path.splitext(filename)[0]
            possible_files = [
                filename,
                base_name + ".mp4",
                base_name + ".mkv",
                base_name + ".webm",
            ]

            final_file = None
            for candidate in possible_files:
                if os.path.exists(candidate):
                    final_file = candidate
                    break

            if not final_file:
                files = sorted(
                    Path(save_path).glob("*"),
                    key=lambda p: p.stat().st_mtime,
                    reverse=True,
                )
                if files:
                    final_file = str(files[0])

            if not final_file:
                raise RuntimeError(
                    "yt-dlp completed but output file could not be found."
                )

            file_size = os.path.getsize(final_file)

            logger.info("YouTube download completed")
            logger.info(f"File: {final_file}")
            logger.info(f"Size: {file_size / (1024 * 1024):.2f} MB")

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
                "format": info.get("ext", "mp4"),
                "duration": info.get("duration", 0),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", ""),
            }

        except yt_dlp.utils.DownloadError as e:
            logger.error(f"YouTube download error: {str(e)}")
            raise RuntimeError(self._friendly_error(str(e))) from e

        finally:
            self._cleanup_opts(opts)

    def _friendly_error(self, message: str) -> str:
        lower = message.lower()

        if "video is not available" in lower:
            return (
                "YouTube reports that this video is not available to the current "
                "client. It may be private, deleted, region-restricted, "
                "age-restricted, or require authentication."
            )

        if "sign in" in lower or "login required" in lower or "confirm you're not a bot" in lower:
            return (
                "YouTube requires authentication for this video. "
                "Provide valid authorized YouTube cookies."
            )

        if "requested format is not available" in lower:
            return (
                "The requested video quality is not available. Try quality='best'."
            )

        if "javascript runtime" in lower:
            return (
                "YouTube extraction requires a supported JavaScript runtime. "
                "Node.js is configured for yt-dlp."
            )

        if "ffmpeg" in lower:
            return (
                "FFmpeg is required to merge separate video and audio streams."
            )

        return message

    def close(self):
        pass
