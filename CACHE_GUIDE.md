# 📦 채팅 캐시 시스템 가이드

## 🎯 개요

채팅 데이터를 **2단계 캐시 시스템**으로 저장하여, 페이지 새로고침 시에도 대화 내역이 유지됩니다.

---

## 🏗️ 아키텍처

### 1️⃣ **프론트엔드 캐시 (localStorage)**
- **저장 위치**: 브라우저 localStorage
- **만료 시간**: 24시간
- **용도**: 빠른 로드, 오프라인 접근
- **키 형식**: `chat_history_${stockName}`

### 2️⃣ **백엔드 캐시 (Upstash Redis)**
- **저장 위치**: Upstash Redis (클라우드)
- **만료 시간**: 7일
- **용도**: 기기 간 동기화, 장기 보관
- **키 형식**: `chat:session:${sessionId}:${ticker}`

---

## 📂 파일 구조

```
src/
  utils/
    chatCache.js          # 프론트엔드 캐시 유틸리티
  pages/
    ChatPage.jsx          # 캐시 통합 완료

server/
  server.js               # 백엔드 Redis 캐시 로직
```

---

## 🔧 기능

### ✅ 프론트엔드 (자동)

#### 1. 채팅 히스토리 자동 저장
```javascript
// ChatPage.jsx
useEffect(() => {
  if (messages.length > 1) {
    saveChatHistory(stockName, messages)
  }
}, [messages, stockName])
```

#### 2. 채팅 히스토리 자동 로드
```javascript
useEffect(() => {
  const cachedMessages = loadChatHistory(stockName)
  if (cachedMessages) {
    setMessages(cachedMessages)
  }
}, [stockName])
```

#### 3. 캐시 관리 함수
```javascript
import { 
  saveChatHistory,      // 저장
  loadChatHistory,      // 로드
  clearChatHistory,     // 특정 종목 삭제
  clearAllChatHistory,  // 전체 삭제
  getCacheStats         // 통계
} from '../utils/chatCache'
```

---

### ✅ 백엔드 API

#### 1. 채팅 히스토리 저장
```http
POST /api/chat/history
Content-Type: application/json

{
  "sessionId": "user123",
  "ticker": "005930.KS",
  "messages": [...]
}
```

**Response:**
```json
{
  "ok": true,
  "saved": 15,
  "sessionId": "user123",
  "ticker": "005930.KS"
}
```

#### 2. 채팅 히스토리 로드
```http
GET /api/chat/history/:sessionId/:ticker
```

**Response:**
```json
{
  "ok": true,
  "messages": [...],
  "sessionId": "user123",
  "ticker": "005930.KS",
  "count": 15
}
```

---

## 🧪 테스트

### 1. 프론트엔드 캐시 테스트

#### a. 브라우저 콘솔에서 확인
```javascript
// 캐시 통계 확인
import { getCacheStats } from './src/utils/chatCache'
console.log(getCacheStats())

// 특정 종목 캐시 확인
localStorage.getItem('chat_history_삼성전자')
```

#### b. 실제 테스트
1. ChatPage에서 대화 진행
2. 브라우저 새로고침 (F5)
3. ✅ 대화 내역이 그대로 유지됨
4. 24시간 후 자동 삭제

### 2. 백엔드 캐시 테스트

#### a. 채팅 저장 테스트
```bash
curl -X POST http://localhost:8080/chat/history \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_user",
    "ticker": "005930.KS",
    "messages": [
      {"id": 1, "type": "user", "content": "안녕"},
      {"id": 2, "type": "bot", "content": "안녕하세요"}
    ]
  }'
```

#### b. 채팅 로드 테스트
```bash
curl http://localhost:8080/chat/history/test_user/005930.KS
```

#### c. Redis 직접 확인
```bash
# Redis CLI 접속 후
GET chat:session:test_user:005930.KS
```

---

## 📊 데이터 구조

### localStorage 구조
```json
{
  "stockName": "삼성전자",
  "messages": [
    {
      "id": 1,
      "type": "date",
      "text": "2024년 11월 12일 화요일"
    },
    {
      "id": 2,
      "type": "user",
      "content": "주가 전망은?",
      "time": "14:32"
    },
    {
      "id": 3,
      "type": "bot",
      "sender": "삼성전자 키우Me",
      "content": ["현재 주가는..."],
      "timestamp": "11/12 14:32 기준"
    }
  ],
  "timestamp": "2024-11-12T14:32:00.000Z",
  "version": "1.0"
}
```

### Redis 구조 (동일)
```json
{
  "sessionId": "user123",
  "ticker": "005930.KS",
  "messages": [...],
  "updatedAt": "2024-11-12T14:32:00.000Z"
}
```

---

## 🔒 보안 & 개인정보

### ✅ 안전한 부분
- **메시지 내용**: 투자 질문/답변만 포함
- **로컬 저장**: 사용자 브라우저에만 저장
- **만료 정책**: 자동 삭제 (24시간/7일)

### ⚠️ 주의사항
- **개인정보 미포함**: 이름, 계좌번호 등 입력 금지
- **공용 PC**: 사용 후 캐시 삭제 권장
- **Redis 접근**: 서버 관리자만 접근 가능

---

## 🛠️ 관리자 기능

### 캐시 전체 삭제 (프론트)
```javascript
// 브라우저 콘솔
import { clearAllChatHistory } from './src/utils/chatCache'
clearAllChatHistory()
```

### Redis 캐시 확인 (백엔드)
```bash
# 모든 채팅 세션 키 조회
redis-cli KEYS "chat:session:*"

# 특정 세션 삭제
redis-cli DEL "chat:session:user123:005930.KS"

# 모든 채팅 세션 삭제
redis-cli KEYS "chat:session:*" | xargs redis-cli DEL
```

---

## 📈 성능 최적화

### 현재 구현
- ✅ localStorage: **즉시 로드** (< 10ms)
- ✅ Redis: **7일 보관** (장기 복구)
- ✅ 자동 압축: JSON.stringify
- ✅ 만료 정책: TTL 자동 삭제

### 향후 개선안
- [ ] IndexedDB 전환 (대용량 지원)
- [ ] 압축 알고리즘 (LZ-string)
- [ ] 차등 저장 (마지막 N개만)
- [ ] 백그라운드 동기화

---

## 🐛 트러블슈팅

### Q1. 캐시가 로드되지 않아요
```javascript
// 1. localStorage 확인
console.log(localStorage.getItem('chat_history_삼성전자'))

// 2. 만료 확인 (24시간 경과?)
const data = JSON.parse(localStorage.getItem('chat_history_삼성전자'))
console.log('저장 시간:', data.timestamp)

// 3. 강제 삭제 후 재시도
localStorage.removeItem('chat_history_삼성전자')
```

### Q2. Redis 연결 오류
```bash
# 1. 환경변수 확인
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# 2. Redis 테스트
curl http://localhost:8080/diag-redis

# 3. 로그 확인
npm run start:backend
# [Cache] 채팅 세션 저장: ... 메시지 확인
```

### Q3. 메시지가 중복 저장돼요
- **원인**: useEffect 의존성 배열 문제
- **해결**: 이미 수정됨 (messages, stockName만 의존)

---

## 📝 로그 확인

### 프론트엔드 (브라우저 콘솔)
```
[Cache] 채팅 히스토리 저장: 삼성전자, 5개 메시지
[ChatPage] 캐시에서 5개 메시지 로드
[Cache] 만료된 캐시 (25.3시간 경과): 삼성전자
```

### 백엔드 (터미널)
```
[Cache] 채팅 세션 저장: user123, 005930.KS, 5개 메시지
[Cache] 채팅 세션 로드: user123, 005930.KS, 5개 메시지
```

---

## 🎉 완료!

- ✅ **프론트엔드**: localStorage 자동 저장/로드
- ✅ **백엔드**: Redis 세션 저장/로드 API
- ✅ **만료 정책**: 24시간 / 7일
- ✅ **자동 동작**: 별도 설정 불필요

이제 페이지 새로고침해도 채팅 내역이 유지됩니다! 🚀

