const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 1406;

// Middleware
app.use(cors());
app.use(express.json());

// Serve React frontend build (home page + SPA)
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// SPA fallback - the React app handles all routes (including /play/gta-vc)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎮 SPVB Platform Server running at http://localhost:${PORT}`);
  console.log(`📍 Home: http://localhost:${PORT}`);
  console.log(`🕹️  Game: http://localhost:${PORT}/play/gta-vc`);
  console.log(`The games page shows "Coming Soon" unless REACT_APP_GAME_URL is set.\n`);
});
