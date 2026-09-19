# 🔧 Environment Setup Guide

## 📁 Project Structure
```
SPVB-Download/
├── frontend/              # React app
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── .env              # Frontend configuration
│   └── build/            # Production build
├── server.js             # Backend server
├── package.json          # Backend dependencies
├── .env                  # Backend configuration
└── .gitignore           # Git ignore rules
```

---

## 🔑 Environment Variables

### Backend (.env)
```
PORT=1406
NODE_ENV=development
JWT_SECRET=spvb-local-development-key-2026
CORS_ORIGIN=http://localhost:1404
SESSION_TIMEOUT=1800000
LOG_LEVEL=debug
```

### Frontend (.env)
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

---

## 🚀 Quick Start (Local Testing)

### Step 1: Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

### Step 2: Start Backend Server
```bash
# From root directory
node server.js
```
Expected output:
```
🎮 SPVB Platform Server running at http://localhost:1406
```

### Step 3: Start Frontend Dev Server (in NEW terminal)
```bash
# From frontend directory
PORT=1404 npm start
```
Expected output:
```
You can now view spvb-downloader in the browser.
Local: http://localhost:1404
```

### Step 4: Test in Browser
```
http://localhost:1404
```

---

## ✅ Verification Checklist

- [ ] Backend running on port 1406
- [ ] Frontend running on port 1404
- [ ] Can access http://localhost:1404
- [ ] Dark theme visible (no white backgrounds)
- [ ] URL input field visible
- [ ] "5000+ Players Online" showing
- [ ] Console shows [DEBUG] session messages

---

## 🐛 Troubleshooting

### "Port Already in Use"
```bash
# Kill process on port 1406
lsof -i :1406 -t | xargs kill -9

# Kill process on port 1404
lsof -i :1404 -t | xargs kill -9

# Then restart servers
```

### "Cannot GET /"
- Make sure frontend dev server is running
- Check `REACT_APP_API_URL` points to `http://localhost:1406`
- Hard refresh: Ctrl+Shift+R

### Backend Not Responding
```bash
# Test backend API
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

---

## 📦 Production Setup (Coming Later)

When ready for production:
1. Update `.env` with real values
2. Build frontend: `npm run build`
3. Deploy to server/cloud provider
4. Use environment-specific .env files

---

## 🔒 Security Notes

- Never commit `.env` files
- Change `JWT_SECRET` in production
- Use HTTPS in production
- Update `CORS_ORIGIN` for your domain
- Keep `NODE_ENV=development` for local testing

---

## 📞 Support

If you encounter issues:
1. Check console (F12) for errors
2. Verify ports are correct
3. Restart both servers
4. Clear browser cache
5. Check git status for uncommitted changes
