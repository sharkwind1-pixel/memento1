-- memory_albums concept CHECK 제약조건 확장
-- 기존: ('anniversary', 'mood', 'random') → 확장: + ('birthday', 'adoption', 'memorial')
-- cron/daily-greeting/albums에서 6가지 concept 사용 중이므로 DB도 맞춤

-- 기존 CHECK 제약조건 삭제 후 재생성
ALTER TABLE memory_albums DROP CONSTRAINT IF EXISTS memory_albums_concept_check;
ALTER TABLE memory_albums ADD CONSTRAINT memory_albums_concept_check
    CHECK (concept IN ('anniversary', 'mood', 'random', 'birthday', 'adoption', 'memorial'));
