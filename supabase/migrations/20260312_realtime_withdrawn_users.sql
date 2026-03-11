-- withdrawn_users 테이블에 Realtime 활성화
-- 관리자가 탈퇴/차단 처리 시 모든 기기에서 즉시 감지하기 위함
ALTER PUBLICATION supabase_realtime ADD TABLE withdrawn_users;
