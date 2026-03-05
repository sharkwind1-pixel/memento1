-- community_posts 테이블에 숨기기 컬럼 추가
-- 작성자가 자신의 게시글을 숨길 수 있는 기능
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- 인덱스: 숨겨진 게시글 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_community_posts_hidden
  ON community_posts (is_hidden) WHERE is_hidden = true;
