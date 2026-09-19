# 🎯 Local Development Setup Guide

## ✅ Prerequisites

Before starting, ensure you have:
- **Node.js** v18+ installed
- **npm** v9+ installed
- **Git** installed
- A terminal/command prompt
- 1GB free disk space

---

## 📋 Step-by-Step Setup

### 1️⃣ Clone/Navigate to Project
```bash
cd /home/dev26/SPVB-Download
```

### 2️⃣ Check Environment Files
Verify both `.env` files exist:

**Root `.env` (Backend):**
```
PORT=1406
NODE_ENV=development
JWT_SECRET=spvb-local-development-key-2026
CORS_ORIGIN=http://localhost:1404
SESSION_TIMEOUT=1800000
LOG_LEVEL=debug
```

**`frontend/.env` (Frontend):**
```
REACT_APP_API_URL=http://localhost:1406
REACT_APP_ENV=development
REACT_APP_DEBUG=true
REACT_APP_GAME_URL=
REACT_APP_SHOW_THIRD_PARTY_ADS=false
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_SESSION_TIMEOUT=1800000
REACT_APP_PLAYER_COUNT_BASE=5000
```

### 3️⃣ Install Dependencies
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 4️⃣ Start Servers

#### Option A: Automated (Recommended)

**Linux/Mac:**
```bash
./start-local.sh
```

**Windows:**
```bash
start-local.bat
```

#### Option B: Manual Setup

**Terminal 1 - Backend:**
```bash
node server.js
```

Expected output:
```
🎮 SPVB Platform Server running at http://localhost:1406
📍 Home: http://localhost:1406
```

**Terminal 2 - Frontend:**
```bash
cd frontend
PORT=1404 npm start
```

Expected output:
```
Local: http://localhost:1404
On Your Network: http://[YOUR-IP]:1404
```

### 5️⃣ Test in Browser
Open: **http://localhost:1404**

---

## 🎨 What You'll See

✅ Dark theme interface (no white backgrounds)
✅ "SPVB Downloader" hero section
✅ "5000+ Players Online Now" badge
✅ Download & History tabs
✅ URL input field ready for use
✅ Professional dark layout

---

## 🔍 Verification

### Backend Running?
```bash
curl http://localhost:1406/api/admin/stats
```

Should return:
```json
{
  "success": true,
  "stats": {
    "totalGames": 0,
    "totalUsers": 0,
    "totalDownloads": 0,
    "totalPlays": 0,
    "activeSessions": 0
  }
}
```

### Frontend Running?
Open browser console (F12) and look for:
```
[DEBUG] Creating session with API URL: http://localhost:1406
[DEBUG] Session response: {success: true, session_id: "..."}
[DEBUG] Session ID saved: session-...
```

---

## 📱 Testing on Different Devices

### Desktop (1440px+)
- Just open http://localhost:1404

### Tablet (768px)
- Open DevTools (F12)
- Toggle Device Toolbar (Ctrl+Shift+M)
- Select iPad

### Mobile (480px)
- Open DevTools (F12)
- Toggle Device Toolbar (Ctrl+Shift+M)
- Select iPhone SE

---

## 🚨 Common Issues

### Port Already in Use

**Linux/Mac:**
```bash
# Kill backend
lsof -i :1406 -t | xargs kill -9

# Kill frontend
lsof -i :1404 -t | xargs kill -9

# Restart
./start-local.sh
```

**Windows:**
```bash
# Kill process on port 1406
netstat -ano | findstr :1406
taskkill /PID <PID> /F

# Kill process on port 1404
netstat -ano | findstr :1404
taskkill /PID <PID> /F

# Restart
start-local.bat
```

### Frontend Won't Connect to Backend

**Check:**
1. Backend is running on port 1406
2. `REACT_APP_API_URL=http://localhost:1406` in frontend/.env
3. Hard refresh browser: Ctrl+Shift+R
4. Check browser console for errors (F12)

### White Backgrounds Showing

**Solution:**
1. Clear browser cache: Ctrl+Shift+Delete
2. Hard refresh: Ctrl+Shift+R
3. Restart frontend: Kill and run `PORT=1404 npm start` again

### npm Start Hangs

**Solution:**
1. Kill the process: Ctrl+C
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules: `rm -rf node_modules frontend/node_modules`
4. Reinstall: `npm install && cd frontend && npm install`

---

## 📊 Project Ports

| Service | Port | URL |
|---------|------|-----|
| Backend API | 1406 | http://localhost:1406 |
| Frontend Dev | 1404 | http://localhost:1404 |

**Never use the same port for both services!**

---

## 🔧 Development Workflow

1. **Code Changes:**
   - Frontend: Changes auto-reload (Hot Module Replacement)
   - Backend: Requires manual restart

2. **Backend Changes:**
   ```bash
   # Kill backend (Ctrl+C in backend terminal)
   # Modify code
   # Restart: node server.js
   ```

3. **Environment Changes:**
   - Modify .env file
   - Restart affected server

---

## 📦 Building for Production

When ready to deploy:

```bash
cd frontend
npm run build
```

This creates optimized build in `frontend/build/`

---

## 🧹 Cleanup

To clean up and start fresh:

```bash
# Remove dependencies
rm -rf node_modules frontend/node_modules

# Remove lock files
rm -f package-lock.json frontend/package-lock.json

# Reinstall
npm install && cd frontend && npm install && cd ..

# Start again
./start-local.sh
```

---

## 📞 Getting Help

### Check Logs
```bash
# Backend
tail -f /tmp/backend.log

# Frontend
tail -f /tmp/frontend.log
```

### Verify Configuration
```bash
# Check env files exist
ls -la .env frontend/.env

# Check ports
netstat -ano | grep 1404
netstat -ano | grep 1406
```

### Test API
```bash
curl -v http://localhost:1406/api/admin/stats
```

---

## ✨ Ready to Code!

You're all set! Start making changes and watch them reload in real-time. Happy coding! 🚀
