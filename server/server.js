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

// Cloudinary (optional - used to delete download files on session expiry)
let cloudinary = null;
try {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
  });
} catch (e) {
  console.warn('[CLOUDINARY] SDK not available - Cloudinary cleanup disabled:', e.message);
}

const app = express();
const PORT = process.env.PORT || 1406;

// Middleware
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Setup for Games, Movies, and Sessions
const { MongoClient } = require('mongodb');

let mongoClient;
let db;
let gamesCollection;
let moviesCollection;
let sessionsCollection;
let visitsCollection;
let visitCountersCollection;
let downloadsCollection;
const DOWNLOADS_COLLECTION_NAME = 'downloads';

const connectMongoDB = async () => {
  try {
    mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME || 'spvb-downloader');

    gamesCollection = db.collection('games');
    moviesCollection = db.collection('movies');
    sessionsCollection = db.collection('sessions');
    visitsCollection = db.collection('visits');
    visitCountersCollection = db.collection('visitCounters');
    downloadsCollection = db.collection(DOWNLOADS_COLLECTION_NAME);

    // Create indexes
    await gamesCollection.createIndex({ id: 1 }, { unique: true }).catch(() => {});
    await moviesCollection.createIndex({ id: 1 }, { unique: true }).catch(() => {});
    await sessionsCollection.createIndex({ session_id: 1 }, { unique: true }).catch(() => {});
    await sessionsCollection.createIndex({ last_activity: 1 }).catch(() => {});
    await sessionsCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    await visitsCollection.createIndex({ session_id: 1 }).catch(() => {});
    await visitsCollection.createIndex({ last_seen: -1 }).catch(() => {});
    await visitsCollection.createIndex({ created_at: 1 }).catch(() => {});
    await downloadsCollection.createIndex({ session_id: 1 }).catch(() => {});

    console.log('[DB] ✅ MongoDB connected for games, movies, and sessions');
  } catch (err) {
    console.error('[DB] ❌ MongoDB connection failed:', err.message);
    throw err;
  }
};

// In-memory maps for sessions (fallback, also sync with MongoDB)
const adminUsers = new Map([
  [process.env.ADMIN_USERNAME || 'admin', { password: process.env.ADMIN_PASSWORD || 'admin2026' }]
]);
const sessions = new Map();
const userStats = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// SESSION_TIMEOUT env accepts milliseconds (e.g. 1800000) or minutes (e.g. 30)
const _rawTimeout = parseInt(process.env.SESSION_TIMEOUT || '0', 10) || 0;
const SESSION_TIMEOUT_MS = _rawTimeout > 60000 ? _rawTimeout : ((_rawTimeout || 30) * 60 * 1000);
const CLEANUP_INTERVAL_MS = (parseInt(process.env.CLEANUP_INTERVAL || '300', 10) || 300) * 1000;

// ============ HELPERS ============

const parseJSONBody = (req) => (typeof req.body === 'object' && req.body !== null ? req.body : {});

const getClientIp = (req) => {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  const raw = (req.socket && req.socket.remoteAddress) || req.ip || '';
  return String(raw).replace('::ffff:', '');
};

// Local/private IPs are used for local development and shared testing, so the
// IP-based session reuse fallback is skipped for them (keeps local browsers
// distinguishable). Public IPs are the ones that get flooded by crawlers.
const isPrivateIp = (ip) => {
  const clean = String(ip || '').replace('::ffff:', '').trim();
  return !clean || clean === '127.0.0.1' || clean === '::1' || clean === 'localhost' ||
    clean.startsWith('192.168.') || clean.startsWith('10.') ||
    clean.startsWith('172.1') || clean.startsWith('169.254.');
};

const toDateKey = (d) => d.toISOString().slice(0, 10);

const detectDevice = (ua) => {
  const u = (ua || '').toLowerCase();
  if (/ipad|tablet/.test(u)) return 'tablet';
  if (/iphone|ipod|android|mobile/.test(u)) return 'mobile';
  return 'desktop';
};

const detectBrowser = (ua) => {
  const u = ua || '';
  if (/edg\//i.test(u)) return 'Edge';
  if (/opr\/|opera/i.test(u)) return 'Opera';
  if (/firefox|fxios/i.test(u)) return 'Firefox';
  if (/crios|chrome/i.test(u)) return 'Chrome';
  if (/safari/i.test(u)) return 'Safari';
  return 'Unknown';
};

const detectOS = (ua) => {
  const u = ua || '';
  if (/windows nt/i.test(u)) return 'Windows';
  if (/android/i.test(u)) return 'Android';
  if (/iphone|ipad|ipod/i.test(u)) return 'iOS';
  if (/mac os x|macintosh/i.test(u)) return 'macOS';
  if (/linux/i.test(u)) return 'Linux';
  return 'Unknown';
};

const parseClientInfo = (source) => {
  const get = (k) => {
    const v = source[k];
    if (v === undefined || v === null) return '';
    return String(v).slice(0, 500);
  };
  return {
    fingerprint: get('fingerprint'),
    device: get('device'),
    browser: get('browser'),
    os: get('os'),
    screen: get('screen'),
    language: get('language'),
    languages: get('languages'),
    timezone: get('timezone'),
    platform: get('platform'),
    referrer: get('referrer'),
    page: get('page'),
    userAgent: get('user_agent') || get('ua')
  };
};

// Best-effort IP geolocation (no external key required)
const geoLookup = async (ip) => {
  try {
    const clean = String(ip || '').replace('::ffff:', '').trim();
    if (!clean || clean === '127.0.0.1' || clean === '::1' || clean === 'localhost' ||
      clean.startsWith('192.168.') || clean.startsWith('10.') ||
      clean.startsWith('172.') || clean.startsWith('169.254.')) {
      return { country: 'Local', region: 'Local', city: 'Local' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,country,regionName,city,lat,lon,isp,org,query`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = await res.json();
    if (j.status !== 'success') return null;
    return {
      country: j.country || '',
      region: j.regionName || '',
      city: j.city || '',
      lat: j.lat || 0,
      lon: j.lon || 0,
      isp: j.isp || '',
      org: j.org || '',
      ip: j.query || clean
    };
  } catch (e) {
    return null;
  }
};

// Delete a video file from Cloudinary (best effort)
const deleteCloudinaryVideo = async (publicId) => {
  if (!cloudinary || !publicId) return false;
  const full = String(publicId).includes('/') ? publicId : `spvb-downloader/${publicId}`;
  try {
    await cloudinary.uploader.destroy(full, { resource_type: 'video', invalidate: true });
    return true;
  } catch (e) {
    console.warn('[CLOUDINARY] Delete failed:', full, e.message);
    return false;
  }
};

// Delete ALL data related to a session (Cloudinary files, MongoDB downloads, session doc)
const deleteSessionData = async (sessionId) => {
  if (!sessionId) return;
  sessions.delete(sessionId);
  userStats.delete(sessionId);

  try {
    if (downloadsCollection) {
      const downloads = await downloadsCollection.find({ session_id: sessionId }).toArray();
      for (const d of downloads) {
        const publicId = d.cloudinary_public_id || (d.download_id ? `download-${d.download_id}` : null);
        if (publicId) await deleteCloudinaryVideo(publicId).catch(() => {});
        if (d.filename && typeof fs.existsSync === 'function' && fs.existsSync(d.filename)) {
          try { fs.unlinkSync(d.filename); } catch (e) {}
        }
      }
      await downloadsCollection.deleteMany({ session_id: sessionId });
    }
    if (sessionsCollection) await sessionsCollection.deleteOne({ session_id: sessionId }).catch(() => {});
  } catch (err) {
    console.error('[CLEANUP] deleteSessionData error:', err.message);
  }
};

// Periodic cleanup: delete sessions with no activity for SESSION_TIMEOUT_MS and all their data
const cleanupExpiredSessions = async () => {
  let removed = 0;
  try {
    if (sessionsCollection) {
      const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);
      const expired = await sessionsCollection.find({ last_activity: { $lt: cutoff } }).toArray();
      for (const s of expired) {
        try {
          await deleteSessionData(s.session_id);
          removed++;
        } catch (e) {
          console.error('[CLEANUP] Failed session cleanup:', s.session_id, e.message);
        }
      }
    }
    const cutoffMs = Date.now() - SESSION_TIMEOUT_MS;
    for (const [id, rec] of sessions) {
      const lastAct = rec.last_activity || rec.created || 0;
      const lastActMs = lastAct instanceof Date ? lastAct.getTime() : (lastAct || 0);
      if (lastActMs < cutoffMs) {
        sessions.delete(id);
        userStats.delete(id);
        removed++;
      }
    }
    if (removed > 0) console.log(`[CLEANUP] Removed ${removed} expired session(s)`);
  } catch (err) {
    console.error('[CLEANUP] Error:', err.message);
  }
  invalidateStats();
  return removed;
};

// Record a visit + increment visit counters (total + today)
const recordVisit = async (visitDoc) => {
  try {
    if (!visitsCollection) return;
    await visitsCollection.insertOne(visitDoc);
    const today = toDateKey(new Date());
    const bump = async (id) => {
      try {
        await visitCountersCollection.updateOne({ _id: id }, { $inc: { count: 1 } }, { upsert: true });
      } catch (e) { console.warn('[VISIT] counter error', e.message); }
    };
    await bump('total');
    await bump(today);
  } catch (e) {
    console.error('[VISIT] record error:', e.message);
  }
};

// Stats cache (refreshed on demand, capped so live polling doesn't hammer MongoDB)
let statsCache = { ts: 0, data: null };
const invalidateStats = () => {
  statsCache = { ts: 0, data: null };
};

const computeStats = async () => {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);
  let totalUsers = sessions.size;
  let totalDownloads = 0;
  let totalPlays = 0;
  let totalGames = 0;
  let totalMovies = 0;
  let totalVisits = 0;
  let todayVisits = 0;

  userStats.forEach(stat => {
    totalDownloads += stat.downloads || 0;
    totalPlays += stat.plays || 0;
  });

  try {
    if (sessionsCollection) {
      totalUsers = await sessionsCollection.countDocuments({ last_activity: { $gt: cutoff } });
    }
  } catch (e) {
    totalUsers = sessions.size;
  }

  try { totalGames = await gamesCollection.countDocuments({}); } catch (e) {}
  try { totalMovies = await moviesCollection.countDocuments({}); } catch (e) {}

  try {
    if (visitCountersCollection) {
      const totalDoc = await visitCountersCollection.findOne({ _id: 'total' });
      totalVisits = totalDoc ? (totalDoc.count || 0) : 0;
      const todayDoc = await visitCountersCollection.findOne({ _id: toDateKey(new Date()) });
      todayVisits = todayDoc ? (todayDoc.count || 0) : 0;
    }
  } catch (e) {}

  return {
    totalGames,
    totalMovies,
    totalUsers,
    totalDownloads,
    totalPlays,
    activeSessions: totalUsers,
    totalVisits,
    todayVisits
  };
};

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
app.post('/api/admin/games/add', verifyAdminToken, async (req, res) => {
  try {
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

    await gamesCollection.insertOne(newGame);
    res.json({ success: true, gameId, game: newGame });
  } catch (err) {
    res.json({ success: false, message: 'Failed to add game: ' + err.message });
  }
});

// Get Admin Games List
app.get('/api/admin/games', verifyAdminToken, async (req, res) => {
  try {
    const games = await gamesCollection.find({}).toArray();
    res.json({ success: true, games });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch games: ' + err.message });
  }
});

// Delete Game
app.delete('/api/admin/games/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await gamesCollection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.json({ success: false, message: 'Game not found' });
    }

    res.json({ success: true, message: 'Game deleted' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to delete game: ' + err.message });
  }
});

// Get Public Games List
app.get('/api/games/list', async (req, res) => {
  try {
    const games = await gamesCollection.find({}).toArray();
    res.json({ success: true, games });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch games: ' + err.message });
  }
});

// ============ MOVIES ENDPOINTS ============

// Add Movie
app.post('/api/admin/movies/add', verifyAdminToken, async (req, res) => {
  try {
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

    await moviesCollection.insertOne(newMovie);
    res.json({ success: true, movieId, movie: newMovie });
  } catch (err) {
    res.json({ success: false, message: 'Failed to add movie: ' + err.message });
  }
});

// Get Admin Movies List
app.get('/api/admin/movies', verifyAdminToken, async (req, res) => {
  try {
    const movies = await moviesCollection.find({}).toArray();
    res.json({ success: true, movies });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch movies: ' + err.message });
  }
});

// Delete Movie
app.delete('/api/admin/movies/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await moviesCollection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.json({ success: false, message: 'Movie not found' });
    }

    res.json({ success: true, message: 'Movie deleted' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to delete movie: ' + err.message });
  }
});

// Get Public Movies List
app.get('/api/movies/list', async (req, res) => {
  try {
    const movies = await moviesCollection.find({}).toArray();
    res.json({ success: true, movies });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch movies: ' + err.message });
  }
});

// ============ SESSION MANAGEMENT ============
// Check if a session is still active (not expired)
const isActiveSession = async (sessionId) => {
  if (!sessionId) return null;
  if (sessionsCollection) {
    try {
      const s = await sessionsCollection.findOne({ session_id: sessionId });
      if (!s) return null;
      const lastAct = s.last_activity ? new Date(s.last_activity).getTime() : 0;
      if (Date.now() - lastAct < SESSION_TIMEOUT_MS) return s;
      return null;
    } catch (e) {
      return sessions.has(sessionId) ? { session_id: sessionId } : null;
    }
  }
  return sessions.has(sessionId) ? { session_id: sessionId } : null;
};

// Reuse an existing still-active session for the same fingerprint instead of
// creating a new one (browser refresh must NOT count as a new visitor).
const findReusableSession = async (fingerprint) => {
  if (!fingerprint || !visitsCollection || !sessionsCollection) return null;
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);
  try {
    const recent = await visitsCollection
      .find({ fingerprint, last_seen: { $gt: cutoff } })
      .sort({ last_seen: -1 })
      .limit(5)
      .toArray();
    for (const v of recent) {
      if (!v.session_id) continue;
      const active = await isActiveSession(v.session_id);
      if (active) return active;
    }
  } catch (e) {
    console.error('[SESS] fingerprint lookup error:', e.message);
  }
  return null;
};

// Reuse the most recent still-active session from the same IP as a fallback.
// Crawlers/bots typically send a brand-new fingerprint on every request, so
// fingerprint matching alone cannot stop them from spawning unlimited sessions
// from one IP. This bounds each public IP to a single live session.
const findReusableSessionByIp = async (ip) => {
  if (!ip || !visitsCollection || !sessionsCollection) return null;
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);
  try {
    const recent = await visitsCollection
      .find({ ip, last_seen: { $gt: cutoff } })
      .sort({ last_seen: -1 })
      .limit(5)
      .toArray();
    for (const v of recent) {
      if (!v.session_id) continue;
      const active = await isActiveSession(v.session_id);
      if (active) return active;
    }
  } catch (e) {}
  return null;
};

// Push an activity + expiry refresh to in-memory session, MongoDB session and its visit record
const refreshSession = async (sessionId, now, expiresAt) => {
  const mem = sessions.get(sessionId);
  if (mem) {
    mem.last_activity = now;
    mem.expires_at = expiresAt;
  }
  if (sessionsCollection) {
    try {
      await sessionsCollection.updateOne(
        { session_id: sessionId },
        { $set: { last_activity: now, expires_at: expiresAt } }
      );
    } catch (e) {}
  }
  if (visitsCollection) {
    try {
      await visitsCollection.updateOne({ session_id: sessionId }, { $set: { last_seen: now } });
    } catch (e) {}
  }
};

// Create session (GET for frontend, POST for API compat) + record visitor fingerprint.
// A visit is counted ONLY when a genuinely new session is created.
const createSessionHandler = async (req, res) => {
  try {
    const info = parseClientInfo({ ...req.query, ...parseJSONBody(req) });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);
    const reqBody = { ...req.query, ...parseJSONBody(req) };

    // If the client sends an existing session id and it's still active, reuse it
    const requestedId = reqBody.sid || reqBody.session_id;
    if (requestedId) {
      const existing = await isActiveSession(requestedId);
      if (existing) {
        await refreshSession(requestedId, now, expiresAt);
        return res.json({ success: true, session_id: requestedId, expires_at: expiresAt.toISOString(), reused: true });
      }
    }

    // Otherwise, reuse any still-active session with the same fingerprint
    const reusable = await findReusableSession(info.fingerprint);
    if (reusable) {
      await refreshSession(reusable.session_id, now, expiresAt);
      return res.json({ success: true, session_id: reusable.session_id, expires_at: expiresAt.toISOString(), reused: true });
    }

    // Fall back to the most recent active session from the same public IP.
    // Skips private/local IPs so local testing still distinguishes browsers,
    // and skips real fingerprint traffic on private hosts.
    const ip = getClientIp(req);
    if (!isPrivateIp(ip) || !info.fingerprint) {
      const reusableByIp = await findReusableSessionByIp(ip);
      if (reusableByIp) {
        await refreshSession(reusableByIp.session_id, now, expiresAt);
        return res.json({ success: true, session_id: reusableByIp.session_id, expires_at: expiresAt.toISOString(), reused: true });
      }
    }

    const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    const sessionRec = {
      session_id: sessionId,
      created_at: now,
      expires_at: expiresAt,
      last_activity: now,
      downloads: 0,
      plays: 0,
      save_path: null
    };

    sessions.set(sessionId, sessionRec);
    userStats.set(sessionId, { downloads: 0, plays: 0, startTime: now.getTime() });

    if (sessionsCollection) {
      try {
        await sessionsCollection.insertOne(sessionRec);
      } catch (e) {
        if (e.code !== 11000) console.error('[SESS] Insert error:', e.message);
      }
    }

    // Record visit (fingerprint + device/browser/OS + location)
    const location = await geoLookup(ip);
    const userAgent = info.userAgent;
    const visitDoc = {
      visit_id: sessionId,
      session_id: sessionId,
      fingerprint: info.fingerprint,
      device_type: info.device || detectDevice(userAgent),
      browser: info.browser || detectBrowser(userAgent),
      os: info.os || detectOS(userAgent),
      user_agent: (userAgent || '').slice(0, 300),
      screen: info.screen,
      language: info.language,
      languages: info.languages,
      timezone: info.timezone,
      platform: info.platform,
      referrer: info.referrer || req.headers['referer'] || req.headers['referrer'] || '',
      page: info.page || (req.headers['x-requested-with'] ? '' : ''),
      ip,
      location: location || null,
      visit_count: 1,
      first_seen: now,
      last_seen: now,
      created_at: now
    };
    await recordVisit(visitDoc);
    invalidateStats();

    res.json({ success: true, session_id: sessionId, expires_at: expiresAt.toISOString() });
  } catch (err) {
    console.error('[SESS] Create session error:', err.message);
    res.json({ success: false, message: 'Failed to create session: ' + err.message });
  }
};

app.get('/api/session', createSessionHandler);
app.post('/api/session', createSessionHandler);

// Heartbeat - keeps session alive while the user is online on the site
app.post('/api/session/heartbeat', async (req, res) => {
  const { session_id } = parseJSONBody(req);
  if (!session_id) {
    return res.json({ success: false, message: 'session_id required' });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);

  let found = false;
  const mem = sessions.get(session_id);
  if (mem) {
    mem.last_activity = now;
    mem.expires_at = expiresAt;
    found = true;
  }

  if (sessionsCollection) {
    try {
      const updateRes = await sessionsCollection.updateOne(
        { session_id },
        { $set: { last_activity: now, expires_at: expiresAt } }
      );
      if (updateRes.matchedCount > 0) found = true;
    } catch (e) {
      console.error('[SESS] Heartbeat error:', e.message);
    }
  }

  try {
    if (visitsCollection) {
      await visitsCollection.updateOne(
        { session_id },
        { $set: { last_seen: now } }
      );
    }
  } catch (e) {}

  res.json({ success: found, session_id, expires_at: expiresAt.toISOString() });
});

// Get Downloads - now proxies to Python backend
// (removed old endpoint that was returning empty array)

// Admin Stats (public - for showing user count & visitor count)
app.get('/api/admin/stats', async (req, res) => {
  try {
    let data = statsCache.data;
    if (!data || Date.now() - statsCache.ts > 30000) {
      data = await computeStats();
      statsCache = { ts: Date.now(), data };
    }
    res.json({ success: true, stats: data });
  } catch (err) {
    res.json({
      success: false,
      message: 'Failed to fetch stats: ' + err.message
    });
  }
});

// Admin - Visitor details (fingerprint, device, browser, location, etc.)
app.get('/api/admin/visits', verifyAdminToken, async (req, res) => {
  try {
    if (!visitsCollection) {
      return res.json({ success: false, message: 'Visits collection not available' });
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const visits = await visitsCollection
      .find({})
      .sort({ last_seen: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const cleanVisits = visits.map(v => {
      const { _id, ...rest } = v;
      return { id: String(_id), ...rest };
    });

    const deviceBreakdown = (await visitsCollection.aggregate([
      { $group: { _id: '$device_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()).map(d => ({ device: d._id || 'Unknown', count: d.count }));

    const browserBreakdown = (await visitsCollection.aggregate([
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()).map(b => ({ browser: b._id || 'Unknown', count: b.count }));

    let totalVisits = 0;
    let todayVisits = 0;
    let activeUsers = 0;
    try {
      const totalDoc = await visitCountersCollection.findOne({ _id: 'total' });
      totalVisits = totalDoc ? (totalDoc.count || 0) : 0;
      const todayDoc = await visitCountersCollection.findOne({ _id: toDateKey(new Date()) });
      todayVisits = todayDoc ? (todayDoc.count || 0) : 0;
      const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);
      activeUsers = await sessionsCollection.countDocuments({ last_activity: { $gt: cutoff } });
    } catch (e) {}

    res.json({
      success: true,
      visits: cleanVisits,
      totalVisits,
      todayVisits,
      activeUsers,
      deviceBreakdown,
      browserBreakdown,
      page,
      limit
    });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch visits: ' + err.message });
  }
});

// Logout / Kill Session - also cleans up all related data
app.post('/api/logout', async (req, res) => {
  const { session_id } = parseJSONBody(req);
  if (!session_id) {
    return res.json({ success: false, message: 'session_id required' });
  }
  sessions.delete(session_id);
  userStats.delete(session_id);
  await deleteSessionData(session_id);
  invalidateStats();
  res.json({ success: true, message: 'Session terminated and data cleaned up' });
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
    const fs = require('fs');
    const fsPromises = fs.promises;

    // Query MongoDB directly to get download info
    const downloadsCollection = db.collection('downloads');
    const download = await downloadsCollection.findOne({ download_id });

    if (!download) {
      return res.status(404).json({ success: false, message: 'Download not found' });
    }

    if (download.status !== 'completed') {
      return res.status(400).json({ success: false, message: `Download not completed: ${download.status}` });
    }

    // Helper function to sanitize filename for HTTP headers (remove special chars)
    const sanitizeFilename = (filename) => {
      return filename
        .replace(/[^\w\s.-]/g, '_')  // Replace special chars with underscore
        .replace(/\s+/g, '_')         // Replace spaces with underscore
        .replace(/_+/g, '_')          // Collapse multiple underscores
        .substring(0, 255);           // Limit to 255 chars
    };

    // Priority 1: Try to serve from local file if it exists (fastest)
    if (download.filename && fs.existsSync(download.filename)) {
      try {
        console.log(`[DOWNLOAD] Serving from local: ${download_id}`);
        const fileBuffer = await fsPromises.readFile(download.filename);
        res.set('Content-Type', 'video/mp4');
        const filename = sanitizeFilename(require('path').basename(download.filename));
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        res.set('Content-Length', fileBuffer.length);
        return res.send(fileBuffer);
      } catch (err) {
        console.warn(`[DOWNLOAD] Local file read failed, falling back: ${err.message}`);
      }
    }

    // Priority 2: Stream from Cloudinary if URL is available
    if (download.file_url) {
      console.log(`[DOWNLOAD] Streaming from Cloudinary: ${download_id}`);
      const response = await fetch(download.file_url);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length > 0) {
          const rawFilename = download.filename ? require('path').basename(download.filename) : `download-${download_id}.mp4`;
          const filename = sanitizeFilename(rawFilename);
          res.set('Content-Type', 'video/mp4');
          res.set('Content-Disposition', `attachment; filename="${filename}"`);
          res.set('Content-Length', buffer.length);
          return res.send(buffer);
        }
      }
    }

    // No file available anywhere
    return res.status(404).json({
      success: false,
      message: 'Video file no longer available. Please re-download from the original source.'
    });

  } catch (err) {
    console.error('Auto-download error:', err.message);
    res.status(500).json({ success: false, message: `Auto-download failed: ${err.message}` });
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
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
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

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Start periodic cleanup of expired sessions (Cloudinary + MongoDB)
    if (process.env.ENABLE_AUTO_CLEANUP !== 'false') {
      setInterval(() => {
        cleanupExpiredSessions().catch(e => console.error('[CLEANUP] worker error:', e.message));
      }, CLEANUP_INTERVAL_MS);
      console.log(`[CLEANUP] Auto-cleanup enabled - running every ${Math.round(CLEANUP_INTERVAL_MS / 1000)}s`);
    }

    // Start Express server - listen on 0.0.0.0 for production (Render, etc.)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✅ SPVB Platform Server running successfully`);
      console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
      console.log(`🔑 API Base: http://0.0.0.0:${PORT}/api`);
      console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
      console.log(`📦 Database: MongoDB (spvb-downloader)`);
      console.log(`💾 Collections: games, movies, downloads, sessions, visits`);
      console.log(`\n=== SERVER READY ===\n`);
    });
  } catch (err) {
    console.error('[ERROR] Failed to start server:', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer, cleanupExpiredSessions, deleteSessionData, computeStats, createSessionHandler };
