import yt_dlp
from ..utils.logger import setup_logger

logger = setup_logger()

class TikTokProvider:
    def __init__(self):
        self.platform = "tiktok"

    def _get_ydl_opts(self, download: bool = False, save_path: str = None):
        """Get yt-dlp options optimized for TikTok"""
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_unavailable_fragments': True,
            'socket_timeout': 30,
            'cookiefile': None,
        }

        if download and save_path:
            opts['outtmpl'] = f"{save_path}/%(title)s.%(ext)s"

        return opts

    async def get_metadata(self, url: str):
        """Extract TikTok metadata using yt-dlp"""
        try:
            ydl_opts = self._get_ydl_opts(download=False)

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=False)
                except yt_dlp.utils.DownloadError as e:
                    logger.warning(f"First attempt failed: {str(e)}, retrying...")
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
                    'title': info.get('title', 'TikTok Video'),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'uploader': info.get('uploader', 'TikTok User'),
                    'qualities': qualities if qualities else [{'label': 'best', 'value': 'best'}],
                    'platform': self.platform
                }
        except Exception as e:
            logger.error(f"TikTok metadata error: {str(e)}")
            raise

    async def download(self, url: str, quality: str, save_path: str, user_cookies: str = None):
        """Download TikTok video using yt-dlp (handles auth/tokens internally)"""
        try:
            quality_value = 'best' if quality == 'best' else f'bestvideo[height<={quality}]+bestaudio/best'

            ydl_opts = self._get_ydl_opts(download=True, save_path=save_path)
            ydl_opts['format'] = quality_value

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=True)
                    filename = ydl.prepare_filename(info)

                    logger.info(f"Successfully downloaded TikTok: {info.get('title', '')}")

                    return {
                        'success': True,
                        'filename': filename,
                        'title': info.get('title', ''),
                        'format': info.get('ext', 'mp4')
                    }
                except yt_dlp.utils.DownloadError as e:
                    logger.warning(f"Download with quality {quality} failed: {str(e)}, using best available...")
                    # Fallback to best quality
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
                            'note': 'Downloaded with best available quality'
                        }
        except Exception as e:
            logger.error(f"TikTok download error: {str(e)}")
            raise
