-- =============================================================================
-- 양방향 실시간 동기화 활성화
-- 모바일 앱 ↔ 웹 사이의 변경을 0.5초 이내 반영하기 위한 Supabase Realtime publication.
--
-- 적용 대상:
--   - profiles          (포인트, 프리미엄, 구독 등급, 닉네임 등)
--   - pets              (펫 추가/수정/삭제/대표지정/추모전환)
--   - pet_media         (사진 업로드/삭제)
--   - notifications     (새 알림 도착)
--   - community_posts   (새 글, 좋아요, 댓글 카운트, 숨김 등)
--   - post_comments     (댓글 추가/수정/삭제, 좋아요/비추천)
--   - pet_reminders     (리마인더 추가/수정/삭제/토글)
--   - timeline_entries  (일기 추가/수정/삭제, AI 자동 기록)
--
-- 안전성: 이미 추가된 테이블은 중복 추가 시 에러 발생 → DO 블록으로 try/catch.
-- =============================================================================

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'profiles',
        'pets',
        'pet_media',
        'notifications',
        'community_posts',
        'post_comments',
        'pet_reminders',
        'timeline_entries'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
            RAISE NOTICE 'Added % to supabase_realtime publication', tbl;
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Table % already in supabase_realtime publication (skipped)', tbl;
        WHEN undefined_table THEN
            RAISE NOTICE 'Table % does not exist (skipped)', tbl;
        END;
    END LOOP;
END $$;
