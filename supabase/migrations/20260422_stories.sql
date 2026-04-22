-- =====================================================
-- 스토리 (24시간 임시 게시물) (2026-04-22)
-- =====================================================
-- 인스타그램 스토리 참고.
-- 게시판보다 진입 장벽 낮은 일상 공유.
-- 24시간 후 자동 삭제.
--
-- 구조:
-- - stories 테이블: 이미지/텍스트 + 24시간 TTL
-- - 피드: 팔로잉이 아닌 전체 공개 (커뮤니티 특성)
-- - 삭제: 크론잡으로 expires_at 지난 것 DELETE
-- =====================================================

CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- 콘텐츠
    image_url TEXT,           -- 사진 URL (Storage)
    text_content TEXT,        -- 텍스트 (사진 없이 텍스트만도 가능)
    background_color TEXT DEFAULT '#05B2DC', -- 텍스트 전용 스토리 배경색
    -- 반려동물 태그 (선택)
    pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
    -- 메타데이터
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    -- 작성자 정보 (JOIN 없이 빠른 조회)
    author_nickname TEXT,
    author_avatar TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_stories_feed ON stories(created_at DESC) WHERE expires_at > NOW();

-- RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- 모든 로그인 유저가 스토리 볼 수 있음
CREATE POLICY "stories_select_all"
    ON stories FOR SELECT
    TO authenticated
    USING (expires_at > NOW());

-- 본인만 작성 가능
CREATE POLICY "stories_insert_own"
    ON stories FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 본인만 삭제 가능
CREATE POLICY "stories_delete_own"
    ON stories FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- service_role은 만료된 스토리 삭제 가능 (크론잡용)
-- (service_role은 RLS 우회하므로 별도 정책 불필요)

-- =====================================================
-- 검증:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'stories';
-- =====================================================
