-- community_posts 테이블에 영상 URL 컬럼 추가
-- "자랑하기" 기능: AI 생성 영상을 커뮤니티에 공유할 때 사용
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 인덱스: badge='자랑' 게시글 + video_url 기반 조회 최적화
CREATE INDEX IF NOT EXISTS idx_community_posts_showcase
  ON community_posts (board_type, badge) WHERE video_url IS NOT NULL;
