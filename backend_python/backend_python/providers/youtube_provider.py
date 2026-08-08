import yt_dlp
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

    def _get_ydl_opts(self, download: bool = False, save_path: str = None, skip_extraction: bool = True):
        """Get yt-dlp options optimized for downloads"""
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_unavailable_fragments': True,
            'socket_timeout': 30,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
        }

        # Use better extraction with client options
        if not skip_extraction:
            opts['extractor_args'] = {
                'youtube': {
                    'player_client': ['web'],
                }
            }
        else:
            opts['extractor_args'] = {
                'youtube': {
                    'player_client': ['web'],
                    'skip': ['webpage'],
                }
            }

        if download and save_path:
            opts['outtmpl'] = f"{save_path}/%(title)s.%(ext)s"

        return opts

    async def get_metadata(self, url: str):
        """Extract metadata - handles bot detection gracefully"""
        try:
            # Normalize YouTube Shorts URLs to standard format
            url = self._normalize_url(url)

            # Try with web client first
            ydl_opts = self._get_ydl_opts(download=False, skip_extraction=False)
            info = None

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=False)
                except yt_dlp.utils.DownloadError as e:
                    if "Sign in to confirm" in str(e) or "bot" in str(e).lower():
                        logger.warning(f"YouTube bot detection triggered: {str(e)}")
                    else:
                        logger.warning(f"Extraction failed: {str(e)}, retrying...")

            # Fallback: retry with different options
            if info is None:
                ydl_opts = self._get_ydl_opts(download=False, skip_extraction=True)
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)

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
        """Download YouTube video - handles bot detection and quality fallbacks"""
        try:
            # Normalize YouTube Shorts URLs to standard format
            url = self._normalize_url(url)

            # Format string for best quality at specified height
            if quality == 'best':
                quality_value = 'bestvideo+bestaudio/best'
            else:
                quality_value = f'bestvideo[height<={quality}]+bestaudio/best'

            # Try with web client extraction
            ydl_opts = self._get_ydl_opts(download=True, save_path=save_path, skip_extraction=False)
            ydl_opts['format'] = quality_value
            download_succeeded = False

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=True)
                    filename = ydl.prepare_filename(info)
                    download_succeeded = True

                    logger.info(f"Successfully downloaded: {info.get('title', '')} at quality {quality}")

                    return {
                        'success': True,
                        'filename': filename,
                        'title': info.get('title', ''),
                        'format': info.get('ext', 'mp4')
                    }
                except yt_dlp.utils.DownloadError as e:
                    error_msg = str(e)
                    if "Sign in to confirm" in error_msg or "bot" in error_msg.lower():
                        logger.warning(f"YouTube bot detection - video may require login: {error_msg}")
                    else:
                        logger.warning(f"Download with quality {quality} failed: {error_msg}, trying alternatives...")

            # Fallback: try with different extraction
            if not download_succeeded:
                ydl_opts = self._get_ydl_opts(download=True, save_path=save_path, skip_extraction=True)
                ydl_opts['format'] = quality_value
                with yt_dlp.YoutubeDL(ydl_opts) as ydl_retry:
                    try:
                        info = ydl_retry.extract_info(url, download=True)
                        filename = ydl_retry.prepare_filename(info)
                        download_succeeded = True

                        logger.info(f"Downloaded after retry: {info.get('title', '')}")

                        return {
                            'success': True,
                            'filename': filename,
                            'title': info.get('title', ''),
                            'format': info.get('ext', 'mp4')
                        }
                    except yt_dlp.utils.DownloadError:
                        logger.warning(f"Download with quality {quality} still failed, using best available...")

            # Final fallback to best available quality
            ydl_opts = self._get_ydl_opts(download=True, save_path=save_path, skip_extraction=False)
            ydl_opts['format'] = 'best'
            with yt_dlp.YoutubeDL(ydl_opts) as ydl_fallback:
                info = ydl_fallback.extract_info(url, download=True)
                filename = ydl_fallback.prepare_filename(info)

                logger.info(f"Downloaded with best available quality: {info.get('title', '')}")

                return {
                    'success': True,
                    'filename': filename,
                    'title': info.get('title', ''),
                    'format': info.get('ext', 'mp4'),
                    'note': 'Downloaded with best available quality due to restrictions'
                }
        except Exception as e:
            logger.error(f"YouTube download error: {str(e)}")
            raise
