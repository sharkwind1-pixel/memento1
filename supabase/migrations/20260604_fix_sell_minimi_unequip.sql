-- 버그수정: sell_minimi_item(4-param) unequip 분기 dead code 제거 (2026-06-04, 보안감사 round2 후속)
--
-- 배경:
--   profiles.equipped_minimi_id 는 user_minimi.id(UUID)를 저장한다 (slug 아님).
--   이는 2026-02-22 사후분석의 최종 결론 — 컬럼은 UUID로 유지하고 코드가 UUID를 저장하도록 바꿈
--   (src/app/api/minimi/equip/route.ts: owned.id 저장). prod 실측으로도
--   equipped_minimi_id 값 5건 모두 같은 유저의 user_minimi.id 와 1:1 매칭 확인됨.
--
-- 문제(dead code):
--   기존 함수는 `IF v_equipped = p_minimi_id AND v_remaining <= 1` 로 비교했는데
--   v_equipped 는 UUID(텍스트), p_minimi_id 는 slug("maltipoo" 등) → 항상 FALSE.
--   즉 함수 내부 장착 해제 분기가 단 한 번도 실행되지 않았다(런타임 무영향 dead branch).
--   지금까지는 route.ts(웹 레거시 경로)의 RPC 후 unequip 폴백이 가려왔으나,
--   모바일 경로(userMinimiId)에는 폴백이 없어 잠재적으로 dangling equip 가능.
--
-- 수정:
--   삭제 대상 복사본의 UUID(v_delete_id)가 현재 장착된 복사본과 같으면 장착 해제한다.
--   `v_equipped = v_delete_id::text` — UUID 텍스트끼리 비교(레거시 slug 값이 남아있어도 cast 예외 없이 안전).
--   v_remaining <= 1 조건은 제거: 중복 보유 환경에서 "장착된 그 복사본"이 삭제되면
--   남은 수와 무관하게 해제해야 dangling 참조가 생기지 않는다.
--
-- 결제/포인트/동시성 로직(FOR UPDATE 직렬화, ROW_COUNT 검사, 환급)은 2026-06-04 동시성 수정분
-- (20260604_fix_sell_minimi_concurrency.sql) 그대로 보존 — 비교식만 교정.
--
-- auth.uid() 체크 없음: API가 service_role(createAdminSupabase)로 호출하므로 함수 내 auth.uid()는 NULL.
--   인증/소유권은 API의 getAuthUser + user_id 검증으로 보장 (3-param 안전 패턴과 동일).
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
    v_deleted INTEGER;
BEGIN
    -- 유저 단위 직렬화: 동시 되팔기 복제 방지 (프로필 행 선점 락)
    PERFORM 1 FROM profiles WHERE id = p_user_id FOR UPDATE;

    -- 가장 오래된 복사본 1개 선택
    SELECT id INTO v_delete_id
    FROM user_minimi
    WHERE user_id = p_user_id AND minimi_id = p_minimi_id
    ORDER BY purchased_at ASC
    LIMIT 1;

    IF v_delete_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_owned');
    END IF;

    -- 장착된 복사본이 바로 이 삭제 대상이면 장착 해제 (equipped_minimi_id = user_minimi.id UUID)
    SELECT equipped_minimi_id INTO v_equipped FROM profiles WHERE id = p_user_id;
    IF v_equipped = v_delete_id::text THEN
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
