-- 질문/신고 & 건의사항 테이블
CREATE TABLE IF NOT EXISTS support_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('question', 'report', 'suggestion')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
    admin_response TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_support_inquiries_user_id ON support_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_category ON support_inquiries(category);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_status ON support_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_created_at ON support_inquiries(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE support_inquiries ENABLE ROW LEVEL SECURITY;

-- 정책: 자기 문의 조회 가능
CREATE POLICY "Users can view own inquiries" ON support_inquiries
    FOR SELECT
    USING (auth.uid() = user_id);

-- 정책: 로그인한 유저만 문의 작성 가능
CREATE POLICY "Authenticated users can create inquiries" ON support_inquiries
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 정책: 관리자는 모든 문의 조회/수정 가능
-- (admin 권한 체크는 앱단에서 처리)
CREATE POLICY "Service role can manage all" ON support_inquiries
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_support_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_support_inquiries_updated_at
    BEFORE UPDATE ON support_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_support_inquiries_updated_at();

-- 코멘트
COMMENT ON TABLE support_inquiries IS '질문/신고/건의사항 문의 테이블';
COMMENT ON COLUMN support_inquiries.category IS 'question: 질문, report: 신고, suggestion: 건의사항';
COMMENT ON COLUMN support_inquiries.status IS 'pending: 대기중, in_progress: 처리중, resolved: 해결됨, closed: 종료';
