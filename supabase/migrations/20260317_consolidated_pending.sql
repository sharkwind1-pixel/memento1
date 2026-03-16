-- ============================================================================
-- 통합 미실행 마이그레이션 (2026-03-17)
--
-- 이전 미실행 파일들을 통합:
-- - 20260225_push_preferred_hour.sql
-- - 20260226_chat_mode_column.sql
-- - 20260226_security_fixes.sql (-> 20260306_qa 버전으로 대체)
-- - 20260306_qa_security_fixes.sql (최종 버전)
-- - 20260306_rpc_security_fixes.sql (-> 20260306_qa 버전에 포함)
-- - 20260317_payment_security_fixes.sql
--
-- 실행 순서: 위에서 아래로 순차 실행 (의존성 없음, 멱등성 보장)
-- ============================================================================

-- ============================================================
-- PART 1: push_subscriptions.preferred_hour 컬럼 추가
-- ============================================================
ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS preferred_hour SMALLINT DEFAULT 9;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_preferred_hour
    ON push_subscriptions(preferred_hour);

-- ============================================================
-- PART 2: chat_mode 컬럼 추가 (chat_messages + conversation_summaries)
-- ============================================================
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS chat_mode TEXT
  CHECK (chat_mode IN ('daily', 'memorial'));

ALTER TABLE conversation_summaries
  ADD COLUMN IF NOT EXISTS chat_mode TEXT
  CHECK (chat_mode IN ('daily', 'memorial'));

CREATE INDEX IF NOT EXISTS idx_chat_messages_mode
  ON chat_messages (user_id, pet_id, chat_mode)
  WHERE chat_mode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_mode
  ON conversation_summaries (user_id, pet_id, chat_mode)
  WHERE chat_mode IS NOT NULL;

-- 레거시 데이터 백필
UPDATE conversation_summaries
SET chat_mode = 'memorial'
WHERE chat_mode IS NULL AND grief_progress IS NOT NULL;

UPDATE conversation_summaries
SET chat_mode = 'daily'
WHERE chat_mode IS NULL AND grief_progress IS NULL;

-- ============================================================
-- PART 3: 보안 RPC 함수 (auth.uid() + search_path + 가격 검증)
-- 20260226 + 20260306_qa + 20260306_rpc 통합 최종 버전
-- ============================================================

-- 3-1. purchase_minimi_item
CREATE OR REPLACE FUNCTION purchase_minimi_item(
    p_user_id UUID,
    p_minimi_id TEXT,
    p_item_name TEXT,
    p_item_price INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
BEGIN
    -- IDOR 방지: 요청자 본인만 구매 가능
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    -- 가격 검증 (0원 이하 조작 방지)
    IF p_item_price <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_price');
    END IF;

    -- 중복 구매 체크
    IF EXISTS (
        SELECT 1 FROM user_minimi
        WHERE user_id = p_user_id AND minimi_id = p_minimi_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_owned');
    END IF;

    -- 포인트 확인 (FOR UPDATE로 락)
    SELECT points INTO v_current_points
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_points IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;

    IF v_current_points < p_item_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_points');
    END IF;

    -- 포인트 차감
    v_new_points := v_current_points - p_item_price;
    UPDATE profiles SET points = v_new_points WHERE id = p_user_id;

    -- 아이템 추가
    INSERT INTO user_minimi (user_id, minimi_id, purchase_price)
    VALUES (p_user_id, p_minimi_id, p_item_price);

    -- 거래 내역 기록
    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (
        p_user_id,
        'minimi_purchase',
        -p_item_price,
        jsonb_build_object('itemSlug', p_minimi_id, 'itemName', p_item_name)
    );

    RETURN jsonb_build_object(
        'success', true,
        'remaining_points', v_new_points
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3-2. sell_minimi_item
CREATE OR REPLACE FUNCTION sell_minimi_item(
    p_user_id UUID,
    p_minimi_id TEXT,
    p_sell_price INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_minimi_id UUID;
    v_purchase_price INTEGER;
    v_max_sell_price INTEGER;
    v_current_points INTEGER;
    v_new_points INTEGER;
BEGIN
    -- IDOR 방지: 요청자 본인만 판매 가능
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    -- 판매가 검증 (음수 방지)
    IF p_sell_price < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_price');
    END IF;

    -- 프로필 행 잠금 (포인트 동시성 보호)
    SELECT points INTO v_current_points
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_points IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;

    -- 보유 확인 + 구매가 조회 (FOR UPDATE로 락)
    SELECT id, purchase_price INTO v_user_minimi_id, v_purchase_price
    FROM user_minimi
    WHERE user_id = p_user_id AND minimi_id = p_minimi_id
    FOR UPDATE;

    IF v_user_minimi_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_owned');
    END IF;

    -- 판매가가 구매가를 초과하지 않는지 검증 (되팔기 차익 방지)
    v_max_sell_price := CEIL(v_purchase_price * 0.7);
    IF p_sell_price > v_max_sell_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'sell_price_too_high');
    END IF;

    -- 장착 해제 (판매 전)
    UPDATE profiles
    SET equipped_minimi_id = NULL
    WHERE id = p_user_id AND equipped_minimi_id = v_user_minimi_id::TEXT;

    -- 아이템 삭제
    DELETE FROM user_minimi WHERE id = v_user_minimi_id;

    -- 포인트 지급
    v_new_points := v_current_points + p_sell_price;
    UPDATE profiles
    SET points = v_new_points
    WHERE id = p_user_id
    RETURNING points INTO v_new_points;

    -- 거래 내역 기록
    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (
        p_user_id,
        'minimi_sell',
        p_sell_price,
        jsonb_build_object('itemSlug', p_minimi_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'remaining_points', v_new_points
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3-3. increment_user_points
CREATE OR REPLACE FUNCTION increment_user_points(
    p_user_id UUID,
    p_action_type VARCHAR(50),
    p_points INTEGER,
    p_daily_cap INTEGER DEFAULT NULL,
    p_one_time BOOLEAN DEFAULT FALSE,
    p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today_count INTEGER;
    v_new_points INTEGER;
    v_new_total INTEGER;
BEGIN
    -- IDOR 방지: 요청자 본인만 포인트 적립 가능
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
    END IF;

    -- 일회성 활동 중복 체크
    IF p_one_time THEN
        SELECT COUNT(*) INTO v_today_count
        FROM point_transactions
        WHERE user_id = p_user_id
          AND action_type = p_action_type;

        IF v_today_count > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'reason', 'already_earned',
                'points', (SELECT points FROM profiles WHERE id = p_user_id)
            );
        END IF;
    END IF;

    -- 일일 cap 체크
    IF p_daily_cap IS NOT NULL THEN
        SELECT COUNT(*) INTO v_today_count
        FROM point_transactions
        WHERE user_id = p_user_id
          AND action_type = p_action_type
          AND created_at::date = CURRENT_DATE;

        IF v_today_count >= p_daily_cap THEN
            RETURN jsonb_build_object(
                'success', false,
                'reason', 'daily_cap_reached',
                'points', (SELECT points FROM profiles WHERE id = p_user_id)
            );
        END IF;
    END IF;

    -- 포인트 증가 (원자적)
    UPDATE profiles
    SET points = points + p_points,
        total_points_earned = total_points_earned + p_points
    WHERE id = p_user_id
    RETURNING points, total_points_earned INTO v_new_points, v_new_total;

    -- 거래 내역 기록
    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (p_user_id, p_action_type, p_points, p_metadata);

    RETURN jsonb_build_object(
        'success', true,
        'points', v_new_points,
        'totalEarned', v_new_total
    );
END;
$$;

-- 3-4. search_path 미설정 함수 수정
ALTER FUNCTION can_rejoin SET search_path = public;

-- 3-5. get_report_stats
CREATE OR REPLACE FUNCTION get_report_stats()
RETURNS TABLE (
    total_count BIGINT,
    pending_count BIGINT,
    resolved_today BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_count,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_count,
        COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE)::BIGINT AS resolved_today
    FROM reports;
END;
$$;

-- 3-6. protect_sensitive_profile_columns (JWT claim 스푸핑 방지)
CREATE OR REPLACE FUNCTION protect_sensitive_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- service_role만 민감 컬럼 변경 허용
    IF current_setting('role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 일반 사용자는 민감 컬럼 변경 시 이전 값으로 복원
    NEW.is_admin := OLD.is_admin;
    NEW.is_premium := OLD.is_premium;
    NEW.is_banned := OLD.is_banned;
    NEW.points := OLD.points;
    NEW.total_points_earned := OLD.total_points_earned;
    NEW.premium_expires_at := OLD.premium_expires_at;
    NEW.premium_started_at := OLD.premium_started_at;
    NEW.premium_plan := OLD.premium_plan;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS protect_sensitive_columns_trigger ON profiles;
CREATE TRIGGER protect_sensitive_columns_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION protect_sensitive_profile_columns();

-- 3-7. 무료 회원 펫 등록 제한 트리거
CREATE OR REPLACE FUNCTION check_pet_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_pet_count INTEGER;
    v_is_premium BOOLEAN;
    v_premium_expires_at TIMESTAMPTZ;
    v_max_pets INTEGER;
BEGIN
    SELECT is_premium, premium_expires_at
    INTO v_is_premium, v_premium_expires_at
    FROM profiles
    WHERE id = NEW.user_id
    FOR UPDATE;

    IF v_is_premium AND v_premium_expires_at IS NOT NULL AND v_premium_expires_at <= NOW() THEN
        v_is_premium := false;
    END IF;

    v_max_pets := CASE WHEN COALESCE(v_is_premium, false) THEN 10 ELSE 1 END;

    SELECT COUNT(*) INTO v_pet_count
    FROM pets
    WHERE user_id = NEW.user_id;

    IF v_pet_count >= v_max_pets THEN
        IF v_is_premium THEN
            RAISE EXCEPTION 'Maximum pet limit reached (10 for premium users)';
        ELSE
            RAISE EXCEPTION 'Free users can only register 1 pet. Please upgrade to premium.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_pet_limit ON pets;
CREATE TRIGGER enforce_pet_limit
BEFORE INSERT ON pets
FOR EACH ROW
EXECUTE FUNCTION check_pet_limit();

-- 3-8. 무료 회원 사진 제한 트리거 (펫당 100장/1000장)
CREATE OR REPLACE FUNCTION check_photo_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_photo_count INTEGER;
    v_is_premium BOOLEAN;
    v_premium_expires_at TIMESTAMPTZ;
    v_pet_user_id UUID;
    v_max_photos INTEGER;
BEGIN
    SELECT user_id INTO v_pet_user_id FROM pets WHERE id = NEW.pet_id;

    IF v_pet_user_id IS NULL THEN
        RAISE EXCEPTION 'Pet not found';
    END IF;

    SELECT is_premium, premium_expires_at
    INTO v_is_premium, v_premium_expires_at
    FROM profiles
    WHERE id = v_pet_user_id;

    IF v_is_premium AND v_premium_expires_at IS NOT NULL AND v_premium_expires_at <= NOW() THEN
        v_is_premium := false;
    END IF;

    v_max_photos := CASE WHEN COALESCE(v_is_premium, false) THEN 1000 ELSE 100 END;

    SELECT COUNT(*) INTO v_photo_count
    FROM pet_media
    WHERE pet_id = NEW.pet_id;

    IF v_photo_count >= v_max_photos THEN
        IF v_is_premium THEN
            RAISE EXCEPTION 'Maximum photo limit reached (1000 per pet for premium users)';
        ELSE
            RAISE EXCEPTION 'Free users can only upload 100 photos per pet. Please upgrade to premium.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_photo_limit ON pet_media;
CREATE TRIGGER enforce_photo_limit
BEFORE INSERT ON pet_media
FOR EACH ROW
EXECUTE FUNCTION check_photo_limit();

-- 3-9. 권한 부여
GRANT EXECUTE ON FUNCTION purchase_minimi_item(UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION sell_minimi_item(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_points(UUID, VARCHAR, INTEGER, INTEGER, BOOLEAN, JSONB) TO authenticated;

-- ============================================================
-- PART 4: 결제 시스템 보안 강화
-- ============================================================

-- grant_premium: authenticated에서 EXECUTE 권한 제거
REVOKE EXECUTE ON FUNCTION grant_premium(UUID, TEXT, INTEGER, UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION grant_premium(UUID, TEXT, INTEGER, UUID, TEXT) FROM anon;

REVOKE EXECUTE ON FUNCTION revoke_premium(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION revoke_premium(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION expire_premium_subscriptions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION expire_premium_subscriptions() FROM anon;

-- merchant_uid UNIQUE 제약조건
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'payments' AND indexname = 'idx_payments_merchant_uid_unique'
    ) THEN
        DROP INDEX IF EXISTS idx_payments_merchant_uid;
        CREATE UNIQUE INDEX idx_payments_merchant_uid_unique ON payments(merchant_uid);
    END IF;
END $$;

-- payments.status CHECK 제약조건
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

-- payments.amount 양수 제약조건
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
-- 실행 후 검증:
-- SELECT has_function_privilege('authenticated', 'grant_premium(uuid, text, integer, uuid, text)', 'execute');
-- -> false 여야 함
-- ============================================================================
