/**
 * manse.ts — 정통 만세력 사주팔자 계산 엔진 (순수 함수, 웹·모바일 공유용).
 *
 * 4기둥(년/월/일/시) 각각 천간(10)+지지(12) = 60갑자.
 * 정확도 급소 처리:
 *  - 일주(日柱): 율리우스적일(JDN, 정오) 기반. stemIdx=(JDN-1)%10, branchIdx=(JDN+1)%12.
 *    (검증: ytliu0 ChineseCalendar — JDN 2371629(1781-03-13) → 壬戌)
 *  - 년주: 1/1이 아니라 입춘(태양황경 315°) 경계. 입춘 순간 vs 출생 순간 비교.
 *  - 월주: 절(節, 12개 홀수절기) 경계 = 태양황경. λ로 월지 직접 매핑 + 오호둔으로 월간.
 *  - 시주: 출생시각(2시간 지지블록) + 오자둔(일간→자시 천간).
 *
 * 시간대: 한국 표준시(KST=UTC+9) 기준. 진태양시(경도 보정 ~30분)·ΔT는 미적용(MVP).
 *   → 절기 경계 ±수분 이내 출생은 오차 가능. 시간 모르면 정오(12:00) 가정 + 시주 생략.
 * 야자시: 23:00~24:00은 子시로 보되 일주는 당일(자정 경계) 기준(국내 통용 단순안).
 */

export const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const STEMS_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
export const BRANCHES_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export const BRANCH_ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"] as const;

// 오행: 천간 갑을=목, 병정=화, 무기=토, 경신=금, 임계=수
export const STEM_ELEMENT = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"] as const;
// 지지 오행: 인묘=목, 사오=화, 진술축미=토, 신유=금, 자해=수
export const BRANCH_ELEMENT = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"] as const;
export type Element = "목" | "화" | "토" | "금" | "수";

export interface Pillar {
    stem: number;   // 0=갑 .. 9=계
    branch: number; // 0=자 .. 11=해
}

export interface SajuChart {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null; // 출생시각 모르면 null
    knownTime: boolean;
    /** 오행 분포 (천간+지지 합산, 시주 포함 여부는 knownTime) */
    elements: Record<Element, number>;
    /** 일간(日干) — 사주의 '나'. stem index */
    dayMaster: number;
    /** 띠 (년지 동물) */
    zodiac: string;
}

// ── 천문/달력 유틸 ─────────────────────────────────────────────

/** 그레고리력 Y,M,D의 정오 율리우스적일(정수). M:1-12 */
export function gregorianToJDN(y: number, m: number, d: number): number {
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return (
        d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
        Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045
    );
}

/** KST 민간시각(Y,M,D,H,Min)을 UTC 기준 율리우스일(소수)로. 정오 JDN 기준 보정. */
function kstToJD_UTC(y: number, m: number, d: number, h: number, min: number): number {
    const jdnNoon = gregorianToJDN(y, m, d); // 그 날 정오의 JD(.0)
    return jdnNoon + (h - 12) / 24 + min / 1440 - 9 / 24; // KST→UTC
}

const D2R = Math.PI / 180;

/** 태양 겉보기 황경(도, 0-360). Meeus 저정밀(±0.01° 수준 — 절기 판정에 충분). jd: UTC 율리우스일 */
export function solarLongitude(jd: number): number {
    const T = (jd - 2451545.0) / 36525.0;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const Mr = M * D2R;
    const C =
        (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
        (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
        0.000289 * Math.sin(3 * Mr);
    const trueLong = L0 + C;
    // 겉보기황경 보정(광행차 -0.00569° + 장동 근사) — 절기 순간 정확도 ~수분 → ~1분 이내로.
    const omega = 125.04 - 1934.136 * T;
    const apparent = trueLong - 0.00569 - 0.00478 * Math.sin(omega * D2R);
    return ((apparent % 360) + 360) % 360;
}

/** 특정 연도의 입춘(황경 315°) 순간을 UTC 율리우스일로. (1월말~2월초 단조구간 이분탐색) */
function ipchunJD(year: number): number {
    let lo = kstToJD_UTC(year, 1, 28, 0, 0);
    let hi = kstToJD_UTC(year, 2, 10, 0, 0);
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        // 1월말~2월초 황경은 ~305→322로 단조증가, 360 wrap 없음
        if (solarLongitude(mid) < 315) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

function mod(n: number, m: number): number {
    return ((n % m) + m) % m;
}

// ── 사주 계산 ─────────────────────────────────────────────

export interface SajuInput {
    year: number;
    month: number; // 1-12 (양력)
    day: number;
    hour?: number;   // 0-23 (KST). knownTime=false면 무시
    minute?: number; // 0-59
    knownTime: boolean;
}

export function computeSaju(input: SajuInput): SajuChart {
    const { year, month, day, knownTime } = input;
    const hour = knownTime ? (input.hour ?? 0) : 12; // 시간 모르면 정오로 황경 평가
    const minute = knownTime ? (input.minute ?? 0) : 0;

    const birthJD = kstToJD_UTC(year, month, day, hour, minute);
    const lambda = solarLongitude(birthJD);

    // ── 일주: 정오 JDN 기반 (자정 경계 = 민간 양력일) ──
    const jdn = gregorianToJDN(year, month, day);
    const dayStem = mod(jdn - 1, 10);
    const dayBranch = mod(jdn + 1, 12);

    // ── 년주: 입춘 경계 ──
    const ipchun = ipchunJD(year);
    const ganzhiYear = birthJD < ipchun ? year - 1 : year;
    const yearStem = mod(ganzhiYear - 4, 10);
    const yearBranch = mod(ganzhiYear - 4, 12);

    // ── 월주: 절(節) 경계 = 황경. 입춘315°→寅, 30°마다 다음 지지 ──
    const monthOrder = Math.floor(mod(lambda - 315, 360) / 30); // 0=寅월 .. 11=丑월
    const monthBranch = mod(monthOrder + 2, 12);                // 寅=2
    // 오호둔: 년간 → 寅월 천간. 寅월간idx = (년간%5)*2+2
    const yinStem = mod((yearStem % 5) * 2 + 2, 10);
    const monthStem = mod(yinStem + monthOrder, 10);

    // ── 시주 ──
    let hourPillar: Pillar | null = null;
    if (knownTime) {
        const hourBranch = Math.floor(mod(hour + 1, 24) / 2) % 12; // 23~01=자(0)
        // 오자둔: 일간 → 子시 천간. 子시간idx=(일간%5)*2
        const ziStem = mod((dayStem % 5) * 2, 10);
        const hourStem = mod(ziStem + hourBranch, 10);
        hourPillar = { stem: hourStem, branch: hourBranch };
    }

    const yearP: Pillar = { stem: yearStem, branch: yearBranch };
    const monthP: Pillar = { stem: monthStem, branch: monthBranch };
    const dayP: Pillar = { stem: dayStem, branch: dayBranch };

    // 오행 분포
    const elements: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    const pillars = [yearP, monthP, dayP, ...(hourPillar ? [hourPillar] : [])];
    for (const p of pillars) {
        elements[STEM_ELEMENT[p.stem] as Element]++;
        elements[BRANCH_ELEMENT[p.branch] as Element]++;
    }

    return {
        year: yearP,
        month: monthP,
        day: dayP,
        hour: hourPillar,
        knownTime,
        elements,
        dayMaster: dayStem,
        zodiac: BRANCH_ANIMALS[yearBranch],
    };
}

// ── 표기 헬퍼 ─────────────────────────────────────────────

export function pillarName(p: Pillar): string {
    return STEMS[p.stem] + BRANCHES[p.branch];
}
export function pillarHanja(p: Pillar): string {
    return STEMS_HANJA[p.stem] + BRANCHES_HANJA[p.branch];
}

/** 입춘 순간을 KST "YYYY-MM-DD HH:MM"로 (검증/표시용) */
export function ipchunKST(year: number): string {
    const jdUTC = ipchunJD(year);
    const jdKST = jdUTC + 9 / 24;
    // JD(.0=정오) → 그레고리력. 0.5 더해 자정기준 정수일로.
    const z = Math.floor(jdKST + 0.5);
    const f = jdKST + 0.5 - z;
    let a = z;
    if (z >= 2299161) {
        const alpha = Math.floor((z - 1867216.25) / 36524.25);
        a = z + 1 + alpha - Math.floor(alpha / 4);
    }
    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const dd = Math.floor(365.25 * c);
    const e = Math.floor((b - dd) / 30.6001);
    const dayFrac = b - dd - Math.floor(30.6001 * e) + f;
    const D = Math.floor(dayFrac);
    const M = e < 14 ? e - 1 : e - 13;
    const Y = M > 2 ? c - 4716 : c - 4715;
    const hourF = (dayFrac - D) * 24;
    const H = Math.floor(hourF);
    const Min = Math.round((hourF - H) * 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${Y}-${pad(M)}-${pad(D)} ${pad(H)}:${pad(Min)}`;
}
