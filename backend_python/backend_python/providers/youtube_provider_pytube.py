"""
Alternative YouTube provider using pytube (no cookies needed)
"""
from ..utils.logger import setup_logger

logger = setup_logger()

try:
    from pytube import YouTube
    PYTUBE_AVAILABLE = True
except ImportError:
    PYTUBE_AVAILABLE = False
    logger.warning("pytube not installed, will use yt-dlp as fallback")


class YouTubePytubeProvider:
    def __init__(self):
        self.platform = "youtube"
        self.use_pytube = PYTUBE_AVAILABLE

    def _normalize_url(self, url: str) -> str:
        """Convert YouTube Shorts URLs to standard format"""
        if "/shorts/" in url:
            video_id = url.split("/shorts/")[1].split("?")[0]
            return f"https://www.youtube.com/watch?v={video_id}"
        return url

    async def get_metadata(self, url: str):
        """Extract metadata using pytube (no cookies needed)"""
        try:
            url = self._normalize_url(url)

            if not self.use_pytube:
                raise Exception("pytube not available")

            yt = YouTube(url)

            # Get available quality streams
            qualities = []
            try:
                # Get all progressive streams (video + audio combined)
                for stream in yt.streams.filter(progressive=True, file_extension='mp4'):
                    if stream.resolution:
                        height = int(stream.resolution.replace('p', ''))
                        if height not in [q['value'] for q in qualities]:
                            qualities.append({
                                'label': f"{height}p",
                                'value': height
                            })
            except Exception as e:
                logger.warning(f"Could not get progressive streams: {str(e)}")
                # Fallback to highest quality available
                qualities = [{'label': 'best', 'value': 'best'}]

            qualities = sorted(qualities, key=lambda x: x['value'], reverse=True)

            return {
                'title': yt.title,
                'duration': yt.length,
                'thumbnail': yt.thumbnail_url,
                'uploader': yt.author,
                'view_count': yt.views,
                'qualities': qualities if qualities else [{'label': 'best', 'value': 'best'}],
                'platform': self.platform,
                'is_age_restricted': False  # pytube handles this internally
            }

        except Exception as e:
            logger.error(f"pytube metadata error: {str(e)}")
            raise

    async def download(self, url: str, quality: str, save_path: str):
        """Download YouTube video using pytube (no cookies needed)"""
        try:
            url = self._normalize_url(url)

            if not self.use_pytube:
                raise Exception("pytube not available")

            yt = YouTube(url)

            # Select stream based on quality
            if quality == 'best':
                # Get best progressive stream (has both video and audio)
                stream = yt.streams.filter(progressive=True, file_extension='mp4').first()
            else:
                quality_int = int(quality)
                # Try to get stream with specified quality
                stream = yt.streams.filter(
                    progressive=True,
                    file_extension='mp4',
                    resolution=f'{quality_int}p'
                ).first()

                # Fallback to closest quality if exact match not found
                if not stream:
                    stream = yt.streams.filter(progressive=True, file_extension='mp4').first()

            if not stream:
                # If no progressive stream, get best available video
                stream = yt.streams.get_highest_resolution()

            if not stream:
                raise Exception("No suitable stream found for this video")

            # Download the stream
            logger.info(f"Downloading: {yt.title} ({stream.resolution})")
            output_file = stream.download(output_path=save_path)

            logger.info(f"✅ Downloaded: {yt.title}")

            return {
                'success': True,
                'filename': output_file,
                'title': yt.title,
                'format': 'mp4'
            }

        except Exception as e:
            logger.error(f"pytube download error: {str(e)}")
            raise
