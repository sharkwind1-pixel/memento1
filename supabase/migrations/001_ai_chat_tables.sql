-- AI 펫톡 관련 테이블 생성
-- Supabase SQL Editor에서 실행하세요

-- 1. 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    emotion TEXT,
    emotion_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_pet ON chat_messages(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- RLS 정책
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
    ON chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. 펫 메모리 테이블 (장기 기억)
CREATE TABLE IF NOT EXISTS pet_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'episode', 'health', 'personality', 'relationship', 'place', 'routine', 'schedule')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    time_info JSONB, -- {"type": "daily", "time": "08:00", "dayOfWeek": 1}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pet_memories_user_pet ON pet_memories(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_memories_importance ON pet_memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_pet_memories_type ON pet_memories(memory_type);

-- RLS 정책
ALTER TABLE pet_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pet memories"
    ON pet_memories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pet memories"
    ON pet_memories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pet memories"
    ON pet_memories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pet memories"
    ON pet_memories FOR DELETE
    USING (auth.uid() = user_id);

-- 3. 펫 리마인더 테이블
CREATE TABLE IF NOT EXISTS pet_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('walk', 'meal', 'medicine', 'vaccine', 'grooming', 'vet', 'custom')),
    title TEXT NOT NULL,
    description TEXT,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'once')),
    schedule_time TIME NOT NULL,
    schedule_day_of_week INTEGER CHECK (schedule_day_of_week >= 0 AND schedule_day_of_week <= 6),
    schedule_day_of_month INTEGER CHECK (schedule_day_of_month >= 1 AND schedule_day_of_month <= 31),
    schedule_date DATE,
    enabled BOOLEAN DEFAULT true,
    last_triggered TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pet_reminders_user ON pet_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_reminders_pet ON pet_reminders(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_reminders_enabled ON pet_reminders(enabled);
CREATE INDEX IF NOT EXISTS idx_pet_reminders_time ON pet_reminders(schedule_time);

-- RLS 정책
ALTER TABLE pet_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pet reminders"
    ON pet_reminders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pet reminders"
    ON pet_reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pet reminders"
    ON pet_reminders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pet reminders"
    ON pet_reminders FOR DELETE
    USING (auth.uid() = user_id);

-- 4. 대화 세션 요약 테이블
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL,
    session_date DATE NOT NULL,
    summary TEXT NOT NULL,
    key_topics TEXT[] DEFAULT '{}',
    emotional_tone TEXT,
    grief_progress TEXT, -- 추모 모드용
    important_mentions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_pet ON conversation_summaries(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_date ON conversation_summaries(session_date DESC);

-- RLS 정책
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation summaries"
    ON conversation_summaries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation summaries"
    ON conversation_summaries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'AI 펫톡 테이블 생성 완료!';
END $$;
