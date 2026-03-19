-- 공지사항 시스템: notice_scope 컬럼 추가
-- NULL = 일반 게시글, 'board' = 게시판 공지, 'global' = 전체 공지

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS notice_scope TEXT DEFAULT NULL
    CHECK (notice_scope IN ('board', 'global'));

-- 공지 게시글 조회 성능을 위한 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_community_posts_notice
    ON community_posts(notice_scope) WHERE notice_scope IS NOT NULL;

-- notice_scope가 설정되면 is_pinned도 true로 동기화
-- (기존 is_pinned 컬럼 활용)
COMMENT ON COLUMN community_posts.notice_scope IS 'NULL=일반, board=게시판공지, global=전체공지';
