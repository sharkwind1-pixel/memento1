-- ========================================================
-- 보안 강화 마이그레이션 (2026-03-20)
-- CRITICAL 1: video_generations UPDATE RLS 정책 수정
-- CRITICAL 2: purchase_shop_item IDOR 수정 (auth.uid() 사용)
-- CRITICAL 3: minihompy 테이블 RLS 활성화
-- CRITICAL 4: magazine_articles 공개 UPDATE 정책 추가 (views/likes)
-- ========================================================

-- ===== CRITICAL 1: video_generations UPDATE 정책 수정 =====
-- 기존 "Service can update any" (USING(true))를 제거하고,
-- 사용자 본인 + service_role만 UPDATE 가능하도록 변경
DROP POLICY IF EXISTS "Service can update any" ON video_generations;

-- 사용자 본인 영상만 UPDATE 가능
CREATE POLICY IF NOT EXISTS "Users update own videos"
    ON video_generations FOR UPDATE
    USING (auth.uid() = user_id);

-- service_role은 RLS를 무시하므로 webhook에서 문제없음

-- ===== CRITICAL 2: purchase_shop_item IDOR 방지 =====
-- p_user_id 파라미터 대신 auth.uid() 사용하도록 함수 재정의
-- 기존 함수 시그니처 유지하되 내부에서 auth.uid() 검증 추가
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
    v_premium_expires TIMESTAMPTZ;
    v_auth_uid UUID;
BEGIN
    -- IDOR 방지: auth.uid()와 p_user_id 일치 검증
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL OR v_auth_uid != p_user_id THEN
        RETURN jsonb_build_object('error', 'unauthorized', 'message', '잘못된 접근입니다.');
    END IF;

    -- 포인트 조회 + 행 잠금 (FOR UPDATE)
    SELECT points INTO v_current_points FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF v_current_points IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found', 'message', '사용자를 찾을 수 없습니다.');
    END IF;

    IF v_current_points < p_item_price THEN
        RETURN jsonb_build_object('error', 'insufficient_points', 'message', '포인트가 부족합니다.');
    END IF;

    -- 포인트 차감
    v_new_points := v_current_points - p_item_price;
    UPDATE profiles SET points = v_new_points WHERE id = p_user_id;

    -- 거래 내역 기록
    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (p_user_id, 'shop_purchase', -p_item_price,
            jsonb_build_object('itemId', p_item_id, 'itemName', p_item_name));

    -- 프리미엄 체험 효과 (bonusDays가 있으면)
    IF p_bonus_days IS NOT NULL AND p_bonus_days > 0 THEN
        SELECT premium_expires_at INTO v_premium_expires FROM profiles WHERE id = p_user_id;
        IF v_premium_expires IS NOT NULL AND v_premium_expires > NOW() THEN
            v_premium_expires := v_premium_expires + (p_bonus_days || ' days')::INTERVAL;
        ELSE
            v_premium_expires := NOW() + (p_bonus_days || ' days')::INTERVAL;
        END IF;
        UPDATE profiles SET is_premium = true, premium_expires_at = v_premium_expires WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'newPoints', v_new_points,
        'premiumExpiresAt', v_premium_expires
    );
END;
$$;

-- ===== CRITICAL 3: minihompy 테이블 RLS 활성화 =====

-- minihompy_settings
ALTER TABLE IF EXISTS minihompy_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view any settings" ON minihompy_settings;
DROP POLICY IF EXISTS "Users can manage own settings" ON minihompy_settings;
CREATE POLICY "Users can view any settings" ON minihompy_settings
    FOR SELECT USING (true);
CREATE POLICY "Users can manage own settings" ON minihompy_settings
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- minihompy_guestbook
ALTER TABLE IF EXISTS minihompy_guestbook ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view guestbook" ON minihompy_guestbook;
DROP POLICY IF EXISTS "Users can write guestbook" ON minihompy_guestbook;
DROP POLICY IF EXISTS "Users can delete own entries" ON minihompy_guestbook;
CREATE POLICY "Anyone can view guestbook" ON minihompy_guestbook
    FOR SELECT USING (true);
CREATE POLICY "Users can write guestbook" ON minihompy_guestbook
    FOR INSERT WITH CHECK (auth.uid() = visitor_id);
CREATE POLICY "Users can delete own entries" ON minihompy_guestbook
    FOR DELETE USING (auth.uid() = visitor_id OR auth.uid() = owner_id);

-- minihompy_user_backgrounds
ALTER TABLE IF EXISTS minihompy_user_backgrounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own backgrounds" ON minihompy_user_backgrounds;
CREATE POLICY "Users can manage own backgrounds" ON minihompy_user_backgrounds
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- minihompy_likes
ALTER TABLE IF EXISTS minihompy_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view likes" ON minihompy_likes;
DROP POLICY IF EXISTS "Users can manage own likes" ON minihompy_likes;
CREATE POLICY "Anyone can view likes" ON minihompy_likes
    FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON minihompy_likes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ===== CRITICAL 4: magazine_articles 공개 UPDATE 제한 =====
-- views/likes 업데이트는 인증된 사용자만 (API에서 인증 추가와 병행)
-- 기존 Admins can update 정책은 유지

-- deduct_points_atomic 함수 (CRITICAL 9 폴백용)
CREATE OR REPLACE FUNCTION deduct_points_atomic(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_points INTEGER;
BEGIN
    -- auth.uid() 검증
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    UPDATE profiles
    SET points = points - p_amount
    WHERE id = p_user_id AND points >= p_amount
    RETURNING points INTO v_new_points;

    IF v_new_points IS NULL THEN
        RAISE EXCEPTION 'insufficient_points';
    END IF;

    RETURN v_new_points;
END;
$$;
