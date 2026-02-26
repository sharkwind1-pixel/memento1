-- ============================================================================
-- 대화 모드 컬럼 추가 (chat_mode: 'daily' | 'memorial')
-- ============================================================================
-- 목적: 일상/추모 모드 대화 데이터를 분리하여
--   추모 모드 데이터가 일상 모드로 역류하는 것을 방지.
--   (일상 → 추모는 OK, 추모 → 일상은 차단)
--
-- 기존 데이터(chat_mode IS NULL)는 레거시로 취급:
--   - conversation_summaries: grief_progress IS NOT NULL이면 memorial로 간주
--   - chat_messages: 코드 레벨에서 NULL은 daily로 간주
-- ============================================================================

-- 1. chat_messages 테이블에 chat_mode 컬럼 추가
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS chat_mode TEXT
  CHECK (chat_mode IN ('daily', 'memorial'));

-- 2. conversation_summaries 테이블에 chat_mode 컬럼 추가
ALTER TABLE conversation_summaries
  ADD COLUMN IF NOT EXISTS chat_mode TEXT
  CHECK (chat_mode IN ('daily', 'memorial'));

-- 3. 인덱스 추가 (모드별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_chat_messages_mode
  ON chat_messages (user_id, pet_id, chat_mode)
  WHERE chat_mode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_mode
  ON conversation_summaries (user_id, pet_id, chat_mode)
  WHERE chat_mode IS NOT NULL;

-- 4. 기존 conversation_summaries 레거시 데이터 백필
-- grief_progress가 있는 것은 memorial, 없는 것은 daily
UPDATE conversation_summaries
SET chat_mode = 'memorial'
WHERE chat_mode IS NULL AND grief_progress IS NOT NULL;

UPDATE conversation_summaries
SET chat_mode = 'daily'
WHERE chat_mode IS NULL AND grief_progress IS NULL;
