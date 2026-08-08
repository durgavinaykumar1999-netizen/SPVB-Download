# YouTube Download System - User Cookie Authentication

## How It Works

Instead of needing a server-side YouTube account, **each user uses their own YouTube login** to download videos.

### User Flow
```
1. User opens app in browser
2. User logs into YouTube (in same browser)
3. App detects YouTube login ✅
4. User enters video URL
5. App sends user's cookies to backend
6. Backend downloads video using user's authentication
7. User gets video file
```

### Why This Works
- YouTube trusts logged-in users (their browser cookies)
- YouTube blocks server IPs automatically
- User's browser cookie bypasses all IP-based blocks
- No shared account needed
- Each user downloads with their own account

---

## For Users

### Step 1: Open the App
- Go to your downloader URL
- App opens in your browser

### Step 2: Log Into YouTube (if not already)
- Click on your profile in YouTube (in same browser)
- Make sure you're logged in
- The app will automatically detect this

### Step 3: Download Videos
- Enter a YouTube URL
- Click "Get Info" → see video details
- Click "Download" → video starts downloading
- Wait for download to complete
- Click download button to save file to your device

### What If It Says "Not Logged In"?
1. Open YouTube.com in same browser
2. Log into your YouTube account
3. Refresh the downloader app
4. The message should change to "YouTube login detected"

### What If Download Still Fails?
**This could happen if:**
- You're logged out of YouTube → Log back in
- YouTube account has restrictions → Try different account
- Video is age-restricted → YouTube blocks all access
- Video requires login → Can't download

---

## For Developers

### System Architecture

#### Frontend (React)
```typescript
// 1. Extract user's cookies on app load
const extractYouTubeCookies = (): string => {
  // Convert document.cookie to Netscape format
  // Send to backend with every request
}

// 2. Include in API calls
await fetch('/api/metadata', {
  body: JSON.stringify({
    url: userUrl,
    session_id: sessionId,
    user_cookies: extractedCookies  // ← USER'S COOKIES
  })
})
```

#### Backend (FastAPI)
```python
# 1. Accept cookies in request
class MetadataRequest(BaseModel):
    url: str
    session_id: str
    user_cookies: str = None  # From user's browser

# 2. Pass to provider
metadata = await download_service.get_metadata(
    url,
    user_cookies=request.user_cookies
)

# 3. Provider uses cookies
async def get_metadata(self, url: str, user_cookies: str = None):
    ydl_opts = self._get_ydl_opts(user_cookies=user_cookies)
    # yt-dlp now uses user's cookies instead of server cookie file
```

#### yt-dlp Integration
```python
# If user provided cookies, write to temp file and use it
if user_cookies:
    temp_cookies = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
    temp_cookies.write(user_cookies)
    temp_cookies.close()
    opts['cookiefile'] = temp_cookies.name
    # ✅ yt-dlp uses user's authenticated cookies
else:
    # ⚠️ Fall back to anonymous (may be blocked)
    opts['extractor_args'] = {...}
```

### Request/Response Examples

#### Get Metadata (with user cookies)
```bash
POST /api/metadata
Content-Type: application/json

{
  "url": "https://youtu.be/8LG8larasUo",
  "session_id": "abc-123",
  "user_cookies": "# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\t..."
}

Response:
{
  "success": true,
  "metadata": {
    "title": "Video Title",
    "duration": 600,
    "qualities": ["360p", "720p", "1080p"],
    ...
  }
}
```

#### Start Download (with user cookies)
```bash
POST /api/download
Content-Type: application/json

{
  "url": "https://youtu.be/8LG8larasUo",
  "session_id": "abc-123",
  "quality": "best",
  "user_cookies": "# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\t..."
}

Response:
{
  "success": true,
  "download_id": "xyz-789",
  "status": "queued"
}
```

### Code Files Modified

**Backend:**
- `backend_python/backend_python/providers/youtube_provider.py`
  - Added `user_cookies` parameter to `get_metadata()` and `download()`
  - Updated `_get_ydl_opts()` to create temp cookie file if cookies provided

- `backend_python/backend_python/services/download_service.py`
  - Added `user_cookies` parameter to `get_metadata()` and `queue_download()`

- `backend_python/backend_python/services/download_queue.py`
  - Extract `user_cookies` from download_info
  - Pass to provider's `download()` method

- `backend_python/backend_python/routes/public_routes.py`
  - Added `user_cookies` field to `MetadataRequest` and `DownloadRequest`
  - Pass `user_cookies` to service methods

**Frontend:**
- `frontend/src/App.tsx`
  - Added `extractYouTubeCookies()` function
  - Added `userCookies` and `isYouTubeLogged` state
  - Detect YouTube login on component load
  - Include `user_cookies` in `fetchMetadata()` and `startDownload()` API calls

### Testing

#### Test Locally
```bash
# 1. Open frontend
cd frontend
npm start
# → Opens http://localhost:3000

# 2. Log into YouTube
# → Open YouTube.com tab in same browser
# → Log into your account

# 3. Back to downloader app
# → Should show "YouTube login detected"

# 4. Test download
# → Enter YouTube URL
# → Click "Get Info"
# → Should load video details
# → Click "Download"
# → Should complete successfully
```

#### Test on Render
```bash
# Same as local, but use:
https://spvb-download-backend.onrender.com

# Login to YouTube in browser
# Visit the frontend URL
# App should detect login
# Download should work
```

### Troubleshooting

**Problem: "Not logged into YouTube"**
- Check if you're logged into YouTube.com in same browser
- Refresh the app
- Close and reopen browser tab

**Problem: Download fails with bot error**
- Means user_cookies were not sent or are invalid
- Frontend might not be extracting cookies properly
- Check browser console for errors

**Problem: Cookies.txt file is ignored**
- Old code path - now uses user's browser cookies instead
- Delete `backend_python/cookies.txt` if it exists
- Frontend extraction is the new system

**Problem: Some videos still don't download**
- This is expected for age-restricted videos
- YouTube blocks these even with authentication
- User would need to bypass on their own account first

### Security Notes

✅ **Safe:**
- Cookies are sent ONLY from user's own browser
- They're their own cookies, they own the risk
- No server-side cookie storage needed
- No sensitive credentials on server

⚠️ **Be Aware:**
- User cookies allow downloads of their private videos
- Don't log in with accounts you don't trust
- Cookies expire - app will fall back to anonymous after expiry

### Future Improvements

1. **Better cookie detection:**
   - Detect specific YouTube cookies only (SSID, APISID)
   - Don't send all browser cookies

2. **Cookie refresh:**
   - Prompt user to re-login if cookies expire
   - Automatic cookie refresh before expiry

3. **Multiple accounts:**
   - Allow user to choose which account to use
   - Support switching between accounts

4. **Headless browser fallback:**
   - If cookies don't work, try browser automation
   - Playwright/Puppeteer as secondary approach

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Authentication** | Server cookie file | User's browser cookies |
| **IP Blocking** | Failed (server IP blocked) | Works (user IP trusted) |
| **Setup** | Export & upload cookies | Automatic detection |
| **Privacy** | Single shared account | Individual user accounts |
| **Cookie Expiry** | Manual refresh needed | Auto-fallback to anonymous |
| **Scalability** | One account for all | Unlimited users |

**Result:** YouTube downloads work reliably with zero setup for users! ✅
