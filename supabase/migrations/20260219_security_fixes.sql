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
-- ALTER FUNCTION으로 search_path만 설정 (리턴 타입 충돌 방지)
ALTER FUNCTION public.check_deleted_account(TEXT) SET search_path = public;

-- ----- 2-4. save_deleted_account -----
-- 출처: 20260209_deleted_accounts.sql
ALTER FUNCTION public.save_deleted_account(UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, TEXT, INTEGER) SET search_path = public;

-- ----- 2-5. mark_account_rejoined -----
-- 출처: 20260209_deleted_accounts.sql
ALTER FUNCTION public.mark_account_rejoined(TEXT, UUID) SET search_path = public;

-- ----- 2-6. handle_new_user -----
-- 출처: schema.sql
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- ----- 2-7. update_ai_chats_updated_at -----
-- DB에만 존재 (마이그레이션 파일 없음) - ALTER로 처리
ALTER FUNCTION public.update_ai_chats_updated_at() SET search_path = public;

-- ----- 2-8. toggle_admin -----
-- 출처: 20260212_admin_update_policy.sql
ALTER FUNCTION public.toggle_admin(UUID, BOOLEAN) SET search_path = public;

-- ----- 2-9. check_premium_status -----
-- 출처: 20250210_premium_system.sql
ALTER FUNCTION public.check_premium_status(UUID) SET search_path = public;

-- ----- 2-10. grant_premium -----
-- 출처: 20250210_premium_system.sql
ALTER FUNCTION public.grant_premium(UUID, TEXT, INTEGER, UUID, TEXT) SET search_path = public;

-- ----- 2-11. revoke_premium -----
-- 출처: 20250210_premium_system.sql
ALTER FUNCTION public.revoke_premium(UUID) SET search_path = public;

-- ----- 2-12. expire_premium_subscriptions -----
-- 출처: 20250210_premium_system.sql
ALTER FUNCTION public.expire_premium_subscriptions() SET search_path = public;

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
