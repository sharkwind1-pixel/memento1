-- Pet Reminders 테이블 생성
-- 산책, 식사, 약, 예방접종 등의 일정 관리

CREATE TABLE IF NOT EXISTS pet_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,

    -- 리마인더 기본 정보
    type VARCHAR(50) NOT NULL CHECK (type IN ('walk', 'meal', 'medicine', 'vaccine', 'grooming', 'vet', 'custom')),
    title VARCHAR(100) NOT NULL,
    description TEXT,

    -- 스케줄 정보
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'once')),
    schedule_time TIME NOT NULL,
    schedule_day_of_week INTEGER CHECK (schedule_day_of_week >= 0 AND schedule_day_of_week <= 6), -- 0=일요일
    schedule_day_of_month INTEGER CHECK (schedule_day_of_month >= 1 AND schedule_day_of_month <= 31),
    schedule_date DATE, -- once 타입일 때 사용

    -- 상태 관리
    enabled BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP WITH TIME ZONE,

    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_pet_reminders_user_id ON pet_reminders(user_id);
CREATE INDEX idx_pet_reminders_pet_id ON pet_reminders(pet_id);
CREATE INDEX idx_pet_reminders_enabled ON pet_reminders(enabled);
CREATE INDEX idx_pet_reminders_schedule_time ON pet_reminders(schedule_time);

-- RLS 정책 설정
ALTER TABLE pet_reminders ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 리마인더만 볼 수 있음
CREATE POLICY "Users can view their own reminders"
    ON pet_reminders FOR SELECT
    USING (auth.uid() = user_id);

-- 사용자는 자신의 리마인더만 생성할 수 있음
CREATE POLICY "Users can create their own reminders"
    ON pet_reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 리마인더만 수정할 수 있음
CREATE POLICY "Users can update their own reminders"
    ON pet_reminders FOR UPDATE
    USING (auth.uid() = user_id);

-- 사용자는 자신의 리마인더만 삭제할 수 있음
CREATE POLICY "Users can delete their own reminders"
    ON pet_reminders FOR DELETE
    USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_pet_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pet_reminders_updated_at
    BEFORE UPDATE ON pet_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_pet_reminders_updated_at();

-- pet_memories 테이블에 시간 정보 컬럼 추가 (이미 있으면 무시)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'pet_memories' AND column_name = 'time_info') THEN
        ALTER TABLE pet_memories ADD COLUMN time_info JSONB;
    END IF;
END $$;

COMMENT ON TABLE pet_reminders IS '반려동물 케어 리마인더 (산책, 식사, 약 등)';
COMMENT ON COLUMN pet_reminders.type IS '리마인더 타입: walk(산책), meal(식사), medicine(약), vaccine(예방접종), grooming(미용), vet(병원), custom(기타)';
COMMENT ON COLUMN pet_reminders.schedule_type IS '반복 타입: daily(매일), weekly(매주), monthly(매월), once(1회)';
