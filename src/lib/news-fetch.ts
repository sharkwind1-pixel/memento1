/**
 * news-fetch.ts — 네이버 뉴스 검색 API로 화제 뉴스 수집 (자동 게시용).
 *
 * 법적 안전:
 *  - 공식 네이버 검색 API(상용 허용 + 출처표기) 사용. 크롤링/스크래핑 아님.
 *  - 본문/이미지 전문 복제 X → 제목 + API description 스니펫(짧은 요약) + 원문 링크만.
 * 톤 안전:
 *  - 사망·폭력·성범죄·자살·마약 등 자극/그래픽 뉴스는 키워드 denylist로 제외.
 *  - 화제뉴스 + 사건사고(화재·적발·검거·리콜 등 비그래픽)를 라운드로빈으로 섞어 노출.
 *  - "조회수 랭킹" API는 없으므로(공식 API 미제공) 화제성 키워드 + 최신순으로 근사.
 *
 * 환경변수: NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (naver-location.ts와 동일)
 */

export interface NewsItem {
    title: string;
    summary: string;
    link: string; // 원문 링크 (originallink 우선)
    source: string; // 출처 도메인
    pubDate: string;
}

// 흥미·조회수 위주(연예·화제·예능)로 검색. 자극·정치는 아래 필터로 계속 차단.
const QUERY_POOL = [
    "연예", "스타", "화제", "근황", "예능", "드라마", "아이돌", "방송", "공개", "역대급",
];

// 사건사고/화제 이슈. 그래픽(사망·폭력 등)은 SENSITIVE에서 계속 차단되어 비그래픽만 살아남음.
const INCIDENT_POOL = [
    "사건사고", "화재", "사고", "논란", "단독", "포착",
];

// ⚠️ 지루한 기업/행정/PR성 뉴스 제외 (사용자 요청: 건설 협약·보험상품·매실 출하·주의보 같은 건 빼라).
//    제목/요약 어느 쪽에 걸려도 제외 → 흥미 없는 보도자료성 기사 차단.
const BORING = [
    "협약", "업무협약", "MOU", "양해각서", "인사이트", "컨퍼런스", "콘퍼런스", "세미나", "포럼", "심포지엄", "간담회",
    "출하", "수확", "작황", "분기 실적", "영업이익", "공시", "IR ", "보험상품", "약관",
    "입찰", "조달", "발주", "용역", "예산안", "조례", "행정처분", "특별단속", "주의보", "경보 발령",
    "진흥원", "공단", "협회", "위원회 출범", "지원사업 공고", "채용 공고", "박람회 개최", "기념식", "위촉",
];

// 자극/그래픽 제외 (반려동물 추모·힐링 커뮤니티 톤 보호). 제목/요약 어느 쪽에 걸려도 제외.
const SENSITIVE = [
    "사망", "숨진", "숨져", "숨졌", "주검", "시신", "시체", "토막", "부고", "빈소", "영안실", "유골", "장례",
    "살해", "살인", "흉기", "칼부림", "찔러", "피살", "총격", "폭행", "집단폭행", "린치", "납치",
    "성폭행", "성추행", "강간", "성범죄", "몰카", "불법촬영", "아동학대", "학대",
    "자살", "극단적 선택", "극단 선택", "목숨을 끊", "투신", "음독",
    "마약", "필로폰", "대마", "흉기난동", "난동",
    "참변", "참사", "끔찍", "잔혹", "엽기", "처참", "추락사", "감전사", "익사", "분신",
    "전쟁", "폭격", "테러", "공습", "학살",
    "변사", "고독사", "암매장", "백골", "고문", "참수", "인신매매", "감금", "방화", "유서",
];

// 정치/선거 뉴스 제외 (사용자 요청 — 커뮤니티 중립성·톤 보호). 제목/요약 어느 쪽에 걸려도 제외.
const POLITICAL = [
    "정치", "대통령", "대통령실", "청와대", "국회", "여당", "야당", "국회의원", "장관", "총리",
    "총선", "대선", "지방선거", "보궐선거", "선거", "공천", "여야", "원내대표", "당대표",
    "국민의힘", "더불어민주당", "민주당", "조국혁신당", "개혁신당", "정의당",
    "탄핵", "청문회", "개각", "국정감사", "국정조사", "특검", "비대위",
    "북한", "김정은", "대북", "외교부", "통일부",
];

function decodeEntities(s: string): string {
    return s
        .replace(/<\/?b>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isSensitive(text: string): boolean {
    return SENSITIVE.some((w) => text.includes(w));
}

function isPolitical(text: string): boolean {
    return POLITICAL.some((w) => text.includes(w));
}

function isBoring(text: string): boolean {
    return BORING.some((w) => text.includes(w));
}

function hostFromUrl(u: string): string {
    try {
        return new URL(u).hostname.replace(/^www\./, "");
    } catch {
        return "출처";
    }
}

interface NaverNewsRaw {
    title: string;
    originallink: string;
    link: string;
    description: string;
    pubDate: string;
}

async function searchNews(query: string, display = 20): Promise<NaverNewsRaw[]> {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) return [];
    try {
        const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&sort=date`;
        const res = await fetch(url, {
            headers: {
                "X-Naver-Client-Id": clientId,
                "X-Naver-Client-Secret": clientSecret,
            },
            cache: "no-store",
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []) as NaverNewsRaw[];
    } catch {
        return [];
    }
}

/**
 * 화제 뉴스 후보 수집 — 정제 + 자극 필터 + 링크 중복 제거.
 * @param dayN 키워드 로테이션 시드(날짜 기반). 같은 날은 같은 키워드 셋.
 * @param limit 최대 후보 수
 */
export async function fetchPopularNews(dayN: number, limit = 12): Promise<NewsItem[]> {
    // 날짜 기반 키워드 선택: 화제 2개 + 사건사고 1개 (매일 다른 조합).
    // 소스 순서를 [화제, 사건사고, 화제]로 두고 아래에서 라운드로빈 인터리브 → 사건사고가 상위에 섞여
    // 하루 게시분(상위 1~2건)에 '화제 + 사건사고'가 함께 노출됨.
    const viral0 = QUERY_POOL[dayN % QUERY_POOL.length];
    const viral1 = QUERY_POOL[(dayN + 1) % QUERY_POOL.length];
    const incident = INCIDENT_POOL[dayN % INCIDENT_POOL.length];
    const picks = [viral0, incident, viral1];
    const batches = await Promise.all(picks.map((q) => searchNews(q, 20)));

    // 각 배치를 자극/정치 필터 + 정제 (배치 순서 유지)
    const cleaned: NewsItem[][] = batches.map((batch) => {
        const list: NewsItem[] = [];
        for (const raw of batch) {
            const title = decodeEntities(raw.title || "");
            const summary = decodeEntities(raw.description || "");
            const link = (raw.originallink || raw.link || "").trim();
            if (!title || !link) continue;
            if (title.length < 8) continue; // 너무 짧은(잘린) 제목 제외
            if (isBoring(title) || isBoring(summary)) continue; // ★지루한 기업/행정/PR성 뉴스 제외(협약·보험·출하·주의보 등)
            if (isSensitive(title) || isSensitive(summary)) continue; // 사망/폭력/성범죄 등 그래픽 제외
            if (isPolitical(title) || isPolitical(summary)) continue; // 정치/선거 제외
            list.push({
                title,
                summary,
                link,
                source: hostFromUrl(link),
                pubDate: raw.pubDate || "",
            });
        }
        return list;
    });

    // 라운드로빈 인터리브(화제↔사건사고 번갈아) + 링크 중복 제거
    const seen = new Set<string>();
    const out: NewsItem[] = [];
    let idx = 0;
    let advanced = true;
    while (out.length < limit && advanced) {
        advanced = false;
        for (const list of cleaned) {
            if (idx >= list.length) continue;
            advanced = true;
            const item = list[idx];
            if (seen.has(item.link)) continue;
            seen.add(item.link);
            out.push(item);
            if (out.length >= limit) break;
        }
        idx++;
    }
    return out;
}
