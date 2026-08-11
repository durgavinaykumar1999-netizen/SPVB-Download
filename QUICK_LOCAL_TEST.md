# Quick Local Testing - YouTube Provider

## Issue Found
MongoDB not running. Instead of waiting for MongoDB setup, let's test the YouTube provider directly first.

---

## Option 1: Test YouTube Provider Directly (No Backend/MongoDB)

This tests if the YouTube provider works correctly in isolation.

### Step 1: Create Test Script

```bash
cd /home/dev26/Downloads/SPVB-Download-main
cat > test_local_youtube.py << 'EOF'
#!/usr/bin/env python3
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend_python'))

from backend_python.providers.youtube_provider import YouTubeProvider


async def test_youtube_locally():
    print("\n" + "="*70)
    print("LOCAL YOUTUBE PROVIDER TEST")
    print("="*70)

    provider = YouTubeProvider()

    # Test diagnostics
    print("\n✓ Diagnostics:")
    diag = provider.diagnostics()
    for key, value in diag.items():
        print(f"  {key}: {value}")

    # Test 1: Long video
    print("\n✓ Test 1: Long Video")
    url1 = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    try:
        meta = await provider.get_metadata(url1)
        print(f"  Title: {meta['title'][:60]}")
        print(f"  Duration: {meta['duration']}s")
        print(f"  Qualities: {len(meta['qualities'])}")
        print(f"  ✅ PASS")
    except Exception as e:
        print(f"  ❌ FAIL: {str(e)[:100]}")
        return False

    # Test 2: Short video
    print("\n✓ Test 2: Short Video")
    url2 = "https://youtube.com/shorts/Ha2HBB-zStg"
    try:
        meta = await provider.get_metadata(url2)
        print(f"  Title: {meta['title'][:60]}")
        print(f"  Duration: {meta['duration']}s")
        print(f"  Qualities: {len(meta['qualities'])}")
        print(f"  ✅ PASS")
    except Exception as e:
        print(f"  ❌ FAIL: {str(e)[:100]}")
        return False

    # Test 3: Download long video
    print("\n✓ Test 3: Download Long Video (to /tmp)")
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            result = await provider.download(url1, "best", tmpdir)
            file_size_mb = result['file_size'] / (1024 * 1024)
            print(f"  File: {os.path.basename(result['filename'][:50])}")
            print(f"  Size: {file_size_mb:.2f} MB")
            print(f"  ✅ PASS")
        except Exception as e:
            print(f"  ❌ FAIL: {str(e)[:100]}")
            return False

    # Test 4: Download short video
    print("\n✓ Test 4: Download Short Video (to /tmp)")
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            result = await provider.download(url2, "best", tmpdir)
            file_size_mb = result['file_size'] / (1024 * 1024)
            print(f"  File: {os.path.basename(result['filename'][:50])}")
            print(f"  Size: {file_size_mb:.2f} MB")
            print(f"  ✅ PASS")
        except Exception as e:
            print(f"  ❌ FAIL: {str(e)[:100]}")
            return False

    print("\n" + "="*70)
    print("✅ ALL YOUTUBE PROVIDER TESTS PASSED")
    print("="*70)
    return True


if __name__ == "__main__":
    success = asyncio.run(test_youtube_locally())
    sys.exit(0 if success else 1)
EOF

chmod +x test_local_youtube.py
```

### Step 2: Run Test

```bash
python3 test_local_youtube.py
```

**Expected Output:**
```
======================================================================
LOCAL YOUTUBE PROVIDER TEST
======================================================================

✓ Diagnostics:
  yt_dlp_version: 2026.07.04
  python: /usr/bin/python3
  node_path: /opt/nodejs/bin/node
  node_version: v20.20.2
  ffmpeg_path: /usr/bin/ffmpeg
  ffmpeg_available: True

✓ Test 1: Long Video
  Title: Rick Astley - Never Gonna Give You Up...
  Duration: 213
  Qualities: 8
  ✅ PASS

✓ Test 2: Short Video
  Title: I love you 3000!...
  Duration: 179
  Qualities: 9
  ✅ PASS

✓ Test 3: Download Long Video (to /tmp)
  File: Rick Astley - Never Gonna Give You Up...
  Size: 232.45 MB
  ✅ PASS

✓ Test 4: Download Short Video (to /tmp)
  File: I love you 3000!...
  Size: 173.94 MB
  ✅ PASS

======================================================================
✅ ALL YOUTUBE PROVIDER TESTS PASSED
======================================================================
```

---

## Option 2: Setup MongoDB for Full Local Testing

If you want to test the full stack (frontend + backend + MongoDB):

### 2.1: Install MongoDB Locally

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y mongodb

# Start MongoDB
sudo systemctl start mongodb

# Verify
mongo --version
```

### 2.2: Update Backend .env

```bash
# Use local MongoDB
MONGODB_URI=mongodb://localhost:27017/spvb-downloader
```

### 2.3: Start Backend

```bash
cd /home/dev26/Downloads/SPVB-Download-main
python3 -m uvicorn backend_python.main:app --reload --port 8000
```

### 2.4: Start Frontend (in another terminal)

```bash
cd /home/dev26/Downloads/SPVB-Download-main/frontend
npm start
```

### 2.5: Test in Browser

```
http://localhost:3000
```

Follow the test cases in LOCAL_TESTING_GUIDE.md

---

## Option 3: Use MongoDB Atlas (Recommended)

If you have MongoDB Atlas account with correct cluster:

### 3.1: Get Connection String

1. Go to https://cloud.mongodb.com
2. Find your cluster (NOT "cluster0")
3. Click "Connect" → "Drivers" → "Python"
4. Copy the full connection string

### 3.2: Update Backend .env

```bash
MONGODB_URI=mongodb+srv://vinaymail1820_db_user:q8lOQH5blNq3Ohd0@YOUR_ACTUAL_CLUSTER_NAME.mongodb.net/spvb-downloader?retryWrites=true&w=majority
```

### 3.3: Follow Option 2 steps 2.3-2.5

---

## Recommendation: Go with Option 1 First

**Why?**
1. ✅ Tests YouTube provider independently
2. ✅ No database setup needed
3. ✅ Fast feedback on YouTube code quality
4. ✅ Confirms metadata extraction works
5. ✅ Confirms downloads work
6. ✅ Verifies real-time data with actual YouTube videos

**Then migrate to Option 2/3:**
- After YouTube provider confirmed working
- Set up MongoDB locally or Atlas
- Test full frontend + backend stack
- Then commit to GitHub

---

## Quick Start

```bash
cd /home/dev26/Downloads/SPVB-Download-main

# Test YouTube provider only
python3 test_local_youtube.py

# If successful:
# - YouTube code is production-ready
# - Can safely commit to GitHub
# - Can then test with full stack (frontend+backend+MongoDB)
```

---

## Expected Timeline

| Step | Time | What Happens |
|------|------|--------------|
| Run `test_local_youtube.py` | 2-3 min | Tests both long videos and shorts |
| Long video metadata | ~10s | Extracts title, duration, qualities |
| Long video download | ~30-60s | Downloads 232 MB file |
| Short video metadata | ~10s | Extracts title, duration, qualities |
| Short video download | ~30-60s | Downloads 173 MB file |
| **Total** | **~3 minutes** | Complete verification |

If all pass → ✅ YouTube provider is production-ready
If any fail → Debug and fix before proceeding

---

## Files Created

| File | Purpose |
|------|---------|
| `test_local_youtube.py` | Direct YouTube provider testing |
| `LOCAL_TESTING_GUIDE.md` | Full stack testing guide |
| `QUICK_LOCAL_TEST.md` | This file - quick start |

---

## Next Steps After Testing

**If all YouTube tests pass:**
1. ✅ Create test results file
2. ✅ Commit to GitHub
3. ✅ Then set up MongoDB + full stack
4. ✅ Test frontend + backend together
5. ✅ Deploy to production

---

**Start here:** `python3 test_local_youtube.py` ✅
