@echo off
REM SPVB Local Development Startup Script for Windows
REM Usage: start-local.bat

echo.
echo ===================================================
echo 🚀 Starting SPVB Development Environment...
echo ===================================================
echo.

REM Check if .env files exist
if not exist ".env" (
    echo ❌ .env file not found!
    echo Please create .env in root directory
    pause
    exit /b 1
)

if not exist "frontend\.env" (
    echo ❌ frontend\.env file not found!
    echo Please create frontend\.env file
    pause
    exit /b 1
)

REM Kill any existing processes on ports (Windows)
echo 🧹 Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1406') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1404') do taskkill /PID %%a /F 2>nul
timeout /t 1 /nobreak

REM Start backend server
echo.
echo 📦 Starting Backend Server on port 1406...
start "SPVB Backend" cmd /k "node server.js"
timeout /t 3 /nobreak

REM Start frontend server
echo ⚛️  Starting Frontend Server on port 1404...
start "SPVB Frontend" cmd /k "cd frontend && set PORT=1404 && npm start"

echo.
echo ===================================================
echo ✅ SPVB Development Environment Started!
echo ===================================================
echo.
echo 📍 Backend:  http://localhost:1406
echo 📍 Frontend: http://localhost:1404
echo.
echo 🔍 Check the opened terminal windows for logs
echo 🛑 Close terminal windows to stop servers
echo.
pause
