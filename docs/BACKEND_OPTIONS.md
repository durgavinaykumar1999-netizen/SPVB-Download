# 🔧 Backend Options - Node.js vs Python

## 📍 Project Location
```
/home/dev26/SPVB-Download/
```

---

## ✅ Both Backends Available

This project has **TWO** backend implementations:

### Option 1: Node.js/Express Backend ✅ **Recommended for Quick Start**
- **Location**: `/home/dev26/SPVB-Download/server.js`
- **Port**: 1406
- **Language**: JavaScript (Node.js)
- **Framework**: Express.js
- **Status**: Simple, fast, ready to run locally
- **Use Case**: Local development, testing, learning

### Option 2: Python/FastAPI Backend
- **Location**: `/home/dev26/SPVB-Download/backend_python/`
- **Port**: Should be 1407 or 5000
- **Language**: Python
- **Framework**: FastAPI
- **Status**: Feature-rich, production-ready
- **Use Case**: Production deployment, advanced features

---

## 🚀 Quick Start with Node.js Backend

### Prerequisites
```bash
node --version  # Should be v18+
npm --version   # Should be v9+
```

### Run Locally

**Automated:**
```bash
./start-local.sh        # Linux/Mac
start-local.bat         # Windows
```

**Or Manual:**
```bash
# Terminal 1 - Backend
node server.js

# Terminal 2 - Frontend (in frontend/)
PORT=1404 npm start
```

**Then open:**
```
http://localhost:1404
```

---

## 🐍 Python Backend (For Reference)

Located in `/home/dev26/SPVB-Download/backend_python/`

### Structure
```
backend_python/
├── main.py                 # FastAPI app
├── config/                 # Configuration
│   └── env.py
├── routes/                 # API routes
│   └── public_routes.py
├── services/               # Business logic
│   └── cleanup_service.py
├── providers/              # Video providers (Instagram, TikTok, etc.)
├── utils/                  # Utilities
│   ├── logger.py
│   └── url_parser.py
├── requirements.txt        # Python dependencies
└── .env.example           # Environment template
```

### To Run Python Backend

```bash
# Install Python dependencies
cd backend_python
pip install -r requirements.txt

# Create .env from .env.example
cp .env.example .env

# Run FastAPI server
python main.py
# or
uvicorn main:app --reload --port 5000
```

### Python Backend Routes
```
GET  /api/session           - Create session
POST /api/metadata          - Get video metadata
POST /api/download          - Download video
GET  /api/downloads         - Get download list
GET  /api/health            - Health check
```

---

## 🎯 Which Backend to Use?

### Use Node.js Backend If:
- ✅ Quick local testing
- ✅ Simple learning project
- ✅ Don't have Python installed
- ✅ Want minimal dependencies
- ✅ Fast setup (no pip install)

### Use Python Backend If:
- ✅ Production deployment
- ✅ Need advanced video processing
- ✅ Want scalability features
- ✅ Need MongoDB/Cloudinary integration
- ✅ Planning enterprise use

---

## 📦 Frontend Works With Both!

The frontend (`http://localhost:1404`) can connect to either backend:

**For Node.js Backend (Default):**
```
REACT_APP_API_URL=http://localhost:1406
```

**For Python Backend:**
```
REACT_APP_API_URL=http://localhost:5000
# or
REACT_APP_API_URL=http://localhost:1407
```

Just update `frontend/.env` and restart!

---

## 🔄 Switching Backends

### From Node.js to Python

1. Stop Node.js backend (Ctrl+C in terminal)

2. Update frontend .env:
```bash
# In frontend/.env
REACT_APP_API_URL=http://localhost:5000
```

3. Start Python backend:
```bash
cd backend_python
python main.py
```

4. Refresh browser: http://localhost:1404

### From Python to Node.js

1. Stop Python backend (Ctrl+C in terminal)

2. Update frontend .env:
```bash
# In frontend/.env
REACT_APP_API_URL=http://localhost:1406
```

3. Start Node.js backend:
```bash
node server.js
```

4. Refresh browser: http://localhost:1404

---

## ⚙️ Backend Comparison

| Feature | Node.js | Python |
|---------|---------|--------|
| Setup Time | ~30 seconds | 2-3 minutes |
| Dependencies | npm packages | pip packages |
| Speed | Fast | Very fast |
| Learning Curve | Easy | Easy |
| Production Ready | No | Yes |
| Video Providers | Basic | Advanced |
| Database Support | None | MongoDB |
| File Storage | None | Cloudinary |
| Auto-Cleanup | Basic | Advanced |
| Scalability | Limited | Good |

---

## 🛠️ Node.js Backend .env

```
PORT=1406
NODE_ENV=development
JWT_SECRET=spvb-local-development-key-2026
CORS_ORIGIN=http://localhost:1404
SESSION_TIMEOUT=1800000
LOG_LEVEL=debug
```

---

## 🐍 Python Backend .env

```
NODE_ENV=development
PORT=5000
DATABASE_URL=mongodb://localhost:27017/spvb
CLOUDINARY_URL=cloudinary://key:secret@cloud
SECRET_KEY=your-secret-key
LOG_LEVEL=debug
MAX_UPLOAD_SIZE=52428800
CLEANUP_INTERVAL=300
CLEANUP_TIME_LIMIT=1800
```

---

## 📚 Documentation Files

- **README.md** - Project overview
- **ENV_SETUP.md** - Environment variables
- **LOCAL_SETUP.md** - Local development
- **SETUP_COMPLETE.md** - Setup summary
- **BACKEND_OPTIONS.md** - This file

---

## ✅ Current Recommended Setup

For **local development and quick testing**:

1. Use **Node.js backend** (`server.js`)
2. Run with `./start-local.sh` or manually
3. No database setup required
4. No additional dependencies
5. Test immediately after git clone

For **production deployment**:

1. Use **Python backend** (`backend_python/`)
2. Set up MongoDB and Cloudinary
3. Configure .env with real values
4. Deploy to cloud (Render, Heroku, etc.)

---

## 🚀 Ready to Go!

Choose your backend and start building:

**Quick Start (Node.js):**
```bash
./start-local.sh
```

**Then:** http://localhost:1404

Enjoy! 🎉
