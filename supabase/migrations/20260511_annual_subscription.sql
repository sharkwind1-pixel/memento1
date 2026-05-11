-- ============================================================================
-- 연 구독(annual billing) 도입
-- ============================================================================
-- profiles + subscriptions 테이블에 billing_cycle 컬럼 추가.
-- 기존 데이터는 모두 'monthly'로 백필 (기존 가입자 보호).
--
-- billing_cycle = 'monthly' → 30일 주기 (기존 동작)
-- billing_cycle = 'annual'  → 365일 주기 (신규)
--
-- 정기결제 크론은 next_billing_date 도래 시 billing_cycle에 따라
-- 다음 청구 금액(9,900 또는 89,000) + 다음 만료일을 계산.
-- ============================================================================

-- 1. profiles 테이블에 billing_cycle 컬럼 추가
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS subscription_billing_cycle TEXT
        DEFAULT 'monthly'
        CHECK (subscription_billing_cycle IN ('monthly', 'annual'));

COMMENT ON COLUMN profiles.subscription_billing_cycle IS
    '구독 결제 주기. monthly=월 9,900원 / annual=연 89,000원 (월 환산 7,416원, 25% 할인)';

-- 기존 프리미엄 사용자는 모두 monthly로 백필
UPDATE profiles
SET subscription_billing_cycle = 'monthly'
WHERE subscription_billing_cycle IS NULL;

-- 2. subscriptions 테이블에 billing_cycle 추가
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS billing_cycle TEXT
        DEFAULT 'monthly'
        CHECK (billing_cycle IN ('monthly', 'annual'));

COMMENT ON COLUMN subscriptions.billing_cycle IS
    '구독 결제 주기 (monthly 또는 annual). next_billing_date 계산의 기준.';

UPDATE subscriptions
SET billing_cycle = 'monthly'
WHERE billing_cycle IS NULL;

-- 3. payments 테이블의 plan 컬럼에 'premium_annual' 값 허용
-- (plan 컬럼에 CHECK constraint 있다면 갱신 필요 — 없으면 자유 TEXT)
-- 기존 plan 값: 'basic', 'premium', 'video_single'
-- 추가 값: 'premium_annual'
--
-- 우리 코드는 plan 컬럼을 자유 TEXT로 사용 중. constraint 없으면 추가 작업 불필요.
-- 확인:
DO $$
BEGIN
    -- 만약 CHECK constraint가 있다면 알림 (수동 처리 필요)
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%payments_plan%'
    ) THEN
        RAISE NOTICE 'payments 테이블에 plan CHECK constraint가 있습니다. premium_annual 값 추가 확인 필요';
    END IF;
END $$;

-- 4. protect_sensitive_columns 트리거에 billing_cycle 보호 추가
-- (이미 is_premium / subscription_tier 보호 중이라 동일 패턴 적용)
-- 단, 트리거 자체를 재정의하면 위험하므로 별도 마이그레이션으로 미루고
-- 일단 admin API의 ALLOWED_FIELDS에만 billing_cycle 추가하는 방식으로 처리.
