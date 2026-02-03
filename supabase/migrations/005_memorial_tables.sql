-- 추모 공간 테이블들
-- memorial_posts: 추모 게시글
-- memorial_likes: 좋아요
-- memorial_comments: 댓글

-- 1. 추모 게시글 테이블
CREATE TABLE IF NOT EXISTS memorial_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    pet_name TEXT NOT NULL,
    pet_type TEXT NOT NULL,
    pet_breed TEXT,
    pet_years TEXT,
    pet_image TEXT,
    is_public BOOLEAN DEFAULT true,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 추모 좋아요 테이블
CREATE TABLE IF NOT EXISTS memorial_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES memorial_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- 3. 추모 댓글 테이블
CREATE TABLE IF NOT EXISTS memorial_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES memorial_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_memorial_posts_user ON memorial_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_pet ON memorial_posts(pet_id);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_public ON memorial_posts(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_memorial_likes_post ON memorial_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_memorial_comments_post ON memorial_comments(post_id);

-- 좋아요 카운트 트리거 함수
CREATE OR REPLACE FUNCTION update_memorial_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE memorial_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE memorial_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 댓글 카운트 트리거 함수
CREATE OR REPLACE FUNCTION update_memorial_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE memorial_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE memorial_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (이미 있으면 무시)
DROP TRIGGER IF EXISTS trigger_memorial_likes_count ON memorial_likes;
CREATE TRIGGER trigger_memorial_likes_count
    AFTER INSERT OR DELETE ON memorial_likes
    FOR EACH ROW EXECUTE FUNCTION update_memorial_likes_count();

DROP TRIGGER IF EXISTS trigger_memorial_comments_count ON memorial_comments;
CREATE TRIGGER trigger_memorial_comments_count
    AFTER INSERT OR DELETE ON memorial_comments
    FOR EACH ROW EXECUTE FUNCTION update_memorial_comments_count();

-- RLS 정책
ALTER TABLE memorial_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_comments ENABLE ROW LEVEL SECURITY;

-- memorial_posts 정책
DROP POLICY IF EXISTS "공개 추모글은 누구나 조회 가능" ON memorial_posts;
CREATE POLICY "공개 추모글은 누구나 조회 가능" ON memorial_posts
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "본인 추모글 조회" ON memorial_posts;
CREATE POLICY "본인 추모글 조회" ON memorial_posts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 추모글 작성" ON memorial_posts;
CREATE POLICY "본인 추모글 작성" ON memorial_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 추모글 수정" ON memorial_posts;
CREATE POLICY "본인 추모글 수정" ON memorial_posts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 추모글 삭제" ON memorial_posts;
CREATE POLICY "본인 추모글 삭제" ON memorial_posts
    FOR DELETE USING (auth.uid() = user_id);

-- memorial_likes 정책
DROP POLICY IF EXISTS "좋아요 조회" ON memorial_likes;
CREATE POLICY "좋아요 조회" ON memorial_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "좋아요 추가" ON memorial_likes;
CREATE POLICY "좋아요 추가" ON memorial_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "좋아요 삭제" ON memorial_likes;
CREATE POLICY "좋아요 삭제" ON memorial_likes
    FOR DELETE USING (auth.uid() = user_id);

-- memorial_comments 정책
DROP POLICY IF EXISTS "댓글 조회" ON memorial_comments;
CREATE POLICY "댓글 조회" ON memorial_comments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "댓글 작성" ON memorial_comments;
CREATE POLICY "댓글 작성" ON memorial_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 댓글 삭제" ON memorial_comments;
CREATE POLICY "본인 댓글 삭제" ON memorial_comments
    FOR DELETE USING (auth.uid() = user_id);
