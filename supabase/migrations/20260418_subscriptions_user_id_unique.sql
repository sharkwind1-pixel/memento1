-- 20260418_subscriptions_user_id_unique
-- subscriptions.user_id에 UNIQUE 제약 추가.
--
-- 배경: payments/complete + subscribe/complete에서 `onConflict: "user_id"` upsert를
-- 호출하는데, UNIQUE 제약이 없어서 실제로는 ON CONFLICT 매칭이 안 돼 에러 또는
-- 중복 INSERT 위험이 있었다. 2026-04-18 기준 subscriptions row 0개라
-- 기존 데이터 정리는 불필요.
--
-- 재실행 안전성: 같은 이름 제약이 이미 있으면 스킵.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.subscriptions'::regclass
          AND contype = 'u'
          AND conname = 'subscriptions_user_id_key'
    ) THEN
        ALTER TABLE public.subscriptions
            ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
    END IF;
END $$;
