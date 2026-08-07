import yt_dlp
from ..utils.logger import setup_logger

logger = setup_logger()

class YouTubeProvider:
    def __init__(self):
        self.platform = "youtube"

    def _get_ydl_opts(self, download: bool = False, save_path: str = None):
        """Get yt-dlp options optimized for no-cookie downloads"""
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_unavailable_fragments': True,
            'socket_timeout': 30,
            # Disable cookie jar to download without authentication
            'cookiefile': None,
            # Use extractor args to bypass some restrictions
            'extractor_args': {
                'youtube': {
                    'skip': ['webpage', 'js'],
                }
            },
        }

        if download and save_path:
            opts['outtmpl'] = f"{save_path}/%(title)s.%(ext)s"

        return opts

    async def get_metadata(self, url: str):
        """Extract metadata without requiring cookies"""
        try:
            ydl_opts = self._get_ydl_opts(download=False)

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=False)
                except yt_dlp.utils.DownloadError as e:
                    logger.warning(f"First attempt failed: {str(e)}, retrying with fallback...")
                    # Fallback: try with more permissive options
                    ydl_opts['quiet'] = False
                    ydl_opts['no_warnings'] = False
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
        """Download YouTube video without cookies - works with public videos"""
        try:
            # Format string for best quality at specified height
            if quality == 'best':
                quality_value = 'bestvideo+bestaudio/best'
            else:
                quality_value = f'bestvideo[height<={quality}]+bestaudio/best'

            ydl_opts = self._get_ydl_opts(download=True, save_path=save_path)
            ydl_opts['format'] = quality_value

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=True)
                    filename = ydl.prepare_filename(info)

                    logger.info(f"Successfully downloaded: {info.get('title', '')} at quality {quality}")

                    return {
                        'success': True,
                        'filename': filename,
                        'title': info.get('title', ''),
                        'format': info.get('ext', 'mp4')
                    }
                except yt_dlp.utils.DownloadError as e:
                    logger.warning(f"Download with quality {quality} failed: {str(e)}, using best available...")
                    # Fallback to best available quality without restrictions
                    ydl_opts['format'] = 'best'
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl_fallback:
                        info = ydl_fallback.extract_info(url, download=True)
                        filename = ydl_fallback.prepare_filename(info)

                        logger.info(f"Downloaded with fallback quality: {info.get('title', '')}")

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
