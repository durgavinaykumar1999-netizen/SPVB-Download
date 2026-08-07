import yt_dlp
import instaloader
from ..utils.logger import setup_logger

logger = setup_logger()

class InstagramProvider:
    def __init__(self):
        self.platform = "instagram"

    async def get_metadata(self, url: str):
        try:
            return await self._get_metadata_instaloader(url)
        except Exception as e:
            logger.warning(f"Instaloader failed, trying yt-dlp: {str(e)}")
            try:
                return await self._get_metadata_ytdlp(url)
            except Exception as e2:
                logger.error(f"Both methods failed: {str(e2)}")
                raise

    async def _get_metadata_instaloader(self, url: str):
        try:
            L = instaloader.Instaloader()
            shortcode = self._extract_shortcode(url)
            post = instaloader.Post.from_shortcode(L.context, shortcode)

            qualities = []
            if post.video_duration:
                if post.video_height:
                    height = post.video_height
                    qualities.append({
                        'label': f"{height}p",
                        'value': height
                    })

            if not qualities:
                qualities = [{'label': 'best', 'value': 'best'}]

            return {
                'title': post.title or post.caption[:50] if post.caption else "Instagram Post",
                'duration': post.video_duration or 0,
                'thumbnail': post.url,
                'likes': post.likes,
                'qualities': qualities,
                'platform': self.platform
            }
        except Exception as e:
            logger.error(f"Instaloader error: {str(e)}")
            raise

    async def _get_metadata_ytdlp(self, url: str):
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
                    'title': info.get('title', 'Instagram Post'),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'uploader': info.get('uploader', ''),
                    'qualities': qualities if qualities else [{'label': 'best', 'value': 'best'}],
                    'platform': self.platform
                }
        except Exception as e:
            logger.error(f"yt-dlp error: {str(e)}")
            raise

    def _extract_shortcode(self, url: str):
        if 'instagram.com/p/' in url:
            return url.split('/p/')[1].rstrip('/')
        elif 'instagram.com/reel/' in url:
            return url.split('/reel/')[1].rstrip('/')
        raise ValueError("Invalid Instagram URL")

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
            logger.error(f"Instagram download error: {str(e)}")
            raise
