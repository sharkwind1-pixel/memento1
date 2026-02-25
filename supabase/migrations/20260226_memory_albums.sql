-- 추억 앨범 테이블 (추모 모드 전용)
-- 매일 자동 생성되는 사진 슬라이드쇼 앨범

CREATE TABLE IF NOT EXISTS memory_albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept VARCHAR(30) NOT NULL CHECK (concept IN ('anniversary', 'mood', 'random')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    media_ids UUID[] NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pet_id, created_date)
);

CREATE INDEX IF NOT EXISTS idx_memory_albums_user_id ON memory_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_albums_pet_id ON memory_albums(pet_id);
CREATE INDEX IF NOT EXISTS idx_memory_albums_created_date ON memory_albums(created_date DESC);

ALTER TABLE memory_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory albums"
    ON memory_albums FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own memory albums"
    ON memory_albums FOR UPDATE
    USING (auth.uid() = user_id);
