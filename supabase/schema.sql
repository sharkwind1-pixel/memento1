-- ============================================
-- 메멘토애니 전체 DB 스키마
-- 최종 업데이트: 2026-02-04
-- ============================================
-- 이 파일 하나로 전체 DB 구조를 관리합니다.
-- 새 Supabase 프로젝트 셋업 시 이 파일만 실행하면 됩니다.
-- ============================================

-- ============================================
-- 1. PROFILES (사용자 프로필)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nickname TEXT,
    avatar_url TEXT,

    -- 사용자 상태
    is_premium BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,

    -- 온보딩 & 튜토리얼
    user_type TEXT, -- 'planning', 'current', 'memorial'
    onboarding_data JSONB,
    onboarding_completed_at TIMESTAMPTZ,
    tutorial_completed_at TIMESTAMPTZ,

    -- 활동 추적
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nickname)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. PETS (반려동물)
-- ============================================
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- 기본 정보
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- '강아지', '고양이', '기타'
    breed TEXT,
    birthday DATE,
    gender TEXT, -- '남아', '여아'
    weight TEXT,
    personality TEXT,

    -- 프로필 이미지
    profile_image TEXT,
    profile_crop_position JSONB,

    -- 상태
    status TEXT DEFAULT 'active', -- 'active', 'memorial'
    memorial_date DATE,
    is_primary BOOLEAN DEFAULT false,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);

-- ============================================
-- 3. PET_MEDIA (반려동물 사진/영상)
-- ============================================
CREATE TABLE IF NOT EXISTS pet_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- 미디어 정보
    url TEXT NOT NULL,
    storage_path TEXT,
    type TEXT DEFAULT 'image', -- 'image', 'video'
    thumbnail_url TEXT,

    -- 메타데이터
    caption TEXT,
    date DATE,
    crop_position JSONB,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_media_pet_id ON pet_media(pet_id);

-- ============================================
-- 4. TIMELINE_ENTRIES (타임라인/일기)
-- ============================================
CREATE TABLE IF NOT EXISTS timeline_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- 내용
    date DATE NOT NULL,
    title TEXT,
    content TEXT,
    mood TEXT, -- 'happy', 'normal', 'sad', 'sick'
    media_ids UUID[],

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_pet_id ON timeline_entries(pet_id);

-- ============================================
-- 5. CHAT_MESSAGES (AI 채팅)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,

    -- 메시지
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,

    -- 감정 분석
    emotion TEXT,
    emotion_score FLOAT,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_pet ON chat_messages(user_id, pet_id);

-- ============================================
-- 6. PET_MEMORIES (AI 메모리)
-- ============================================
CREATE TABLE IF NOT EXISTS pet_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,

    -- 메모리 정보
    memory_type TEXT NOT NULL, -- 'preference', 'episode', 'health', 'personality', 'relationship', 'place', 'routine', 'schedule'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    importance INTEGER DEFAULT 5,
    time_info JSONB,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_memories_pet_id ON pet_memories(pet_id);

-- ============================================
-- 7. PET_REMINDERS (리마인더)
-- ============================================
CREATE TABLE IF NOT EXISTS pet_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,

    -- 리마인더 정보
    type TEXT NOT NULL, -- 'meal', 'walk', 'medicine', 'grooming', 'vet', 'custom'
    title TEXT NOT NULL,
    description TEXT,

    -- 스케줄
    schedule_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'once'
    schedule_time TIME,
    schedule_day_of_week INTEGER, -- 0-6
    schedule_day_of_month INTEGER, -- 1-31
    schedule_date DATE,

    -- 상태
    enabled BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_reminders_user_id ON pet_reminders(user_id);

-- ============================================
-- 8. CONVERSATION_SUMMARIES (대화 요약)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,

    -- 요약 정보
    summary TEXT NOT NULL,
    key_topics TEXT[],
    emotional_moments TEXT[],
    message_count INTEGER DEFAULT 0,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_pet_id ON conversation_summaries(user_id, pet_id);

-- ============================================
-- 9. COMMUNITY_POSTS (커뮤니티 게시글)
-- ============================================
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- 게시글 정보
    category TEXT NOT NULL, -- 'free', 'qna', 'tips', 'memorial', 'daily', 'health'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT,

    -- 통계
    views INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,

    -- 미디어
    image_urls TEXT[],

    -- 상태
    is_hidden BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);

-- ============================================
-- 10. COMMUNITY_COMMENTS (댓글)
-- ============================================
CREATE TABLE IF NOT EXISTS community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- 댓글 정보
    content TEXT NOT NULL,
    author_name TEXT,

    -- 대댓글
    parent_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);

-- ============================================
-- 11. COMMUNITY_LIKES (좋아요)
-- ============================================
CREATE TABLE IF NOT EXISTS community_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

-- ============================================
-- 12. MEMORIAL_POSTS (추모 게시글)
-- ============================================
CREATE TABLE IF NOT EXISTS memorial_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,

    -- 게시글 정보
    title TEXT NOT NULL,
    content TEXT NOT NULL,

    -- 반려동물 정보 (pet 삭제 시에도 유지)
    pet_name TEXT,
    pet_type TEXT,
    pet_image TEXT,

    -- 통계
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,

    -- 미디어
    image_urls TEXT[],

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memorial_posts_user_id ON memorial_posts(user_id);

-- ============================================
-- 13. MEMORIAL_COMMENTS (추모 댓글)
-- ============================================
CREATE TABLE IF NOT EXISTS memorial_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES memorial_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    author_name TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. MEMORIAL_LIKES (추모 좋아요)
-- ============================================
CREATE TABLE IF NOT EXISTS memorial_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES memorial_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Pets
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pets" ON pets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pets" ON pets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pets" ON pets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pets" ON pets
    FOR DELETE USING (auth.uid() = user_id);

-- Pet Media
ALTER TABLE pet_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media" ON pet_media
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media" ON pet_media
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media" ON pet_media
    FOR DELETE USING (auth.uid() = user_id);

-- Timeline
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own timeline" ON timeline_entries
    FOR ALL USING (auth.uid() = user_id);

-- Chat Messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own messages" ON chat_messages
    FOR ALL USING (auth.uid() = user_id);

-- Pet Memories
ALTER TABLE pet_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memories" ON pet_memories
    FOR ALL USING (auth.uid() = user_id);

-- Reminders
ALTER TABLE pet_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders" ON pet_reminders
    FOR ALL USING (auth.uid() = user_id);

-- Conversation Summaries
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own summaries" ON conversation_summaries
    FOR ALL USING (auth.uid() = user_id);

-- Community Posts
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts" ON community_posts
    FOR SELECT USING (NOT is_hidden);

CREATE POLICY "Users can insert own posts" ON community_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON community_posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON community_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Community Comments
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON community_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert comments" ON community_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON community_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Community Likes
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON community_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own likes" ON community_likes
    FOR ALL USING (auth.uid() = user_id);

-- Memorial Posts (공개)
ALTER TABLE memorial_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view memorial posts" ON memorial_posts
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own memorial posts" ON memorial_posts
    FOR ALL USING (auth.uid() = user_id);

-- Memorial Comments
ALTER TABLE memorial_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view memorial comments" ON memorial_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own memorial comments" ON memorial_comments
    FOR ALL USING (auth.uid() = user_id);

-- Memorial Likes
ALTER TABLE memorial_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view memorial likes" ON memorial_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own memorial likes" ON memorial_likes
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Storage Buckets
-- ============================================
-- Supabase Dashboard에서 생성 필요:
-- 1. pet-media (public)
-- 2. community-images (public)
-- 3. memorial-images (public)

-- ============================================
-- 초기 관리자 설정 (필요시)
-- ============================================
-- UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
