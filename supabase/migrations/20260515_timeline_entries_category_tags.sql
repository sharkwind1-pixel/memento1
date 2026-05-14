-- 타임라인 일기 카테고리 + 태그 (Phase 3)
-- 적용일: 2026-05-15 (supabase MCP apply_migration로 prod 적용 완료)
--
-- 배경: 블로그/매거진 글이 약속한 "사료 섭취량/배변 상태/행동 변화 시계열" 기능을
--   timeline_entries에 구조화하기 위한 컬럼 추가. 검색/필터 인덱스도 함께.

ALTER TABLE timeline_entries
    ADD COLUMN IF NOT EXISTS category text,
    ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 펫별 날짜순 정렬 (가장 흔한 쿼리)
CREATE INDEX IF NOT EXISTS idx_timeline_entries_pet_date_desc
    ON timeline_entries (pet_id, date DESC);

-- 카테고리 필터
CREATE INDEX IF NOT EXISTS idx_timeline_entries_category
    ON timeline_entries (category)
    WHERE category IS NOT NULL;

-- 태그 배열 검색
CREATE INDEX IF NOT EXISTS idx_timeline_entries_tags_gin
    ON timeline_entries USING GIN (tags);

-- 한글 키워드 검색 (제목 + 본문)
CREATE INDEX IF NOT EXISTS idx_timeline_entries_search
    ON timeline_entries USING GIN (
        to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
    );

COMMENT ON COLUMN timeline_entries.category IS
    '카테고리: meal / poop / behavior / health / training / play / etc';
COMMENT ON COLUMN timeline_entries.tags IS
    '자유 태그 배열';
