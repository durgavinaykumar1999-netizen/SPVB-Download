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
app.use(express.urlencoded({ extended: true }));

// In-memory storage (for development - replace with database in production)
const games = [];
const movies = [];
const adminUsers = new Map([
  [process.env.ADMIN_USERNAME || 'admin', { password: process.env.ADMIN_PASSWORD || 'admin2026' }]
]);
const sessions = new Map();
const userStats = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

console.log('\n=== SPVB PLATFORM SERVER STARTING ===');
console.log('[STARTUP] Port:', PORT);
console.log('[STARTUP] Admin users:', Array.from(adminUsers.keys()));
console.log('[STARTUP] Registering API endpoints...\n');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
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
  res.json({ success: true, games });
});

// ============ MOVIES ENDPOINTS ============

// Add Movie
app.post('/api/admin/movies/add', verifyAdminToken, (req, res) => {
  const { name, url, thumbnail } = req.body;

  if (!name || !url) {
    return res.json({ success: false, message: 'Name and URL required' });
  }

  const movieId = 'movie-' + Date.now();
  const newMovie = {
    id: movieId,
    name,
    url,
    thumbnail: thumbnail || '',
    createdAt: new Date().toISOString(),
    plays: 0
  };

  movies.push(newMovie);
  res.json({ success: true, movieId, movie: newMovie });
});

// Get Admin Movies List
app.get('/api/admin/movies', verifyAdminToken, (req, res) => {
  res.json({ success: true, movies });
});

// Delete Movie
app.delete('/api/admin/movies/:id', verifyAdminToken, (req, res) => {
  const { id } = req.params;
  const index = movies.findIndex(m => m.id === id);

  if (index === -1) {
    return res.json({ success: false, message: 'Movie not found' });
  }

  movies.splice(index, 1);
  res.json({ success: true, message: 'Movie deleted' });
});

// Get Public Movies List
app.get('/api/movies/list', (req, res) => {
  res.json({ success: true, movies });
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
      totalMovies: movies.length,
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

// ============ PYTHON BACKEND PROXY ============
// Forward metadata and download requests to Python backend (port 5000 for local, 8000 for production)
const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'http://localhost:8000' : 'http://localhost:5000');

app.post('/api/metadata', async (req, res) => {
  try {
    const response = await fetch(`${pythonBackendUrl}/api/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Metadata proxy error:', err.message);
    res.json({ success: false, message: `Metadata fetch failed: ${err.message}` });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const response = await fetch(`${pythonBackendUrl}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Download proxy error:', err.message);
    res.json({ success: false, message: `Download request failed: ${err.message}` });
  }
});

app.get('/api/downloads', async (req, res) => {
  try {
    const { session_id } = req.query;
    const response = await fetch(`${pythonBackendUrl}/api/downloads?session_id=${session_id}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Downloads list proxy error:', err.message);
    res.json({ success: false, downloads: [], message: `Failed to fetch downloads: ${err.message}` });
  }
});

app.get('/api/download/:download_id/auto-download', async (req, res) => {
  try {
    const { download_id } = req.params;
    const { session_id } = req.query;
    const response = await fetch(`${pythonBackendUrl}/api/download/${download_id}/auto-download?session_id=${session_id}`);

    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const buffer = await response.buffer();
      res.set('Content-Type', 'video/mp4');
      res.set('Content-Disposition', response.headers.get('content-disposition'));
      res.send(buffer);
    }
  } catch (err) {
    console.error('Auto-download proxy error:', err.message);
    res.json({ success: false, message: `Auto-download failed: ${err.message}` });
  }
});

app.get('/api/download/:download_id/stream', async (req, res) => {
  try {
    const { download_id } = req.params;
    const { session_id } = req.query;
    const response = await fetch(`${pythonBackendUrl}/api/download/${download_id}/stream?session_id=${session_id}`);

    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const buffer = await response.buffer();
      res.set('Content-Type', 'video/mp4');
      res.set('Content-Disposition', response.headers.get('content-disposition'));
      res.send(buffer);
    }
  } catch (err) {
    console.error('Stream proxy error:', err.message);
    res.json({ success: false, message: `Stream failed: ${err.message}` });
  }
});

console.log('[STARTUP] ✓ API endpoints registered successfully\n');

// 404 handler for missing API routes (must be after specific routes)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// ============ STATIC FILES & SPA FALLBACK ============
const buildPath = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  console.log('[STARTUP] Frontend build found - serving static files');
} else {
  console.log('[STARTUP] Frontend build not found - API only mode');
}

// SPA fallback
app.get('*', (req, res) => {
  try {
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ success: false, message: 'Frontend not built' });
    }
  } catch (err) {
    res.status(404).json({ success: false, message: 'Page not found' });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ SPVB Platform Server running successfully`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔑 API Base: http://localhost:${PORT}/api`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`\n=== SERVER READY ===\n`);
});
