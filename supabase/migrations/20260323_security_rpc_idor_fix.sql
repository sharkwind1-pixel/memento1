-- ============================================================================
-- RPC IDOR 취약점 수정 마이그레이션
-- 2026-03-23
-- ============================================================================
-- C-1: purchase_minimi_item, sell_minimi_item에 auth.uid() 검증 추가
-- C-3: protect_sensitive_profile_columns 트리거에서 JWT claim 대신 profiles.is_admin 사용
-- ============================================================================

-- ============================================================================
-- 1. purchase_minimi_item: auth.uid() = p_user_id 검증 추가
-- 공격자가 다른 유저 ID를 넣어 포인트/아이템을 조작하는 것을 방지
-- ============================================================================
CREATE OR REPLACE FUNCTION purchase_minimi_item(
    p_user_id UUID,
    p_minimi_id TEXT,
    p_item_name TEXT,
    p_item_price INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
BEGIN
    -- 0. 인증된 사용자가 자신의 ID로만 호출 가능
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
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

-- ============================================================================
-- 2. sell_minimi_item: auth.uid() = p_user_id 검증 추가
-- ============================================================================
CREATE OR REPLACE FUNCTION sell_minimi_item(
    p_user_id UUID,
    p_minimi_id TEXT,
    p_sell_price INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_minimi_id UUID;
    v_current_points INTEGER;
    v_new_points INTEGER;
BEGIN
    -- 0. 인증된 사용자가 자신의 ID로만 호출 가능
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    -- 1. 프로필 행 잠금 (포인트 동시성 보호)
    SELECT points INTO v_current_points
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_points IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;

    -- 2. 보유 확인 (FOR UPDATE로 락)
    SELECT id INTO v_user_minimi_id
    FROM user_minimi
    WHERE user_id = p_user_id AND minimi_id = p_minimi_id
    FOR UPDATE;

    IF v_user_minimi_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_owned');
    END IF;

    -- 3. 장착 해제 (판매 전)
    UPDATE profiles
    SET equipped_minimi_id = NULL
    WHERE id = p_user_id AND equipped_minimi_id = v_user_minimi_id::TEXT;

    -- 4. 아이템 삭제
    DELETE FROM user_minimi WHERE id = v_user_minimi_id;

    -- 5. 포인트 지급
    v_new_points := v_current_points + p_sell_price;
    UPDATE profiles
    SET points = v_new_points
    WHERE id = p_user_id
    RETURNING points INTO v_new_points;

    -- 6. 거래 내역 기록
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

-- ============================================================================
-- 3. protect_sensitive_profile_columns 트리거 수정
-- JWT claim spoofing 방지: current_setting('request.jwt.claims') 대신
-- profiles.is_admin 테이블 값을 직접 조회
-- ============================================================================
CREATE OR REPLACE FUNCTION protect_sensitive_profile_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- service_role은 항상 통과 (Supabase 내부 역할)
    IF current_setting('role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- DB의 profiles.is_admin 값으로 관리자 여부 판단 (JWT claim 사용 안 함)
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = NEW.id;

    -- 관리자가 아닌 경우 민감 컬럼 변경 차단
    IF NOT COALESCE(v_is_admin, false) THEN
        -- is_premium, is_admin, points 등 민감 컬럼은 기존 값 유지
        NEW.is_premium := OLD.is_premium;
        NEW.is_admin := OLD.is_admin;
        NEW.points := OLD.points;
        NEW.total_points_earned := OLD.total_points_earned;
        NEW.premium_expires_at := OLD.premium_expires_at;
        NEW.subscription_tier := OLD.subscription_tier;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 재생성 (이미 존재할 수 있으므로 DROP + CREATE)
DROP TRIGGER IF EXISTS protect_sensitive_columns ON profiles;
CREATE TRIGGER protect_sensitive_columns
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_sensitive_profile_columns();

-- ============================================================================
-- 권한 설정 (기존과 동일하게 유지)
-- ============================================================================
GRANT EXECUTE ON FUNCTION purchase_minimi_item TO authenticated;
GRANT EXECUTE ON FUNCTION sell_minimi_item TO authenticated;
