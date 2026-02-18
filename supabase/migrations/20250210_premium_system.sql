-- ============================================================================
-- 프리미엄 구독 시스템 마이그레이션
-- ============================================================================
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ============================================================================

-- 1. profiles 테이블에 프리미엄 관련 필드 추가
-- ============================================================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS premium_plan TEXT DEFAULT NULL; -- 'monthly', 'yearly', 'lifetime', 'admin_grant'

-- 코멘트 추가
COMMENT ON COLUMN profiles.premium_started_at IS '프리미엄 시작일';
COMMENT ON COLUMN profiles.premium_expires_at IS '프리미엄 만료일 (NULL이면 무기한)';
COMMENT ON COLUMN profiles.premium_plan IS '구독 플랜: monthly, yearly, lifetime, admin_grant';

-- 2. 결제 내역 테이블 생성
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 결제 정보
    amount INTEGER NOT NULL, -- 원화 (KRW)
    currency TEXT DEFAULT 'KRW',
    plan TEXT NOT NULL, -- 'monthly', 'yearly', 'lifetime'

    -- 포트원 연동 정보
    payment_id TEXT, -- 포트원 결제 고유 ID
    merchant_uid TEXT, -- 우리 서비스 주문번호
    imp_uid TEXT, -- 아임포트 결제 고유번호

    -- 상태
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'cancelled', 'refunded'

    -- 메타데이터
    metadata JSONB DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_uid ON payments(merchant_uid);

-- RLS 정책
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 결제 내역만 조회 가능
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

-- 서비스 역할만 결제 생성/수정 가능 (웹훅에서 처리)
CREATE POLICY "Service role can manage payments" ON payments
    FOR ALL USING (auth.role() = 'service_role');

-- 3. 구독 내역 테이블 생성
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 구독 정보
    plan TEXT NOT NULL, -- 'monthly', 'yearly', 'lifetime', 'admin_grant'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'paused'

    -- 기간
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL이면 무기한 (lifetime, admin_grant)
    cancelled_at TIMESTAMPTZ,

    -- 결제 연동
    last_payment_id UUID REFERENCES payments(id),

    -- 관리자 부여인 경우
    granted_by UUID REFERENCES auth.users(id),
    grant_reason TEXT,

    -- 메타데이터
    metadata JSONB DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

-- RLS 정책
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 구독 내역만 조회 가능
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- 4. 프리미엄 상태 확인 함수
-- ============================================================================
CREATE OR REPLACE FUNCTION check_premium_status(p_user_id UUID)
RETURNS TABLE (
    is_premium BOOLEAN,
    plan TEXT,
    expires_at TIMESTAMPTZ,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN p.premium_expires_at IS NULL AND p.is_premium = true THEN true
            WHEN p.premium_expires_at > NOW() THEN true
            ELSE false
        END as is_premium,
        p.premium_plan as plan,
        p.premium_expires_at as expires_at,
        CASE
            WHEN p.premium_expires_at IS NULL THEN NULL
            ELSE EXTRACT(DAY FROM (p.premium_expires_at - NOW()))::INTEGER
        END as days_remaining
    FROM profiles p
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. 프리미엄 부여 함수 (관리자용)
-- ============================================================================
CREATE OR REPLACE FUNCTION grant_premium(
    p_user_id UUID,
    p_plan TEXT,
    p_duration_days INTEGER DEFAULT NULL, -- NULL이면 무기한
    p_granted_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 만료일 계산
    IF p_duration_days IS NOT NULL AND p_duration_days > 0 THEN
        v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
    ELSE
        v_expires_at := NULL; -- 무기한
    END IF;

    -- profiles 업데이트
    UPDATE profiles
    SET
        is_premium = true,
        premium_started_at = COALESCE(premium_started_at, NOW()),
        premium_expires_at = v_expires_at,
        premium_plan = p_plan
    WHERE id = p_user_id;

    -- subscriptions에 기록
    INSERT INTO subscriptions (
        user_id, plan, status, started_at, expires_at,
        granted_by, grant_reason
    ) VALUES (
        p_user_id, p_plan, 'active', NOW(), v_expires_at,
        p_granted_by, p_reason
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. 프리미엄 해제 함수
-- ============================================================================
CREATE OR REPLACE FUNCTION revoke_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- profiles 업데이트
    UPDATE profiles
    SET
        is_premium = false,
        premium_expires_at = NOW(),
        premium_plan = NULL
    WHERE id = p_user_id;

    -- 활성 구독 취소
    UPDATE subscriptions
    SET
        status = 'cancelled',
        cancelled_at = NOW()
    WHERE user_id = p_user_id AND status = 'active';

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. 만료된 프리미엄 자동 해제 함수 (크론잡용)
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_premium_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- 만료된 프리미엄 해제
    WITH expired AS (
        UPDATE profiles
        SET is_premium = false
        WHERE is_premium = true
          AND premium_expires_at IS NOT NULL
          AND premium_expires_at < NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM expired;

    -- 구독 상태도 업데이트
    UPDATE subscriptions
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 완료!
-- ============================================================================
-- 이 마이그레이션 실행 후:
-- 1. profiles 테이블에 premium_started_at, premium_expires_at, premium_plan 필드 추가됨
-- 2. payments 테이블 생성 (결제 내역)
-- 3. subscriptions 테이블 생성 (구독 내역)
-- 4. 프리미엄 관련 함수들 생성
-- ============================================================================
