const path = require('path');
const fs = require('fs');

// Try to load .env from config folder (local), fallback to root .env (Render)
const envPath1 = path.join(__dirname, '..', 'config', '.env');
const envPath2 = path.join(__dirname, '..', '.env');
const envPathToUse = fs.existsSync(envPath1) ? envPath1 : (fs.existsSync(envPath2) ? envPath2 : null);

if (envPathToUse) {
  require('dotenv').config({ path: envPathToUse });
  console.log(`[INFO] Loaded .env from: ${envPathToUse}`);
} else {
  console.log('[INFO] No .env file found, using environment variables');
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 1406;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (for development - replace with database in production)
const games = [];
const adminUsers = new Map([
  [process.env.ADMIN_USERNAME || 'admin', { password: process.env.ADMIN_PASSWORD || 'admin123' }]
]);
const sessions = new Map();
const userStats = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// ============ API ENDPOINTS (must be before static files) ============
console.log('[STARTUP] Registering API endpoints...');

// Admin Login
app.post('/api/admin/login', (req, res) => {
  console.log('[DEBUG] POST /api/admin/login called');
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, message: 'Username and password required' });
  }

  const user = adminUsers.get(username);
  if (!user || user.password !== password) {
    return res.json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign({ username, admin: true }, JWT_SECRET, { expiresIn: '30m' });
  res.json({ success: true, token });
});

// Verify admin token middleware
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.json({ success: false, message: 'Invalid token' });
  }
};

// Add Game
app.post('/api/admin/games/add', verifyAdminToken, (req, res) => {
  const { name, url, thumbnail } = req.body;

  if (!name || !url) {
    return res.json({ success: false, message: 'Name and URL required' });
  }

  const gameId = 'game-' + Date.now();
  const newGame = {
    id: gameId,
    name,
    url,
    thumbnail: thumbnail || '',
    createdAt: new Date().toISOString(),
    plays: 0,
    downloads: 0
  };

  games.push(newGame);
  res.json({ success: true, gameId, game: newGame });
});

// Get Admin Games List
app.get('/api/admin/games', verifyAdminToken, (req, res) => {
  res.json({ success: true, games });
});

// Delete Game
app.delete('/api/admin/games/:id', verifyAdminToken, (req, res) => {
  const { id } = req.params;
  const index = games.findIndex(g => g.id === id);

  if (index === -1) {
    return res.json({ success: false, message: 'Game not found' });
  }

  games.splice(index, 1);
  res.json({ success: true, message: 'Game deleted' });
});

// Get Public Games List
app.get('/api/games/list', (req, res) => {
  console.log('[DEBUG] GET /api/games/list called - returning', games.length, 'games');
  res.json({ success: true, games });
});

// Session Management
app.post('/api/session', (req, res) => {
  const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const sessionData = {
    created: Date.now(),
    expires: Date.now() + SESSION_TIMEOUT,
    downloads: 0,
    plays: 0
  };

  sessions.set(sessionId, sessionData);
  userStats.set(sessionId, { downloads: 0, plays: 0, startTime: Date.now() });

  res.json({ success: true, session_id: sessionId });
});

// Get Downloads
app.get('/api/downloads', (req, res) => {
  const { session_id } = req.query;
  const sessionData = sessions.get(session_id);

  if (!sessionData) {
    return res.json({ success: false, downloads: [], message: 'Session expired' });
  }

  // Check if session expired
  if (Date.now() > sessionData.expires) {
    sessions.delete(session_id);
    userStats.delete(session_id);
    return res.json({ success: false, downloads: [], message: 'Session expired - please refresh' });
  }

  // Update expiry time on each request
  sessionData.expires = Date.now() + SESSION_TIMEOUT;

  res.json({ success: true, downloads: [] });
});

// Admin Stats (public - for showing user count)
app.get('/api/admin/stats', (req, res) => {
  const totalUsers = sessions.size;
  let totalDownloads = 0;
  let totalPlays = 0;

  userStats.forEach(stat => {
    totalDownloads += stat.downloads || 0;
    totalPlays += stat.plays || 0;
  });

  res.json({
    success: true,
    stats: {
      totalGames: games.length,
      totalUsers,
      totalDownloads,
      totalPlays,
      activeSessions: sessions.size
    }
  });
});

// Logout / Kill Session
app.post('/api/logout', (req, res) => {
  const { session_id } = req.body;
  sessions.delete(session_id);
  userStats.delete(session_id);
  res.json({ success: true, message: 'Session terminated' });
});

// ============ STATIC FILES & SPA FALLBACK ============
console.log('[STARTUP] Configuring static files...');
const buildPath = path.join(__dirname, '..', 'frontend', 'build');
const fs = require('fs');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  console.log('[STARTUP] Frontend build found at:', buildPath);
} else {
  console.log('[STARTUP] Frontend build not found at', buildPath, '- API only mode');
}

// 404 handler for missing API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found', path: req.path, method: req.method });
});

// SPA fallback - the React app handles all routes (including /admin, /play/gta-vc)
// Only serve index.html for non-API routes
app.get('*', (req, res) => {
  console.log('[DEBUG] SPA fallback for:', req.path);
  try {
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ success: false, message: 'Frontend not built' });
    }
  } catch (err) {
    res.status(404).json({ success: false, message: 'Page not found', error: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    routes: [
      'POST /api/admin/login',
      'GET /api/admin/games',
      'POST /api/admin/games/add',
      'DELETE /api/admin/games/:id',
      'GET /api/games/list',
      'POST /api/session',
      'GET /api/downloads',
      'GET /api/admin/stats',
      'POST /api/logout'
    ],
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    env: process.env.NODE_ENV,
    port: PORT,
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    hasMongoDb: !!process.env.MONGODB_URI,
    hasCloudinary: !!process.env.CLOUDINARY_API_KEY
  });
});

app.listen(PORT, () => {
  console.log(`\n🎮 SPVB Platform Server running at http://localhost:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`📍 Admin Login: POST http://localhost:${PORT}/api/admin/login`);
  console.log(`📍 Home: http://localhost:${PORT}`);
  console.log(`🕹️  Admin: http://localhost:${PORT}/admin`);
  console.log(`🎮 Games: http://localhost:${PORT}/play`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/admin/stats\n`);
});
