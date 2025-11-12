# 🚀 빠른 시작 가이드

백엔드와 프론트엔드를 빠르게 실행하는 방법입니다.

## 📋 사전 준비

### 1. 백엔드 환경 변수 설정

`jujuclub/.env.gateway` 파일을 생성하고 아래 내용을 채워주세요:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Groq
GROQ_API_KEY=your_groq_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Server
PORT=8080
```

### 2. 의존성 설치

```bash
# 프론트엔드 의존성 설치
npm install

# 백엔드 의존성 설치
cd jujuclub/services/gateway
npm install
cd ../../..
```

## 🎯 실행 방법

### 방법 1: 원클릭 실행 (Windows)

```batch
start-all.bat
```

이 스크립트가 백엔드와 프론트엔드를 동시에 실행합니다.

### 방법 2: npm 스크립트 사용

```bash
npm run start:all
```

### 방법 3: 개별 실행

**터미널 1 - 백엔드:**
```bash
npm run backend
# 또는
start-backend.bat
```

**터미널 2 - 프론트엔드:**
```bash
npm run dev
# 또는
start-frontend.bat
```

## ✅ 확인

- **프론트엔드**: http://localhost:3000
- **백엔드**: http://localhost:8080
- **백엔드 헬스체크**: http://localhost:8080/health

## 🐛 문제 해결

### 백엔드가 시작되지 않는 경우

1. `.env.gateway` 파일이 `jujuclub/` 디렉토리에 있는지 확인
2. 모든 API 키가 올바르게 설정되었는지 확인
3. 포트 8080이 사용 가능한지 확인

### 프론트엔드에서 Mock 응답만 나오는 경우

1. 백엔드가 실행 중인지 확인 (http://localhost:8080/health)
2. 브라우저 개발자 도구에서 네트워크 요청 확인
3. 콘솔 로그에서 에러 메시지 확인

## 📚 더 자세한 정보

[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) 파일을 참고하세요.

