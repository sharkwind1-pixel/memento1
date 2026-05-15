-- 기존 timeline_entries.category NULL 8건 키워드 기반 백필
-- (20260515_timeline_entries_category_tags.sql 적용 이전 row 보정)
--
-- 9번 팩트체커 잔존 minor risk #3 해결.
-- 키워드 우선순위: 작별/추모 → 여행 → 놀이(산책) → 사료 → 배변 → 건강 → 훈련 → 일상(default)
-- mood='sad' AND 작별/이별/보고싶/사랑한다 → 특별한날 (추모 펫의 작별 인사)

UPDATE timeline_entries
SET category = CASE
    WHEN mood = 'sad' AND (
        title ILIKE '%작별%' OR title ILIKE '%이별%'
        OR content ILIKE '%보고싶%' OR content ILIKE '%사랑한다%'
    )
        THEN '특별한날'
    WHEN title ILIKE '%꽃놀이%' OR title ILIKE '%여행%' OR title ILIKE '%놀러%'
        OR content ILIKE '%꽃놀이%' OR content ILIKE '%여행%' OR content ILIKE '%놀러%'
        THEN '여행'
    WHEN title ILIKE '%산책%' OR content ILIKE '%산책%'
        OR title ILIKE '%놀이%' OR content ILIKE '%놀이%'
        THEN '놀이'
    WHEN title ILIKE '%사료%' OR title ILIKE '%밥%'
        OR content ILIKE '%사료%' OR content ILIKE '%밥%'
        THEN '사료'
    WHEN title ILIKE '%배변%' OR title ILIKE '%똥%' OR title ILIKE '%오줌%'
        OR content ILIKE '%배변%' OR content ILIKE '%똥%' OR content ILIKE '%오줌%'
        THEN '배변'
    WHEN title ILIKE '%병원%' OR title ILIKE '%약%' OR title ILIKE '%수의사%' OR title ILIKE '%접종%'
        OR content ILIKE '%병원%' OR content ILIKE '%약%' OR content ILIKE '%수의사%' OR content ILIKE '%접종%'
        THEN '건강'
    WHEN title ILIKE '%훈련%' OR content ILIKE '%훈련%'
        OR title ILIKE '%교육%' OR content ILIKE '%교육%'
        THEN '훈련'
    ELSE '일상'
END
WHERE category IS NULL;
