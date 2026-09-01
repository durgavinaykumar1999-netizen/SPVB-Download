const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 1406;

// Game URL comes from environment variable - never hardcoded.
// Empty/absent => game shows "Coming Soon".
const GAME_URL = process.env.GAME_URL || '';

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint - returns game info
app.get('/api/game/gta-vc', (req, res) => {
  res.json({
    available: !!GAME_URL,
    gameUrl: GAME_URL || null,
    title: 'Grand Theft Auto: Vice City',
    description: 'Play GTA Vice City in your browser',
    type: 'web-game',
    controls: {
      desktop: ['Arrow Keys - Move', 'Space - Action', 'E - Enter Vehicle', 'WASD - Alternative Controls'],
      mobile: ['Touch buttons on screen', 'Swipe gestures', 'Tap to interact']
    }
  });
});

// Game player page
app.get('/play/gta-vc', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game-player.html'));
});

// Serve React frontend build as home page
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// Serve game assets from public directory
app.use('/play', express.static(path.join(__dirname, 'public')));
app.use('/api', express.static(path.join(__dirname, 'public')));

// Home page - serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎮 Unified Platform Server running at http://localhost:${PORT}`);
  console.log(`📍 Home: http://localhost:${PORT}`);
  console.log(`🕹️  Play Game: http://localhost:${PORT}/play/gta-vc`);
  console.log(`📡 API: http://localhost:${PORT}/api/game/gta-vc\n`);
});
