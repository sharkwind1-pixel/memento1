-- ============================================================================
-- user_blocks 테이블 (유저 차단 기능)
-- 2026-03-01
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT CHECK (reason IS NULL OR reason IN ('harassment', 'spam', 'inappropriate', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_user_id),
    CHECK (blocker_id != blocked_user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);

-- RLS 활성화
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- 자기 차단 목록만 조회 가능
DROP POLICY IF EXISTS "Users can view own blocks" ON user_blocks;
CREATE POLICY "Users can view own blocks" ON user_blocks
    FOR SELECT USING (auth.uid() = blocker_id);

-- 로그인 유저만 차단 생성 (자기 차단만)
DROP POLICY IF EXISTS "Users can create own blocks" ON user_blocks;
CREATE POLICY "Users can create own blocks" ON user_blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- 자기 차단만 해제 가능
DROP POLICY IF EXISTS "Users can delete own blocks" ON user_blocks;
CREATE POLICY "Users can delete own blocks" ON user_blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- 관리자 전체 관리
DROP POLICY IF EXISTS "Admins can manage all blocks" ON user_blocks;
CREATE POLICY "Admins can manage all blocks" ON user_blocks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

COMMENT ON TABLE user_blocks IS '유저 차단 테이블 - 차단한 유저의 게시글/댓글이 보이지 않음';
