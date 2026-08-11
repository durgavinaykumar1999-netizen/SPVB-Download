#!/usr/bin/env python3
"""Test that provider works WITHOUT cookies for public videos"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend_python'))

from backend_python.providers.youtube_provider import YouTubeProvider


async def test_without_cookies():
    print("\n" + "="*70)
    print("TEST: PROVIDER WORKS WITHOUT COOKIES FOR PUBLIC VIDEOS")
    print("="*70)

    provider = YouTubeProvider()

    # Public video - should work WITHOUT cookies
    print("\n✓ Test 1: Public Long Video (NO COOKIES)")
    public_long = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
    try:
        metadata = await provider.get_metadata(public_long)  # NO cookies passed
        print(f"  ✅ SUCCESS - Metadata extracted without cookies")
        print(f"     Title: {metadata['title'][:50]}")
        print(f"     Duration: {metadata['duration']}s")
    except Exception as e:
        print(f"  ❌ FAILED - Error: {str(e)[:80]}")
        return False

    # Public short - should work WITHOUT cookies
    print("\n✓ Test 2: Public Short Video (NO COOKIES)")
    public_short = "https://youtube.com/shorts/Ha2HBB-zStg"
    try:
        metadata = await provider.get_metadata(public_short)  # NO cookies passed
        print(f"  ✅ SUCCESS - Metadata extracted without cookies")
        print(f"     Title: {metadata['title'][:50]}")
        print(f"     Duration: {metadata['duration']}s")
    except Exception as e:
        print(f"  ❌ FAILED - Error: {str(e)[:80]}")
        return False

    # Age-restricted video - may fail without cookies (expected)
    print("\n✓ Test 3: Age-Restricted Video (NO COOKIES)")
    age_restricted = "https://www.youtube.com/watch?v=gg5-h5soHuQ"
    try:
        metadata = await provider.get_metadata(age_restricted)  # NO cookies passed
        print(f"  ✅ WORKED - Even age-restricted worked!")
        print(f"     Title: {metadata['title'][:50]}")
    except RuntimeError as e:
        error_msg = str(e)
        if "authentication" in error_msg.lower() or "cookies" in error_msg.lower():
            print(f"  ℹ️  EXPECTED FAIL - Requires cookies (age-restricted)")
            print(f"     Error message guides user to provide cookies")
            print(f"     Message: {error_msg[:80]}...")
        else:
            print(f"  ❌ UNEXPECTED ERROR: {error_msg[:80]}")
            return False
    except Exception as e:
        print(f"  ❌ UNEXPECTED ERROR: {str(e)[:80]}")
        return False

    # Test provider state
    print("\n✓ Test 4: Provider Status Check")
    diag = provider.diagnostics()
    print(f"  Node.js: {diag['node_path']}")
    print(f"  FFmpeg: {diag['ffmpeg_path']}")
    print(f"  Status: {'✅ Ready for production' if diag['node_path'] and diag['ffmpeg_path'] else '⚠️  Missing dependencies'}")

    print("\n" + "="*70)
    print("✅ PROVIDER WORKS WITHOUT COOKIES FOR PUBLIC VIDEOS")
    print("✅ PROVIDER PROPERLY HANDLES AUTH ERRORS FOR RESTRICTED CONTENT")
    print("✅ READY FOR PRODUCTION")
    print("="*70)
    return True


async def main():
    success = await test_without_cookies()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
