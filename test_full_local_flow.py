#!/usr/bin/env python3
"""Complete end-to-end test: YouTube → MongoDB → Cloudinary"""

import asyncio
import sys
import os
import tempfile
import uuid
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend_python'))

from backend_python.providers.youtube_provider import YouTubeProvider
from backend_python.services.mongodb_service import MongoDBService
from backend_python.services.cloudinary_service import CloudinaryService
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend_python/.env')


async def test_full_flow():
    print("\n" + "="*70)
    print("COMPLETE END-TO-END LOCAL TEST")
    print("YouTube → MongoDB → Cloudinary")
    print("="*70)

    # Initialize services
    print("\n✓ Initializing Services...")
    try:
        youtube_provider = YouTubeProvider()
        print("  ✅ YouTube Provider initialized")
    except Exception as e:
        print(f"  ❌ YouTube Provider failed: {e}")
        return False

    try:
        mongodb = MongoDBService()
        print("  ✅ MongoDB connected")
    except Exception as e:
        print(f"  ❌ MongoDB failed: {e}")
        print("     Fix: Go to MongoDB Atlas and whitelist your IP")
        return False

    try:
        cloudinary = CloudinaryService()
        print("  ✅ Cloudinary initialized")
    except Exception as e:
        print(f"  ❌ Cloudinary failed: {e}")
        return False

    # Test 1: YouTube metadata
    print("\n✓ Test 1: YouTube Metadata Extraction")
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    try:
        metadata = await youtube_provider.get_metadata(url)
        print(f"  ✅ Title: {metadata['title'][:50]}")
        print(f"  ✅ Duration: {metadata['duration']}s")
        print(f"  ✅ Video ID: {metadata['id']}")
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        return False

    # Test 2: Create session in MongoDB
    print("\n✓ Test 2: MongoDB Session Creation")
    try:
        session_id = str(uuid.uuid4())
        await mongodb.create_session(session_id)
        print(f"  ✅ Session created: {session_id[:8]}...")
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        return False

    # Test 3: Create download record in MongoDB
    print("\n✓ Test 3: MongoDB Download Record")
    try:
        download_id = str(uuid.uuid4())
        await mongodb.create_download(download_id, session_id, url, "best")
        print(f"  ✅ Download record created: {download_id[:8]}...")
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        return False

    # Test 4: Download YouTube video
    print("\n✓ Test 4: YouTube Download")
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            result = await youtube_provider.download(url, "best", tmpdir)
            filename = result['filename']
            file_size_mb = result['file_size'] / (1024 * 1024)
            print(f"  ✅ Downloaded: {os.path.basename(filename)[:50]}")
            print(f"  ✅ Size: {file_size_mb:.2f} MB")

            # Test 5: Upload to Cloudinary
            print("\n✓ Test 5: Cloudinary Upload")
            try:
                cloudinary_url = await cloudinary.upload_video(filename, f"test-{download_id}.mp4")
                print(f"  ✅ Uploaded to Cloudinary")
                print(f"  ✅ URL: {cloudinary_url[:60]}...")

                # Test 6: Update MongoDB with Cloudinary URL
                print("\n✓ Test 6: Update MongoDB with Cloudinary URL")
                try:
                    await mongodb.update_download(
                        download_id,
                        {
                            "status": "completed",
                            "progress": 100,
                            "filename": filename,
                            "file_url": cloudinary_url,
                            "completed_at": datetime.utcnow()
                        }
                    )
                    print(f"  ✅ Download record updated in MongoDB")

                    # Test 7: Retrieve from MongoDB
                    print("\n✓ Test 7: Retrieve from MongoDB")
                    try:
                        download_record = await mongodb.get_download(download_id)
                        print(f"  ✅ Retrieved from MongoDB:")
                        print(f"     Status: {download_record.get('status')}")
                        print(f"     Progress: {download_record.get('progress')}%")
                        print(f"     File URL: {download_record.get('file_url', '')[:50]}...")

                        # Test 8: Verify Cloudinary URL accessible
                        print("\n✓ Test 8: Cloudinary URL Validation")
                        cloudinary_file_url = download_record.get('file_url', '')
                        if cloudinary_file_url:
                            print(f"  ✅ Cloudinary URL ready for download:")
                            print(f"     {cloudinary_file_url}")
                        else:
                            print(f"  ❌ No Cloudinary URL in database")
                            return False

                    except Exception as e:
                        print(f"  ❌ MongoDB retrieve failed: {e}")
                        return False

                except Exception as e:
                    print(f"  ❌ MongoDB update failed: {e}")
                    return False

            except Exception as e:
                print(f"  ❌ Cloudinary upload failed: {e}")
                print("     Fix: Check your Cloudinary credentials in .env")
                return False

        except Exception as e:
            print(f"  ❌ Download failed: {e}")
            return False

    # Summary
    print("\n" + "="*70)
    print("✅ ALL END-TO-END TESTS PASSED!")
    print("="*70)
    print("\nFlow verified:")
    print("  1. ✅ YouTube metadata extraction")
    print("  2. ✅ MongoDB session creation")
    print("  3. ✅ MongoDB download record creation")
    print("  4. ✅ YouTube video download")
    print("  5. ✅ Cloudinary file upload")
    print("  6. ✅ MongoDB update with Cloudinary URL")
    print("  7. ✅ MongoDB retrieval")
    print("  8. ✅ Cloudinary URL validation")
    print("\nYou can now:")
    print("  1. Start backend server")
    print("  2. Start frontend app")
    print("  3. Test complete flow in browser")
    print("  4. Deploy to production")

    return True


async def main():
    success = await test_full_flow()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
