-- 인덱스 중복 정리: idx_timeline_pet (pet_id) 는
-- idx_timeline_entries_pet_date_desc (pet_id, date DESC)의 subset이라 dead weight.
-- 9번 팩트체커 권고로 DROP. (2026-05-15 supabase MCP apply_migration로 prod 적용 완료)
DROP INDEX IF EXISTS public.idx_timeline_pet;
