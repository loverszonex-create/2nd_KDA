# 🔧 환경변수 설정 가이드

## 📝 `.env` 파일에 추가해야 할 항목

채팅 캐시 시스템을 사용하려면 Supabase 환경변수가 필요합니다.

### 프론트엔드 환경변수 (`.env` 파일)

```bash
# Supabase 설정 (채팅 히스토리 저장용)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# API Base URL
VITE_API_BASE_URL=/api
```

### 백엔드 환경변수 (`.env` 파일 - 이미 있을 수 있음)

```bash
# Supabase (백엔드용)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# 기존 환경변수들 (이미 설정되어 있음)
OPENAI_API_KEY=...
GROQ_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
PORT=8080
```

---

## 🗄️ Supabase 테이블 생성

### 1. Supabase 대시보드 접속
https://app.supabase.com/

### 2. SQL Editor 열기
좌측 메뉴 → SQL Editor

### 3. SQL 실행
`supabase_chat_history_schema.sql` 파일의 내용을 복사해서 실행:

```sql
-- 채팅 히스토리 테이블 생성
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chat_history_unique UNIQUE (session_id, ticker)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_chat_history_session_ticker 
ON chat_history(session_id, ticker);

CREATE INDEX IF NOT EXISTS idx_chat_history_updated_at 
ON chat_history(updated_at DESC);

-- RLS 활성화
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능
CREATE POLICY "Enable read access for all users" 
ON chat_history FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" 
ON chat_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" 
ON chat_history FOR UPDATE USING (true);
```

### 4. 테이블 확인
좌측 메뉴 → Table Editor → `chat_history` 테이블이 생성되었는지 확인

---

## 🔑 Supabase API Key 찾기

### 1. Project Settings
Supabase 대시보드 → 좌측 하단 톱니바퀴 아이콘

### 2. API 탭
Settings → API

### 3. 필요한 값 복사
- **Project URL**: `https://xxxxx.supabase.co` → `VITE_SUPABASE_URL`
- **anon / public key**: `eyJ...` → `VITE_SUPABASE_ANON_KEY`
- **service_role key**: `eyJ...` → `SUPABASE_SERVICE_ROLE_KEY` (백엔드용)

---

## ✅ 설정 확인

### 1. 프론트엔드 확인
```bash
npm run dev
```
브라우저 콘솔에서:
```
[Cache] ✅ Supabase 클라이언트 초기화 완료
```

### 2. 백엔드 확인
```bash
npm run start:backend
```
터미널에서 에러 없이 시작되는지 확인

### 3. 채팅 테스트
1. ChatPage에서 AI와 대화
2. 브라우저 콘솔 확인:
```
[Cache] 💾 localStorage 저장: 삼성전자, 3개 메시지
[Cache] ✅ Supabase 저장 완료: 삼성전자
```

3. 페이지 새로고침 (F5)
4. 대화가 복원되는지 확인:
```
[Cache] 📦 localStorage 로드: 삼성전자, 3개 메시지
```

---

## 🐛 트러블슈팅

### ❌ `Supabase 환경변수 없음`
→ `.env` 파일에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가

### ❌ `Supabase 저장 실패: relation "chat_history" does not exist`
→ SQL 스크립트 실행해서 테이블 생성

### ❌ `Supabase 저장 실패: new row violates row-level security policy`
→ RLS 정책 확인 (위 SQL 스크립트에 포함됨)

### ✅ localStorage만 사용
Supabase 설정 없이도 localStorage는 작동합니다!
- 새로고침 시 대화 유지 (24시간)
- Supabase는 선택적 백업 (7일)

---

## 📊 캐시 우선순위

```
1. localStorage (최우선)
   ↓ (없으면)
2. Supabase (백업)
   ↓ (없으면)
3. 기본 메시지 (초기 상태)
```

완료! 🎉

