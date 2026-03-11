-- ============================================================================
-- can_rejoin RPC 수정: 최신 레코드 기준 판정
-- ============================================================================
--
-- 기존 문제:
-- banned, abuse_concern, error_resolution을 각각 따로 체크하여
-- 같은 이메일에 여러 타입 레코드가 공존할 때 판정이 꼬임.
-- 예: banned 삭제 후 error_resolution만 남으면 차단이 풀림.
--
-- 수정:
-- 해당 이메일의 "가장 최근 레코드"(created_at DESC) 1개로 판정.
-- - banned → 차단
-- - abuse_concern + rejoin_allowed_at > NOW() → 대기
-- - abuse_concern + rejoin_allowed_at <= NOW() → 통과 (대기 만료)
-- - error_resolution → 통과 (관리자가 명시적으로 허용)
-- - 레코드 없음 → 통과
--
-- ============================================================================

CREATE OR REPLACE FUNCTION can_rejoin(check_email TEXT, check_ip TEXT DEFAULT NULL)
RETURNS TABLE (
    can_join BOOLEAN,
    block_reason TEXT,
    wait_until TIMESTAMPTZ
) AS $$
DECLARE
    latest_record RECORD;
BEGIN
    -- 1. 해당 이메일의 가장 최근 레코드 조회
    SELECT * INTO latest_record FROM withdrawn_users
    WHERE email = check_email
    ORDER BY created_at DESC
    LIMIT 1;

    -- 레코드 없음 → 가입 가능
    IF NOT FOUND THEN
        RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- 2. 최신 레코드 타입별 판정

    -- error_resolution = 관리자가 명시적으로 재가입 허용
    IF latest_record.withdrawal_type = 'error_resolution' THEN
        RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- banned = 영구 차단
    IF latest_record.withdrawal_type = 'banned' THEN
        RETURN QUERY SELECT false, '영구 차단된 계정입니다.'::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- abuse_concern = 재가입 대기 기간 체크
    IF latest_record.withdrawal_type = 'abuse_concern' THEN
        IF latest_record.rejoin_allowed_at IS NOT NULL AND latest_record.rejoin_allowed_at > NOW() THEN
            RETURN QUERY SELECT false, '재가입 대기 기간입니다.'::TEXT, latest_record.rejoin_allowed_at;
            RETURN;
        END IF;
        -- 대기 기간 만료 → 가입 가능
        RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- 3. IP 차단 체크 (이메일 체크 통과 후)
    IF check_ip IS NOT NULL THEN
        SELECT * INTO latest_record FROM withdrawn_users
        WHERE ip_address = check_ip AND withdrawal_type = 'banned'
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND THEN
            RETURN QUERY SELECT false, '차단된 IP입니다.'::TEXT, NULL::TIMESTAMPTZ;
            RETURN;
        END IF;
    END IF;

    -- 기본값: 가입 가능
    RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
