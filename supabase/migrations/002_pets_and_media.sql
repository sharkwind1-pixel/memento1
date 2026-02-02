-- 반려동물 테이블
CREATE TABLE IF NOT EXISTS pets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('강아지', '고양이', '기타')),
    breed VARCHAR(100) NOT NULL,
    birthday DATE,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('남아', '여아')),
    weight VARCHAR(50),
    personality TEXT,
    profile_image TEXT,
    profile_crop_position JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'memorial')),
    memorial_date DATE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 반려동물 미디어 테이블 (사진/영상)
CREATE TABLE IF NOT EXISTS pet_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),
    caption TEXT,
    date DATE NOT NULL,
    crop_position JSONB,
    thumbnail_url TEXT,  -- 영상 썸네일용
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 타임라인 일기 테이블
CREATE TABLE IF NOT EXISTS timeline_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    mood VARCHAR(20) CHECK (mood IN ('happy', 'normal', 'sad', 'sick')),
    media_ids UUID[],  -- 연결된 미디어 ID들
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_media_pet_id ON pet_media(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_media_date ON pet_media(date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_pet_id ON timeline_entries(pet_id);
CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_entries(date DESC);

-- RLS (Row Level Security) 정책
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;

-- pets RLS 정책
CREATE POLICY "Users can view own pets" ON pets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pets" ON pets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pets" ON pets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pets" ON pets
    FOR DELETE USING (auth.uid() = user_id);

-- pet_media RLS 정책
CREATE POLICY "Users can view own pet media" ON pet_media
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pet media" ON pet_media
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pet media" ON pet_media
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pet media" ON pet_media
    FOR DELETE USING (auth.uid() = user_id);

-- timeline_entries RLS 정책
CREATE POLICY "Users can view own timeline" ON timeline_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own timeline" ON timeline_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timeline" ON timeline_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own timeline" ON timeline_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Storage 버킷 생성 (Supabase Dashboard에서 실행 필요)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('pet-media', 'pet-media', true);

-- Storage RLS 정책
-- CREATE POLICY "Users can upload own media" ON storage.objects
--     FOR INSERT WITH CHECK (
--         bucket_id = 'pet-media' AND
--         auth.uid()::text = (storage.foldername(name))[1]
--     );

-- CREATE POLICY "Users can view own media" ON storage.objects
--     FOR SELECT USING (
--         bucket_id = 'pet-media' AND
--         auth.uid()::text = (storage.foldername(name))[1]
--     );

-- CREATE POLICY "Users can delete own media" ON storage.objects
--     FOR DELETE USING (
--         bucket_id = 'pet-media' AND
--         auth.uid()::text = (storage.foldername(name))[1]
--     );

-- CREATE POLICY "Public media access" ON storage.objects
--     FOR SELECT USING (bucket_id = 'pet-media');
