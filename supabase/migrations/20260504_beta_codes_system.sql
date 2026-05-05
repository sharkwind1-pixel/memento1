-- 베타 코드 시스템 (적용일: 2026-05-04, MCP에서 직접 실행)
-- 출시 베타 테스터 모집용. 코드 입력 시 3,000P + 3개월 50% 구독 할인.
-- DB 정의에서 dump 떠 로컬 reflect (마이그레이션 드리프트 해소).

-- ============================================================================
-- 1) profiles 테이블에 베타 관련 컬럼 추가
-- ============================================================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS beta_redeemed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS beta_discount_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS beta_code_used TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_beta_discount_until
    ON profiles(beta_discount_until)
    WHERE is_beta_tester = true;

-- ============================================================================
-- 2) beta_codes 테이블 (관리자가 발급)
-- ============================================================================
CREATE TABLE IF NOT EXISTS beta_codes (
    code              TEXT PRIMARY KEY,
    max_uses          INTEGER NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
    used_count        INTEGER NOT NULL DEFAULT 0,
    points_reward     INTEGER NOT NULL DEFAULT 3000,
    discount_months   INTEGER NOT NULL DEFAULT 3,
    discount_percent  INTEGER NOT NULL DEFAULT 50,
    expires_at        TIMESTAMPTZ,
    note              TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_beta_codes_expires ON beta_codes(expires_at);

-- ============================================================================
-- 3) RLS — beta_codes 는 관리자만 SELECT (INSERT/UPDATE/DELETE는 service_role)
-- ============================================================================
ALTER TABLE beta_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS beta_codes_select_admin ON beta_codes;
CREATE POLICY beta_codes_select_admin ON beta_codes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

-- ============================================================================
-- 4) RPC: redeem_beta_code(_code) — 사용자가 직접 호출 (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.redeem_beta_code(_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    _user_id UUID;
    _code_row RECORD;
    _profile RECORD;
    _now TIMESTAMPTZ := NOW();
BEGIN
    _user_id := auth.uid();
    IF _user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', '로그인이 필요합니다');
    END IF;

    -- 이미 베타 테스터?
    SELECT id, is_beta_tester INTO _profile FROM profiles WHERE id = _user_id;
    IF _profile.is_beta_tester THEN
        RETURN json_build_object('success', false, 'error', '이미 베타 테스터로 등록되어 있어요');
    END IF;

    -- 코드 조회 + 잠금 (동시성 방어)
    SELECT * INTO _code_row FROM beta_codes WHERE code = _code FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', '유효하지 않은 코드입니다');
    END IF;
    IF _code_row.expires_at IS NOT NULL AND _code_row.expires_at < _now THEN
        RETURN json_build_object('success', false, 'error', '만료된 코드입니다');
    END IF;
    IF _code_row.used_count >= _code_row.max_uses THEN
        RETURN json_build_object('success', false, 'error', '이미 모두 사용된 코드입니다');
    END IF;

    -- profiles 업데이트 (베타 테스터 활성화 + 포인트 즉시 지급)
    UPDATE profiles
    SET is_beta_tester = true,
        beta_redeemed_at = _now,
        beta_discount_until = _now + (_code_row.discount_months || ' months')::INTERVAL,
        beta_code_used = _code,
        points = COALESCE(points, 0) + _code_row.points_reward
    WHERE id = _user_id;

    -- 코드 사용 카운트 +1
    UPDATE beta_codes SET used_count = used_count + 1 WHERE code = _code;

    -- 포인트 거래 내역 (테이블 없으면 silent skip)
    BEGIN
        INSERT INTO points_history (user_id, change, reason, balance_after)
        SELECT _user_id, _code_row.points_reward, '베타 테스터 가입 보너스',
               (SELECT points FROM profiles WHERE id = _user_id);
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    RETURN json_build_object(
        'success', true,
        'points_added', _code_row.points_reward,
        'discount_until', _now + (_code_row.discount_months || ' months')::INTERVAL,
        'discount_percent', _code_row.discount_percent
    );
END;
$function$;

-- ============================================================================
-- 5) RPC: create_beta_code — 관리자 전용 (SECURITY DEFINER + admin check)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_beta_code(
    _code TEXT,
    _max_uses INTEGER DEFAULT 1,
    _points INTEGER DEFAULT 3000,
    _discount_months INTEGER DEFAULT 3,
    _discount_percent INTEGER DEFAULT 50,
    _expires_at TIMESTAMPTZ DEFAULT NULL,
    _note TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    _is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO _is_admin FROM profiles WHERE id = auth.uid();
    IF NOT COALESCE(_is_admin, false) THEN
        RETURN json_build_object('success', false, 'error', '관리자 권한이 필요합니다');
    END IF;

    INSERT INTO beta_codes (code, max_uses, points_reward, discount_months, discount_percent,
                            expires_at, note, created_by)
    VALUES (_code, _max_uses, _points, _discount_months, _discount_percent,
            _expires_at, _note, auth.uid())
    ON CONFLICT (code) DO NOTHING;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', '이미 존재하는 코드입니다');
    END IF;

    RETURN json_build_object('success', true, 'code', _code);
END;
$function$;

-- ============================================================================
-- 6) 권한
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.redeem_beta_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_beta_code(TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TIMESTAMPTZ, TEXT) TO authenticated;
