-- ============================================================================
-- 통합 마이그레이션 (2026-03-01)
-- Supabase SQL Editor에서 한 번에 실행
-- ============================================================================

-- ============================================================================
-- PART 1: support_inquiries 테이블
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_support_inquiries_user_id ON support_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_category ON support_inquiries(category);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_status ON support_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_created_at ON support_inquiries(created_at DESC);

ALTER TABLE support_inquiries ENABLE ROW LEVEL SECURITY;

-- 자기 문의 조회
DROP POLICY IF EXISTS "Users can view own inquiries" ON support_inquiries;
CREATE POLICY "Users can view own inquiries" ON support_inquiries
    FOR SELECT USING (auth.uid() = user_id);

-- 로그인 유저 문의 작성
DROP POLICY IF EXISTS "Authenticated users can create inquiries" ON support_inquiries;
CREATE POLICY "Authenticated users can create inquiries" ON support_inquiries
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 관리자 전체 관리
DROP POLICY IF EXISTS "Admins can manage all inquiries" ON support_inquiries;
CREATE POLICY "Admins can manage all inquiries" ON support_inquiries
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_support_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_support_inquiries_updated_at ON support_inquiries;
CREATE TRIGGER trigger_update_support_inquiries_updated_at
    BEFORE UPDATE ON support_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_support_inquiries_updated_at();

COMMENT ON TABLE support_inquiries IS '질문/신고/건의사항 문의 테이블';

-- ============================================================================
-- PART 2: withdrawn_users 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS withdrawn_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    nickname TEXT,
    ip_address TEXT,
    withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('abuse_concern', 'banned', 'error_resolution')),
    withdrawn_at TIMESTAMPTZ DEFAULT NOW(),
    rejoin_allowed_at TIMESTAMPTZ,
    reason TEXT,
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawn_users_email ON withdrawn_users(email);
CREATE INDEX IF NOT EXISTS idx_withdrawn_users_ip ON withdrawn_users(ip_address);
CREATE INDEX IF NOT EXISTS idx_withdrawn_users_type ON withdrawn_users(withdrawal_type);

-- profiles에 필드 추가 (이미 있으면 무시)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'ban_reason'
    ) THEN
        ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'banned_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'last_ip'
    ) THEN
        ALTER TABLE profiles ADD COLUMN last_ip TEXT;
    END IF;
END $$;

ALTER TABLE withdrawn_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view withdrawn users" ON withdrawn_users;
CREATE POLICY "Admins can view withdrawn users" ON withdrawn_users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Admins can insert withdrawn users" ON withdrawn_users;
CREATE POLICY "Admins can insert withdrawn users" ON withdrawn_users
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Admins can update withdrawn users" ON withdrawn_users;
CREATE POLICY "Admins can update withdrawn users" ON withdrawn_users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Admins can delete withdrawn users" ON withdrawn_users;
CREATE POLICY "Admins can delete withdrawn users" ON withdrawn_users
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- 재가입 가능 여부 확인 함수
CREATE OR REPLACE FUNCTION can_rejoin(check_email TEXT, check_ip TEXT DEFAULT NULL)
RETURNS TABLE (
    can_join BOOLEAN,
    block_reason TEXT,
    wait_until TIMESTAMPTZ
) AS $$
DECLARE
    banned_record RECORD;
BEGIN
    SELECT * INTO banned_record FROM withdrawn_users
    WHERE email = check_email AND withdrawal_type = 'banned'
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT false, '영구 차단된 계정입니다.'::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    IF check_ip IS NOT NULL THEN
        SELECT * INTO banned_record FROM withdrawn_users
        WHERE ip_address = check_ip AND withdrawal_type = 'banned'
        LIMIT 1;

        IF FOUND THEN
            RETURN QUERY SELECT false, '차단된 IP입니다.'::TEXT, NULL::TIMESTAMPTZ;
            RETURN;
        END IF;
    END IF;

    SELECT * INTO banned_record FROM withdrawn_users
    WHERE email = check_email
      AND withdrawal_type = 'abuse_concern'
      AND rejoin_allowed_at > NOW()
    ORDER BY withdrawn_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT false, '재가입 대기 기간입니다.'::TEXT, banned_record.rejoin_allowed_at;
        RETURN;
    END IF;

    RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE withdrawn_users IS '탈퇴 유저 관리 테이블';

-- ============================================================================
-- PART 3: reports RLS 수정 (이메일 하드코딩 제거 → is_admin 기반)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all reports" ON reports;
DROP POLICY IF EXISTS "Admin can manage reports" ON reports;
DROP POLICY IF EXISTS "admin_manage_reports" ON reports;
CREATE POLICY "Admins can manage all reports" ON reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- ============================================================================
-- PART 4: deleted_accounts RLS 수정
-- ============================================================================

-- deleted_accounts 테이블이 있을 때만 실행
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'deleted_accounts'
    ) THEN
        EXECUTE 'DROP POLICY IF EXISTS "Admin only access" ON deleted_accounts';
        EXECUTE 'DROP POLICY IF EXISTS "admin_access" ON deleted_accounts';
        EXECUTE 'CREATE POLICY "Admin only access" ON deleted_accounts
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
            )';
    END IF;
END $$;

-- ============================================================================
-- 완료! 아래 쿼리로 결과 확인:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('support_inquiries', 'withdrawn_users');
-- ============================================================================
