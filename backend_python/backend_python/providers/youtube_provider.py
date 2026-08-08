import yt_dlp
import os
from ..utils.logger import setup_logger

logger = setup_logger()

# Try to import pytube for YouTube (no cookies needed)
PYTUBE_AVAILABLE = False
PytubeYouTube = None

try:
    from pytube import YouTube as PytubeYouTube
    PYTUBE_AVAILABLE = True
    logger.info("✅ pytube available - will use as primary YouTube provider (NO COOKIES NEEDED)")
except Exception as e:
    logger.warning(f"⚠️ pytube import failed ({str(e)}) - will use yt-dlp with cookies")
    try:
        from pytubefix import YouTube as PytubeYouTube
        PYTUBE_AVAILABLE = True
        logger.info("✅ pytubefix available - will use as primary YouTube provider (NO COOKIES NEEDED)")
    except Exception as e2:
        logger.warning(f"⚠️ pytubefix also unavailable ({str(e2)}) - falling back to yt-dlp only")
        PYTUBE_AVAILABLE = False


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
        """Extract metadata - tries pytube first (no cookies), then yt-dlp"""
        try:
            # Normalize YouTube Shorts URLs to standard format
            url = self._normalize_url(url)

            # Try pytube first (no cookies needed)
            if PYTUBE_AVAILABLE and PytubeYouTube:
                try:
                    logger.info("📺 Trying pytube (no cookies needed)...")
                    yt = PytubeYouTube(url)

                    qualities = []
                    try:
                        for stream in yt.streams.filter(progressive=True, file_extension='mp4'):
                            if stream.resolution:
                                height = int(stream.resolution.replace('p', ''))
                                if height not in [q['value'] for q in qualities]:
                                    qualities.append({
                                        'label': f"{height}p",
                                        'value': height
                                    })
                    except:
                        qualities = [{'label': 'best', 'value': 'best'}]

                    qualities = sorted(qualities, key=lambda x: x['value'], reverse=True)

                    logger.info(f"✅ Metadata extracted with pytube (no cookies)")
                    return {
                        'title': yt.title,
                        'duration': yt.length,
                        'thumbnail': yt.thumbnail_url,
                        'uploader': yt.author,
                        'view_count': yt.views,
                        'qualities': qualities if qualities else [{'label': 'best', 'value': 'best'}],
                        'platform': self.platform,
                        'is_age_restricted': False
                    }
                except Exception as e:
                    logger.warning(f"⚠️ pytube failed: {str(e)}, falling back to yt-dlp...")

            # Fallback to yt-dlp with cookies
            logger.info("Trying yt-dlp with cookies...")
            ydl_opts = self._get_ydl_opts(download=False, use_cookies=True)
            info = None

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=False)
                    logger.info(f"✅ Metadata extracted with yt-dlp (cookies)")
                except yt_dlp.utils.DownloadError as e:
                    error_msg = str(e)
                    if "Sign in to confirm" in error_msg or "bot" in error_msg.lower():
                        logger.warning(f"Bot detection - trying without cookies: {error_msg}")
                    else:
                        logger.warning(f"Extraction failed: {error_msg}")

            # Fallback: try yt-dlp without cookies requirement
            if info is None:
                logger.info("Retrying yt-dlp without strict cookie requirement...")
                ydl_opts = self._get_ydl_opts(download=False, use_cookies=False)
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    try:
                        info = ydl.extract_info(url, download=False)
                        logger.info("✅ Metadata extracted with yt-dlp fallback")
                    except Exception as e2:
                        logger.error(f"All extraction methods failed: {str(e2)}")
                        raise

            formats = info.get('formats', [])
            qualities = []

            for fmt in formats:
                if fmt.get('height'):
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
        """Download YouTube video - tries pytube first, then yt-dlp"""
        try:
            # Normalize YouTube Shorts URLs to standard format
            url = self._normalize_url(url)

            # Try pytube first (no cookies needed)
            if PYTUBE_AVAILABLE and PytubeYouTube:
                try:
                    logger.info(f"📺 Downloading with pytube (no cookies)...")
                    yt = PytubeYouTube(url)

                    # Select stream based on quality
                    if quality == 'best':
                        stream = yt.streams.filter(progressive=True, file_extension='mp4').first()
                    else:
                        quality_int = int(quality)
                        stream = yt.streams.filter(
                            progressive=True,
                            file_extension='mp4',
                            resolution=f'{quality_int}p'
                        ).first()

                        if not stream:
                            stream = yt.streams.filter(progressive=True, file_extension='mp4').first()

                    if not stream:
                        stream = yt.streams.get_highest_resolution()

                    if not stream:
                        raise Exception("No suitable stream found")

                    logger.info(f"⏳ Downloading: {yt.title} ({stream.resolution})...")
                    output_file = stream.download(output_path=save_path)

                    logger.info(f"✅ Downloaded with pytube: {yt.title}")
                    return {
                        'success': True,
                        'filename': output_file,
                        'title': yt.title,
                        'format': 'mp4'
                    }
                except Exception as e:
                    logger.warning(f"⚠️ pytube download failed: {str(e)}, falling back to yt-dlp...")

            # Fallback to yt-dlp with cookies
            logger.info("Trying yt-dlp with cookies...")

            # Format string for best quality at specified height
            if quality == 'best':
                quality_value = 'bestvideo+bestaudio/best'
            else:
                quality_value = f'bestvideo[height<={quality}]+bestaudio/best'

            # Try with browser cookies first
            ydl_opts = self._get_ydl_opts(download=True, save_path=save_path, use_cookies=True)
            ydl_opts['format'] = quality_value
            download_succeeded = False

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=True)
                    filename = ydl.prepare_filename(info)
                    download_succeeded = True

                    logger.info(f"✅ Downloaded with yt-dlp: {info.get('title', '')} at quality {quality}")

                    return {
                        'success': True,
                        'filename': filename,
                        'title': info.get('title', ''),
                        'format': info.get('ext', 'mp4')
                    }
                except yt_dlp.utils.DownloadError as e:
                    error_msg = str(e)
                    if "Sign in to confirm" in error_msg or "bot" in error_msg.lower():
                        logger.warning(f"⚠️ Bot detection triggered, trying alternative method...")
                    else:
                        logger.warning(f"Download failed: {error_msg}, trying alternatives...")

            # Fallback: try without strict cookie requirement
            if not download_succeeded:
                logger.info("Attempting yt-dlp fallback without cookie requirement...")
                ydl_opts = self._get_ydl_opts(download=True, save_path=save_path, use_cookies=False)
                ydl_opts['format'] = quality_value
                with yt_dlp.YoutubeDL(ydl_opts) as ydl_retry:
                    try:
                        info = ydl_retry.extract_info(url, download=True)
                        filename = ydl_retry.prepare_filename(info)
                        download_succeeded = True

                        logger.info(f"✅ Downloaded with yt-dlp fallback: {info.get('title', '')}")

                        return {
                            'success': True,
                            'filename': filename,
                            'title': info.get('title', ''),
                            'format': info.get('ext', 'mp4')
                        }
                    except yt_dlp.utils.DownloadError as e2:
                        logger.warning(f"Fallback failed, trying best quality...")

            # Final fallback to best available quality
            if not download_succeeded:
                logger.info("Using best available quality fallback...")
                ydl_opts = self._get_ydl_opts(download=True, save_path=save_path, use_cookies=False)
                ydl_opts['format'] = 'best'
                with yt_dlp.YoutubeDL(ydl_opts) as ydl_fallback:
                    info = ydl_fallback.extract_info(url, download=True)
                    filename = ydl_fallback.prepare_filename(info)

                    logger.info(f"✅ Downloaded with best quality: {info.get('title', '')}")

                    return {
                        'success': True,
                        'filename': filename,
                        'title': info.get('title', ''),
                        'format': info.get('ext', 'mp4'),
                        'note': 'Downloaded with best available quality'
                    }
        except Exception as e:
            logger.error(f"❌ YouTube download error: {str(e)}")
            raise
