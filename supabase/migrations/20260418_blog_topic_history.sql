-- 20260418_blog_topic_history
-- 블로그 크론 전송 이력 저장. 최근 N일 내 같은 topic 재전송 방지용.
--
-- 배경: 블로그 크론이 BLOG_TOPICS 배열에서 daysSinceEpoch 기반 모듈로 선택하는데,
-- 펫로스 토픽 풀이 10개라 10일마다 같은 topic이 돌아와서 구독자가 "똑같은 내용
-- 또 왔네" 체감. 이 테이블에 전송 이력을 쌓아 최근 14일 내 전송된 topic은
-- 재선택에서 제외한다.

CREATE TABLE IF NOT EXISTS public.blog_topic_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    category TEXT NOT NULL,
    species TEXT,
    title TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_topic_history_sent_at
    ON public.blog_topic_history(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_topic_history_topic_sent_at
    ON public.blog_topic_history(topic, sent_at DESC);

-- RLS: 서비스 롤만 접근 (일반 유저에게는 노출될 이유 없음)
ALTER TABLE public.blog_topic_history ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.blog_topic_history IS
    '블로그 크론 전송 이력. 최근 N일 내 중복 topic 선택 방지용.';
