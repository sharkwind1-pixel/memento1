-- =====================================================
-- 삭제된 계정 보관 테이블
-- 목적: 탈퇴 후 재가입 악용 방지
-- =====================================================

-- 1. 삭제 계정 보관 테이블
CREATE TABLE IF NOT EXISTS deleted_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 원본 계정 정보
    original_user_id UUID NOT NULL,
    email TEXT NOT NULL,
    nickname TEXT,

    -- 사용량 통계 (재가입 시 참고용)
    total_ai_usage INTEGER DEFAULT 0,        -- 총 AI 펫톡 사용 횟수
    total_pets_created INTEGER DEFAULT 0,    -- 생성한 반려동물 수
    total_photos_uploaded INTEGER DEFAULT 0, -- 업로드한 사진 수
    was_premium BOOLEAN DEFAULT FALSE,       -- 프리미엄 구독 이력

    -- 탈퇴 관련
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deletion_reason TEXT,                    -- 탈퇴 사유 (선택)

    -- 재가입 제한
    rejoin_allowed_after TIMESTAMPTZ,        -- 재가입 가능 시점
    rejoin_cooldown_days INTEGER DEFAULT 30, -- 쿨다운 일수

    -- 재가입 시 사용
    rejoined_at TIMESTAMPTZ,                 -- 재가입한 경우 시점 기록
    new_user_id UUID,                        -- 재가입 시 새 user_id

    -- 인덱스용
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_accounts(email);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_deleted_at ON deleted_accounts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_rejoin ON deleted_accounts(rejoin_allowed_after);

-- 3. 이메일로 삭제 계정 조회 함수
CREATE OR REPLACE FUNCTION check_deleted_account(check_email TEXT)
RETURNS TABLE (
    can_rejoin BOOLEAN,
    days_until_rejoin INTEGER,
    previous_ai_usage INTEGER,
    was_premium BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (da.rejoin_allowed_after <= NOW()) AS can_rejoin,
        GREATEST(0, EXTRACT(DAY FROM da.rejoin_allowed_after - NOW())::INTEGER) AS days_until_rejoin,
        da.total_ai_usage AS previous_ai_usage,
        da.was_premium
    FROM deleted_accounts da
    WHERE da.email = check_email
      AND da.rejoined_at IS NULL  -- 아직 재가입 안 한 계정만
    ORDER BY da.deleted_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. 계정 삭제 시 호출할 함수
CREATE OR REPLACE FUNCTION save_deleted_account(
    p_user_id UUID,
    p_email TEXT,
    p_nickname TEXT,
    p_ai_usage INTEGER DEFAULT 0,
    p_pets_count INTEGER DEFAULT 0,
    p_photos_count INTEGER DEFAULT 0,
    p_was_premium BOOLEAN DEFAULT FALSE,
    p_reason TEXT DEFAULT NULL,
    p_cooldown_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO deleted_accounts (
        original_user_id,
        email,
        nickname,
        total_ai_usage,
        total_pets_created,
        total_photos_uploaded,
        was_premium,
        deletion_reason,
        rejoin_allowed_after,
        rejoin_cooldown_days
    ) VALUES (
        p_user_id,
        p_email,
        p_nickname,
        p_ai_usage,
        p_pets_count,
        p_photos_count,
        p_was_premium,
        p_reason,
        NOW() + (p_cooldown_days || ' days')::INTERVAL,
        p_cooldown_days
    )
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. 재가입 시 호출할 함수 (이전 기록 연결)
CREATE OR REPLACE FUNCTION mark_account_rejoined(
    p_email TEXT,
    p_new_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE deleted_accounts
    SET
        rejoined_at = NOW(),
        new_user_id = p_new_user_id
    WHERE email = p_email
      AND rejoined_at IS NULL
      AND rejoin_allowed_after <= NOW();

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. RLS 정책 (관리자만 조회 가능)
ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access" ON deleted_accounts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.email IN ('sharkwind1@gmail.com')
        )
    );

-- 7. 오래된 기록 자동 삭제 (1년 후) - 선택적
-- CREATE OR REPLACE FUNCTION cleanup_old_deleted_accounts()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM deleted_accounts
--     WHERE deleted_at < NOW() - INTERVAL '1 year'
--       AND rejoined_at IS NULL;
-- END;
-- $$ LANGUAGE plpgsql;

COMMENT ON TABLE deleted_accounts IS '탈퇴 계정 보관 - 재가입 악용 방지용';
