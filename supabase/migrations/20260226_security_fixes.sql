-- ============================================================
-- 보안 수정 마이그레이션 (2026-02-26)
-- 1. 미니미 구매 원자성 보장 RPC
-- 2. 무료 회원 펫 등록 제한 트리거
-- ============================================================

-- ============================================================
-- 1. 미니미 구매 RPC (원자성 보장)
-- 포인트 차감 + 아이템 추가 + 거래 내역을 단일 트랜잭션으로 처리
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
AS $$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
BEGIN
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
-- 2. 미니미 판매 RPC (원자성 보장)
-- ============================================================
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

-- ============================================================
-- 3. 무료 회원 펫 등록 제한 트리거
-- 무료 회원은 최대 1마리, 프리미엄은 10마리
-- ============================================================
CREATE OR REPLACE FUNCTION check_pet_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_pet_count INTEGER;
    v_is_premium BOOLEAN;
    v_premium_expires_at TIMESTAMPTZ;
    v_max_pets INTEGER;
BEGIN
    -- 프리미엄 상태 확인 (FOR UPDATE로 동시 INSERT 방지)
    SELECT is_premium, premium_expires_at
    INTO v_is_premium, v_premium_expires_at
    FROM profiles
    WHERE id = NEW.user_id
    FOR UPDATE;

    -- 프리미엄 만료 체크
    IF v_is_premium AND v_premium_expires_at IS NOT NULL AND v_premium_expires_at <= NOW() THEN
        v_is_premium := false;
    END IF;

    -- 최대 펫 수 결정
    v_max_pets := CASE WHEN COALESCE(v_is_premium, false) THEN 10 ELSE 1 END;

    -- 현재 펫 수 확인
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

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS enforce_pet_limit ON pets;

-- 트리거 생성
CREATE TRIGGER enforce_pet_limit
BEFORE INSERT ON pets
FOR EACH ROW
EXECUTE FUNCTION check_pet_limit();

-- ============================================================
-- 4. 무료 회원 사진 제한 트리거 (펫당 100장)
-- ============================================================
CREATE OR REPLACE FUNCTION check_photo_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_photo_count INTEGER;
    v_is_premium BOOLEAN;
    v_premium_expires_at TIMESTAMPTZ;
    v_pet_user_id UUID;
    v_max_photos INTEGER;
BEGIN
    -- 펫 소유자 확인
    SELECT user_id INTO v_pet_user_id FROM pets WHERE id = NEW.pet_id;

    IF v_pet_user_id IS NULL THEN
        RAISE EXCEPTION 'Pet not found';
    END IF;

    -- 프리미엄 상태 확인
    SELECT is_premium, premium_expires_at
    INTO v_is_premium, v_premium_expires_at
    FROM profiles
    WHERE id = v_pet_user_id;

    -- 프리미엄 만료 체크
    IF v_is_premium AND v_premium_expires_at IS NOT NULL AND v_premium_expires_at <= NOW() THEN
        v_is_premium := false;
    END IF;

    -- 최대 사진 수 결정
    v_max_photos := CASE WHEN COALESCE(v_is_premium, false) THEN 1000 ELSE 100 END;

    -- 현재 사진 수 확인
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

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS enforce_photo_limit ON pet_media;

-- 트리거 생성
CREATE TRIGGER enforce_photo_limit
BEFORE INSERT ON pet_media
FOR EACH ROW
EXECUTE FUNCTION check_photo_limit();

-- ============================================================
-- 권한 설정
-- ============================================================
GRANT EXECUTE ON FUNCTION purchase_minimi_item TO authenticated;
GRANT EXECUTE ON FUNCTION sell_minimi_item TO authenticated;
