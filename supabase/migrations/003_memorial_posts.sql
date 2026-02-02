/**
 * 추모 게시글 테이블
 * 추모 모드로 전환된 반려동물에 대한 공개 게시글
 * 다른 유저들도 볼 수 있고, 간단한 상호작용(하트, 댓글) 가능
 */

-- 추모 게시글 테이블
CREATE TABLE IF NOT EXISTS public.memorial_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,

    -- 게시글 내용
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,

    -- 펫 정보 (게시 시점 스냅샷)
    pet_name VARCHAR(50) NOT NULL,
    pet_type VARCHAR(20) NOT NULL,
    pet_breed VARCHAR(50),
    pet_years VARCHAR(50), -- 예: "2015-2024"
    pet_image TEXT, -- 프로필 이미지 URL

    -- 공개 설정
    is_public BOOLEAN DEFAULT true,

    -- 통계
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 추모 게시글 좋아요 테이블
CREATE TABLE IF NOT EXISTS public.memorial_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.memorial_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(post_id, user_id) -- 중복 좋아요 방지
);

-- 추모 게시글 댓글 테이블
CREATE TABLE IF NOT EXISTS public.memorial_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.memorial_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_memorial_posts_user_id ON public.memorial_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_pet_id ON public.memorial_posts(pet_id);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_created_at ON public.memorial_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_is_public ON public.memorial_posts(is_public);
CREATE INDEX IF NOT EXISTS idx_memorial_likes_post_id ON public.memorial_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_memorial_comments_post_id ON public.memorial_comments(post_id);

-- RLS 활성화
ALTER TABLE public.memorial_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_comments ENABLE ROW LEVEL SECURITY;

-- memorial_posts RLS 정책
-- 공개 게시글은 누구나 조회 가능
CREATE POLICY "Public memorial posts are viewable by everyone"
ON public.memorial_posts FOR SELECT
USING (is_public = true);

-- 본인 게시글은 비공개여도 조회 가능
CREATE POLICY "Users can view own memorial posts"
ON public.memorial_posts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 본인만 작성 가능
CREATE POLICY "Users can create own memorial posts"
ON public.memorial_posts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 본인만 수정 가능
CREATE POLICY "Users can update own memorial posts"
ON public.memorial_posts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 본인만 삭제 가능
CREATE POLICY "Users can delete own memorial posts"
ON public.memorial_posts FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- memorial_likes RLS 정책
-- 누구나 좋아요 조회 가능
CREATE POLICY "Anyone can view likes"
ON public.memorial_likes FOR SELECT
USING (true);

-- 로그인 유저만 좋아요 추가 가능
CREATE POLICY "Authenticated users can like"
ON public.memorial_likes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 본인 좋아요만 삭제 가능
CREATE POLICY "Users can unlike own likes"
ON public.memorial_likes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- memorial_comments RLS 정책
-- 누구나 댓글 조회 가능
CREATE POLICY "Anyone can view comments"
ON public.memorial_comments FOR SELECT
USING (true);

-- 로그인 유저만 댓글 작성 가능
CREATE POLICY "Authenticated users can comment"
ON public.memorial_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 본인 댓글만 삭제 가능
CREATE POLICY "Users can delete own comments"
ON public.memorial_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 좋아요 수 업데이트 트리거
CREATE OR REPLACE FUNCTION update_memorial_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.memorial_posts
        SET likes_count = likes_count + 1
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.memorial_posts
        SET likes_count = likes_count - 1
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_memorial_likes_count
AFTER INSERT OR DELETE ON public.memorial_likes
FOR EACH ROW EXECUTE FUNCTION update_memorial_post_likes_count();

-- 댓글 수 업데이트 트리거
CREATE OR REPLACE FUNCTION update_memorial_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.memorial_posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.memorial_posts
        SET comments_count = comments_count - 1
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_memorial_comments_count
AFTER INSERT OR DELETE ON public.memorial_comments
FOR EACH ROW EXECUTE FUNCTION update_memorial_post_comments_count();
