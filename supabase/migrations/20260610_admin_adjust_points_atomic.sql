-- 관리자 포인트 지급/차감 원자 처리 (read-then-write race 제거).
-- (MCP apply_migration "admin_adjust_points_atomic"로 prod 적용됨 — 리포 기록용)
-- FOR UPDATE 행잠금 + GREATEST(0,...) 클램프로 음수 잔액·잃어버린 갱신 방지.
-- total_points_earned(누적 획득)는 단조 증가 — 지급 시에만 증가, 차감 시 불변.
-- point_transactions.points_earned는 0 불가(CHECK) → 실변동 0이면 거래 미기록.
-- service_role 전용(API에서 관리자 검증 후 호출). SECURITY DEFINER지만 호출 role이 service_role이라
--   protect_sensitive_profile_columns 트리거(current_setting('role')='service_role'면 통과) 통과.
CREATE OR REPLACE FUNCTION public.admin_adjust_points(
    p_user_id uuid,
    p_delta int,
    p_action_type text,
    p_reason text,
    p_admin_id uuid,
    p_admin_email text
)
RETURNS TABLE(new_points int, actual_delta int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old int;
    v_new int;
    v_delta int;
BEGIN
    SELECT COALESCE(points, 0) INTO v_old FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'target_not_found';
    END IF;

    v_new := GREATEST(0, v_old + p_delta);
    v_delta := v_new - v_old;  -- 부호 있음(클램프 반영). 차감 잔액부족 시 |delta| < |p_delta|

    UPDATE public.profiles
    SET points = v_new,
        total_points_earned = COALESCE(total_points_earned, 0) + GREATEST(0, v_delta)
    WHERE id = p_user_id;

    IF v_delta <> 0 THEN
        INSERT INTO public.point_transactions (user_id, action_type, points_earned, metadata)
        VALUES (p_user_id, p_action_type, v_delta, jsonb_build_object(
            'awarded_by', p_admin_id,
            'awarded_by_email', p_admin_email,
            'reason', p_reason
        ));
    END IF;

    RETURN QUERY SELECT v_new, v_delta;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_points(uuid,int,text,text,uuid,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_points(uuid,int,text,text,uuid,text) TO service_role;
