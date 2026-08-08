# YouTube Cookies Setup Guide

## Problem
YouTube blocks automated downloads from server IPs (like Render) with "Sign in to confirm you're not a bot" error.

## Solution
Use your own YouTube account cookies for authentication. YouTube trusts authenticated sessions.

---

## Step 1: Export Your YouTube Cookies

### Option A: Using the Helper Script (Easiest)

1. **Go to YouTube**
   - Visit https://www.youtube.com
   - Make sure you're logged in to your YouTube account

2. **Open DevTools**
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Or `Cmd+Option+I` (Mac)

3. **Go to Console Tab**
   - Click the "Console" tab in DevTools

4. **Copy & Paste the Script**
   - Open this file: `export_youtube_cookies.js` in this repo
   - Copy ALL the code
   - Paste into the DevTools Console
   - Press Enter

5. **Copy the Output**
   - Green text will appear: "=== YOUTUBE COOKIES EXPORTED ==="
   - Select and copy ALL the text shown
   - This is your cookies file

### Option B: Manual Export (Chrome/Edge)

1. Open DevTools (F12)
2. Go to: **Application** tab → **Cookies** → **youtube.com**
3. Select all cookies (Ctrl+A)
4. Right-click → "Export as..." → Save as `cookies.txt`

### Option C: Using Browser Extension (Firefox/Chrome)

- **Firefox**: Install "Export Cookies" extension
- **Chrome**: Install "EditThisCookie" extension
- Visit YouTube, click extension icon, select "Export"
- Save as `cookies.txt`

---

## Step 2: Save Cookies File Locally

1. Create a text file and name it `cookies.txt`
2. Paste the exported cookies content into it
3. Save it

**Example format:**
```
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	TRUE	9999999999	DEVICE_ID	abc123xyz...
.youtube.com	TRUE	/	TRUE	9999999999	__Secure-1PSID	xyz789abc...
```

---

## Step 3: Upload to Backend

### Method A: Local Testing (First)

```bash
# Copy cookies to backend directory
cp cookies.txt backend_python/cookies.txt

# Test locally
cd backend_python
python3 -m venv test_env
source test_env/bin/activate
pip install -r requirements.txt

# Run test script
python3 -c "
from backend_python.providers.youtube_provider import YouTubeProvider
import asyncio

async def test():
    provider = YouTubeProvider()
    meta = await provider.get_metadata('https://youtu.be/8LG8larasUo')
    print(f'✅ Success! Video: {meta[\"title\"]}')

asyncio.run(test())
"
```

### Method B: Deploy to Render

**Option 1: Via Git Push**
```bash
# 1. Copy cookies.txt to backend_python/ directory
cp your_cookies.txt backend_python/cookies.txt

# 2. (cookies.txt is in .gitignore - won't be committed for security)
# 3. Redeploy Render:
#    - Go to Render Dashboard
#    - Click "Redeploy"
#    - The server will use the cookies.txt file from your local machine
```

**Option 2: Render File Mount (Recommended)**
```bash
# Create a Render file mount:
# 1. Render Dashboard → Your Service → Settings
# 2. Scroll to "Persistent Disk"
# 3. Create mount at: /backend/cookies
# 4. SSH into Render or use Render CLI
# 5. Upload cookies.txt to the mount:
#    scp cookies.txt [render-user]@[render-host]:/backend/cookies/cookies.txt
```

---

## Step 4: Test It Works

### Test Locally (Before Pushing)
```bash
# Run the test from Step 3
# Should see: ✅ Success! Video: [video title]
```

### Test on Render (After Deployment)
```bash
# Check if metadata works
curl -X POST https://spvb-download-backend.onrender.com/api/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtu.be/8LG8larasUo",
    "session_id": "test"
  }'

# Response should show:
# {
#   "success": true,
#   "metadata": {
#     "title": "Video Title",
#     "duration": 600,
#     ...
#   }
# }

# NOT:
# {
#   "detail": "ERROR: [youtube]... Sign in to confirm you're not a bot"
# }
```

---

## Step 5: Users Can Download Videos

Once cookies are set up:

### Frontend Flow
1. User enters YouTube URL
2. Clicks "Get Info" → gets title, duration, quality options
3. Clicks "Download" → video starts downloading
4. Clicks "Download" button in list → file downloads to their device

### API Flow (for developers)
```bash
# 1. Create session
SESSION=$(curl -s https://spvb-download-backend.onrender.com/api/session | jq -r '.session_id')

# 2. Get metadata
curl -X POST https://spvb-download-backend.onrender.com/api/metadata \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtu.be/[VIDEO_ID]","session_id":"'$SESSION'"}'

# 3. Queue download
DOWNLOAD=$(curl -s -X POST https://spvb-download-backend.onrender.com/api/download \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtu.be/[VIDEO_ID]","session_id":"'$SESSION'","quality":"best"}')

DOWNLOAD_ID=$(echo $DOWNLOAD | jq -r '.download_id')

# 4. Wait for download to complete (check status)
curl "https://spvb-download-backend.onrender.com/api/download/$DOWNLOAD_ID?session_id=$SESSION"

# 5. Download the file
curl "https://spvb-download-backend.onrender.com/api/download/$DOWNLOAD_ID/stream?session_id=$SESSION" -o video.mp4
```

---

## ⚠️ Important Notes

### Cookies Expiration
- YouTube cookies expire (usually 2-4 weeks)
- When expired, users will see "Sign in to confirm you're not a bot" again
- **Solution**: Re-export and re-upload fresh cookies

### Security
- ✅ `cookies.txt` is in `.gitignore` — won't be committed to GitHub
- 🔐 Contains auth tokens — keep private
- 👤 Use a dedicated/secondary YouTube account (not your main personal account)
- 🚫 Never share cookies.txt with others

### Multiple Accounts
- If you need multiple accounts' access, upload cookies for each account
- Rename: `cookies_account1.txt`, `cookies_account2.txt`
- Modify `youtube_provider.py` to pick the right one per request

### Troubleshooting

**"No cookies file found" warning**
- Means `backend_python/cookies.txt` doesn't exist
- Falls back to anonymous (which gets blocked)
- Solution: Upload cookies.txt file

**Still getting bot error after uploading**
- Cookies might be expired
- Try re-exporting fresh cookies
- Or the YouTube account might be rate-limited
- Try a different account

**Works locally, fails on Render**
- Render might not have the cookies.txt file
- Check that redeploy included the file
- Use file mount instead of git-based approach

---

## Summary

| Step | What | Where |
|------|------|-------|
| 1 | Export cookies from YouTube | Browser (F12) |
| 2 | Save as cookies.txt | Local machine |
| 3 | Upload to backend | backend_python/ directory |
| 4 | Test it works | Local or Render URL |
| 5 | Users download videos | Frontend or API |

**Next: You tell me when you have the cookies exported, and I'll help you upload them!**
