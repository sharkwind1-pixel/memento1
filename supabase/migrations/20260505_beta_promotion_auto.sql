-- 베타 프로모션 자동 적용 시스템 (적용일: 2026-05-05, MCP에서 직접 실행)
-- 정식 출시일부터 1개월간 신규 가입자 모두에게 자동으로 베타 혜택 적용.
-- 출시 후 admin이 start_beta_promotion(30) 1번 호출하면 30일 카운트다운 시작.

-- ============================================================================
-- 1) beta_promotion: 단일 row(id=1)로 베타 기간/혜택 관리
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.beta_promotion (
    id INTEGER PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT false,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    points_reward INTEGER NOT NULL DEFAULT 3000,
    discount_months INTEGER NOT NULL DEFAULT 3,
    discount_percent INTEGER NOT NULL DEFAULT 50,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT beta_promotion_singleton CHECK (id = 1)
);

INSERT INTO public.beta_promotion (id, enabled) VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2) RLS — 누구나 SELECT 가능 (모집 상태 배너 표시용), 변경은 service_role/RPC만
-- ============================================================================
ALTER TABLE public.beta_promotion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS beta_promotion_public_select ON public.beta_promotion;
CREATE POLICY beta_promotion_public_select ON public.beta_promotion
    FOR SELECT USING (true);

-- ============================================================================
-- 3) 신규 가입자에게 베타 자동 적용 (BEFORE INSERT trigger)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.apply_beta_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    promo RECORD;
BEGIN
    -- 이미 베타로 INSERT되는 row(예: 관리자 직접 INSERT)는 스킵
    IF NEW.is_beta_tester IS TRUE THEN
        RETURN NEW;
    END IF;

    SELECT * INTO promo FROM public.beta_promotion WHERE id = 1;
    IF NOT FOUND OR NOT promo.enabled THEN
        RETURN NEW;
    END IF;
    IF promo.start_at IS NULL OR promo.end_at IS NULL THEN
        RETURN NEW;
    END IF;
    IF NOW() < promo.start_at OR NOW() > promo.end_at THEN
        RETURN NEW;
    END IF;

    -- 베타 기간 안 → 자동 적용
    NEW.is_beta_tester := true;
    NEW.beta_redeemed_at := NOW();
    NEW.beta_discount_until := NOW() + (promo.discount_months || ' months')::INTERVAL;
    NEW.beta_code_used := 'AUTO_PROMO';
    NEW.points := COALESCE(NEW.points, 0) + promo.points_reward;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_beta_on_signup ON public.profiles;
CREATE TRIGGER trg_apply_beta_on_signup
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.apply_beta_on_signup();

-- ============================================================================
-- 4) Admin RPC: 출시일에 한 번 호출 → 1개월 카운트다운 시작
-- ============================================================================
CREATE OR REPLACE FUNCTION public.start_beta_promotion(_days INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _is_admin BOOLEAN;
    _now TIMESTAMPTZ := NOW();
    _end TIMESTAMPTZ := _now + (_days || ' days')::INTERVAL;
BEGIN
    SELECT is_admin INTO _is_admin FROM profiles WHERE id = auth.uid();
    IF NOT COALESCE(_is_admin, false) THEN
        RETURN json_build_object('success', false, 'error', '관리자 권한이 필요합니다');
    END IF;

    UPDATE public.beta_promotion
    SET enabled = true, start_at = _now, end_at = _end,
        updated_at = _now, updated_by = auth.uid()
    WHERE id = 1;

    RETURN json_build_object(
        'success', true, 'enabled', true,
        'start_at', _now, 'end_at', _end
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.stop_beta_promotion()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO _is_admin FROM profiles WHERE id = auth.uid();
    IF NOT COALESCE(_is_admin, false) THEN
        RETURN json_build_object('success', false, 'error', '관리자 권한이 필요합니다');
    END IF;

    UPDATE public.beta_promotion
    SET enabled = false, updated_at = NOW(), updated_by = auth.uid()
    WHERE id = 1;

    RETURN json_build_object('success', true, 'enabled', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_beta_promotion(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stop_beta_promotion() TO authenticated;

-- ============================================================================
-- 사용법:
--   출시일(예: Play Store 정식 공개) 직후 admin 계정으로:
--     SELECT start_beta_promotion(30);  -- 30일간 활성
--   필요 시 조기 종료:
--     SELECT stop_beta_promotion();
--   현재 상태 조회 (누구나):
--     SELECT * FROM beta_promotion WHERE id = 1;
-- ============================================================================
