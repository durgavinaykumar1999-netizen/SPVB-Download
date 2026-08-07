import yt_dlp
from ..utils.logger import setup_logger

logger = setup_logger()

class TwitterProvider:
    def __init__(self):
        self.platform = "twitter"

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
                    'title': info.get('title', 'Twitter/X Video'),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'uploader': info.get('uploader', ''),
                    'qualities': qualities if qualities else [{'label': 'best', 'value': 'best'}],
                    'platform': self.platform
                }
        except Exception as e:
            logger.error(f"Twitter metadata error: {str(e)}")
            raise

    async def download(self, url: str, quality: str, save_path: str):
        try:
            quality_value = 'best' if quality == 'best' else f'bestvideo[height={quality}]'

            ydl_opts = {
                'format': quality_value,
                'outtmpl': f"{save_path}/%(title)s.%(ext)s",
                'quiet': True,
                'no_warnings': True,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)

                return {
                    'success': True,
                    'filename': filename,
                    'title': info.get('title', ''),
                    'format': info.get('ext', 'mp4')
                }
        except Exception as e:
            logger.error(f"Twitter download error: {str(e)}")
            raise
