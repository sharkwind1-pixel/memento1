-- 20260614_fix_chat_messages_select_leak.sql
-- 보안(HIGH): 사적 AI 펫톡 대화 전건이 누구에게나 읽혔음.
--
-- 원인: chat_messages에 올바른 소유자 SELECT 정책("Users can view own chat messages",
--   auth.uid()=user_id)이 있는데도, 레거시 "채팅 조회" 정책이 SELECT qual=true,
--   role=PUBLIC으로 존재 → RLS 정책은 OR(permissive)이라 anon/authenticated 누구나
--   전 유저의 chat_messages(사적 대화)를 SELECT 가능했음. anon 키는 클라 번들에 있으므로
--   로그인 없이도 전체 대화 덤프 가능했던 셈.
--
-- 해결: 잘못된 PUBLIC true 정책 제거. 남은 소유자 정책만으로 본인 대화만 조회.
--   서버 경로(요약/저장 등)는 service_role로 RLS를 우회하므로 영향 없음.
--
-- 검증: 제거 후 chat_messages SELECT 정책 = "Users can view own chat messages"(auth.uid()=user_id) 단독.
--   (neighbors는 컬럼 GRANT로 별도 보호됨 — neighbor_nickname 미노출 확인. moderation_logs/
--    user_daily_usage의 true 정책은 role=service_role이라 안전.)

DROP POLICY IF EXISTS "채팅 조회" ON public.chat_messages;
