-- ============================================================================
-- ip_blocks 테이블 (IP 차단 영속화 - 서버리스 환경 대응)
-- 2026-03-06
-- ============================================================================

CREATE TABLE IF NOT EXISTS ip_blocks (
    ip_address TEXT PRIMARY KEY,
    blocked_until TIMESTAMPTZ NOT NULL,
    reason TEXT DEFAULT 'rate_limit_violation',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 만료된 차단 자동 정리용 인덱스
CREATE INDEX IF NOT EXISTS idx_ip_blocks_until ON ip_blocks(blocked_until);

-- RLS: service_role만 접근 (일반 유저 접근 불가)
ALTER TABLE ip_blocks ENABLE ROW LEVEL SECURITY;

-- 모든 일반 유저 접근 차단 (service_role key만 bypass)
-- RLS가 활성화되면 정책이 없는 한 모든 접근이 차단됨

COMMENT ON TABLE ip_blocks IS 'IP 차단 테이블 - rate limit 위반 IP를 서버 재시작 후에도 차단 유지';
