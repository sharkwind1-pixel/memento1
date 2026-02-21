-- ============================================================
-- 미니미 시스템 마이그레이션
-- 1. user_minimi 테이블 생성 (캐릭터 보유 목록)
-- 2. profiles 테이블에 미니미 관련 컬럼 추가
-- 3. point_transactions CHECK 제약 수정 (음수 허용)
-- 4. RPC 함수 3개 (구매/되팔기/상점)
-- ============================================================

-- ============================================================
-- 1. user_minimi 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS user_minimi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    minimi_id TEXT NOT NULL,
    purchase_price INTEGER NOT NULL DEFAULT 0,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, minimi_id)
);

CREATE INDEX IF NOT EXISTS idx_user_minimi_user_id ON user_minimi(user_id);

-- RLS
ALTER TABLE user_minimi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own minimi"
    ON user_minimi FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Only server can insert minimi"
    ON user_minimi FOR INSERT
    WITH CHECK (false);

CREATE POLICY "Only server can delete minimi"
    ON user_minimi FOR DELETE
    USING (false);

-- ============================================================
-- 2. profiles 테이블에 미니미 컬럼 추가
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_minimi_id TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS minimi_pixel_data JSONB DEFAULT NULL;

-- ============================================================
-- 3. point_transactions CHECK 제약 수정 (음수 허용)
-- ============================================================
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_points_earned_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_points_earned_check CHECK (points_earned != 0);

-- ============================================================
-- 4. 미니미 캐릭터 구매 RPC
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
    -- 중복 구매 체크
    IF EXISTS (SELECT 1 FROM user_minimi WHERE user_id = p_user_id AND minimi_id = p_minimi_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_owned');
    END IF;

    -- 포인트 조회 + 행 잠금 (FOR UPDATE)
    SELECT points INTO v_current_points FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF v_current_points IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;

    IF v_current_points < p_item_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_points', 'current_points', v_current_points);
    END IF;

    -- 포인트 차감
    v_new_points := v_current_points - p_item_price;
    UPDATE profiles SET points = v_new_points WHERE id = p_user_id;

    -- 아이템 추가
    INSERT INTO user_minimi (user_id, minimi_id, purchase_price) VALUES (p_user_id, p_minimi_id, p_item_price);

    -- 거래 내역 기록
    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (p_user_id, 'minimi_purchase', -p_item_price, jsonb_build_object('itemSlug', p_minimi_id, 'itemName', p_item_name));

    RETURN jsonb_build_object('success', true, 'remaining_points', v_new_points);
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_owned');
END;
$$;

-- ============================================================
-- 5. 미니미 캐릭터 되팔기 RPC
-- ============================================================
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
BEGIN
    -- 보유 확인
    IF NOT EXISTS (SELECT 1 FROM user_minimi WHERE user_id = p_user_id AND minimi_id = p_minimi_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_owned');
    END IF;

    -- 장착 중이면 해제 (행 잠금 포함)
    SELECT equipped_minimi_id INTO v_equipped FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF v_equipped = p_minimi_id THEN
        UPDATE profiles SET equipped_minimi_id = NULL, minimi_pixel_data = NULL WHERE id = p_user_id;
    END IF;

    -- 아이템 삭제
    DELETE FROM user_minimi WHERE user_id = p_user_id AND minimi_id = p_minimi_id;

    -- 포인트 환급
    UPDATE profiles SET points = points + p_resell_price WHERE id = p_user_id RETURNING points INTO v_new_points;

    -- 거래 내역 기록
    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (p_user_id, 'minimi_sell', p_resell_price, jsonb_build_object('itemSlug', p_minimi_id, 'itemName', p_item_name));

    RETURN jsonb_build_object('success', true, 'remaining_points', v_new_points);
END;
$$;

-- ============================================================
-- 6. 포인트 상점 아이템 구매 RPC
-- ============================================================
CREATE OR REPLACE FUNCTION purchase_shop_item(
    p_user_id UUID,
    p_item_id TEXT,
    p_item_name TEXT,
    p_item_price INTEGER,
    p_effect TEXT,
    p_bonus_days INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
    v_current_expires TIMESTAMPTZ;
    v_new_expires TIMESTAMPTZ;
    v_is_premium BOOLEAN;
BEGIN
    -- 포인트 조회 + 행 잠금
    SELECT points INTO v_current_points FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF v_current_points IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;

    IF v_current_points < p_item_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_points');
    END IF;

    -- 포인트 차감
    v_new_points := v_current_points - p_item_price;
    UPDATE profiles SET points = v_new_points WHERE id = p_user_id;

    -- 거래 내역 기록
    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (p_user_id, 'shop_purchase', -p_item_price, jsonb_build_object('itemId', p_item_id, 'itemName', p_item_name));

    -- 프리미엄 체험 효과 적용
    IF p_bonus_days IS NOT NULL THEN
        SELECT is_premium, premium_expires_at INTO v_is_premium, v_current_expires
        FROM profiles WHERE id = p_user_id;

        IF v_is_premium AND v_current_expires > NOW() THEN
            v_new_expires := v_current_expires + (p_bonus_days || ' days')::INTERVAL;
        ELSE
            v_new_expires := NOW() + (p_bonus_days || ' days')::INTERVAL;
        END IF;

        UPDATE profiles SET is_premium = true, premium_expires_at = v_new_expires WHERE id = p_user_id;

        RETURN jsonb_build_object('success', true, 'remaining_points', v_new_points, 'premium_expires_at', v_new_expires);
    END IF;

    RETURN jsonb_build_object('success', true, 'remaining_points', v_new_points);
END;
$$;
