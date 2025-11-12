@echo off
echo ========================================
echo Starting myVibe Backend Server
echo ========================================
echo.

cd jujuclub\services\gateway

echo Checking environment file...
if not exist "..\..\..\.env.gateway" (
    echo ERROR: .env.gateway file not found!
    echo Please create jujuclub/.env.gateway with your API keys
    echo See INTEGRATION_GUIDE.md for details
    pause
    exit /b 1
)

echo Starting server on port 8080...
npm start

pause

