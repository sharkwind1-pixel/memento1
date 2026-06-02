-- chat_messages 재시도 중복행 방지: dedup_key UNIQUE
--
-- 배경: saveMessage(lib/agent/memory.ts)가 silent-commit(서버엔 저장됐는데 응답이 유실)된 뒤
-- 재시도하면 동일 메시지가 중복 INSERT 되는 문제. 호출당 UUID 1개를 dedup_key로 재사용하고
-- UNIQUE + ON CONFLICT DO NOTHING(upsert ignoreDuplicates)으로 차단한다.
--
-- 기존 행은 dedup_key NULL. PG 기본 NULLS DISTINCT라 다중 NULL이 공존하므로 비부분 UNIQUE로 충분하고,
-- 비부분이어야 supabase-js의 onConflict("dedup_key") ON CONFLICT 추론이 동작한다(부분 인덱스면 깨짐).
--
-- 적용: 2026-06-02 prod(kuqhjgrlrzskvuutqbce) apply_migration 으로 선반영 후 repo 동기화.

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS dedup_key text;

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_dedup_key_uniq
    ON public.chat_messages (dedup_key);
