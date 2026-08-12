from urllib.parse import urlparse
from ..utils.logger import setup_logger

logger = setup_logger()

# Lazy load other providers to avoid missing dependencies during development
def _get_instagram_provider():
    try:
        from .instagram_provider import InstagramProvider
        return InstagramProvider
    except ImportError:
        raise ValueError("Instagram provider not available")

def _get_facebook_provider():
    try:
        from .facebook_provider import FacebookProvider
        return FacebookProvider
    except ImportError:
        raise ValueError("Facebook provider not available")

def _get_tiktok_provider():
    try:
        from .tiktok_provider import TikTokProvider
        return TikTokProvider
    except ImportError:
        raise ValueError("TikTok provider not available")

def _get_twitter_provider():
    try:
        from .twitter_provider import TwitterProvider
        return TwitterProvider
    except ImportError:
        raise ValueError("Twitter provider not available")

class ProviderFactory:
    @staticmethod
    def get_provider(url: str):
        parsed_url = urlparse(url.lower())
        domain = parsed_url.netloc.replace("www.", "")

        if "instagram.com" in domain:
            return _get_instagram_provider()()
        elif "facebook.com" in domain or "fb.com" in domain:
            return _get_facebook_provider()()
        elif "tiktok.com" in domain:
            return _get_tiktok_provider()()
        elif "twitter.com" in domain or "x.com" in domain:
            return _get_twitter_provider()()
        else:
            raise ValueError(f"Unsupported platform: {domain}")

def get_provider(url: str):
    return ProviderFactory.get_provider(url)
