-- ============================================
-- Community DB Migration: API 코드와 스키마 정렬
-- ============================================
-- 실행 방법: Supabase SQL Editor에서 실행
-- 날짜: 2026-02-19

-- 1. community_posts에 API가 기대하는 컬럼 추가
-- (기존 category 컬럼은 유지, board_type 추가)
ALTER TABLE community_posts
    ADD COLUMN IF NOT EXISTS board_type TEXT,
    ADD COLUMN IF NOT EXISTS animal_type TEXT,
    ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;

-- 기존 데이터 마이그레이션: category → board_type
UPDATE community_posts SET board_type = category WHERE board_type IS NULL;
-- likes_count → likes, comments_count → comments
UPDATE community_posts SET likes = likes_count WHERE likes = 0 AND likes_count > 0;
UPDATE community_posts SET comments = comments_count WHERE comments = 0 AND comments_count > 0;

-- board_type 인덱스
CREATE INDEX IF NOT EXISTS idx_community_posts_board_type ON community_posts(board_type);
CREATE INDEX IF NOT EXISTS idx_community_posts_animal_type ON community_posts(animal_type);

-- 2. post_comments 테이블 생성 (API가 이 이름으로 조회)
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    author_nickname TEXT DEFAULT '익명',
    author_avatar TEXT,

    -- 대댓글
    parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);

-- 기존 community_comments 데이터 마이그레이션 (있으면)
INSERT INTO post_comments (id, post_id, user_id, content, author_nickname, parent_id, created_at)
SELECT id, post_id, user_id, content, COALESCE(author_name, '익명'), parent_id, created_at
FROM community_comments
ON CONFLICT (id) DO NOTHING;

-- 3. post_likes 테이블 생성 (API가 이 이름으로 조회)
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- 기존 community_likes 데이터 마이그레이션 (있으면)
INSERT INTO post_likes (id, post_id, user_id, created_at)
SELECT id, post_id, user_id, created_at
FROM community_likes
ON CONFLICT (id) DO NOTHING;

-- 4. RLS 정책 설정

-- post_comments RLS
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_comments_select_all" ON post_comments
    FOR SELECT USING (true);

CREATE POLICY "post_comments_insert_own" ON post_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_comments_delete_own" ON post_comments
    FOR DELETE USING (auth.uid() = user_id);

-- post_likes RLS
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_likes_select_all" ON post_likes
    FOR SELECT USING (true);

CREATE POLICY "post_likes_insert_own" ON post_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_likes_delete_own" ON post_likes
    FOR DELETE USING (auth.uid() = user_id);

-- 5. community_posts RLS 보완 (board_type, likes, comments 컬럼용)
-- 기존 정책이 있으면 무시됨
DO $$ BEGIN
    -- SELECT 정책 (누구나 조회)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'community_posts_select_all') THEN
        CREATE POLICY community_posts_select_all ON community_posts FOR SELECT USING (true);
    END IF;

    -- INSERT 정책 (로그인 사용자)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'community_posts_insert_own') THEN
        CREATE POLICY community_posts_insert_own ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- UPDATE 정책 (본인 글만)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'community_posts_update_own') THEN
        CREATE POLICY community_posts_update_own ON community_posts FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- DELETE 정책 (본인 글만)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'community_posts_delete_own') THEN
        CREATE POLICY community_posts_delete_own ON community_posts FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
