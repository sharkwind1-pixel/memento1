/**
 * profiles 테이블 민감 컬럼 보호 트리거
 *
 * 문제: RLS "Users can update own profile" 정책이 auth.uid() = id 조건만 체크하여
 *       일반 사용자가 Supabase 클라이언트로 직접 is_admin, is_premium, points 등을 변경할 수 있음
 *
 * 해결: BEFORE UPDATE 트리거에서 service_role이 아닌 요청의 민감 컬럼 변경을 차단
 */

-- 1. 민감 컬럼 보호 트리거 함수
CREATE OR REPLACE FUNCTION protect_sensitive_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- service_role (서버 API)이면 모든 변경 허용
    IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 일반 사용자(anon/authenticated)는 민감 컬럼을 변경할 수 없음
    -- 변경 시도 시 이전 값으로 되돌림 (에러 발생 대신 조용히 무시)
    NEW.is_admin := OLD.is_admin;
    NEW.is_premium := OLD.is_premium;
    NEW.is_banned := OLD.is_banned;
    NEW.points := OLD.points;
    NEW.total_points_earned := OLD.total_points_earned;
    NEW.premium_expires_at := OLD.premium_expires_at;
    NEW.premium_started_at := OLD.premium_started_at;
    NEW.premium_plan := OLD.premium_plan;
    NEW.ban_reason := OLD.ban_reason;
    NEW.banned_at := OLD.banned_at;
    NEW.last_ip := OLD.last_ip;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 트리거 적용 (기존 트리거가 있으면 교체)
DROP TRIGGER IF EXISTS protect_sensitive_columns_trigger ON profiles;

CREATE TRIGGER protect_sensitive_columns_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION protect_sensitive_profile_columns();

-- 검증: 트리거가 정상 생성되었는지 확인
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'profiles'::regclass;
