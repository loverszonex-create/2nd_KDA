@echo off
chcp 65001 >nul
echo ========================================
echo myVibe 프로젝트 초기 설정
echo ========================================
echo.

echo [1/4] 프론트엔드 의존성 설치 중...
echo.
call npm install
if errorlevel 1 (
    echo 오류: 프론트엔드 의존성 설치 실패
    pause
    exit /b 1
)

echo.
echo [2/4] 백엔드 의존성 설치 중...
echo.
cd jujuclub\services\gateway
call npm install
if errorlevel 1 (
    echo 오류: 백엔드 의존성 설치 실패
    cd ..\..\..
    pause
    exit /b 1
)
cd ..\..\..

echo.
echo [3/4] 환경 변수 파일 확인 중...
echo.
if exist "jujuclub\.env.gateway" (
    echo ✓ 환경 변수 파일이 이미 존재합니다.
) else (
    echo ⚠ jujuclub\.env.gateway 파일을 생성해야 합니다.
    echo.
    echo jujuclub\.env.gateway.example 파일을 참고하여
    echo jujuclub\.env.gateway 파일을 생성하고 API 키를 입력하세요.
    echo.
    echo 필요한 API 키:
    echo   - Supabase URL & Key
    echo   - OpenAI API Key
    echo   - Groq API Key
    echo   - Upstash Redis URL & Token
    echo.
)

echo.
echo [4/4] 설정 완료!
echo.
echo ========================================
echo 다음 단계:
echo ========================================
echo.
echo 1. jujuclub\.env.gateway 파일 생성 및 API 키 입력
echo    (파일이 없는 경우)
echo.
echo 2. 서버 실행:
echo    방법 1: start-all.bat 더블클릭
echo    방법 2: npm run start:all 실행
echo.
echo 3. 브라우저에서 접속:
echo    프론트엔드: http://localhost:3000
echo    백엔드: http://localhost:8080
echo.
echo 자세한 내용은 setup-guide.txt를 참고하세요.
echo ========================================
echo.

pause

