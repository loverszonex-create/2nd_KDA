@echo off
echo ========================================
echo Starting myVibe - Full Stack Application
echo ========================================
echo.
echo This will start:
echo   - Backend (Express) on port 8080
echo   - Frontend (Vite) on port 3000
echo.
echo Press Ctrl+C to stop both servers
echo ========================================
echo.

REM Check if concurrently is installed
npm list concurrently >nul 2>&1
if errorlevel 1 (
    echo Installing concurrently...
    call npm install --save-dev concurrently
)

REM Start both servers
npm run start:all

pause

