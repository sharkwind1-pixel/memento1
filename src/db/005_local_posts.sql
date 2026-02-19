-- 005_local_posts.sql
-- 지역정보 (동네 커뮤니티 게시판) 테이블

-- 테이블 생성
CREATE TABLE IF NOT EXISTS local_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    category TEXT NOT NULL CHECK (category IN ('hospital', 'walk', 'share', 'trade', 'meet', 'place')),
    title TEXT NOT NULL,
    content TEXT,
    region TEXT,
    district TEXT,
    badge TEXT CHECK (badge IN ('질문', '모집중', '나눔', '판매', '후기', '정보', '기타')),
    image_url TEXT,
    image_storage_path TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_local_posts_category ON local_posts(category);
CREATE INDEX IF NOT EXISTS idx_local_posts_region ON local_posts(region);
CREATE INDEX IF NOT EXISTS idx_local_posts_status ON local_posts(status);
CREATE INDEX IF NOT EXISTS idx_local_posts_created_at ON local_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_local_posts_user_id ON local_posts(user_id);

-- RLS 활성화
ALTER TABLE local_posts ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 누구나 active 게시글 조회 가능
CREATE POLICY "local_posts_select_active"
    ON local_posts FOR SELECT
    USING (status = 'active');

-- RLS 정책: 인증된 사용자만 자신의 게시글 작성
CREATE POLICY "local_posts_insert_own"
    ON local_posts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 자신의 게시글만 수정
CREATE POLICY "local_posts_update_own"
    ON local_posts FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 자신의 게시글만 삭제
CREATE POLICY "local_posts_delete_own"
    ON local_posts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_local_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_local_posts_updated_at
    BEFORE UPDATE ON local_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_local_posts_updated_at();
