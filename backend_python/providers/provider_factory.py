from urllib.parse import urlparse
from .youtube_provider import YouTubeProvider
from .instagram_provider import InstagramProvider
from .facebook_provider import FacebookProvider
from .tiktok_provider import TikTokProvider
from .twitter_provider import TwitterProvider
from ..utils.logger import setup_logger

logger = setup_logger()

class ProviderFactory:
    @staticmethod
    def get_provider(url: str):
        parsed_url = urlparse(url.lower())
        domain = parsed_url.netloc.replace("www.", "")

        if "youtube.com" in domain or "youtu.be" in domain:
            return YouTubeProvider()
        elif "instagram.com" in domain:
            return InstagramProvider()
        elif "facebook.com" in domain or "fb.com" in domain:
            return FacebookProvider()
        elif "tiktok.com" in domain:
            return TikTokProvider()
        elif "twitter.com" in domain or "x.com" in domain:
            return TwitterProvider()
        else:
            raise ValueError(f"Unsupported platform: {domain}")

def get_provider(url: str):
    return ProviderFactory.get_provider(url)
