/**
 * 트리거 함수에서 존재하지 않는 컬럼 참조 제거
 *
 * 문제: protect_sensitive_profile_columns() 트리거가
 *       ban_reason, banned_at, last_ip 컬럼을 참조하지만
 *       실제 profiles 테이블에 해당 컬럼이 없어서
 *       모든 UPDATE 쿼리가 실패함
 *       ("record 'new' has no field 'ban_reason'" 에러)
 *
 * 해결: 존재하지 않는 3개 컬럼 참조를 트리거에서 제거
 */

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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
