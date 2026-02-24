-- AI 채팅 일일 사용량 추적 테이블 (Vercel 서버리스 대응)
-- 기존 메모리 Map 기반 → DB 기반으로 전환하여 인스턴스 간 공유

CREATE TABLE IF NOT EXISTS user_daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,                          -- user_id 또는 IP
    usage_type TEXT NOT NULL DEFAULT 'ai_chat',        -- 사용량 타입
    usage_date DATE NOT NULL,                          -- KST 기준 날짜
    request_count INTEGER DEFAULT 0,                   -- 요청 횟수
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(identifier, usage_type, usage_date)
);

-- 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_usage_lookup
    ON user_daily_usage(identifier, usage_type, usage_date);

-- 오래된 데이터 정리용 인덱스 (30일 이상 된 레코드 삭제 시)
CREATE INDEX IF NOT EXISTS idx_daily_usage_date
    ON user_daily_usage(usage_date);

-- RLS: service role key로 접근하므로 최소 정책
ALTER TABLE user_daily_usage ENABLE ROW LEVEL SECURITY;

-- service role은 RLS 우회하므로 별도 정책 불필요
-- 혹시 anon key fallback 시를 위한 최소 정책
CREATE POLICY "Service access only" ON user_daily_usage
    FOR ALL USING (true);
