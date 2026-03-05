-- community_posts에 지역 필터 컬럼 추가 (지역정보 게시판용)
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS region TEXT;

-- 인덱스 (local 게시판 지역 필터 성능)
CREATE INDEX IF NOT EXISTS idx_community_posts_region
    ON community_posts(region)
    WHERE board_type = 'local';
