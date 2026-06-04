-- 보안수정 B: sell_minimi_item(4-param) 포인트 복제 방지 (2026-06-04 적용, 보안감사 round2)
--
-- 문제: 실제 사용되는 4-param 오버로드(p_item_name/p_resell_price)가
--   - 삭제후보 SELECT에 FOR UPDATE 없음
--   - DELETE 후 ROW_COUNT 미검사인데 포인트 환급은 무조건 실행
--   → 동시 되팔기 시 두 트랜잭션이 같은 복사본을 잡아 양쪽 다 환급(포인트 복제) 가능.
--
-- 수정:
--   (1) 프로필 행을 함수 시작 시 FOR UPDATE로 락 → 유저 단위 직렬화 (안전한 3-param 오버로드와 동일 패턴)
--   (2) DELETE 후 GET DIAGNOSTICS ROW_COUNT 검사 → 실제 삭제된 경우에만 환급
--
-- auth.uid() 체크는 의도적으로 없음: API가 service_role(createAdminSupabase)로 호출하므로
--   함수 내 auth.uid()는 NULL. 인증/소유권은 API에서 getAuthUser + user_id 검증으로 보장.
CREATE OR REPLACE FUNCTION public.sell_minimi_item(p_user_id uuid, p_minimi_id text, p_item_name text, p_resell_price integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_equipped TEXT;
    v_new_points INTEGER;
    v_delete_id UUID;
    v_remaining INTEGER;
    v_deleted INTEGER;
BEGIN
    -- 유저 단위 직렬화: 동시 되팔기 복제 방지 (프로필 행 선점 락)
    PERFORM 1 FROM profiles WHERE id = p_user_id FOR UPDATE;

    SELECT id INTO v_delete_id
    FROM user_minimi
    WHERE user_id = p_user_id AND minimi_id = p_minimi_id
    ORDER BY purchased_at ASC
    LIMIT 1;

    IF v_delete_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_owned');
    END IF;

    SELECT COUNT(*) INTO v_remaining
    FROM user_minimi
    WHERE user_id = p_user_id AND minimi_id = p_minimi_id;

    SELECT equipped_minimi_id INTO v_equipped FROM profiles WHERE id = p_user_id;
    IF v_equipped = p_minimi_id AND v_remaining <= 1 THEN
        UPDATE profiles SET equipped_minimi_id = NULL, minimi_pixel_data = NULL WHERE id = p_user_id;
    END IF;

    DELETE FROM user_minimi WHERE id = v_delete_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    IF v_deleted = 0 THEN
        -- 다른 트랜잭션이 먼저 삭제함 → 환급 금지
        RETURN jsonb_build_object('success', false, 'error', 'not_owned');
    END IF;

    UPDATE profiles SET points = points + p_resell_price WHERE id = p_user_id RETURNING points INTO v_new_points;

    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (p_user_id, 'minimi_sell', p_resell_price,
            jsonb_build_object('itemSlug', p_minimi_id, 'itemName', p_item_name));

    RETURN jsonb_build_object('success', true, 'remaining_points', v_new_points);
END;
$function$;
