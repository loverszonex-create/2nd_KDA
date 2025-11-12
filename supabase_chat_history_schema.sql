-- 채팅 히스토리 테이블 생성
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 인덱스
  CONSTRAINT chat_history_unique UNIQUE (session_id, ticker)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_chat_history_session_ticker 
ON chat_history(session_id, ticker);

CREATE INDEX IF NOT EXISTS idx_chat_history_updated_at 
ON chat_history(updated_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능 (추후 인증 시스템과 연동)
CREATE POLICY "Enable read access for all users" 
ON chat_history FOR SELECT 
USING (true);

CREATE POLICY "Enable insert access for all users" 
ON chat_history FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update access for all users" 
ON chat_history FOR UPDATE 
USING (true);

-- 자동 updated_at 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_history_updated_at 
BEFORE UPDATE ON chat_history 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 7일 이상 지난 채팅 자동 삭제 (선택적)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('delete-old-chats', '0 0 * * *', 
--   'DELETE FROM chat_history WHERE updated_at < NOW() - INTERVAL ''7 days''');

COMMENT ON TABLE chat_history IS '채팅 히스토리 저장 테이블';
COMMENT ON COLUMN chat_history.session_id IS '브라우저 세션 ID (localStorage)';
COMMENT ON COLUMN chat_history.ticker IS '종목 코드 (예: 005930.KS)';
COMMENT ON COLUMN chat_history.stock_name IS '종목명 (예: 삼성전자)';
COMMENT ON COLUMN chat_history.messages IS '메시지 배열 (JSONB)';

