const fs = require('fs');
const path = require('path');

const config = {
  gameUrl: process.env.REACT_APP_GAME_URL || ''
};

const buildDir = path.join(__dirname, '..', 'build');
const configPath = path.join(buildDir, 'config.json');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Write config.json to the build folder
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`✓ Generated config.json with gameUrl: ${config.gameUrl || '(empty)'}`);
