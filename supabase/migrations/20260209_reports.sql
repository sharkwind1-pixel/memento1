-- =====================================================
-- 신고 시스템 테이블
-- 목적: 게시물/댓글/회원 신고 기능
-- =====================================================

-- 1. 신고 테이블
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 신고자 정보
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 신고 대상
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'pet_memorial')),
    target_id UUID NOT NULL,  -- 대상의 ID (post_id, comment_id, user_id 등)

    -- 신고 내용
    reason TEXT NOT NULL CHECK (reason IN (
        'spam',           -- 스팸/광고
        'abuse',          -- 욕설/비방
        'inappropriate',  -- 부적절한 콘텐츠
        'harassment',     -- 괴롭힘
        'misinformation', -- 허위정보
        'copyright',      -- 저작권 침해
        'other'           -- 기타
    )),
    description TEXT,  -- 상세 설명 (선택)

    -- 처리 상태
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',   -- 대기 중
        'reviewing', -- 검토 중
        'resolved',  -- 처리 완료
        'rejected'   -- 반려 (신고 기각)
    )),

    -- 처리 결과
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_note TEXT,  -- 처리 메모
    action_taken TEXT CHECK (action_taken IN (
        'none',           -- 조치 없음
        'warning',        -- 경고
        'content_removed',-- 콘텐츠 삭제
        'user_warned',    -- 사용자 경고
        'user_suspended', -- 사용자 일시 정지
        'user_banned'     -- 사용자 영구 정지
    )),

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- 3. 중복 신고 방지 (같은 사용자가 같은 대상을 여러번 신고 못하게)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique ON reports(reporter_id, target_type, target_id)
WHERE status IN ('pending', 'reviewing');

-- 4. RLS 정책
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 본인이 한 신고만 조회 가능
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT
    USING (reporter_id = auth.uid());

-- 본인만 신고 생성 가능
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT
    WITH CHECK (reporter_id = auth.uid());

-- 관리자만 모든 신고 조회/수정 가능
CREATE POLICY "Admins can manage all reports" ON reports
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.email IN ('sharkwind1@gmail.com')
        )
    );

-- 5. 신고 사유 한글 매핑 함수
CREATE OR REPLACE FUNCTION get_report_reason_label(reason TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE reason
        WHEN 'spam' THEN '스팸/광고'
        WHEN 'abuse' THEN '욕설/비방'
        WHEN 'inappropriate' THEN '부적절한 콘텐츠'
        WHEN 'harassment' THEN '괴롭힘'
        WHEN 'misinformation' THEN '허위정보'
        WHEN 'copyright' THEN '저작권 침해'
        WHEN 'other' THEN '기타'
        ELSE reason
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. 신고 통계 함수 (관리자용)
CREATE OR REPLACE FUNCTION get_report_stats()
RETURNS TABLE (
    total_count BIGINT,
    pending_count BIGINT,
    resolved_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_count,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_count,
        COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE)::BIGINT AS resolved_today
    FROM reports;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

COMMENT ON TABLE reports IS '신고 시스템 - 게시물/댓글/회원 신고 관리';
