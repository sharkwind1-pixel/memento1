-- 20260614_nickname_set_at.sql
-- 신규 유저 닉네임 설정 모달이 한 번도 안 뜨던 버그 수정.
--
-- 원인: handle_new_user 트리거가 가입 시 nickname을 항상 자동으로 채운다
--   (raw_user_meta_data.nickname → 없으면 이메일 앞부분 → 그것도 없으면 'user').
--   그런데 프론트(page.tsx)는 "nickname IS NULL"일 때만 NicknameSetupModal을 띄웠다.
--   → nickname이 절대 NULL이 아니므로 모달이 영원히 안 떴고, 신규 유저는
--     /u/이메일앞부분 펫홈 주소에 그대로 고정됐다(최근 가입 15명 중 13명).
--
-- 해결: "유저가 직접 닉네임을 확정했는지"를 별도 컬럼으로 추적.
--   - handle_new_user 트리거의 INSERT는 이 컬럼을 건드리지 않으므로 신규행은 자동 NULL → 모달 노출.
--   - NicknameSetupModal 완료 시 nickname_set_at = now() 기록 → 다음 진입부터 재노출 안 함.
--   - 기존 유저는 이미 닉네임/펫홈이 자리잡았으므로 backfill로 채워 재노출 차단.
--   ※ nickname 자동 채움은 유지(펫홈 URL/표시 불변식 보호, NULL 크래시 방지).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname_set_at timestamptz;

UPDATE public.profiles
SET nickname_set_at = COALESCE(created_at, now())
WHERE nickname_set_at IS NULL;
