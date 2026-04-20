-- 20260420_grant_premium_tier_fix
-- grant_premium RPC 버그 수정:
-- 1. subscription_tier 업데이트 누락 → 프리미엄 결제 후에도 DB상 tier가 'free'로 남던 문제
-- 2. subscription_phase 초기화 누락 → 해지 후 재구독 시 archived 상태 남아있을 가능성
-- 3. subscriptions INSERT → ON CONFLICT UPDATE 로 변경
--    (2026-04-18 UNIQUE(user_id) 제약 추가 후 두 번째 결제에서 중복 INSERT 실패)

CREATE OR REPLACE FUNCTION public.grant_premium(
    p_user_id uuid,
    p_plan text,
    p_duration_days integer DEFAULT NULL,
    p_granted_by uuid DEFAULT NULL,
    p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF p_duration_days IS NOT NULL AND p_duration_days > 0 THEN
        v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
    ELSE
        v_expires_at := NULL;
    END IF;

    UPDATE profiles
    SET is_premium = true,
        premium_started_at = COALESCE(premium_started_at, NOW()),
        premium_expires_at = v_expires_at,
        premium_plan = p_plan,
        subscription_tier = p_plan,             -- 누락됐던 핵심 필드
        subscription_phase = 'active',          -- 해지 후 재구독 시 복구
        subscription_cancelled_at = NULL,       -- 이전 해지 기록 정리
        data_reset_at = NULL,                   -- 이전 lifecycle 리셋 예약 정리
        protected_pet_id = NULL
    WHERE id = p_user_id;

    -- 기존 구독 row가 있으면 갱신, 없으면 신규 생성 (UNIQUE(user_id) 대응)
    INSERT INTO subscriptions (user_id, plan, status, started_at, expires_at, granted_by, grant_reason)
    VALUES (p_user_id, p_plan, 'active', NOW(), v_expires_at, p_granted_by, p_reason)
    ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = 'active',
        expires_at = EXCLUDED.expires_at,
        granted_by = EXCLUDED.granted_by,
        grant_reason = EXCLUDED.grant_reason,
        cancelled_at = NULL;

    RETURN true;
END;
$function$;
