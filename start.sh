#!/bin/bash

# Load .env from config directory
export $(cat config/.env | xargs)

echo "🎮 Starting SPVB Platform - Local Development"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  npm install
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

echo ""
echo "🚀 Starting services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start backend in background
echo "🔧 Backend: Starting on http://localhost:1406"
node server/server.js &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Start frontend
echo "⚛️  Frontend: Starting on http://localhost:1404"
cd frontend && PORT=1404 npm start

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT
