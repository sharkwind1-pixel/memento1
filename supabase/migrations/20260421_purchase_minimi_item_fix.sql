-- 버그 수정:
-- 1. auth.uid() 체크 제거
--    API가 createAdminSupabase() (service_role)로 RPC 호출 → auth.uid() NULL
--    → 모든 구매가 'unauthorized' 반환되던 버그. API에서 이미 getAuthUser()로
--    검증 후 p_user_id 넘기므로 RPC 내부 auth 체크는 중복.
-- 2. 반환 키를 'newPoints'로 변경 (API가 rpcData.newPoints 읽음)

CREATE OR REPLACE FUNCTION public.purchase_minimi_item(
    p_user_id uuid,
    p_minimi_id text,
    p_item_name text,
    p_item_price integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
BEGIN
    -- 인증 체크는 API에서 수행 (createAdminSupabase 사용 시 auth.uid()는 NULL이라 여기선 체크 불가)

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

    -- API가 rpcData.newPoints 읽으므로 camelCase 키로 반환
    RETURN jsonb_build_object(
        'success', true,
        'newPoints', v_new_points
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
