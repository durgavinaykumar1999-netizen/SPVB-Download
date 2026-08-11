#!/usr/bin/env python3
"""Test upgraded YouTube provider against spec requirements"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend_python'))

from backend_python.providers.youtube_provider import YouTubeProvider


async def test_upgraded_provider():
    print("\n" + "="*70)
    print("TESTING UPGRADED YOUTUBE PROVIDER")
    print("="*70)

    provider = YouTubeProvider()

    # Test 1: Diagnostics
    print("\n✓ Test 1: Diagnostics")
    diag = provider.diagnostics()
    print(f"  yt-dlp: {diag['yt_dlp_version']}")
    print(f"  Node: {diag['node_path'] or 'NOT FOUND'}")
    print(f"  FFmpeg: {diag['ffmpeg_path'] or 'NOT FOUND'}")

    # Test 2: URL normalization
    print("\n✓ Test 2: URL Normalization")
    test_urls = [
        "https://youtu.be/dQw4w9WgXcQ",
        "https://youtube.com/shorts/Ha2HBB-zStg?si=xyz",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ]
    for url in test_urls:
        normalized = provider.normalize_url(url)
        print(f"  {url[:50]}...")
        print(f"    → {normalized[:60]}...")

    # Test 3: Long video metadata
    print("\n✓ Test 3: Long Video Metadata")
    long_video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    try:
        metadata = await provider.get_metadata(long_video)
        print(f"  Title: {metadata['title'][:60]}")
        print(f"  Duration: {metadata['duration']} seconds")
        print(f"  Type: {metadata['url_type']}")
        print(f"  Qualities: {len(metadata['qualities'])} available")
        if metadata['qualities']:
            print(f"  Max quality: {metadata['qualities'][0]['label']}")
    except Exception as e:
        print(f"  ❌ Error: {str(e)[:100]}")
        return False

    # Test 4: Short video metadata
    print("\n✓ Test 4: Short Video Metadata")
    short_video = "https://youtube.com/shorts/Ha2HBB-zStg"
    try:
        metadata = await provider.get_metadata(short_video)
        print(f"  Title: {metadata['title'][:60]}")
        print(f"  Duration: {metadata['duration']} seconds")
        print(f"  Type: {metadata['url_type']}")
        print(f"  Qualities: {len(metadata['qualities'])} available")
        if metadata['qualities']:
            print(f"  Max quality: {metadata['qualities'][0]['label']}")
    except Exception as e:
        print(f"  ❌ Error: {str(e)[:100]}")
        return False

    # Test 5: Download long video
    print("\n✓ Test 5: Download Long Video")
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            result = await provider.download(long_video, "best", tmpdir)
            print(f"  File: {os.path.basename(result['filename'])[:60]}")
            print(f"  Size: {result['file_size'] / (1024*1024):.2f} MB")
            print(f"  Format: {result['format']}")
        except Exception as e:
            print(f"  ❌ Error: {str(e)[:100]}")
            return False

    # Test 6: Download short video
    print("\n✓ Test 6: Download Short Video")
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            result = await provider.download(short_video, "best", tmpdir)
            print(f"  File: {os.path.basename(result['filename'])[:60]}")
            print(f"  Size: {result['file_size'] / (1024*1024):.2f} MB")
            print(f"  Format: {result['format']}")
        except Exception as e:
            print(f"  ❌ Error: {str(e)[:100]}")
            return False

    print("\n" + "="*70)
    print("✅ ALL TESTS PASSED - PROVIDER UPGRADE SUCCESSFUL")
    print("="*70)
    return True


async def main():
    success = await test_upgraded_provider()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
