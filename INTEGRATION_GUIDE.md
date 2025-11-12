# 백엔드-프론트엔드 통합 가이드

## 🎯 개요

이 프로젝트는 **React + Vite 프론트엔드**와 **Express.js 백엔드**가 통합된 주식 AI 챗봇 애플리케이션입니다.

### 프로젝트 구조

```
myVibe/
├── src/                      # 프론트엔드 (React + Vite)
│   ├── components/
│   ├── pages/
│   └── utils/
│       └── chatAPI.js        # 백엔드 API 연동
├── jujuclub/                 # 백엔드
│   └── services/
│       └── gateway/          # Express 서버
│           └── src/
│               └── server.js # 메인 서버
├── package.json              # 프론트엔드 의존성
└── vite.config.js           # Vite 프록시 설정
```

---

## 🚀 빠른 시작

### 1️⃣ 백엔드 환경 설정

백엔드를 실행하기 위해서는 환경 변수 설정이 필요합니다.

**jujuclub/.env.gateway 파일 생성:**

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Groq
GROQ_API_KEY=your_groq_api_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Server Port
PORT=8080
```

> 📝 각 API 키는 해당 서비스에서 발급받아야 합니다:
> - Supabase: https://supabase.com
> - OpenAI: https://platform.openai.com
> - Groq: https://console.groq.com
> - Upstash Redis: https://upstash.com

### 2️⃣ 의존성 설치

```bash
# 프론트엔드 의존성 설치
npm install

# 백엔드 의존성 설치
cd jujuclub/services/gateway
npm install
cd ../../..
```

### 3️⃣ 서버 실행

#### 옵션 1: 백엔드와 프론트엔드를 동시에 실행 (권장)

```bash
npm run start:all
```

이 명령어는 다음 두 서버를 동시에 실행합니다:
- **백엔드**: http://localhost:8080
- **프론트엔드**: http://localhost:3000

#### 옵션 2: 각각 별도로 실행

**터미널 1 - 백엔드 실행:**
```bash
npm run backend
```

**터미널 2 - 프론트엔드 실행:**
```bash
npm run dev
```

---

## 🔧 API 연동 방식

### Vite 프록시 설정

프론트엔드에서 `/api/*` 경로로 요청하면 자동으로 백엔드 서버(`http://localhost:8080`)로 프록시됩니다.

**vite.config.js:**
```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

### API 호출 흐름

```
프론트엔드 (localhost:3000)
    ↓
GET /api/chat?q=질문&ticker=005930.KS
    ↓ (Vite 프록시)
백엔드 (localhost:8080)
    ↓
GET /chat?q=질문&ticker=005930.KS
    ↓
AI 응답 (SSE 스트리밍)
```

### chatAPI.js 구현

`src/utils/chatAPI.js`에서 백엔드와 SSE 스트리밍 방식으로 통신합니다:

```javascript
export async function getAIResponse(userMessage, stockName, userNickname, onDelta) {
  const ticker = STOCK_NAME_TO_TICKER[stockName] || '005930.KS'
  const url = `/api/chat?q=${encodeURIComponent(userMessage)}&ticker=${ticker}&stream=true`
  
  const response = await fetch(url)
  const reader = response.body.getReader()
  
  // SSE 스트리밍 처리...
}
```

---

## 📡 백엔드 API 엔드포인트

### `/chat` - AI 챗봇 응답

**요청:**
```
GET /chat?q={질문}&ticker={티커}&stream=true
```

**파라미터:**
- `q`: 사용자 질문 (필수)
- `ticker`: 종목 티커 (예: 005930.KS)
- `stream`: SSE 스트리밍 여부 (기본값: true)

**응답 (SSE):**
```
data: {"delta": "텍스트 조각"}

data: {"delta": "추가 텍스트"}

data: {
  "done": true,
  "full": "전체 응답 텍스트",
  "asOf": "2024-11-12T10:30:00",
  "mood": "😄 매우 기쁨",
  "news": {...},
  "macro": {...},
  "visuals": {...}
}
```

### 기타 엔드포인트

- `GET /health` - 서버 상태 확인
- `GET /diag` - 환경 변수 진단
- `GET /diag-redis` - Redis 연결 확인
- `GET /diag-krx` - KRX 데이터 확인
- `GET /diag-adr` - ADR 데이터 확인

---

## 🧪 테스트

### 백엔드 헬스체크

```bash
curl http://localhost:8080/health
```

**예상 응답:**
```json
{"ok": true, "time": "2024-11-12T10:30:00.000Z"}
```

### 챗봇 API 테스트

```bash
curl "http://localhost:8080/chat?q=오늘%20주가는?&ticker=005930.KS&stream=false"
```

### 프론트엔드 테스트

1. 브라우저에서 http://localhost:3000 접속
2. "삼성전자" 종목 선택
3. 챗봇에 질문 입력
4. 실시간 스트리밍 응답 확인

---

## 🐛 문제 해결

### 백엔드 연결 실패

**증상:** 프론트엔드에서 Mock 응답만 표시됨

**원인:**
- 백엔드 서버가 실행되지 않음
- 환경 변수가 설정되지 않음
- 포트 충돌

**해결:**
1. 백엔드 서버 실행 확인: `npm run backend`
2. 환경 변수 확인: `jujuclub/.env.gateway`
3. 포트 확인: `netstat -ano | findstr 8080`

### CORS 오류

**원인:** 백엔드에 CORS 설정이 없음

**해결:** `jujuclub/services/gateway/src/server.js`에 CORS가 이미 설정되어 있습니다:
```javascript
app.use(cors())
```

### API 키 오류

**증상:** 백엔드 로그에 API 오류 메시지

**해결:**
1. `.env.gateway` 파일에 모든 API 키가 올바르게 설정되어 있는지 확인
2. 각 서비스에서 API 키가 유효한지 확인
3. 무료 티어 사용량 제한 확인

---

## 📦 프로덕션 빌드

### 프론트엔드 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

### 백엔드 배포

백엔드는 Node.js 환경에서 실행 가능한 Express 서버입니다.

**Docker를 사용한 배포:**
```bash
cd jujuclub/services/gateway
docker build -t myvibe-backend .
docker run -p 8080:8080 --env-file .env myvibe-backend
```

---

## 🔐 보안 고려사항

1. **환경 변수 관리**
   - `.env.gateway` 파일은 절대 Git에 커밋하지 마세요
   - 프로덕션 환경에서는 환경 변수를 안전하게 관리하세요

2. **API 키 보호**
   - 백엔드에서만 API 키를 사용하세요
   - 프론트엔드에 API 키를 노출하지 마세요

3. **CORS 설정**
   - 프로덕션에서는 특정 도메인만 허용하도록 CORS 설정을 업데이트하세요

---

## 📚 추가 문서

- [DEMO_GUIDE.md](./DEMO_GUIDE.md) - 데모 시연 가이드
- [KIS_API_SETUP.md](./KIS_API_SETUP.md) - 한국투자증권 API 설정
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase 설정
- [LEVEL_SYSTEM_GUIDE.md](./LEVEL_SYSTEM_GUIDE.md) - 레벨 시스템 가이드

---

## 🎉 완료!

이제 백엔드와 프론트엔드가 성공적으로 통합되었습니다! 

질문이나 문제가 있으면 GitHub Issues에 등록해주세요.

