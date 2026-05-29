-- ============================================
-- 가구/소품 시스템 — user_furniture 테이블 + 구매 RPC
-- 미니미 시스템(user_minimi)과 동일 패턴
-- ============================================

-- 1. 테이블 생성 (중복 구매 허용 — UNIQUE 없음)
CREATE TABLE IF NOT EXISTS user_furniture (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    furniture_id TEXT NOT NULL,
    purchase_price INTEGER NOT NULL DEFAULT 0,
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_furniture_user_id ON user_furniture(user_id);

-- 2. RLS
ALTER TABLE user_furniture ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own furniture"
    ON user_furniture FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Only server can insert furniture"
    ON user_furniture FOR INSERT
    WITH CHECK (false);

CREATE POLICY "Only server can delete furniture"
    ON user_furniture FOR DELETE
    USING (false);

-- 3. 구매 RPC (원자적: 포인트 확인 + 차감 + 인서트 + 트랜잭션 로그)
CREATE OR REPLACE FUNCTION purchase_furniture_item(
    p_user_id UUID,
    p_furniture_id TEXT,
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
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_points',
                                  'current', v_current_points, 'required', p_item_price);
    END IF;

    v_new_points := v_current_points - p_item_price;
    UPDATE profiles SET points = v_new_points WHERE id = p_user_id;

    INSERT INTO user_furniture (user_id, furniture_id, purchase_price)
    VALUES (p_user_id, p_furniture_id, p_item_price);

    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (p_user_id, 'furniture_purchase', -p_item_price,
            jsonb_build_object('itemSlug', p_furniture_id, 'itemName', p_item_name));

    RETURN jsonb_build_object('success', true, 'newPoints', v_new_points);
END;
$$;
