/**
 * hashtag.ts
 * 해시태그 추출/검색 유틸리티
 *
 * 게시글 본문/제목에서 #태그를 자동 추출하고,
 * 해시태그 기반 탐색을 지원.
 *
 * DB 스키마 변경 없이 기존 content 필드에서 추출.
 * 향후 별도 tags[] 컬럼 + 인덱스 추가 시 성능 개선 가능.
 */

/**
 * 텍스트에서 해시태그 추출
 * - #한글, #영문, #숫자, #언더스코어 지원
 * - 공백/특수문자로 태그 구분
 * - 중복 제거, 소문자 정규화
 * - 최대 20개까지
 */
export function extractHashtags(text: string): string[] {
    if (!text) return [];

    // #으로 시작하는 한글/영문/숫자/언더스코어 연속
    const regex = /#([가-힣a-zA-Z0-9_]+)/g;
    const tags = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        const tag = match[1].toLowerCase();
        if (tag.length >= 2 && tag.length <= 30) {
            tags.add(tag);
        }
        if (tags.size >= 20) break;
    }

    return Array.from(tags);
}

/**
 * 해시태그를 클릭 가능한 링크로 변환 (렌더링용)
 * - #골든리트리버 → <span class="hashtag">#골든리트리버</span>
 * - XSS 방지: 태그 이름은 정규식으로 안전하게 추출
 */
export function renderHashtags(text: string): string {
    if (!text) return text;
    return text.replace(
        /#([가-힣a-zA-Z0-9_]{2,30})/g,
        '<span class="text-memento-500 hover:text-memento-600 cursor-pointer font-medium" data-hashtag="$1">#$1</span>'
    );
}

/**
 * 인기 해시태그 집계용 — 여러 게시글의 content에서 태그 빈도 계산
 */
export function aggregateHashtags(
    contents: string[],
    limit: number = 20
): Array<{ tag: string; count: number }> {
    const counts = new Map<string, number>();

    for (const content of contents) {
        const tags = extractHashtags(content);
        for (const tag of tags) {
            counts.set(tag, (counts.get(tag) || 0) + 1);
        }
    }

    return Array.from(counts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}
