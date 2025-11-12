@echo off
echo ========================================
echo Starting myVibe Frontend (Vite)
echo ========================================
echo.

echo Installing dependencies if needed...
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
)

echo Starting Vite dev server on port 3000...
npm run dev

pause

