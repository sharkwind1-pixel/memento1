-- 튜토리얼 완료 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMPTZ;
