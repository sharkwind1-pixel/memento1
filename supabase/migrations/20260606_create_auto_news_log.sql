-- 자동 뉴스 게시(콩콩 계정) 중복 방지 로그 (2026-06-06 적용)
-- /api/cron/news-post 가 같은 원문 링크를 두 번 게시하지 않도록 link를 PK로 기록.
CREATE TABLE IF NOT EXISTS public.auto_news_log (
    link text PRIMARY KEY,
    title text,
    posted_at timestamptz NOT NULL DEFAULT now()
);

-- 서비스 롤(크론)만 접근. 일반 유저/anon 차단 (정책 없음 = deny-all).
ALTER TABLE public.auto_news_log ENABLE ROW LEVEL SECURITY;
