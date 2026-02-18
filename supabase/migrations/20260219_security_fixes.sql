-- =====================================================================
-- Supabase Security Advisor 보안 경고 일괄 수정
-- 생성일: 2026-02-19
-- =====================================================================
-- Supabase Dashboard > SQL Editor에서 이 파일 전체를 실행하세요.
-- 1 ERROR (RLS 미활성화) + 14 WARN (search_path 미설정) 해결
-- =====================================================================

-- =============================================================
-- PART 1: deleted_accounts 테이블 RLS 활성화 (ERROR 해결)
-- =============================================================
ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

-- 정책이 없으면 추가 (이미 있으면 스킵)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'deleted_accounts'
        AND policyname = 'Admin only access'
    ) THEN
        CREATE POLICY "Admin only access" ON public.deleted_accounts
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.email IN ('sharkwind1@gmail.com')
                )
            );
    END IF;
END $$;

-- =============================================================
-- PART 2: 함수 search_path 고정 (14개 WARN 해결)
-- =============================================================
-- 각 함수를 CREATE OR REPLACE로 재생성하되, SET search_path = public 추가
-- 함수 본문은 기존과 100% 동일

-- ----- 2-1. update_memorial_likes_count -----
-- 출처: 005_memorial_tables.sql
CREATE OR REPLACE FUNCTION update_memorial_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE memorial_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE memorial_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- ----- 2-2. update_memorial_comments_count -----
-- 출처: 005_memorial_tables.sql
CREATE OR REPLACE FUNCTION update_memorial_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE memorial_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE memorial_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- ----- 2-3. check_deleted_account -----
-- 출처: 20260209_deleted_accounts.sql
-- DROP 필요: RETURNS TABLE 함수는 CREATE OR REPLACE로 리턴 타입 변경 불가
DROP FUNCTION IF EXISTS check_deleted_account(TEXT);
CREATE OR REPLACE FUNCTION check_deleted_account(check_email TEXT)
RETURNS TABLE (
    can_rejoin BOOLEAN,
    days_until_rejoin INTEGER,
    previous_ai_usage INTEGER,
    was_premium BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (da.rejoin_allowed_after <= NOW()) AS can_rejoin,
        GREATEST(0, EXTRACT(DAY FROM da.rejoin_allowed_after - NOW())::INTEGER) AS days_until_rejoin,
        da.total_ai_usage AS previous_ai_usage,
        da.was_premium
    FROM deleted_accounts da
    WHERE da.email = check_email
      AND da.rejoined_at IS NULL
    ORDER BY da.deleted_at DESC
    LIMIT 1;
END;
$$;

-- ----- 2-4. save_deleted_account -----
-- 출처: 20260209_deleted_accounts.sql
CREATE OR REPLACE FUNCTION save_deleted_account(
    p_user_id UUID,
    p_email TEXT,
    p_nickname TEXT,
    p_ai_usage INTEGER DEFAULT 0,
    p_pets_count INTEGER DEFAULT 0,
    p_photos_count INTEGER DEFAULT 0,
    p_was_premium BOOLEAN DEFAULT FALSE,
    p_reason TEXT DEFAULT NULL,
    p_cooldown_days INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO deleted_accounts (
        original_user_id,
        email,
        nickname,
        total_ai_usage,
        total_pets_created,
        total_photos_uploaded,
        was_premium,
        deletion_reason,
        rejoin_allowed_after,
        rejoin_cooldown_days
    ) VALUES (
        p_user_id,
        p_email,
        p_nickname,
        p_ai_usage,
        p_pets_count,
        p_photos_count,
        p_was_premium,
        p_reason,
        NOW() + (p_cooldown_days || ' days')::INTERVAL,
        p_cooldown_days
    )
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$;

-- ----- 2-5. mark_account_rejoined -----
-- 출처: 20260209_deleted_accounts.sql
CREATE OR REPLACE FUNCTION mark_account_rejoined(
    p_email TEXT,
    p_new_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE deleted_accounts
    SET
        rejoined_at = NOW(),
        new_user_id = p_new_user_id
    WHERE email = p_email
      AND rejoined_at IS NULL
      AND rejoin_allowed_after <= NOW();

    RETURN FOUND;
END;
$$;

-- ----- 2-6. handle_new_user -----
-- 출처: schema.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nickname)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$;

-- ----- 2-7. update_ai_chats_updated_at -----
-- DB에만 존재 (마이그레이션 파일 없음) - ALTER로 처리
ALTER FUNCTION public.update_ai_chats_updated_at() SET search_path = public;

-- ----- 2-8. toggle_admin -----
-- 출처: 20260212_admin_update_policy.sql
CREATE OR REPLACE FUNCTION toggle_admin(
    p_target_user_id UUID,
    p_is_admin BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: caller is not an admin';
    END IF;

    IF p_target_user_id = auth.uid() AND p_is_admin = false THEN
        RAISE EXCEPTION 'Cannot revoke your own admin status';
    END IF;

    UPDATE profiles
    SET is_admin = p_is_admin
    WHERE id = p_target_user_id;

    RETURN true;
END;
$$;

-- ----- 2-9. check_premium_status -----
-- 출처: 20250210_premium_system.sql
-- DROP 필요: RETURNS TABLE 함수는 CREATE OR REPLACE로 리턴 타입 변경 불가
DROP FUNCTION IF EXISTS check_premium_status(UUID);
CREATE OR REPLACE FUNCTION check_premium_status(p_user_id UUID)
RETURNS TABLE (
    is_premium BOOLEAN,
    plan TEXT,
    expires_at TIMESTAMPTZ,
    days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN p.premium_expires_at IS NULL AND p.is_premium = true THEN true
            WHEN p.premium_expires_at > NOW() THEN true
            ELSE false
        END as is_premium,
        p.premium_plan as plan,
        p.premium_expires_at as expires_at,
        CASE
            WHEN p.premium_expires_at IS NULL THEN NULL
            ELSE EXTRACT(DAY FROM (p.premium_expires_at - NOW()))::INTEGER
        END as days_remaining
    FROM profiles p
    WHERE p.id = p_user_id;
END;
$$;

-- ----- 2-10. grant_premium -----
-- 출처: 20250210_premium_system.sql
CREATE OR REPLACE FUNCTION grant_premium(
    p_user_id UUID,
    p_plan TEXT,
    p_duration_days INTEGER DEFAULT NULL,
    p_granted_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF p_duration_days IS NOT NULL AND p_duration_days > 0 THEN
        v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
    ELSE
        v_expires_at := NULL;
    END IF;

    UPDATE profiles
    SET
        is_premium = true,
        premium_started_at = COALESCE(premium_started_at, NOW()),
        premium_expires_at = v_expires_at,
        premium_plan = p_plan
    WHERE id = p_user_id;

    INSERT INTO subscriptions (
        user_id, plan, status, started_at, expires_at,
        granted_by, grant_reason
    ) VALUES (
        p_user_id, p_plan, 'active', NOW(), v_expires_at,
        p_granted_by, p_reason
    );

    RETURN true;
END;
$$;

-- ----- 2-11. revoke_premium -----
-- 출처: 20250210_premium_system.sql
CREATE OR REPLACE FUNCTION revoke_premium(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles
    SET
        is_premium = false,
        premium_expires_at = NOW(),
        premium_plan = NULL
    WHERE id = p_user_id;

    UPDATE subscriptions
    SET
        status = 'cancelled',
        cancelled_at = NOW()
    WHERE user_id = p_user_id AND status = 'active';

    RETURN true;
END;
$$;

-- ----- 2-12. expire_premium_subscriptions -----
-- 출처: 20250210_premium_system.sql
CREATE OR REPLACE FUNCTION expire_premium_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH expired AS (
        UPDATE profiles
        SET is_premium = false
        WHERE is_premium = true
          AND premium_expires_at IS NOT NULL
          AND premium_expires_at < NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM expired;

    UPDATE subscriptions
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();

    RETURN v_count;
END;
$$;

-- =============================================================
-- PART 3: support_inquiries INSERT 정책 의도 문서화
-- =============================================================
-- 이 정책은 의도적입니다 (비로그인 유저도 문의 가능해야 함)
COMMENT ON POLICY "Anyone can create inquiries" ON public.support_inquiries
IS 'Intentionally allows unauthenticated users to submit support inquiries - this is by design for support accessibility';

-- =============================================================
-- 완료!
-- =============================================================
-- 실행 후 Security Advisor에서 "Rerun linter"를 클릭하세요.
-- 예상 결과: ERROR 0, WARNING 2 (support_inquiries + leaked password)
-- Leaked Password Protection은 Authentication > Settings에서 활성화하세요.
-- =============================================================
