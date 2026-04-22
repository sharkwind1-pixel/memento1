-- 20260422_protect_lifecycle_columns
-- profiles 테이블 라이프사이클 컬럼 보호 + search_path 고정.
-- ✅ 2026-04-22 Supabase MCP로 실적용 확인 (protect_lifecycle_columns + protect_lifecycle_search_path_fix)
--
-- 배경:
-- 기존 protect_sensitive_profile_columns (20260323) 트리거는 is_premium/points/subscription_tier 등은
-- 보호하지만 구독 라이프사이클 컬럼(subscription_phase, data_reset_at, protected_pet_id 등)은
-- 보호하지 않았음. 일반 유저가 Supabase 클라이언트로 직접 UPDATE할 수 있는 취약점.
--
-- 공격 시나리오:
-- 1. archived 상태 유저가 subscription_phase='active'로 되돌림 → 자동 데이터 삭제 회피
-- 2. data_reset_at=NULL 설정 → 예정된 데이터 삭제 취소
-- 3. protected_pet_id에 다른 유저 펫 UUID 삽입 → 엉뚱한 펫이 보호 대상
-- 4. is_banned=false 설정 → 관리자 차단 우회
--
-- 해결: 라이프사이클 4개 + 결제 2개 + 차단 1개 = 7개 컬럼 추가 보호 + SET search_path = public.

CREATE OR REPLACE FUNCTION protect_sensitive_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- service_role (서버 API, 크론, 웹훅)은 항상 통과
    IF current_setting('role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- DB의 profiles.is_admin 값으로 관리자 여부 판단 (JWT claim spoofing 방지)
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = NEW.id;

    -- 관리자가 아닌 경우 민감 컬럼 변경 차단
    IF NOT COALESCE(v_is_admin, false) THEN
        -- 기존 보호 컬럼
        NEW.is_premium := OLD.is_premium;
        NEW.is_admin := OLD.is_admin;
        NEW.points := OLD.points;
        NEW.total_points_earned := OLD.total_points_earned;
        NEW.premium_expires_at := OLD.premium_expires_at;
        NEW.subscription_tier := OLD.subscription_tier;

        -- 결제/프리미엄 추가 보호
        NEW.premium_started_at := OLD.premium_started_at;
        NEW.premium_plan := OLD.premium_plan;

        -- 구독 라이프사이클 컬럼 보호 (핵심)
        NEW.subscription_phase := OLD.subscription_phase;
        NEW.subscription_cancelled_at := OLD.subscription_cancelled_at;
        NEW.data_reset_at := OLD.data_reset_at;
        NEW.protected_pet_id := OLD.protected_pet_id;

        -- 차단 플래그
        NEW.is_banned := OLD.is_banned;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_sensitive_columns ON profiles;
CREATE TRIGGER protect_sensitive_columns
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_sensitive_profile_columns();

-- 검증 (Supabase MCP로 실행 완료):
-- SELECT COUNT(*) FROM pg_trigger WHERE tgrelid='profiles'::regclass AND tgname='protect_sensitive_columns'; -- 1
-- SELECT proconfig IS NOT NULL FROM pg_proc WHERE proname='protect_sensitive_profile_columns'; -- true
