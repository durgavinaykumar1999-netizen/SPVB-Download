#!/bin/bash

# SPVB Local Development Startup Script
# Usage: ./start-local.sh

echo "🚀 Starting SPVB Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env files exist
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env in root directory"
    exit 1
fi

if [ ! -f "frontend/.env" ]; then
    echo -e "${RED}❌ frontend/.env file not found!${NC}"
    echo "Please create frontend/.env file"
    exit 1
fi

# Kill any existing processes on ports
echo -e "${BLUE}🧹 Cleaning up old processes...${NC}"
lsof -i :1406 -t 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -i :1404 -t 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend server
echo -e "${BLUE}📦 Starting Backend Server...${NC}"
node server.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend PID: $BACKEND_PID${NC}"

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start!${NC}"
    cat /tmp/backend.log
    exit 1
fi

# Start frontend server
echo -e "${BLUE}⚛️  Starting Frontend Server...${NC}"
cd frontend
PORT=1404 npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend PID: $FRONTEND_PID${NC}"
cd ..

# Wait a moment for frontend to compile
sleep 5

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SPVB Development Environment Started!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📍 Backend:  ${NC}http://localhost:1406"
echo -e "${BLUE}📍 Frontend: ${NC}http://localhost:1404"
echo ""
echo -e "${BLUE}🔍 Logs:${NC}"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo -e "${BLUE}🛑 To stop:${NC}"
echo "   Kill PIDs: kill $BACKEND_PID $FRONTEND_PID"
echo "   Or press Ctrl+C"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID

echo -e "${RED}❌ Servers stopped${NC}"
