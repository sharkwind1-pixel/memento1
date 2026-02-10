-- ============================================================================
-- 탈퇴 유형별 관리 시스템
-- ============================================================================
--
-- 탈퇴 유형:
-- 1. abuse_concern (악용 우려) - 30일 후 재가입 가능
-- 2. banned (영구 차단) - 재가입 불가, IP 차단
-- 3. error_resolution (오류 해결) - 즉시 재가입 가능
--
-- ============================================================================

-- 1. 탈퇴자 테이블 생성
CREATE TABLE IF NOT EXISTS withdrawn_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,                           -- 원래 유저 ID
    email TEXT NOT NULL,                             -- 이메일 (재가입 체크용)
    nickname TEXT,                                   -- 닉네임 (기록용)
    ip_address TEXT,                                 -- IP 주소 (차단용)
    withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('abuse_concern', 'banned', 'error_resolution')),
    withdrawn_at TIMESTAMPTZ DEFAULT NOW(),          -- 탈퇴 일시
    rejoin_allowed_at TIMESTAMPTZ,                   -- 재가입 가능 일시
    reason TEXT,                                     -- 탈퇴/밴 사유
    processed_by UUID REFERENCES auth.users(id),    -- 처리한 관리자
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_withdrawn_users_email ON withdrawn_users(email);
CREATE INDEX IF NOT EXISTS idx_withdrawn_users_ip ON withdrawn_users(ip_address);
CREATE INDEX IF NOT EXISTS idx_withdrawn_users_type ON withdrawn_users(withdrawal_type);

-- 3. profiles 테이블에 필드 추가 (이미 있으면 무시)
DO $$
BEGIN
    -- ban_reason 필드
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'ban_reason'
    ) THEN
        ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
    END IF;

    -- banned_at 필드
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'banned_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMPTZ;
    END IF;

    -- last_ip 필드
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'last_ip'
    ) THEN
        ALTER TABLE profiles ADD COLUMN last_ip TEXT;
    END IF;
END $$;

-- 4. RLS 정책
ALTER TABLE withdrawn_users ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/수정 가능
CREATE POLICY "Admins can view withdrawn users" ON withdrawn_users
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can insert withdrawn users" ON withdrawn_users
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can update withdrawn users" ON withdrawn_users
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can delete withdrawn users" ON withdrawn_users
    FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- 5. 재가입 가능 여부 확인 함수
CREATE OR REPLACE FUNCTION can_rejoin(check_email TEXT, check_ip TEXT DEFAULT NULL)
RETURNS TABLE (
    can_join BOOLEAN,
    block_reason TEXT,
    wait_until TIMESTAMPTZ
) AS $$
DECLARE
    banned_record RECORD;
BEGIN
    -- 영구 차단 확인 (이메일)
    SELECT * INTO banned_record FROM withdrawn_users
    WHERE email = check_email AND withdrawal_type = 'banned'
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT false, '영구 차단된 계정입니다.'::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- 영구 차단 확인 (IP)
    IF check_ip IS NOT NULL THEN
        SELECT * INTO banned_record FROM withdrawn_users
        WHERE ip_address = check_ip AND withdrawal_type = 'banned'
        LIMIT 1;

        IF FOUND THEN
            RETURN QUERY SELECT false, '차단된 IP입니다.'::TEXT, NULL::TIMESTAMPTZ;
            RETURN;
        END IF;
    END IF;

    -- 30일 대기 확인
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

    -- 가입 가능
    RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 코멘트 추가
COMMENT ON TABLE withdrawn_users IS '탈퇴 유저 관리 테이블 - 재가입 제한, IP 차단 등';
COMMENT ON COLUMN withdrawn_users.withdrawal_type IS 'abuse_concern: 30일 대기, banned: 영구차단, error_resolution: 즉시 가능';
