-- ============================================================
-- 미니미 중복 구매 허용 + 배치 한도 10마리 확장
-- ============================================================

-- 1. UNIQUE 제약 제거 → 같은 미니미 여러 번 구매 허용
ALTER TABLE user_minimi DROP CONSTRAINT IF EXISTS user_minimi_user_id_minimi_id_key;

-- 2. purchase_minimi_item: already_owned 체크 제거
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
    SELECT points INTO v_current_points FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF v_current_points IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;

    IF v_current_points < p_item_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_points', 'current_points', v_current_points);
    END IF;

    v_new_points := v_current_points - p_item_price;
    UPDATE profiles SET points = v_new_points WHERE id = p_user_id;

    -- 중복 허용: INSERT (UNIQUE 제약 없음)
    INSERT INTO user_minimi (user_id, minimi_id, purchase_price)
    VALUES (p_user_id, p_minimi_id, p_item_price);

    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (p_user_id, 'minimi_purchase', -p_item_price,
            jsonb_build_object('itemSlug', p_minimi_id, 'itemName', p_item_name));

    RETURN jsonb_build_object('success', true, 'remaining_points', v_new_points);
END;
$$;

-- 3. sell_minimi_item: 복사본 1개만 삭제 (오래된 것 우선), 마지막 복사본 판매 시 장착 해제
CREATE OR REPLACE FUNCTION sell_minimi_item(
    p_user_id UUID,
    p_minimi_id TEXT,
    p_item_name TEXT,
    p_resell_price INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_equipped TEXT;
    v_new_points INTEGER;
    v_delete_id UUID;
    v_remaining INTEGER;
BEGIN
    -- 가장 오래된 복사본 1개 선택
    SELECT id INTO v_delete_id
    FROM user_minimi
    WHERE user_id = p_user_id AND minimi_id = p_minimi_id
    ORDER BY purchased_at ASC
    LIMIT 1;

    IF v_delete_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_owned');
    END IF;

    -- 남은 복사본 수 계산 (삭제 전)
    SELECT COUNT(*) INTO v_remaining
    FROM user_minimi
    WHERE user_id = p_user_id AND minimi_id = p_minimi_id;

    -- 마지막 복사본이면 장착 해제
    SELECT equipped_minimi_id INTO v_equipped FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF v_equipped = p_minimi_id AND v_remaining <= 1 THEN
        UPDATE profiles SET equipped_minimi_id = NULL, minimi_pixel_data = NULL WHERE id = p_user_id;
    END IF;

    DELETE FROM user_minimi WHERE id = v_delete_id;

    UPDATE profiles SET points = points + p_resell_price WHERE id = p_user_id RETURNING points INTO v_new_points;

    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (p_user_id, 'minimi_sell', p_resell_price,
            jsonb_build_object('itemSlug', p_minimi_id, 'itemName', p_item_name));

    RETURN jsonb_build_object('success', true, 'remaining_points', v_new_points);
END;
$$;
