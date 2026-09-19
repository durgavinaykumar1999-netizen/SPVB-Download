@echo off
REM Load environment from config/.env
for /f "tokens=*" %%i in (config\.env) do set %%i

echo.
echo 🎮 Starting SPVB Platform - Local Development
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM Check if node_modules exists
if not exist "node_modules" (
  echo 📦 Installing backend dependencies...
  call npm install
)

if not exist "frontend\node_modules" (
  echo 📦 Installing frontend dependencies...
  cd frontend
  call npm install
  cd ..
)

echo.
echo 🚀 Starting services...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Start backend in new window
echo 🔧 Backend: Starting on http://localhost:1406
start "SPVB Backend" cmd /k "node server\server.js"

REM Wait for backend to start
timeout /t 2 /nobreak

REM Start frontend
echo ⚛️  Frontend: Starting on http://localhost:1404
echo.
cd frontend
set PORT=1404
call npm start
