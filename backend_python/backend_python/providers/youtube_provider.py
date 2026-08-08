import yt_dlp
import os
from ..utils.logger import setup_logger

logger = setup_logger()

# NOTE: pytube is removed due to unreliable cipher decryption on many videos
# yt-dlp with Android API fallback handles all videos reliably
PYTUBE_AVAILABLE = False
PytubeYouTube = None


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

    def _get_ydl_opts(self, download: bool = False, save_path: str = None, use_cookies: bool = True):
        """Get yt-dlp options with proper authentication handling"""
        opts = {
            'quiet': False,
            'no_warnings': False,
            'skip_unavailable_fragments': True,
            'socket_timeout': 30,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Sec-Fetch-Mode': 'navigate',
            },
            'extractor_args': {
                'youtube': {
                    'player_client': ['web', 'android'],
                    'player_skip_js_player': False,
                }
            },
            'retries': 5,
            'fragment_retries': 5,
            'skip_unavailable_fragments': True,
            'keep_fragments': False,
        }

        # Try to use cookies from browser if available
        if use_cookies:
            opts['cookiesfrombrowser'] = 'chrome'  # Try to extract from Chrome

        if download and save_path:
            opts['outtmpl'] = f"{save_path}/%(title)s.%(ext)s"
            opts['quiet'] = True  # Only show warnings for downloads
            opts['no_warnings'] = False

        return opts

    async def get_metadata(self, url: str):
        """Extract metadata using yt-dlp with Android API fallback"""
        try:
            url = self._normalize_url(url)

            # Use yt-dlp - it handles all videos including with Android API fallback
            ydl_opts = self._get_ydl_opts(download=False, use_cookies=False)

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
        """Download YouTube video using yt-dlp with Android API fallback"""
        try:
            url = self._normalize_url(url)

            # Format string for quality selection
            if quality == 'best':
                quality_value = 'bestvideo+bestaudio/best'
            else:
                quality_value = f'bestvideo[height<={quality}]+bestaudio/best'

            # Use yt-dlp - handles all videos with Android API fallback
            ydl_opts = self._get_ydl_opts(download=True, save_path=save_path, use_cookies=False)
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
