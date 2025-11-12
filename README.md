# 키우Me - 주식 행동데이터 챗봇 어플리케이션

주식 투자자를 위한 AI 챗봇 기반 행동 분석 및 추천 플랫폼입니다.

## 주요 기능

### 1. 챗 인터페이스 (Chat Interface)
- 종목별 AI 챗봇과 실시간 대화
- 주가 정보, 뉴스, 분석 정보 제공
- 추천 질문 및 액션 버튼
- 생성형 AI 기반 답변

### 2. 홈/대화 리스트 (Home/Chat List)
- 최근 대화 목록
- 북마크 기능
- 종목별 대화방 관리
- 빠른 검색 기능

### 3. 주식 대시보드 (Stock Dashboard)
- 실시간 주가 차트 (Line Chart)
- 거래량 분석 (Bar Chart)
- 내 포트폴리오 현황
- 수익률 통계
- AI 인사이트 제공

### 4. 피드백 & 행동 추천 패널 (Feedback & Action Panel)
- AI 기반 투자 피드백
- 개인화된 행동 추천
- 투자 행동 패턴 분석
- 신뢰도 기반 추천 시스템

### 5. 주간 리포트 (Weekly Report)
- 주간 수익 현황
- 일별 거래 통계
- 포트폴리오 구성 분석
- 성과 및 개선 영역
- AI 코치 추천
- 다음 주 목표 설정

## 기술 스택

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v6
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Framework**: Express.js
- **AI/LLM**: OpenAI, Groq (Llama 3.1)
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **APIs**: 
  - 한국투자증권 (KIS) API
  - KRX (한국거래소) API
  - CNN Fear & Greed Index
  - ADR 데이터 크롤링

## 🚀 빠른 시작

### 필수 사항
1. Node.js 18+ 설치
2. API 키 준비:
   - Supabase (https://supabase.com)
   - OpenAI (https://platform.openai.com)
   - Groq (https://console.groq.com)
   - Upstash Redis (https://upstash.com)

### 설치 및 실행

#### 1️⃣ 의존성 설치
```bash
# 프론트엔드 의존성
npm install

# 백엔드 의존성
cd jujuclub/services/gateway
npm install
cd ../../..
```

#### 2️⃣ 환경 변수 설정
`jujuclub/.env.gateway` 파일을 생성하고 API 키를 설정하세요:
```bash
# 예시는 jujuclub/.env.gateway.example 참고
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_key
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
PORT=8080
```

#### 3️⃣ 서버 실행

**방법 1: 원클릭 실행 (Windows)**
```bash
start-all.bat
```

**방법 2: npm 스크립트**
```bash
npm run start:all
```

**방법 3: 개별 실행**
```bash
# 터미널 1 - 백엔드
npm run backend

# 터미널 2 - 프론트엔드
npm run dev
```

애플리케이션 접속:
- **프론트엔드**: http://localhost:3000
- **백엔드**: http://localhost:8080

### 3. 프로덕션 빌드
```bash
npm run build
```

### 4. 프로덕션 미리보기
```bash
npm run preview
```

## 프로젝트 구조

```
myVibe/
├── src/                          # 프론트엔드
│   ├── components/               # 재사용 가능한 컴포넌트
│   │   ├── FeedbackPanel.jsx
│   │   └── LevelDebugPanel.jsx
│   ├── pages/                    # 페이지 컴포넌트
│   │   ├── HomePage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── WeeklyReportPage.jsx
│   │   ├── BookmarkPage.jsx
│   │   └── ProfilePage.jsx
│   ├── utils/                    # 유틸리티 함수
│   │   ├── chatAPI.js           # 백엔드 API 연동 ⭐
│   │   ├── levelSystem.js
│   │   ├── bookmarkUtils.js
│   │   └── stockAPI.js
│   ├── lib/
│   │   └── supabase.js          # Supabase 클라이언트
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── jujuclub/                     # 백엔드
│   ├── services/
│   │   ├── gateway/             # 메인 API 서버
│   │   │   ├── src/
│   │   │   │   ├── server.js   # Express 서버 ⭐
│   │   │   │   ├── kis.js      # KIS API 연동
│   │   │   │   ├── krx.js      # KRX API 연동
│   │   │   │   ├── cnn.js      # Fear & Greed Index
│   │   │   │   └── ...
│   │   │   └── package.json
│   │   └── ws-consumer/         # WebSocket 소비자
│   └── shared/                   # 공유 모듈
├── public/                       # 정적 파일
├── package.json                  # 프론트엔드 의존성
├── vite.config.js               # Vite 프록시 설정 ⭐
├── INTEGRATION_GUIDE.md         # 통합 가이드 ⭐
├── QUICK_START.md               # 빠른 시작 ⭐
└── start-all.bat                # 원클릭 실행 스크립트 ⭐
```

## 페이지 라우팅

- `/` - 홈페이지 (대화 리스트)
- `/chat/:stockName` - 채팅 페이지
- `/dashboard` - 주식 대시보드
- `/weekly-report` - 주간 리포트

## 디자인 특징

- 모바일 퍼스트 디자인 (너비: 448px)
- 흰색 기반 깔끔한 UI
- 그라데이션 액센트
- 직관적인 네비게이션
- 반응형 차트 및 그래프

## 커스텀 컬러

```javascript
{
  'color-white-solid': '#FFFFFF',
  'color-blue-59': '#3B5998',
  'color-blue-82': '#CBD5E1',
  'color-grey-97': '#F7F7F7',
  'color-grey-98': '#FAFAFA',
  'color-azure-11': '#1E3A8A',
  'color-azure-27': '#1E40AF',
  'color-azure-64': '#60A5FA',
}
```

## 🤖 AI 챗봇 아키텍처

### 백엔드 통합 완료 ✅

백엔드 API와 프론트엔드가 SSE (Server-Sent Events) 스트리밍 방식으로 연동되었습니다.

### API 흐름
```
사용자 질문
    ↓
React Frontend (ChatPage.jsx)
    ↓
chatAPI.js → /api/chat
    ↓ (Vite 프록시)
Express Backend (server.js)
    ↓
├─ Supabase (RAG 문서 검색)
├─ KIS API (실시간 주가)
├─ OpenAI (임베딩)
└─ Groq LLM (Llama 3.1)
    ↓
SSE 스트리밍 응답
    ↓
실시간 UI 업데이트
```

### 주요 기능
- **실시간 스트리밍**: SSE를 통한 답변 실시간 표시
- **하이브리드 검색**: Vector + FTS 검색으로 관련 문서 찾기
- **실시간 주가**: KIS API 연동으로 실시간 시세 제공
- **감정 분석**: 주가 변동에 따른 AI 페르소나 mood 변화
- **뉴스 분석**: 삼성전자 관련 최신 뉴스 자동 필터링
- **폴백 시스템**: 백엔드 오류 시 Mock 데이터로 자동 전환

### Mock 데이터 (폴백 전용)
백엔드 연결이 실패할 경우에만 사용되는 Mock 응답:
- "키움증권 의견을 알려 줘"
- "AI 버블론은 뭐였는데?"
- "최근 뉴스 요약해줘"
- "경쟁사와 비교해줘"
- 기타 등등

자세한 내용은 `src/utils/chatAPI.js` 참고.

## 📚 추가 문서

- **[QUICK_START.md](./QUICK_START.md)** - 빠른 시작 가이드
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - 백엔드-프론트엔드 통합 가이드
- **[KIS_API_SETUP.md](./KIS_API_SETUP.md)** - 한국투자증권 API 설정
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Supabase 설정
- **[LEVEL_SYSTEM_GUIDE.md](./LEVEL_SYSTEM_GUIDE.md)** - 레벨 시스템 가이드
- **[DEMO_GUIDE.md](./DEMO_GUIDE.md)** - 데모 시연 가이드

## ✅ 구현 완료 사항

- ✅ **백엔드-프론트엔드 통합** (SSE 스트리밍)
- ✅ **실시간 AI 챗봇** (Groq Llama 3.1)
- ✅ **RAG 시스템** (Supabase + OpenAI 임베딩)
- ✅ **실시간 주가 연동** (KIS API)
- ✅ **뉴스 분석** (자동 필터링 및 요약)
- ✅ **감정 기반 페르소나** (Mood 시스템)
- ✅ **북마크 시스템**
- ✅ **레벨 시스템** (대화 기반 성장)
- ✅ **주간 리포트**
- ✅ **대시보드 차트**

## 🚧 향후 개선 사항

- 사용자 인증 시스템 (Supabase Auth)
- 대화 히스토리 클라우드 동기화
- 푸시 알림 기능
- 소셜 공유 기능
- 다크 모드 지원
- 음성 입력 기능
- 차트 이미지 생성 및 공유
- WebSocket 실시간 시세 업데이트

## 라이선스

Private - myVibe Project

## 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.
