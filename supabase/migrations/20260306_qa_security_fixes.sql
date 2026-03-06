-- ============================================================================
-- QA 스캔 보안 수정 (2026-03-06)
-- C-1: RPC IDOR — auth.uid() 검증 추가
-- C-3: JWT 트리거 — current_setting('role') 사용
-- ============================================================================

-- ============================================================
-- C-1. purchase_minimi_item — auth.uid() 검증 추가
-- ============================================================
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

    -- 0. 가격 검증 (0원 이하 조작 방지)
    IF p_item_price <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_price');
    END IF;

    -- 1. 중복 구매 체크
    IF EXISTS (
        SELECT 1 FROM user_minimi
        WHERE user_id = p_user_id AND minimi_id = p_minimi_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_owned');
    END IF;

    -- 2. 포인트 확인 (FOR UPDATE로 락)
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

    -- 3. 포인트 차감
    v_new_points := v_current_points - p_item_price;
    UPDATE profiles SET points = v_new_points WHERE id = p_user_id;

    -- 4. 아이템 추가
    INSERT INTO user_minimi (user_id, minimi_id, purchase_price)
    VALUES (p_user_id, p_minimi_id, p_item_price);

    -- 5. 거래 내역 기록
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

-- ============================================================
-- C-1. sell_minimi_item — auth.uid() 검증 추가
-- ============================================================
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

    -- 0. 판매가 검증 (음수 방지)
    IF p_sell_price < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_price');
    END IF;

    -- 1. 프로필 행 잠금 (포인트 동시성 보호)
    SELECT points INTO v_current_points
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_points IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;

    -- 2. 보유 확인 + 구매가 조회 (FOR UPDATE로 락)
    SELECT id, purchase_price INTO v_user_minimi_id, v_purchase_price
    FROM user_minimi
    WHERE user_id = p_user_id AND minimi_id = p_minimi_id
    FOR UPDATE;

    IF v_user_minimi_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_owned');
    END IF;

    -- 3. 판매가가 구매가를 초과하지 않는지 검증 (되팔기 차익 방지)
    v_max_sell_price := CEIL(v_purchase_price * 0.7);
    IF p_sell_price > v_max_sell_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'sell_price_too_high');
    END IF;

    -- 4. 장착 해제 (판매 전)
    UPDATE profiles
    SET equipped_minimi_id = NULL
    WHERE id = p_user_id AND equipped_minimi_id = v_user_minimi_id::TEXT;

    -- 5. 아이템 삭제
    DELETE FROM user_minimi WHERE id = v_user_minimi_id;

    -- 6. 포인트 지급
    v_new_points := v_current_points + p_sell_price;
    UPDATE profiles
    SET points = v_new_points
    WHERE id = p_user_id
    RETURNING points INTO v_new_points;

    -- 7. 거래 내역 기록
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

-- ============================================================
-- C-1. increment_user_points — auth.uid() 검증 추가
-- ============================================================
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

-- 권한 유지
GRANT EXECUTE ON FUNCTION purchase_minimi_item TO authenticated;
GRANT EXECUTE ON FUNCTION sell_minimi_item TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_points TO authenticated;

-- ============================================================
-- C-3. protect_sensitive_profile_columns — JWT claim 스푸핑 방지
-- current_setting('role')은 Supabase가 내부적으로 설정하므로 스푸핑 불가
-- ============================================================
CREATE OR REPLACE FUNCTION protect_sensitive_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- service_role (서버 API)이면 모든 변경 허용
    -- current_setting('role')은 Supabase 내부 설정이므로 클라이언트 조작 불가
    IF current_setting('role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 일반 사용자(anon/authenticated)는 민감 컬럼을 변경할 수 없음
    -- 변경 시도 시 이전 값으로 되돌림 (에러 발생 대신 조용히 무시)
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

-- 트리거 재적용
DROP TRIGGER IF EXISTS protect_sensitive_columns_trigger ON profiles;
CREATE TRIGGER protect_sensitive_columns_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION protect_sensitive_profile_columns();
