-- AI 펫톡 에이전트 테이블 마이그레이션
-- 장기 메모리 + 감정 인식 시스템

-- 1. 대화 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    emotion TEXT, -- 감정 분석 결과 (happy, sad, anxious, angry, neutral, etc.)
    emotion_score FLOAT, -- 감정 강도 (0-1)
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 인덱스용
    CONSTRAINT fk_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

-- 2. 반려동물 장기 메모리 테이블 (중요 정보 저장)
CREATE TABLE IF NOT EXISTS pet_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN (
        'preference',    -- 좋아하는 것/싫어하는 것
        'episode',       -- 특별한 에피소드/추억
        'health',        -- 건강 관련 정보
        'personality',   -- 성격/습관
        'relationship',  -- 가족/친구 관계
        'place',         -- 좋아하는 장소
        'routine'        -- 일상 루틴
    )),
    title TEXT NOT NULL, -- 메모리 제목 (예: "산책 좋아함")
    content TEXT NOT NULL, -- 상세 내용
    importance INT DEFAULT 5 CHECK (importance >= 1 AND importance <= 10), -- 중요도
    source_message_id UUID REFERENCES chat_messages(id), -- 출처 메시지
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 대화 세션 테이블 (세션별 요약 저장)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    summary TEXT, -- 세션 요약
    dominant_emotion TEXT, -- 주요 감정
    message_count INT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 4. 감정 히스토리 테이블 (감정 추적용)
CREATE TABLE IF NOT EXISTS emotion_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    emotion TEXT NOT NULL,
    emotion_score FLOAT NOT NULL,
    context TEXT, -- 감정 발생 맥락
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_pet ON chat_messages(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_memories_pet ON pet_memories(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_memories_type ON pet_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_emotion_history_user_pet ON emotion_history(user_id, pet_id);

-- RLS 정책
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_history ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 접근 가능
CREATE POLICY "Users can manage own chat_messages" ON chat_messages
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own pet_memories" ON pet_memories
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chat_sessions" ON chat_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own emotion_history" ON emotion_history
    FOR ALL USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pet_memories_updated_at
    BEFORE UPDATE ON pet_memories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
