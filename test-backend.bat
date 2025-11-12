@echo off
echo ========================================
echo 백엔드 단독 테스트
echo ========================================
echo.

echo 환경 변수 파일 확인...
if exist "jujuclub\.env.gateway" (
    echo ✓ jujuclub\.env.gateway 파일 존재
) else (
    echo ✗ jujuclub\.env.gateway 파일 없음!
    pause
    exit /b 1
)

echo.
echo 백엔드 서버 시작 중...
echo 포트: 8080
echo.
echo 서버가 시작되면 브라우저에서 테스트:
echo   http://localhost:8080/health
echo.
echo Ctrl+C를 눌러 서버를 중지할 수 있습니다.
echo ========================================
echo.

node --env-file=jujuclub/.env.gateway jujuclub/services/gateway/src/server.js

pause

