from urllib.parse import urlparse, parse_qs
from .logger import setup_logger

logger = setup_logger()

class URLParser:
    @staticmethod
    def extract_video_id(url: str):
        parsed_url = urlparse(url.lower())
        domain = parsed_url.netloc.replace("www.", "")

        if "youtube.com" in domain:
            query = parse_qs(parsed_url.query)
            return query.get("v", [None])[0]
        elif "youtu.be" in domain:
            return parsed_url.path.lstrip('/')
        elif "instagram.com" in domain:
            if "/p/" in url:
                return url.split("/p/")[1].rstrip('/')
            elif "/reel/" in url:
                return url.split("/reel/")[1].rstrip('/')
        elif "tiktok.com" in domain:
            if "/video/" in url:
                return url.split("/video/")[1].split("?")[0]
        elif "twitter.com" in domain or "x.com" in domain:
            if "/status/" in url:
                return url.split("/status/")[1].split("?")[0]

        return None

    @staticmethod
    def get_platform(url: str):
        parsed_url = urlparse(url.lower())
        domain = parsed_url.netloc.replace("www.", "")

        if "youtube.com" in domain or "youtu.be" in domain:
            return "youtube"
        elif "instagram.com" in domain:
            return "instagram"
        elif "facebook.com" in domain or "fb.com" in domain:
            return "facebook"
        elif "tiktok.com" in domain:
            return "tiktok"
        elif "twitter.com" in domain or "x.com" in domain:
            return "twitter"

        return None

    @staticmethod
    def validate_url(url: str):
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False

def get_platform(url: str):
    return URLParser.get_platform(url)

def extract_video_id(url: str):
    return URLParser.extract_video_id(url)

def validate_url(url: str):
    return URLParser.validate_url(url)
