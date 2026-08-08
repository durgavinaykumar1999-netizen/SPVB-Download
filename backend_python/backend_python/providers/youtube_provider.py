import yt_dlp
import os
from ..utils.logger import setup_logger

logger = setup_logger()

# YouTube account cookies for authentication bypass
COOKIES_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'cookies.txt')
COOKIES_AVAILABLE = os.path.exists(COOKIES_PATH)

if COOKIES_AVAILABLE:
    logger.info(f"✅ YouTube cookies found at {COOKIES_PATH}")
else:
    logger.warning(f"⚠️  No YouTube cookies file found at {COOKIES_PATH}")


class YouTubeProvider:
    def __init__(self):
        self.platform = "youtube"

    def _normalize_url(self, url: str) -> str:
        """Convert YouTube Shorts URLs to standard format"""
        if "/shorts/" in url:
            # Extract video ID from shorts URL and convert to standard format
            video_id = url.split("/shorts/")[1].split("?")[0]
            return f"https://www.youtube.com/watch?v={video_id}"
        return url

    def _get_ydl_opts(self, download: bool = False, save_path: str = None):
        """Get yt-dlp options - use account cookies if available"""
        opts = {
            'quiet': False,
            'no_warnings': False,
            'socket_timeout': 30,
            'retries': 15,
            'fragment_retries': 15,
            'skip_unavailable_fragments': True,
            'keep_fragments': False,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        }

        # Use account cookies if available (bypasses bot detection completely)
        if COOKIES_AVAILABLE:
            opts['cookiefile'] = COOKIES_PATH
            logger.info("Using YouTube account cookies for authentication")
        else:
            # Fallback: Try Android client without cookies
            opts['extractor_args'] = {
                'youtube': {
                    'player_client': ['android', 'android_vr', 'web'],
                    'skip': ['hls', 'dash'],
                }
            }
            logger.warning("No cookies file - falling back to anonymous extraction (may be blocked)")

        if download and save_path:
            opts['outtmpl'] = f"{save_path}/%(title)s.%(ext)s"
            opts['quiet'] = True
            opts['no_warnings'] = False

        return opts

    async def get_metadata(self, url: str):
        """Extract metadata using yt-dlp with Android API"""
        try:
            url = self._normalize_url(url)

            # Use yt-dlp with Android player (no cookies needed)
            ydl_opts = self._get_ydl_opts(download=False)

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            formats = info.get('formats', [])
            qualities = []

            for fmt in formats:
                if fmt.get('height') and fmt.get('vcodec') != 'none':  # Only video formats
                    height = fmt.get('height')
                    if height not in [q['value'] for q in qualities]:
                        qualities.append({
                            'label': f"{height}p",
                            'value': height
                        })

            qualities = sorted(qualities, key=lambda x: x['value'], reverse=True)

            return {
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration', 0),
                'thumbnail': info.get('thumbnail', ''),
                'uploader': info.get('uploader', ''),
                'view_count': info.get('view_count', 0),
                'qualities': qualities if qualities else [{'label': 'best', 'value': 'best'}],
                'platform': self.platform,
                'is_age_restricted': info.get('age_limit', 0) > 0
            }
        except Exception as e:
            logger.error(f"YouTube metadata error: {str(e)}")
            raise

    async def download(self, url: str, quality: str, save_path: str):
        """Download YouTube video using yt-dlp with Android API"""
        try:
            url = self._normalize_url(url)

            # Format string for quality selection
            if quality == 'best':
                quality_value = 'bestvideo+bestaudio/best'
            else:
                quality_value = f'bestvideo[height<={quality}]+bestaudio/best'

            # Use yt-dlp with Android player (no cookies needed on server)
            ydl_opts = self._get_ydl_opts(download=True, save_path=save_path)
            ydl_opts['format'] = quality_value

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)

                logger.info(f"✅ YouTube download: {info.get('title', '')}")

                return {
                    'success': True,
                    'filename': filename,
                    'title': info.get('title', ''),
                    'format': info.get('ext', 'mp4')
                }
        except Exception as e:
            logger.error(f"❌ YouTube download error: {str(e)}")
            raise
