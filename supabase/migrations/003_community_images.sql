-- ============================================
-- Community Posts: 이미지 첨부 기능 추가
-- ============================================
-- 실행 방법: Supabase SQL Editor에서 실행
-- 날짜: 2026-02-19

-- community_posts에 이미지 URL 배열 컬럼 추가
ALTER TABLE community_posts
    ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- is_public 컬럼 (추모 게시판 홈화면 공개 여부)
ALTER TABLE community_posts
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
