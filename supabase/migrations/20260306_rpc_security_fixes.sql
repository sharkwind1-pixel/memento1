-- ============================================================================
-- RPC 보안 수정 (2026-03-06)
-- 1. SECURITY DEFINER 함수에 search_path 설정 (권한 상승 방지)
-- 2. purchase_minimi_item / sell_minimi_item에 가격 검증 추가
-- ============================================================================

-- ============================================================
-- 1. search_path 미설정 함수 수정
-- ============================================================
ALTER FUNCTION can_rejoin SET search_path = public;
ALTER FUNCTION protect_sensitive_profile_columns SET search_path = public;

-- get_report_stats: DB에 미존재 시 생성 + search_path 설정
-- (20260209_reports.sql 마이그레이션이 미실행된 경우 대비)
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

-- ============================================================
-- 2. purchase_minimi_item -- 가격 검증 추가
-- RPC 직접 호출로 가격 0원 조작 방지
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
-- 3. sell_minimi_item -- 판매가 검증 추가
-- RPC 직접 호출로 판매가 조작 방지
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

-- 권한 유지
GRANT EXECUTE ON FUNCTION purchase_minimi_item TO authenticated;
GRANT EXECUTE ON FUNCTION sell_minimi_item TO authenticated;
