# SPVB Download - Complete API & Backend Setup Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│         React Frontend (Port 1405)                       │
│         http://localhost:1405                            │
└────────────────────┬────────────────────────────────────┘
                     │ All API calls to
                     ▼
┌─────────────────────────────────────────────────────────┐
│      Node.js Express Server (Port 1406)                  │
│      http://localhost:1406                               │
├─────────────────────────────────────────────────────────┤
│  • Games Management (/api/admin/games/add, etc)         │
│  • Movies Management (/api/admin/movies/add, etc)       │
│  • Admin Authentication (/api/admin/login)              │
│  • Admin Statistics (/api/admin/stats)                  │
│  • PUBLIC PROXY ENDPOINTS (see below)                    │
└────────────────────┬────────────────────────────────────┘
                     │ Proxies to
                     ▼
┌─────────────────────────────────────────────────────────┐
│      Python FastAPI Backend (Port 5000/8000)            │
│      http://localhost:5000 (local development)          │
│      http://localhost:8000 (production)                 │
├─────────────────────────────────────────────────────────┤
│  • Video Metadata Extraction (/api/metadata)            │
│  • Download Queue Management (/api/download)            │
│  • Download Status Tracking (/api/downloads)            │
│  • File Streaming & Download (/api/download/{id}/...)   │
│  • Session Management                                    │
│  • Video Format Support: Instagram, TikTok, YouTube,    │
│    Facebook, Twitter, etc (via yt-dlp)                 │
└─────────────────────────────────────────────────────────┘
       ↓
    ▼
┌─────────────────────────────────────────────────────────┐
│  External Services                                       │
├─────────────────────────────────────────────────────────┤
│  • MongoDB (session storage, download history)          │
│  • Cloudinary (file hosting)                            │
│  • Video Download Services (yt-dlp)                     │
└─────────────────────────────────────────────────────────┘
```

## Local Development Setup

### Prerequisites
- Node.js 16+ with npm
- Python 3.8+ with pip
- MongoDB instance running (or MongoDB Atlas account)
- Cloudinary account (for file storage)

### Step 1: Install Dependencies

```bash
# Install root dependencies (for Node.js server)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install Python backend dependencies
pip install -r backend_python/requirements.txt
```

### Step 2: Environment Configuration

#### Root .env file (already exists)
Located at: `/home/dev26/SPVB-Download/.env`
```
PORT=1406
NODE_ENV=development
MONGODB_URI=mongodb+srv://[your-credentials]...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

#### Frontend .env.local file
Located at: `/home/dev26/SPVB-Download/frontend/.env.local`
```
REACT_APP_API_URL=http://localhost:1406
REACT_APP_ENV=development
```

#### Python Backend (uses root .env)
Reads PORT from environment, defaults to 8000 in production, 5000 in development.

### Step 3: Start All Services

**Terminal 1 - Python Backend (download/metadata service):**
```bash
cd /home/dev26/SPVB-Download
PORT=5000 python3 -m uvicorn backend_python.main:app --host 0.0.0.0 --port 5000 --reload
```
Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:5000
```

**Terminal 2 - Node.js Server (API gateway + Games/Movies management):**
```bash
cd /home/dev26/SPVB-Download
node server/server.js
```
Expected output:
```
✅ SPVB Platform Server running successfully
🌐 URL: http://localhost:1406
```

**Terminal 3 - React Frontend:**
```bash
cd /home/dev26/SPVB-Download/frontend
npm start
```
Expected output:
```
Compiled successfully!
You can now view spvb-downloader in the browser at http://localhost:1405
```

### Step 4: Test the APIs

```bash
# Test Node.js server
curl http://localhost:1406/health

# Test Python backend
curl http://localhost:5000/api/health

# Test metadata proxy (should work)
curl -X POST http://localhost:1406/api/metadata \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.instagram.com/p/test","session_id":"test-123"}'

# Create a session
curl -X POST http://localhost:1406/api/session \
  -H "Content-Type: application/json"
```

---

## Node.js Server Endpoints Summary

### Admin Endpoints (Protected by JWT Token)
- `POST /api/admin/login` - Login with admin credentials
- `POST /api/admin/games/add` - Add a new game
- `GET /api/admin/games` - List all games
- `DELETE /api/admin/games/:id` - Delete a game
- `POST /api/admin/movies/add` - Add a new movie  
- `GET /api/admin/movies` - List all movies
- `DELETE /api/admin/movies/:id` - Delete a movie
- `GET /api/admin/stats` - Get platform statistics

### Public Endpoints
- `GET /api/games/list` - Get public games list
- `GET /api/movies/list` - Get public movies list

### Proxy Endpoints (Forward to Python Backend)
- `POST /api/metadata` - Get video metadata
- `POST /api/download` - Queue a download
- `GET /api/downloads?session_id=...` - Get download status
- `GET /api/download/:id/auto-download?session_id=...` - Download completed video
- `GET /api/download/:id/stream?session_id=...` - Stream video

---

## Render.com Deployment

### Why Two Backends?

On Render, we can't easily run both Python and Node.js in the same process. The solution:

1. **Deploy Python backend to Render** (main service on port 8000)
2. **Deploy Node.js server to Render** as a secondary service (port 1406)
3. Node.js automatically proxies to Python backend

### Deployment Steps

#### 1. Create Render Services

**Service 1: Python Backend**
- **Name**: `spvb-python-backend`
- **Type**: Web Service
- **Runtime**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python -m uvicorn backend_python.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `PORT=8000`
  - `NODE_ENV=production`
  - `MONGODB_URI=...`
  - `CLOUDINARY_CLOUD_NAME=...`
  - (all other vars from .env)

**Service 2: Node.js + React**
- **Name**: `spvb-node-server`
- **Type**: Web Service
- **Runtime**: Node
- **Build Command**: 
  ```
  npm install && cd frontend && npm install && npm run build && cd ..
  ```
- **Start Command**: 
  ```
  node server/server.js
  ```
- **Environment Variables**:
  - `PORT=10000` (Render assigns this)
  - `NODE_ENV=production`
  - `PYTHON_BACKEND_URL=https://spvb-python-backend.onrender.com` (points to Python service)
  - All other vars from .env

#### 2. Configure Environment Variables in Render Dashboard

For **Python Backend Service**:
```
PORT=8000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
CLOUDINARY_CLOUD_NAME=dnlxnj0e1
CLOUDINARY_API_KEY=759347421676118
CLOUDINARY_API_SECRET=lHkY4w26XfNckBYgWD16WAAwAVk
CLOUDINARY_FOLDER=spvb/production/downloads
```

For **Node.js Server Service**:
```
PORT=10000
NODE_ENV=production
PYTHON_BACKEND_URL=https://spvb-python-backend.onrender.com
ADMIN_USERNAME=secureadmin2026
ADMIN_PASSWORD=admin2026
JWT_SECRET=gM6J0q2L5zW8z9bq1xFvPi8ndaQyhN6R7mKcYtA4eL9sBnE=
CORS_ORIGIN=https://your-domain.onrender.com
MONGODB_URI=mongodb+srv://...
```

#### 3. Database Configuration

- **MongoDB Atlas**: Create a cloud database
- **Cloudinary**: Create account for file hosting
- Update connection strings in Render environment variables

#### 4. Verify Deployment

```bash
# Check Python backend
curl https://spvb-python-backend.onrender.com/api/health

# Check Node server
curl https://spvb-node-server.onrender.com/health

# Check metadata proxy
curl -X POST https://spvb-node-server.onrender.com/api/metadata \
  -H "Content-Type: application/json" \
  -d '{"url":"...","session_id":"test"}'
```

---

## Troubleshooting

### Issue: "Metadata fetch failed"
**Cause**: Python backend not running or not accessible
**Solution**: 
- Check Python backend is running on port 5000 (local) or 8000 (production)
- Verify `PYTHON_BACKEND_URL` environment variable is correct
- Check network connectivity: `curl http://localhost:5000/api/health`

### Issue: "Cannot GET /api/metadata"
**Cause**: Node.js server routes registered after 404 handler
**Solution**: Routes must be registered BEFORE `app.all('/api/*')` catch-all

### Issue: Downloads not working
**Cause**: MongoDB or Cloudinary credentials invalid
**Solution**:
- Verify `MONGODB_URI` can connect: `mongosh "$MONGODB_URI"`
- Verify Cloudinary credentials in dashboard
- Check Python backend logs for auth errors

### Issue: Frontend stuck on loading
**Cause**: Frontend .env.local pointing to wrong API URL
**Solution**: 
- Local: `REACT_APP_API_URL=http://localhost:1406`
- Production: `REACT_APP_API_URL=https://your-render-domain.onrender.com`

---

## Local Testing Checklist

- [ ] Python backend running on port 5000
- [ ] Node.js server running on port 1406  
- [ ] React frontend running on port 1405
- [ ] Can create admin session: `POST /api/admin/login`
- [ ] Can add game: `POST /api/admin/games/add`
- [ ] Can list games: `GET /api/games/list`
- [ ] Can add movie: `POST /api/admin/movies/add`
- [ ] Can list movies: `GET /api/movies/list`
- [ ] Can get metadata: `POST /api/metadata` (with valid URL)
- [ ] Can queue download: `POST /api/download`
- [ ] Can get download status: `GET /api/downloads`
- [ ] Games page displays ads correctly
- [ ] Movies page displays ads correctly
- [ ] Admin panel shows Games and Movies tabs
