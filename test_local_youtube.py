#!/usr/bin/env python3
"""Direct YouTube provider test - no backend/MongoDB needed"""

import asyncio
import sys
import os
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend_python'))

from backend_python.providers.youtube_provider import YouTubeProvider


async def test_youtube_locally():
    print("\n" + "="*70)
    print("LOCAL YOUTUBE PROVIDER TEST")
    print("="*70)

    provider = YouTubeProvider()

    # Test diagnostics
    print("\n✓ System Diagnostics:")
    diag = provider.diagnostics()
    for key, value in diag.items():
        status = "✅" if value and value != "unknown" else "⚠️ "
        print(f"  {status} {key}: {value}")

    # Test 1: Long video metadata
    print("\n✓ Test 1: Long Video Metadata")
    url1 = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    try:
        meta = await provider.get_metadata(url1)
        print(f"  ✅ Title: {meta['title'][:60]}")
        print(f"  ✅ Duration: {meta['duration']}s")
        print(f"  ✅ Qualities: {len(meta['qualities'])} available")
        print(f"  ✅ URL Type: {meta['url_type']}")
        assert meta['duration'] > 0, "Invalid duration"
        assert len(meta['qualities']) > 0, "No qualities found"
    except Exception as e:
        print(f"  ❌ FAIL: {str(e)[:100]}")
        import traceback
        traceback.print_exc()
        return False

    # Test 2: Short video metadata
    print("\n✓ Test 2: Short Video Metadata")
    url2 = "https://youtube.com/shorts/Ha2HBB-zStg"
    try:
        meta = await provider.get_metadata(url2)
        print(f"  ✅ Title: {meta['title'][:60]}")
        print(f"  ✅ Duration: {meta['duration']}s")
        print(f"  ✅ Qualities: {len(meta['qualities'])} available")
        print(f"  ✅ URL Type: {meta['url_type']}")
        assert meta['duration'] > 0, "Invalid duration"
        assert len(meta['qualities']) > 0, "No qualities found"
    except Exception as e:
        print(f"  ❌ FAIL: {str(e)[:100]}")
        import traceback
        traceback.print_exc()
        return False

    # Test 3: Download long video
    print("\n✓ Test 3: Download Long Video")
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            result = await provider.download(url1, "best", tmpdir)
            file_size_mb = result['file_size'] / (1024 * 1024)
            filename = os.path.basename(result['filename'])
            print(f"  ✅ Downloaded: {filename[:50]}")
            print(f"  ✅ File size: {file_size_mb:.2f} MB")
            print(f"  ✅ Format: {result['format']}")
            assert os.path.exists(result['filename']), "File doesn't exist"
            assert result['file_size'] > 0, "File size is 0"
        except Exception as e:
            print(f"  ❌ FAIL: {str(e)[:100]}")
            import traceback
            traceback.print_exc()
            return False

    # Test 4: Download short video
    print("\n✓ Test 4: Download Short Video")
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            result = await provider.download(url2, "best", tmpdir)
            file_size_mb = result['file_size'] / (1024 * 1024)
            filename = os.path.basename(result['filename'])
            print(f"  ✅ Downloaded: {filename[:50]}")
            print(f"  ✅ File size: {file_size_mb:.2f} MB")
            print(f"  ✅ Format: {result['format']}")
            assert os.path.exists(result['filename']), "File doesn't exist"
            assert result['file_size'] > 0, "File size is 0"
        except Exception as e:
            print(f"  ❌ FAIL: {str(e)[:100]}")
            import traceback
            traceback.print_exc()
            return False

    # Test 5: URL Normalization
    print("\n✓ Test 5: URL Normalization")
    test_urls = [
        ("https://youtu.be/dQw4w9WgXcQ", "youtu.be short"),
        ("https://youtube.com/shorts/Ha2HBB-zStg?si=xyz", "shorts with tracking"),
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", "embed URL"),
    ]
    try:
        for url, desc in test_urls:
            normalized = provider.normalize_url(url)
            print(f"  ✅ {desc}: normalized correctly")
            assert "watch?v=" in normalized, f"Failed to normalize: {url}"
    except Exception as e:
        print(f"  ❌ FAIL: {str(e)[:100]}")
        return False

    print("\n" + "="*70)
    print("✅ ALL YOUTUBE PROVIDER TESTS PASSED - PRODUCTION READY!")
    print("="*70)
    print("\nSummary:")
    print("  ✅ Long video metadata extraction: WORKING")
    print("  ✅ Short video metadata extraction: WORKING")
    print("  ✅ Long video download: WORKING")
    print("  ✅ Short video download: WORKING")
    print("  ✅ URL normalization: WORKING")
    print("  ✅ Real YouTube videos tested: WORKING")
    print("\nNext steps:")
    print("  1. Commit these test results to GitHub")
    print("  2. Set up MongoDB (local or Atlas)")
    print("  3. Test frontend + backend together")
    print("  4. Deploy to production")
    return True


async def main():
    success = await test_youtube_locally()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
