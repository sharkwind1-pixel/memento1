-- 신규 가입 트리거가 unique(lower(nickname)) 제약과 충돌해 가입 자체가 롤백되던 회귀 수정.
-- 자동 닉네임(메타 또는 이메일앞부분)이 기존과 대소문자 무관 충돌하면 접미사(base2, base3..) 자동부여.
-- 예외(unique_violation) 재시도로 동시가입 레이스도 안전. id PK 충돌(중복 트리거)은 조기 종료.
-- (MCP apply_migration "handle_new_user_nickname_collision_safe"로 prod 적용됨 — 리포 기록용)
-- E2E 검증: 메타 nickname='test'(기존 존재) 가입 → 'test2' 자동부여 후 프로필 생성 확인.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    base_nick text;
    candidate text;
    n int := 1;
BEGIN
    base_nick := COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'nickname'), ''), split_part(NEW.email, '@', 1));
    IF base_nick IS NULL OR base_nick = '' THEN
        base_nick := 'user';
    END IF;
    candidate := base_nick;

    LOOP
        BEGIN
            INSERT INTO public.profiles (id, email, nickname)
            VALUES (NEW.id, NEW.email, candidate);
            RETURN NEW;
        EXCEPTION
            WHEN unique_violation THEN
                -- 이미 이 유저의 프로필이 있으면(중복 트리거/재시도) 그대로 종료
                IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
                    RETURN NEW;
                END IF;
                -- 닉네임 충돌 → 접미사 증가 후 재시도
                n := n + 1;
                candidate := base_nick || n::text;
                IF n > 50 THEN
                    candidate := base_nick || floor(random() * 1000000)::text;
                END IF;
        END;
    END LOOP;
END;
$function$;
