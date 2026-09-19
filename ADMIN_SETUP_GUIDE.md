# 🔐 Admin Panel Setup Guide

## Issue
The admin panel on production can't login because Render backend doesn't have admin credentials set.

## Solution

### Step 1: Set Environment Variables on Render

Go to: https://dashboard.render.com/
1. Select your **spvb-download-backend** service
2. Click **Settings**
3. Scroll to **Environment**
4. Add these variables:

```
ADMIN_USERNAME = admin
ADMIN_PASSWORD = admin123
SESSION_SECRET = your-secret-key-here
```

### Step 2: Redeploy Render

After setting env vars:
1. Click **Manual Deploy** (or **Redeploy latest**)
2. Wait for build to complete
3. Test: Go to `/admin` and try login

### Step 3: Test Locally First (Optional)

If you want to test locally:

```bash
cd /home/dev26/SPVB-Download

# Start Python backend
python -m uvicorn backend_python.main:app --host 0.0.0.0 --port 8000

# In another terminal, start frontend
cd frontend
npm start
```

Then:
1. Go to http://localhost:3000/admin
2. Login with: `admin` / `admin123`
3. Should see visitor analytics with UNIQUE visitors only

## What the Admin Panel Does

✅ **Games Management** - Add/delete games with iframe URLs
✅ **Movies Management** - Add/delete movies with .m3u8 URLs  
✅ **Visitor Analytics** - See unique visitors only (no duplicates)
  - Total visitors
  - Today's visitors
  - Active now
  - Device breakdown
  - Browser breakdown

## API Endpoints

### Login
```
POST /api/admin/login
Body: {"username":"admin","password":"admin123"}
Response: {"success":true,"token":"JWT_TOKEN"}
```

### Get Visitor List
```
GET /api/admin/visits?limit=50
Headers: Authorization: Bearer JWT_TOKEN
Response: {
  "success": true,
  "visits": [...],
  "totalVisits": 100,
  "todayVisits": 55,
  "activeUsers": 3
}
```

### Add Game
```
POST /api/admin/games/add
Headers: Authorization: Bearer JWT_TOKEN
Body: {
  "name": "Game Name",
  "url": "https://...",
  "thumbnail": "https://..."
}
```

## Troubleshooting

### "Invalid credentials" error
- Check env vars are set on Render
- Verify username/password match
- Try redeploy

### CORS errors
- ✅ Already fixed - CORS is enabled on backend

### Visitors showing as duplicates
- ✅ Already fixed - Node.js visitor recording removed

### Can't see visitors in admin
- Check backend is returning JSON (not HTML)
- Verify token is valid
- Check MongoDB connection on Render
