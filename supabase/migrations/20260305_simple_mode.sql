-- 간편모드 (Simple Mode) 컬럼 추가
-- 노인 사용자를 위한 간편 UI 모드 전환 기능
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_simple_mode BOOLEAN DEFAULT false;
