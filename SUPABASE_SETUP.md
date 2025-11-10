# Supabase 데이터베이스 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속하여 계정 생성 또는 로그인
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호 설정
4. 리전 선택 (한국은 "Northeast Asia (Seoul)" 권장)
5. 프로젝트 생성 완료 대기

## 2. 데이터베이스 테이블 생성

### Profiles 테이블 생성

Supabase Dashboard의 SQL Editor에서 다음 쿼리를 실행하세요:

```sql
-- profiles 테이블 생성
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT NOT NULL DEFAULT '수익키우미',
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 프로필을 읽을 수 있도록 허용
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (true);

-- 모든 사용자가 자신의 프로필을 수정할 수 있도록 허용
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (true);

-- 프로필 삽입 허용
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- 업데이트 시 updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 테스트용 Mock 데이터 삽입
INSERT INTO profiles (id, nickname, level, experience)
VALUES ('mock-user-id-001', '수익키우미', 1, 0);
```

## 3. 환경 변수 설정

1. Supabase Dashboard에서 Settings > API로 이동
2. 다음 정보를 복사:
   - `Project URL` (VITE_SUPABASE_URL)
   - `anon public` key (VITE_SUPABASE_ANON_KEY)

3. 프로젝트 루트에 `.env` 파일 생성:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. 개발 서버 재시작

환경 변수를 적용하기 위해 개발 서버를 재시작하세요:

```bash
# 개발 서버 중지 (Ctrl+C)
# 개발 서버 재시작
npm run dev
```

## 5. 테스트

1. 프로필 설정 페이지로 이동
2. 닉네임 옆의 편집 아이콘 클릭
3. 새로운 닉네임 입력 후 체크 버튼 클릭
4. 페이지 새로고침 후 닉네임이 유지되는지 확인

## 6. 추가 기능 (선택사항)

### 프로필 이미지 업로드

```sql
-- Storage bucket 생성 (Supabase Dashboard > Storage)
-- 버킷 이름: avatars
-- Public bucket으로 설정
```

### 레벨 시스템

```sql
-- 경험치 획득 함수
CREATE OR REPLACE FUNCTION add_experience(user_id UUID, exp_amount INTEGER)
RETURNS void AS $$
DECLARE
  current_exp INTEGER;
  current_level INTEGER;
  new_exp INTEGER;
  new_level INTEGER;
BEGIN
  SELECT experience, level INTO current_exp, current_level
  FROM profiles WHERE id = user_id;
  
  new_exp := current_exp + exp_amount;
  new_level := FLOOR(new_exp / 100) + 1; -- 100 경험치당 1레벨
  
  UPDATE profiles
  SET experience = new_exp, level = new_level
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
```

## 문제 해결

### 연결 오류
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수 이름이 `VITE_` 접두사로 시작하는지 확인
- 개발 서버를 재시작했는지 확인

### RLS 정책 오류
- Supabase Dashboard에서 RLS 정책이 올바르게 설정되었는지 확인
- 테스트 환경에서는 RLS를 일시적으로 비활성화할 수 있음

### Mock 데이터 사용
- Supabase가 설정되지 않은 경우, 앱은 로컬 상태로 작동
- 실제 데이터베이스 연결 없이 UI 테스트 가능

