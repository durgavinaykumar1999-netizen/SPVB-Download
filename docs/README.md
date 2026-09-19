# 🎮 SPVB Downloader - Local Development Guide

## 📍 Project Overview

SPVB is a social media video downloader platform with:
- **Frontend**: React TypeScript (Dark Theme)
- **Backend**: Node.js Express API
- **Storage**: In-memory (development)
- **Admin Panel**: Game management system
- **Session Management**: 30-minute timeouts

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- npm v9+

### Installation & Running

**1. Navigate to project:**
```bash
cd /home/dev26/SPVB-Download
```

**2. Install dependencies:**
```bash
npm install
cd frontend && npm install && cd ..
```

**3. Start servers:**

**Linux/Mac (Automated):**
```bash
./start.sh
```

**Windows (Automated):**
```bash
start.bat
```

**Or manually in separate terminals:**

Terminal 1:
```bash
node server/server.js
```

Terminal 2:
```bash
cd frontend && PORT=1404 npm start
```

**4. Open in browser:**
```
http://localhost:1404
```

---

## 📂 Project Structure

```
SPVB-Download/
├── frontend/                      # React app
│   ├── src/                      # React components
│   ├── public/                   # Static assets
│   ├── build/                    # Production build
│   ├── package.json
│   └── .env
├── server/                       # Backend server
│   ├── server.js                # Express API
│   └── export_youtube_cookies.js
├── config/                       # Configuration
│   ├── .env                     # Backend config
│   └── vercel.json              # Deploy config
├── docs/                         # Documentation
│   ├── README.md
│   ├── ENV_SETUP.md
│   ├── LOCAL_SETUP.md
│   ├── SETUP_COMPLETE.md
│   └── BACKEND_OPTIONS.md
├── scripts/                      # Utility scripts
│   ├── start-local.sh
│   └── start-local.bat
├── start.sh                      # Main startup (Linux/Mac)
├── start.bat                     # Main startup (Windows)
├── package.json
├── .gitignore
└── backend_python/               # Optional Python backend
```

---

## 🔧 Environment Configuration

**Backend (config/.env):**
```
PORT=1406
NODE_ENV=development
JWT_SECRET=spvb-local-development-key-2026
CORS_ORIGIN=http://localhost:1404
SESSION_TIMEOUT=1800000
LOG_LEVEL=debug
```

**Frontend (frontend/.env):**
```
REACT_APP_API_URL=http://localhost:1406
REACT_APP_ENV=development
REACT_APP_DEBUG=true
REACT_APP_SHOW_THIRD_PARTY_ADS=false
REACT_APP_SESSION_TIMEOUT=1800000
REACT_APP_PLAYER_COUNT_BASE=5000
```

---

## 🎯 Backend API (http://localhost:1406)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/games` | List games (admin) |
| POST | `/api/admin/games/add` | Add game |
| DELETE | `/api/admin/games/:id` | Delete game |
| GET | `/api/games/list` | List games (public) |
| POST | `/api/session` | Create session |
| GET | `/api/downloads` | Get downloads |
| GET | `/api/admin/stats` | Get stats & user count |
| POST | `/api/logout` | Logout |

---

## 🎨 Frontend (http://localhost:1404)

✅ Dark Theme • ✅ Auto-Session • ✅ Responsive
✅ Admin Panel • ✅ Games List • ✅ Real Player Count

**Routes:**
- `/` - Home/Downloader
- `/admin` - Admin login (admin/admin123)
- `/play` - Browse games
- `/play/[game-id]` - Play game

---

## 🚀 Start Development

```bash
# Linux/Mac
./start.sh

# Windows
start.bat

# Or manual (2 terminals)
node server/server.js
cd frontend && PORT=1404 npm start
```

Then open: **http://localhost:1404**

---

## 📚 Documentation

- [docs/ENV_SETUP.md](./ENV_SETUP.md) - Environment variables
- [docs/LOCAL_SETUP.md](./LOCAL_SETUP.md) - Local development guide
- [docs/BACKEND_OPTIONS.md](./BACKEND_OPTIONS.md) - Backend comparison

---

## ✨ Ready to Code!

Happy coding! 🎉
