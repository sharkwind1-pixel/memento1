-- =====================================================
-- 매거진 좋아요 전용 테이블 (2026-04-21)
-- =====================================================
-- 배경: magazine_likes 테이블 없이 카운터만 +1/-1 했더니
--       경쟁 조건 + 중복 좋아요 + 음수(-1) 버그 발생.
--       post_likes 패턴을 그대로 따름.
--
-- 구조: 1사용자 1기사 1좋아요 (UNIQUE 제약)
-- 카운터: magazine_articles.likes는 이 테이블의 count로 동기화
-- =====================================================

CREATE TABLE IF NOT EXISTS magazine_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES magazine_articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_magazine_likes_article
    ON magazine_likes(article_id);

CREATE INDEX IF NOT EXISTS idx_magazine_likes_user
    ON magazine_likes(user_id);

-- RLS
ALTER TABLE magazine_likes ENABLE ROW LEVEL SECURITY;

-- 모든 로그인 사용자가 좋아요 가능
CREATE POLICY "magazine_likes_insert"
    ON magazine_likes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "magazine_likes_select"
    ON magazine_likes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "magazine_likes_delete"
    ON magazine_likes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 기존 음수 likes 값 정리 (버그로 인한 -1 등)
UPDATE magazine_articles SET likes = GREATEST(likes, 0) WHERE likes < 0;

-- =====================================================
-- 검증 쿼리:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name = 'magazine_likes';
-- → 1행 나오면 OK
--
-- SELECT conname FROM pg_constraint
-- WHERE conname = 'magazine_likes_article_id_user_id_key';
-- → UNIQUE 제약 확인
-- =====================================================
