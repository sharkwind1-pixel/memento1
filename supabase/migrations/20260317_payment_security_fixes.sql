-- ============================================================================
-- 결제 시스템 보안 강화 마이그레이션
-- 2026-03-17
-- ============================================================================
-- 수정 사항:
-- 1. grant_premium, revoke_premium RPC를 authenticated 사용자가 직접 호출 불가
-- 2. merchant_uid에 UNIQUE 제약조건 추가
-- 3. payments.status에 CHECK 제약조건 추가
-- 4. payments.amount에 양수 CHECK 제약조건 추가
-- ============================================================================

-- 1. grant_premium: authenticated 역할에서 EXECUTE 권한 제거
-- service_role (adminSupabase)에서만 호출 가능
-- ============================================================================
REVOKE EXECUTE ON FUNCTION grant_premium(UUID, TEXT, INTEGER, UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION grant_premium(UUID, TEXT, INTEGER, UUID, TEXT) FROM anon;

-- 2. revoke_premium도 마찬가지
-- ============================================================================
REVOKE EXECUTE ON FUNCTION revoke_premium(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION revoke_premium(UUID) FROM anon;

-- 3. expire_premium_subscriptions도 보호 (크론잡에서만 사용)
-- ============================================================================
REVOKE EXECUTE ON FUNCTION expire_premium_subscriptions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION expire_premium_subscriptions() FROM anon;

-- 4. check_premium_status는 유지 (사용자가 자신의 상태 확인은 OK)
-- (SECURITY DEFINER이지만 자기 정보만 조회하므로 안전)

-- 5. merchant_uid에 UNIQUE 제약조건 추가 (중복 방지)
-- ============================================================================
DO $$
BEGIN
    -- UNIQUE 인덱스가 없으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'payments' AND indexname = 'idx_payments_merchant_uid_unique'
    ) THEN
        -- 기존 non-unique 인덱스 삭제
        DROP INDEX IF EXISTS idx_payments_merchant_uid;
        -- UNIQUE 인덱스로 재생성
        CREATE UNIQUE INDEX idx_payments_merchant_uid_unique ON payments(merchant_uid);
    END IF;
END $$;

-- 6. payments.status에 CHECK 제약조건 추가
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_payments_status' AND conrelid = 'payments'::regclass
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT chk_payments_status
            CHECK (status IN ('pending', 'verifying', 'paid', 'failed', 'cancelled', 'refunded'));
    END IF;
END $$;

-- 7. payments.amount에 양수 제약조건 추가
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_payments_amount_positive' AND conrelid = 'payments'::regclass
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_positive
            CHECK (amount > 0);
    END IF;
END $$;

-- ============================================================================
-- 완료!
-- ============================================================================
-- 실행 후 검증:
-- SELECT has_function_privilege('authenticated', 'grant_premium(uuid, text, integer, uuid, text)', 'execute');
-- 위 쿼리 결과가 false여야 함
-- ============================================================================
