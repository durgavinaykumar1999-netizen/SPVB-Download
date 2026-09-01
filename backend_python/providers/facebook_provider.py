import yt_dlp
from ..utils.logger import setup_logger
from .download_opts import build_download_opts, resolve_filename

logger = setup_logger()

class FacebookProvider:
    def __init__(self):
        self.platform = "facebook"

    async def get_metadata(self, url: str):
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
            }

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
                    'title': info.get('title', 'Facebook Video'),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'uploader': info.get('uploader', ''),
                    'qualities': qualities if qualities else [{'label': 'best', 'value': 'best'}],
                    'platform': self.platform
                }
        except Exception as e:
            logger.error(f"Facebook metadata error: {str(e)}")
            raise

    async def download(self, url: str, quality: str, save_path: str, user_cookies: str = None):
        try:
            ydl_opts = build_download_opts(save_path, quality)

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = resolve_filename(ydl, info)

                return {
                    'success': True,
                    'filename': filename,
                    'title': info.get('title', ''),
                    'format': 'mp4'
                }
        except Exception as e:
            logger.error(f"Facebook download error: {str(e)}")
            raise
