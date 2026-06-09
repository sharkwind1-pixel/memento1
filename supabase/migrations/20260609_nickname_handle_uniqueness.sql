-- 닉네임 = 펫홈 핸들(/u/{nickname}) → URL 키로 쓰려면 고유성 보장 필요.
-- 대소문자 무관 고유(임퍼소네이션 방지: Coco vs coco). 부분 인덱스(닉네임 NULL 허용).
-- (MCP apply_migration "nickname_handle_uniqueness"로 prod 적용됨 — 리포 기록용)

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_nickname_lower
    ON public.profiles (lower(nickname))
    WHERE nickname IS NOT NULL;

-- 대소문자 무관 닉네임 사용중 여부 (본인 제외). checkNickname이 호출 → DB 제약과 동일 기준.
CREATE OR REPLACE FUNCTION public.is_nickname_taken(p_nick text, p_exclude uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS(
        SELECT 1 FROM public.profiles
        WHERE lower(nickname) = lower(p_nick)
          AND (p_exclude IS NULL OR id <> p_exclude)
    );
$$;
GRANT EXECUTE ON FUNCTION public.is_nickname_taken(text, uuid) TO anon, authenticated, service_role;
