-- 미니홈피 스테이지 멀티 미니미 배치 시스템
-- placed_minimi: [{slug, x, y, zIndex}, ...] 형태의 JSONB 배열
ALTER TABLE minihompy_settings ADD COLUMN IF NOT EXISTS placed_minimi JSONB DEFAULT '[]';
