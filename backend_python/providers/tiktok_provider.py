import re
import os
import aiohttp
from ..utils.logger import setup_logger

logger = setup_logger()

class TikTokProvider:
    def __init__(self):
        self.platform = "tiktok"
        self.api_url = "https://www.tiktok.com/api/v1/video"

    def _extract_video_id(self, url: str) -> str:
        """Extract TikTok video ID from URL"""
        patterns = [
            r'tiktok\.com/@[\w.-]+/video/(\d+)',
            r'vm\.tiktok\.com/(\w+)',
            r'vt\.tiktok\.com/(\w+)',
            r'tiktok\.com/v/(\d+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        raise ValueError(f"Could not extract TikTok video ID from URL: {url}")

    async def get_metadata(self, url: str):
        """Get TikTok video metadata without authentication"""
        try:
            video_id = self._extract_video_id(url)
            logger.info(f"Extracted TikTok video ID: {video_id}")

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.tiktok.com/',
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=10) as resp:
                    if resp.status != 200:
                        raise ValueError(f"Failed to fetch TikTok page: {resp.status}")

                    html = await resp.text()

                    title = self._extract_title(html)
                    thumbnail = self._extract_thumbnail(html)
                    duration = self._extract_duration(html)

                    return {
                        'title': title or 'TikTok Video',
                        'duration': duration or 30,
                        'thumbnail': thumbnail or '',
                        'uploader': 'TikTok User',
                        'qualities': [
                            {'label': 'best', 'value': 'best'},
                            {'label': '720p', 'value': '720'},
                            {'label': '480p', 'value': '480'},
                        ],
                        'platform': self.platform,
                        'video_id': video_id
                    }
        except Exception as e:
            logger.error(f"TikTok metadata error: {str(e)}")
            raise

    def _extract_title(self, html: str) -> str:
        """Extract video title from HTML"""
        try:
            match = re.search(r'<title>([^<]+)</title>', html)
            if match:
                return match.group(1).replace(' | TikTok', '').strip()
        except:
            pass
        return 'TikTok Video'

    def _extract_thumbnail(self, html: str) -> str:
        """Extract thumbnail URL from HTML"""
        try:
            patterns = [
                r'"coverMid":"([^"]+)"',
                r'"dynamicCover":"([^"]+)"',
                r'property="og:image" content="([^"]+)"',
            ]
            for pattern in patterns:
                match = re.search(pattern, html)
                if match:
                    return match.group(1)
        except:
            pass
        return ''

    def _extract_duration(self, html: str) -> int:
        """Extract video duration from HTML"""
        try:
            match = re.search(r'"duration":(\d+)', html)
            if match:
                return int(match.group(1))
        except:
            pass
        return 30

    async def download(self, url: str, quality: str, save_path: str):
        """Download TikTok video without authentication"""
        try:
            video_id = self._extract_video_id(url)
            logger.info(f"Downloading TikTok video: {video_id}")

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.tiktok.com/',
            }

            download_url = await self._get_download_url(url, headers)

            if not download_url:
                raise ValueError("Could not extract download URL from TikTok")

            os.makedirs(save_path, exist_ok=True)

            filename = os.path.join(save_path, f"tiktok_{video_id}.mp4")

            async with aiohttp.ClientSession() as session:
                async with session.get(download_url, headers=headers, timeout=30) as resp:
                    if resp.status != 200:
                        raise ValueError(f"Failed to download video: {resp.status}")

                    with open(filename, 'wb') as f:
                        async for chunk in resp.content.iter_chunked(8192):
                            f.write(chunk)

            logger.info(f"TikTok video downloaded successfully: {filename}")

            return {
                'success': True,
                'filename': filename,
                'title': f'TikTok_{video_id}',
                'format': 'mp4'
            }

        except Exception as e:
            logger.error(f"TikTok download error: {str(e)}")
            raise

    async def _get_download_url(self, url: str, headers: dict) -> str:
        """Extract download URL from TikTok video page"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=10) as resp:
                    html = await resp.text()

                    patterns = [
                        r'"playAddr":"([^"]+)"',
                        r'"downloadAddr":"([^"]+)"',
                        r'"videoUrl":"([^"]+)"',
                    ]

                    for pattern in patterns:
                        match = re.search(pattern, html)
                        if match:
                            download_url = match.group(1)
                            download_url = download_url.replace('\\/', '/')
                            return download_url

                    logger.warning("Could not find download URL in HTML, trying alternative method...")
                    return await self._get_download_url_api(url)

        except Exception as e:
            logger.error(f"Error extracting download URL: {str(e)}")
            raise

    async def _get_download_url_api(self, url: str) -> str:
        """Alternative method using TikTok API endpoint"""
        try:
            video_id = self._extract_video_id(url)
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.tiktok.com/',
            }

            api_url = f"https://api.tiktok.com/v1/video/query/?aweme_id={video_id}"

            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, headers=headers, timeout=10) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get('data', {}).get('video', {}).get('downloadAddr'):
                            return data['data']['video']['downloadAddr']

            raise ValueError("Could not get download URL from API")

        except Exception as e:
            logger.error(f"TikTok API error: {str(e)}")
            raise
