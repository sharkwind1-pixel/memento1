-- 대화 세션 요약 테이블 마이그레이션
-- 대화 맥락 유지를 위한 상세 요약 시스템

-- conversation_summaries 테이블 생성
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    summary TEXT NOT NULL, -- 대화 요약 (2-3문장)
    key_topics TEXT[] DEFAULT '{}', -- 주요 주제 배열
    emotional_tone TEXT NOT NULL DEFAULT 'neutral' CHECK (emotional_tone IN (
        'happy', 'sad', 'anxious', 'angry', 'grateful',
        'lonely', 'peaceful', 'excited', 'neutral'
    )),
    grief_progress TEXT CHECK (grief_progress IN (
        'denial', 'anger', 'bargaining', 'depression', 'acceptance', 'unknown'
    )), -- 추모 모드용 애도 단계
    important_mentions TEXT[] DEFAULT '{}', -- 기억할 만한 중요 언급 배열
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 하루에 펫별로 여러 세션 요약 가능하도록 unique 제약 없음
    CONSTRAINT fk_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_pet
    ON conversation_summaries(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_date
    ON conversation_summaries(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_pet_date
    ON conversation_summaries(pet_id, session_date DESC);

-- RLS 정책
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 접근 가능
CREATE POLICY "Users can manage own conversation_summaries" ON conversation_summaries
    FOR ALL USING (auth.uid() = user_id);

-- 댓글: 기존 chat_sessions 테이블과의 차이점
-- chat_sessions: 세션 시작/종료 시간, 메시지 수 등 메타데이터 중심
-- conversation_summaries: 대화 내용 요약, 감정 분석, 주제 등 컨텍스트 중심
-- 두 테이블은 서로 다른 목적으로 사용되며, 필요에 따라 연결 가능

-- pet_memories 테이블에 schedule 타입 추가 (이미 있으면 무시)
DO $$
BEGIN
    ALTER TABLE pet_memories DROP CONSTRAINT IF EXISTS pet_memories_memory_type_check;
    ALTER TABLE pet_memories ADD CONSTRAINT pet_memories_memory_type_check
        CHECK (memory_type IN (
            'preference',
            'episode',
            'health',
            'personality',
            'relationship',
            'place',
            'routine',
            'schedule'
        ));
EXCEPTION WHEN OTHERS THEN
    -- 이미 있거나 오류 발생 시 무시
    NULL;
END $$;
