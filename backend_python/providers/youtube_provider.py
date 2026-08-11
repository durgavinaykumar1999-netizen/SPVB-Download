import yt_dlp
import os
import tempfile
from ..utils.logger import setup_logger

logger = setup_logger()


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

    def _get_ydl_opts(self, download: bool = False, save_path: str = None, user_cookies: str = None):
        """Get yt-dlp options - use user's browser cookies if provided"""
        opts = {
            'quiet': False,
            'no_warnings': False,
            'socket_timeout': 60,
            'retries': 3,
            'fragment_retries': 3,
            'skip_unavailable_fragments': True,
            'keep_fragments': False,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            'extractor_args': {
                'youtube': {
                    'player_client': ['web', 'android_vr', 'android'],
                    'skip': ['hls', 'dash'],
                }
            },
            'file_access_retries': 2,
            'extractor_retries': 2,
            'connection_speed': 20,
            'throttledratelimit': 1000000,
        }

        # Use user's browser cookies if provided (from their YouTube login)
        if user_cookies and user_cookies.strip():
            try:
                # Validate cookie format before using
                if 'Netscape HTTP Cookie File' in user_cookies and len(user_cookies) > 50:
                    # Write user's cookies to temporary file
                    temp_cookies = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
                    temp_cookies.write(user_cookies)
                    temp_cookies.close()
                    opts['cookiefile'] = temp_cookies.name
                    logger.info(f"Using browser cookies for YouTube authentication")
                else:
                    logger.warning("Cookie format invalid, using anonymous download")
            except Exception as e:
                logger.warning(f"Failed to use cookies: {e}, falling back to anonymous")

        if download and save_path:
            opts['outtmpl'] = f"{save_path}/%(title)s.%(ext)s"
            opts['quiet'] = True
            opts['no_warnings'] = False

        return opts

    async def get_metadata(self, url: str, user_cookies: str = None):
        """Extract metadata using yt-dlp"""
        try:
            url = self._normalize_url(url)

            # Use user's cookies if provided
            ydl_opts = self._get_ydl_opts(download=False, user_cookies=user_cookies)

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

    async def download(self, url: str, quality: str, save_path: str, user_cookies: str = None):
        """Download YouTube video using yt-dlp with user's YouTube cookies"""
        try:
            is_short = "/shorts/" in url
            url = self._normalize_url(url)

            # Format string for quality selection
            # Shorts might have limited formats, so use fallback options
            if quality == 'best':
                quality_value = 'bestvideo+bestaudio/best' if not is_short else 'best'
            else:
                quality_value = f'bestvideo[height<={quality}]+bestaudio/best'

            # Use user's cookies if provided
            ydl_opts = self._get_ydl_opts(download=True, save_path=save_path, user_cookies=user_cookies)
            ydl_opts['format'] = quality_value

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=True)
                    filename = ydl.prepare_filename(info)
                except Exception as e:
                    # Fallback for Shorts with limited format options
                    if is_short:
                        logger.warning(f"Retrying Shorts download with best format: {str(e)}")
                        ydl_opts['format'] = 'best'
                        with yt_dlp.YoutubeDL(ydl_opts) as ydl_retry:
                            info = ydl_retry.extract_info(url, download=True)
                            filename = ydl_retry.prepare_filename(info)
                    else:
                        raise

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
