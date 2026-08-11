# Local Testing Guide - YouTube Provider

## Overview
Complete end-to-end testing of YouTube provider locally before production deployment.

**Goal:** Verify everything works locally (frontend + backend) before pushing to GitHub/Render

---

## Prerequisites

✅ Node.js installed (check: `node --version`)
✅ Python 3.11+ installed (check: `python3 --version`)
✅ Git installed (check: `git --version`)
✅ MongoDB running locally or Atlas connection available
✅ Cloudinary credentials ready (optional for local testing)

---

## Step 1: Setup MongoDB Locally (Quick)

### Option A: MongoDB Atlas (Cloud - Recommended)
```bash
# Use your existing connection string
MONGODB_URI=mongodb+srv://vinaymail1820_db_user:q8lOQH5blNq3Ohd0@YOUR_CLUSTER_NAME.mongodb.net/
```

### Option B: Local MongoDB (if installed)
```bash
# Start MongoDB locally
mongod

# Connection string
MONGODB_URI=mongodb://localhost:27017/spvb-downloader
```

---

## Step 2: Setup Backend

### 2.1 Create Backend .env File

```bash
cd /home/dev26/Downloads/SPVB-Download-main
cd backend_python

# Create .env file
cat > .env << 'EOF'
# Server
NODE_ENV=development
PORT=8000
LOG_LEVEL=info

# MongoDB (use your connection string)
MONGODB_URI=mongodb://localhost:27017/spvb-downloader

# Cloudinary (optional for local testing)
CLOUDINARY_CLOUD_NAME=dev
CLOUDINARY_API_KEY=dev
CLOUDINARY_API_SECRET=dev

# Paths (auto-detected, but can override)
YTDLP_NODE_PATH=/opt/nodejs/bin/node
YTDLP_FFMPEG_PATH=/usr/bin/ffmpeg
EOF

cat .env
```

### 2.2 Install Backend Dependencies

```bash
cd /home/dev26/Downloads/SPVB-Download-main

# Install Python packages
python3 -m pip install -r backend_python/requirements.txt

# Verify installations
python3 -c "import yt_dlp; print('yt-dlp:', yt_dlp.version.__version__)"
python3 -c "import pymongo; print('pymongo: OK')"
python3 -c "import fastapi; print('fastapi: OK')"
```

### 2.3 Start Backend Server

```bash
# From project root
python3 -m uvicorn backend_python.main:app --reload --port 8000 &

# Or run in separate terminal
cd /home/dev26/Downloads/SPVB-Download-main
python3 -m uvicorn backend_python.main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### 2.4 Test Backend Health

```bash
# Test if backend is running
curl http://localhost:8000/health

# Should return: {"status": "ok"}
```

---

## Step 3: Setup Frontend

### 3.1 Create Frontend .env File

```bash
cd /home/dev26/Downloads/SPVB-Download-main/frontend

# Create .env file
cat > .env << 'EOF'
REACT_APP_API_URL=http://localhost:8000
EOF

cat .env
```

### 3.2 Install Frontend Dependencies

```bash
cd frontend

# Install npm packages
npm install

# Verify
npm --version
node --version
```

### 3.3 Start Frontend Dev Server

```bash
# From frontend directory
npm start

# Or run in separate terminal
cd /home/dev26/Downloads/SPVB-Download-main/frontend
npm start
```

**Expected Output:**
```
Compiled successfully!
Local:            http://localhost:3000
```

---

## Step 4: Test Complete Flow

### 4.1 Open Browser

```
http://localhost:3000
```

You should see the SPVB Downloader UI with:
- Input field for YouTube URL
- Download section
- History tab (empty initially)

### 4.2 Test Case 1: Regular YouTube Video

**URL:** `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

**Steps:**
1. Copy URL to input field
2. Wait for metadata to load
   - Should show title: "Rick Astley - Never Gonna Give You Up"
   - Should show duration: 213 seconds
   - Should show available qualities: 8+
3. Select quality (default "best")
4. Click "Download"
5. Monitor progress bar (0% → 100%)
6. File should auto-download to browser
7. Check History tab - video should appear

**Expected Results:**
- ✅ Metadata extracted (no API errors)
- ✅ Download starts (progress tracking works)
- ✅ File auto-downloads (~30-60 seconds)
- ✅ Appears in History tab

**Backend Logs Should Show:**
```
Metadata request for: https://www.youtube.com/watch?v=...
URL type: video
Metadata extracted: Rick Astley - Never Gonna Give You Up
Starting download: https://www.youtube.com/watch?v=...
URL type: video
Download complete: Rick Astley...
File size: XXX.XX MB
```

### 4.3 Test Case 2: YouTube Short

**URL:** `https://youtube.com/shorts/Ha2HBB-zStg`

**Steps:**
1. Copy Short URL to input field
2. Wait for metadata
   - Should show title: "I love you 3000!..."
   - Should show duration: 179 seconds
   - Should show qualities
3. Select quality
4. Click "Download"
5. Monitor progress
6. File should auto-download
7. Should appear in History tab

**Expected Results:**
- ✅ URL normalized to watch?v=
- ✅ Metadata extracted (handles Shorts)
- ✅ Download works for Shorts
- ✅ Saved to History

**Backend Logs Should Show:**
```
Input type: short
Normalized URL: https://www.youtube.com/watch?v=Ha2HBB-zStg
...
Download complete: I love you 3000!...
```

### 4.4 Test Case 3: History Tab Download

**Steps:**
1. Go to History tab (should have 2 videos now)
2. Click "Download" button on first video
3. Should download from Cloudinary (or direct URL)
4. Should be instant (no progress tracking needed)

**Expected Results:**
- ✅ Video thumbnails visible
- ✅ Download button works
- ✅ File downloads instantly (from cache)
- ✅ No auto-download API call (backend logs should be silent)

### 4.5 Test Case 4: Page Refresh

**Steps:**
1. Refresh browser (Ctrl+R or Cmd+R)
2. History tab should still show both videos
3. Click download on any video
4. Should work instantly

**Expected Results:**
- ✅ History persists after refresh
- ✅ No auto-download API calls on refresh
- ✅ Direct download from cache

### 4.6 Test Case 5: New Video After Existing

**Steps:**
1. Enter a different YouTube video URL
2. Download it
3. Should auto-download to browser
4. Should appear in History (now 3 videos total)
5. Previous videos should NOT trigger auto-download

**Expected Results:**
- ✅ New download auto-completes
- ✅ History grows
- ✅ Only new video triggers auto-download

---

## Step 5: Monitor Backend Logs

### 5.1 What to Look For

**Good Log Entries:**
```
✅ YouTube Provider Initialization
✅ yt-dlp version: 2026.07.04
✅ Node.js: /opt/nodejs/bin/node
✅ FFmpeg: /usr/bin/ffmpeg
✅ Metadata request for: https://...
✅ Metadata extracted: [Title]
✅ Starting download: https://...
✅ Download complete: [Filename]
✅ File size: XXX.XX MB
```

**Bad Log Entries (Need to Fix):**
```
❌ Node.js: NOT FOUND
❌ FFmpeg: NOT FOUND
❌ YouTube extraction requires JavaScript runtime
❌ Error: [youtube] ... Video is not available
❌ Sign in to confirm you're not a bot
```

### 5.2 Check for Repeated API Calls

**When downloading from History:**
- Backend logs should be SILENT
- No new metadata requests
- No download requests
- This confirms it's using cached Cloudinary URL

---

## Step 6: Troubleshooting

### Issue: "Cannot connect to backend"

**Solution:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# If fails, restart backend
pkill -f "uvicorn"
python3 -m uvicorn backend_python.main:app --reload --port 8000
```

### Issue: "Cannot extract metadata"

**Check logs for:**
- Node.js detection: `Node.js: /opt/nodejs/bin/node`
- FFmpeg detection: `FFmpeg: /usr/bin/ffmpeg`

**Solution:**
```bash
# Test manually
cd backend_python
python3 -c "from providers.youtube_provider import YouTubeProvider; p = YouTubeProvider(); print(p.diagnostics())"
```

### Issue: "Video not available" error

**Possible causes:**
- Age-restricted (try public video first)
- Region-blocked
- Video deleted
- Too many requests (rate limited)

**Solution:**
- Try different video URL
- Wait a few minutes
- Check error message in browser

### Issue: "Auto-download not working"

**Check:**
1. Is file actually downloaded? (Check backend logs)
2. Did backend complete successfully?
3. Does browser allow auto-download?

**Solution:**
```bash
# Check if file exists in save_path
ls -lh ~/Downloads/SPVB-Downloads/
```

---

## Step 7: Full Test Results Checklist

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Backend starts | No errors | | ✅/❌ |
| Frontend starts | Compiles successfully | | ✅/❌ |
| Long video metadata | Title + duration + qualities | | ✅/❌ |
| Long video download | Auto-downloads ~30-60s | | ✅/❌ |
| Short video metadata | Title + duration + qualities | | ✅/❌ |
| Short video download | Auto-downloads ~30-60s | | ✅/❌ |
| History tab shows | Video thumbnails visible | | ✅/❌ |
| History download | Instant (no progress) | | ✅/❌ |
| Page refresh | History persists | | ✅/❌ |
| New video download | Auto-downloads once | | ✅/❌ |
| No repeated APIs | Backend silent on history | | ✅/❌ |

---

## Step 8: Before Pushing to GitHub

**Checklist:**
- [ ] All test cases pass locally
- [ ] Backend logs show expected messages
- [ ] No errors in browser console
- [ ] No errors in backend terminal
- [ ] YouTube provider works for long and shorts
- [ ] History tab works correctly
- [ ] Page refresh doesn't trigger auto-download
- [ ] All features functional

---

## Step 9: Commit to GitHub

Once all tests pass locally:

```bash
# Add all changes
git add -A

# Commit with test results
git commit -m "Test YouTube provider locally - all tests pass

Tested:
- Long video download (Rick Astley): ✅
- Short video download (Ha2HBB-zStg): ✅
- Metadata extraction: ✅
- Auto-download (first time): ✅
- History tab: ✅
- Direct Cloudinary download: ✅
- Page refresh (no auto-download): ✅
- Backend logs verified: ✅

All systems operational locally.
Ready for production deployment.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YR5n3PFYnJsXLDDEL7vDb4"

# Push to GitHub
git push origin main
```

---

## Step 10: Production Deployment

Once local testing passes:

1. Update MongoDB URI on Render
2. Update Cloudinary credentials on Render
3. Push code to GitHub
4. Render automatically deploys
5. Test on production URL

---

## Quick Reference Commands

```bash
# Backend - Start
cd /home/dev26/Downloads/SPVB-Download-main
python3 -m uvicorn backend_python.main:app --reload --port 8000

# Frontend - Start
cd /home/dev26/Downloads/SPVB-Download-main/frontend
npm start

# Backend - Test
curl http://localhost:8000/health

# Check logs
tail -f backend.log

# Restart all
pkill -f "uvicorn"
pkill -f "npm start"
# Start both again

# Test YouTube Provider
python3 -c "
import sys
sys.path.insert(0, 'backend_python')
from providers.youtube_provider import YouTubeProvider
p = YouTubeProvider()
print(p.diagnostics())
"
```

---

**Status:** Ready for local testing ✅
**Next:** Follow steps 1-8 before production deployment
