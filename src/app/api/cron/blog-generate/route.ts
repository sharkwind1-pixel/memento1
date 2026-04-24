/**
 * 네이버 블로그 초안 자동 생성 크론
 * GET /api/cron/blog-generate
 *
 * 매일 09시(KST) 실행
 * 1. 토픽 선택 (카테고리별 세부 주제, 계절 반영)
 * 2. Tavily로 최신 정보/학술 자료 검색
 * 3. 검색 결과를 GPT 컨텍스트에 주입 → 검증된 정보 기반 블로그 글 생성
 * 4. 텔레그램으로 초안 전송
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret, getKstTime } from "@/lib/cron-utils";
import {
    type PetSpecies,
    SPECIES_CONTEXT,
    SPECIES_ENGLISH_KEYWORDS,
    isExoticSpecies,
} from "@/lib/species-context";

/** 서비스 롤 Supabase — blog_topic_history + magazine_articles 조회용 (서버 전용) */
function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================================
// 토픽 풀 — 종별로 분류된 디테일한 세부 주제
// ============================================================

interface BlogTopic {
    category: "반려동물 정보" | "펫로스를 이겨내기" | "메멘토애니 소식";
    species: PetSpecies;
    topic: string;
    searchQuery: string; // Tavily 검색 쿼리
    keywords: string[];
    seasonal?: number[]; // 해당 월에만 등장 (없으면 연중)
}

const BLOG_TOPICS: BlogTopic[] = [
    // ============================================================
    // 강아지 건강/케어
    // ============================================================
    { category: "반려동물 정보", species: "강아지", topic: "강아지 발톱 안전하게 깎는 방법과 출혈 대처법", searchQuery: "강아지 발톱 깎기 방법 출혈 응급처치 수의사", keywords: ["강아지발톱", "강아지발톱깎기", "반려견케어"] },
    { category: "반려동물 정보", species: "강아지", topic: "강아지 구강 관리 — 치석 제거와 양치 습관 들이기", searchQuery: "강아지 양치 방법 치석 제거 구강관리 수의사 권장", keywords: ["강아지양치", "강아지치석", "반려견구강관리"] },
    { category: "반려동물 정보", species: "강아지", topic: "강아지 귀 청소 주기와 올바른 방법 (외이염 예방)", searchQuery: "강아지 귀 청소 외이염 예방 수의사 방법", keywords: ["강아지귀청소", "강아지외이염", "반려견건강"] },
    { category: "반려동물 정보", species: "강아지", topic: "강아지 피부병 종류와 증상별 관리법", searchQuery: "강아지 피부병 아토피 습진 종류 치료 수의사", keywords: ["강아지피부병", "강아지아토피", "반려견피부관리"] },
    { category: "반려동물 정보", species: "강아지", topic: "강아지 슬개골 탈구 등급별 증상과 예방 운동", searchQuery: "강아지 슬개골 탈구 등급 증상 예방 운동 수의사", keywords: ["강아지슬개골", "슬개골탈구", "소형견건강"] },
    { category: "반려동물 정보", species: "강아지", topic: "강아지 예방접종 스케줄과 부스터 접종 시기", searchQuery: "강아지 예방접종 스케줄 종합백신 광견병 부스터 2024 2025", keywords: ["강아지예방접종", "강아지백신", "반려견건강검진"] },
    { category: "반려동물 정보", species: "강아지", topic: "강아지 분리불안 — 원인 분석과 단계별 훈련법", searchQuery: "강아지 분리불안 훈련 방법 행동교정 강형욱", keywords: ["강아지분리불안", "분리불안훈련", "강아지행동교정"] },
    { category: "반려동물 정보", species: "강아지", topic: "강아지 산책 후 발바닥 관리와 패드 보호법", searchQuery: "강아지 발바닥 패드 갈라짐 관리 보호 여름 겨울", keywords: ["강아지발바닥", "강아지패드", "반려견산책"] },
    { category: "반려동물 정보", species: "강아지", topic: "강아지 사료 성분표 읽는 법 — 원재료 순서의 비밀", searchQuery: "강아지 사료 성분표 읽는법 원재료 단백질 조지방 분석", keywords: ["강아지사료성분", "사료분석", "반려견영양"] },
    { category: "반려동물 정보", species: "강아지", topic: "강아지 생식 vs 건사료 vs 습식 — 수의 영양학 관점 비교", searchQuery: "강아지 생식 건사료 습식 사료 비교 수의 영양학 장단점", keywords: ["강아지사료비교", "생식사료", "반려견식단"] },
    { category: "반려동물 정보", species: "강아지", topic: "강아지가 먹으면 안 되는 음식 완전 정리 (포도, 자일리톨 등)", searchQuery: "강아지 못 먹는 음식 위험 식품 포도 초콜릿 자일리톨 양파", keywords: ["강아지위험음식", "강아지못먹는음식", "반려견식품안전"] },
    { category: "반려동물 정보", species: "강아지", topic: "노견 사료 선택 가이드 — 관절, 소화, 체중 관리", searchQuery: "노견 시니어 강아지 사료 관절 소화 체중 영양 수의사 추천", keywords: ["노견사료", "시니어강아지", "노견건강관리"] },
    { category: "반려동물 정보", species: "강아지", topic: "말티즈 키울 때 꼭 알아야 할 건강 주의점 5가지", searchQuery: "말티즈 건강 주의점 슬개골 눈물자국 치아 유전질환", keywords: ["말티즈", "말티즈건강", "소형견주의점"] },
    { category: "반려동물 정보", species: "강아지", topic: "푸들 종류와 성격 차이 — 스탠다드부터 토이까지", searchQuery: "푸들 종류 스탠다드 미니어처 토이 성격 차이 특징", keywords: ["푸들종류", "토이푸들", "푸들성격"] },
    { category: "반려동물 정보", species: "강아지", topic: "골든리트리버 성격과 운동량, 건강 관리 포인트", searchQuery: "골든리트리버 성격 운동량 건강관리 고관절 피부", keywords: ["골든리트리버", "대형견", "골든리트리버건강"] },
    { category: "반려동물 정보", species: "강아지", topic: "시바견 특유의 성격과 훈련 시 주의할 점", searchQuery: "시바견 시바이누 성격 특징 훈련 주의점 고집", keywords: ["시바견", "시바이누", "시바견성격"] },
    { category: "반려동물 정보", species: "강아지", topic: "포메라니안 미용 주기와 이중모 관리의 모든 것", searchQuery: "포메라니안 미용 이중모 관리 클리핑 빗질 방법", keywords: ["포메라니안", "포메라니안미용", "이중모관리"] },

    // ============================================================
    // 고양이
    // ============================================================
    { category: "반려동물 정보", species: "고양이", topic: "고양이 구토 색깔별 원인과 병원 가야 할 타이밍", searchQuery: "고양이 구토 원인 색깔 노란 분홍 갈색 병원 수의사", keywords: ["고양이구토", "고양이건강", "반려묘병원"] },
    { category: "반려동물 정보", species: "고양이", topic: "고양이 하부요로계 질환(FLUTD) 예방과 관리", searchQuery: "고양이 하부요로계 질환 FLUTD 방광염 요로결석 예방 수의사", keywords: ["고양이방광염", "FLUTD", "고양이요로결석"] },
    { category: "반려동물 정보", species: "고양이", topic: "고양이 스트레스 신호 7가지와 환경 개선 방법", searchQuery: "고양이 스트레스 증상 신호 행동 변화 환경 풍부화", keywords: ["고양이스트레스", "고양이행동", "고양이환경풍부화"] },
    { category: "반려동물 정보", species: "고양이", topic: "고양이 양치와 구강 관리 — 치은염 예방법", searchQuery: "고양이 양치 방법 치은염 구내염 구강관리 수의사", keywords: ["고양이양치", "고양이치은염", "반려묘구강관리"] },
    { category: "반려동물 정보", species: "고양이", topic: "고양이 예방접종 종류와 실내묘도 맞아야 하는 이유", searchQuery: "고양이 예방접종 종류 실내묘 종합백신 광견병 수의사", keywords: ["고양이예방접종", "고양이백신", "실내묘건강"] },
    { category: "반려동물 정보", species: "고양이", topic: "고양이 사료 성분 분석 — 단백질 함량과 곡물 프리의 진실", searchQuery: "고양이 사료 성분 분석 단백질 곡물 프리 그레인프리 수의 영양학", keywords: ["고양이사료성분", "그레인프리", "반려묘영양"] },
    { category: "반려동물 정보", species: "고양이", topic: "고양이 음수량 늘리는 방법 — 신장 건강의 핵심", searchQuery: "고양이 물 안마심 음수량 늘리기 방법 신장 건강 수의사", keywords: ["고양이음수량", "고양이물", "고양이신장건강"] },
    { category: "반려동물 정보", species: "고양이", topic: "고양이 습식 사료의 중요성과 급여 가이드", searchQuery: "고양이 습식 사료 장점 수분 섭취 급여 방법 혼합급여", keywords: ["고양이습식사료", "고양이사료추천", "혼합급여"] },
    { category: "반려동물 정보", species: "고양이", topic: "고양이 만성신부전(CKD) — 조기 발견 신호와 식이 관리", searchQuery: "고양이 만성신부전 CKD 신장병 증상 식이 처방사료 수의사", keywords: ["고양이신부전", "고양이CKD", "고양이신장식이"] },
    { category: "반려동물 정보", species: "고양이", topic: "고양이 비만 — 진단 기준과 안전한 다이어트 방법", searchQuery: "고양이 비만 진단 BCS 다이어트 체중 감량 안전 수의사", keywords: ["고양이비만", "고양이다이어트", "BCS"] },
    { category: "반려동물 정보", species: "고양이", topic: "코리안숏헤어 성격과 건강 — 한국 고양이의 매력", searchQuery: "코리안숏헤어 코숏 성격 건강 특징 유전질환", keywords: ["코리안숏헤어", "코숏", "한국고양이"] },
    { category: "반려동물 정보", species: "고양이", topic: "러시안블루 성격과 키울 때 주의할 점", searchQuery: "러시안블루 성격 특징 건강 주의점 예민", keywords: ["러시안블루", "러시안블루성격", "반려묘종류"] },
    { category: "반려동물 정보", species: "고양이", topic: "브리티시숏헤어 체중 관리와 건강 체크 포인트", searchQuery: "브리티시숏헤어 체중 관리 비만 건강 심장병 수의사", keywords: ["브리티시숏헤어", "브숏", "고양이비만관리"] },
    { category: "반려동물 정보", species: "고양이", topic: "스코티시폴드 귀 관절 유전 질환의 진실", searchQuery: "스코티시폴드 유전 질환 접힌귀 관절 골연골이형성증", keywords: ["스코티시폴드", "스코티시폴드유전질환", "고양이유전병"] },

    // ============================================================
    // NOTE: 햄스터/토끼/앵무새/파충류/물고기 등 특수반려동물 토픽은
    // 유저 대부분이 강아지/고양이이므로 제거됨 (2026-04-12).
    // 유저 수가 늘고 특수반려동물 유저 비율이 의미있어지면 재추가.
    // ============================================================
    // ============================================================
    // 계절 한정 (모든 종 공통)
    // ============================================================
    { category: "반려동물 정보", species: "공통", topic: "봄철 반려동물 산책 시 진드기/벼룩 예방법", searchQuery: "봄 강아지 고양이 진드기 벼룩 예방 외부기생충 넥스가드", keywords: ["진드기예방", "벼룩예방", "봄산책"], seasonal: [3, 4, 5] },
    { category: "반려동물 정보", species: "공통", topic: "여름 반려동물 열사병 증상과 응급 대처법 (소형 포유류 포함)", searchQuery: "강아지 고양이 햄스터 토끼 열사병 증상 응급처치 여름 더위", keywords: ["열사병", "반려동물여름", "열사병응급"], seasonal: [6, 7, 8] },
    { category: "반려동물 정보", species: "공통", topic: "여름철 어항/사육장 수온 관리 — 쿨링팬과 에어컨", searchQuery: "여름 어항 수온 쿨링팬 에어컨 파충류 사육장 온도", keywords: ["여름어항", "사육장온도", "쿨링팬"], seasonal: [6, 7, 8] },
    { category: "반려동물 정보", species: "공통", topic: "가을 환절기 반려동물 호흡기 질환 주의보", searchQuery: "가을 환절기 강아지 고양이 새 기침 호흡기 질환 예방", keywords: ["환절기건강", "강아지기침", "가을반려동물"], seasonal: [9, 10] },
    { category: "반려동물 정보", species: "공통", topic: "겨울철 보온이 필요한 반려동물 — 종별 적정 온도 가이드", searchQuery: "겨울 반려동물 보온 적정 온도 고슴도치 햄스터 파충류 새", keywords: ["겨울보온", "반려동물겨울", "사육온도"], seasonal: [11, 12, 1, 2] },

    // ============================================================
    // 펫로스를 이겨내기 (종 무관)
    // ============================================================
    { category: "펫로스를 이겨내기", species: "공통", topic: "펫로스 증후군 — 의학적으로 인정된 상실 반응의 이해", searchQuery: "펫로스 증후군 증상 극복 상실감 심리학 연구 의학", keywords: ["펫로스", "펫로스증후군", "반려동물상실"] },
    { category: "펫로스를 이겨내기", species: "공통", topic: "반려동물을 떠나보낸 후 죄책감이 드는 마음에 대하여", searchQuery: "펫로스 죄책감 안락사 결정 후회 심리 상담", keywords: ["펫로스죄책감", "반려동물이별", "펫로스마음"] },
    { category: "펫로스를 이겨내기", species: "공통", topic: "아이와의 추억을 따뜻하게 간직하는 방법들", searchQuery: "반려동물 추모 방법 추억 보관 메모리얼 디지털 기록", keywords: ["반려동물추모", "펫메모리얼", "추억간직"] },
    { category: "펫로스를 이겨내기", species: "공통", topic: "아이를 보내고 일상으로 돌아가는 과정", searchQuery: "펫로스 극복 일상 회복 애도 과정 시간 치유", keywords: ["펫로스극복", "반려동물이별후", "애도과정"] },
    { category: "펫로스를 이겨내기", species: "공통", topic: "아이가 아플 때 보호자가 알아두면 좋은 것들 — 마지막 시간의 준비", searchQuery: "반려동물 임종 준비 호스피스 마지막 시간 보호자 가이드", keywords: ["반려동물임종", "펫호스피스", "마지막시간준비"] },
    { category: "펫로스를 이겨내기", species: "공통", topic: "가족 구성원이 펫로스를 겪을 때 옆에서 할 수 있는 일", searchQuery: "펫로스 위로 방법 가족 친구 도움 공감 하지말아야할말", keywords: ["펫로스위로", "펫로스가족", "반려동물공감"] },
    { category: "펫로스를 이겨내기", species: "공통", topic: "두 번째 아이를 맞이하는 마음의 준비", searchQuery: "펫로스 후 새 반려동물 입양 시기 마음 준비 죄책감", keywords: ["펫로스후입양", "새반려동물", "반려동물재입양"] },
    { category: "펫로스를 이겨내기", species: "공통", topic: "반려동물 장례 절차 — 화장, 수목장, 자연장 비교", searchQuery: "반려동물 장례 화장 수목장 자연장 비용 절차 장례식장", keywords: ["반려동물장례", "펫장례", "동물장례식장"] },
    { category: "펫로스를 이겨내기", species: "공통", topic: "특수반려동물 펫로스 — 햄스터, 새, 파충류 보호자의 슬픔", searchQuery: "햄스터 새 파충류 펫로스 슬픔 짧은 수명 애도", keywords: ["특수반려동물펫로스", "햄스터펫로스", "엑조틱펫로스"] },
    { category: "펫로스를 이겨내기", species: "공통", topic: "수명이 짧은 반려동물과 함께한 시간의 의미", searchQuery: "수명 짧은 반려동물 햄스터 페럿 시간 의미 애도", keywords: ["짧은수명", "반려동물수명", "함께한시간"] },

    // ============================================================
    // 메멘토애니 소식 — 서비스 기능 소개 + 활용법
    // ============================================================
    { category: "메멘토애니 소식", species: "공통", topic: "반려동물 타임라인 일기 — 매일 한 줄이면 충분한 기록법", searchQuery: "반려동물 일기 기록 앱 타임라인 다이어리 사진 정리", keywords: ["반려동물일기", "반려동물타임라인", "펫다이어리"] },
    { category: "메멘토애니 소식", species: "공통", topic: "AI 펫톡 — 우리 아이 성격으로 대화하는 AI가 있다면", searchQuery: "반려동물 AI 대화 챗봇 펫 성격 맞춤 인공지능 반려", keywords: ["AI펫톡", "반려동물AI", "펫챗봇"] },
    { category: "메멘토애니 소식", species: "공통", topic: "반려동물 케어 리마인더 — 예방접종, 병원, 산책을 깜빡하지 않는 법", searchQuery: "반려동물 예방접종 일정 관리 앱 리마인더 병원 알림", keywords: ["반려동물리마인더", "예방접종일정", "펫케어관리"] },
    { category: "메멘토애니 소식", species: "공통", topic: "반려동물 사진 정리 — 갤러리에 묻힌 만 장을 되살리는 법", searchQuery: "반려동물 사진 정리 앱 추억 앨범 자동 생성 기록", keywords: ["반려동물사진정리", "반려동물앨범", "펫사진관리"] },
    { category: "메멘토애니 소식", species: "공통", topic: "미니홈피로 우리 아이만의 공간 꾸미기", searchQuery: "반려동물 미니홈피 커스텀 공간 싸이월드 감성 SNS", keywords: ["반려동물미니홈피", "펫꾸미기", "반려동물SNS"] },
    { category: "메멘토애니 소식", species: "공통", topic: "AI가 만들어주는 추억 앨범 — 한 달의 기록이 작품이 되는 순간", searchQuery: "반려동물 자동 앨범 생성 AI 추억 정리 월간 기록", keywords: ["AI추억앨범", "반려동물앨범자동", "월간기록"] },
    { category: "메멘토애니 소식", species: "공통", topic: "반려동물 커뮤니티 — 같은 마음을 가진 사람들과 연결되기", searchQuery: "반려동물 커뮤니티 게시판 경험 공유 입양 정보 지역", keywords: ["반려동물커뮤니티", "펫커뮤니티", "반려인모임"] },
    { category: "메멘토애니 소식", species: "공통", topic: "무지개다리를 건넌 아이를 위한 추모 공간", searchQuery: "반려동물 추모 디지털 메모리얼 무지개다리 기록 보존", keywords: ["반려동물추모", "디지털메모리얼", "무지개다리추모"] },
    { category: "메멘토애니 소식", species: "공통", topic: "포인트와 등급 시스템 — 기록할수록 성장하는 우리 아이", searchQuery: "반려동물 앱 포인트 등급 게이미피케이션 리텐션", keywords: ["반려동물포인트", "펫앱등급", "게이미피케이션"] },
    { category: "메멘토애니 소식", species: "공통", topic: "반려동물 기록, 왜 지금 시작해야 할까", searchQuery: "반려동물 기록 중요성 추억 보관 디지털 시대 사진 일기", keywords: ["반려동물기록", "추억보관", "지금시작"] },
];

// ============================================================
// 검색 쿼리 강화 — 종별 영문 키워드/학술 검색어 추가
// (실제 매핑은 lib/species-context.ts의 SPECIES_ENGLISH_KEYWORDS 사용)
// ============================================================

function enhanceSearchQuery(topic: BlogTopic): string {
    const engKeywords = SPECIES_ENGLISH_KEYWORDS[topic.species];
    if (!engKeywords) return topic.searchQuery;
    return `${topic.searchQuery} ${engKeywords}`;
}

// ============================================================
// Tavily 검색
// ============================================================

async function searchTopicInfo(query: string): Promise<string> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return "";

    try {
        const client = tavily({ apiKey });
        // 1차: 전문 자료 검색 — 도메인 확장 (엑조틱/수의학 학술 사이트 포함)
        const response = await client.search(query, {
            searchDepth: "advanced",
            maxResults: 5,
            includeAnswer: true,
            includeDomains: [
                // 한국 반려동물 전문 매체
                "royalcanin.com", "fitpetmall.com", "mypetlife.co.kr",
                "petzlp.com", "wayopet.com", "naver.com",
                "tistory.com", "brunch.co.kr",
                // 학술/수의학
                "pubmed.ncbi.nlm.nih.gov", "merckvetmanual.com",
                "vcahospitals.com", "avma.org",
                // 엑조틱/특수반려동물 전문
                "rspca.org.uk", "rwaf.org.uk",          // 영국 동물복지/토끼
                "exoticdirect.co.uk", "exoticpetvet.net",
                "lafeber.com",                           // 새 전문
                "reptifiles.com",                        // 파충류 전문
                "youtube.com",
            ],
        });

        // 2차: YouTube 전문가 영상 검색 (강형욱, 수의사 채널, 엑조틱 전문가 등)
        const ytResponse = await client.search(`${query} 강형욱 OR 수의사 OR 동물행동전문가 OR exotic vet site:youtube.com`, {
            searchDepth: "basic",
            maxResults: 3,
            includeAnswer: true,
        }).catch(() => null);

        const parts: string[] = [];

        if (response.answer) {
            parts.push(`[검색 요약] ${response.answer}`);
        }

        if (response.results) {
            for (let i = 0; i < Math.min(5, response.results.length); i++) {
                const r = response.results[i];
                if (r.content) {
                    parts.push(`[출처${i + 1}: ${r.url}]\n${r.content.slice(0, 500)}`);
                }
            }
        }

        // YouTube 전문가 영상 결과 추가
        if (ytResponse?.results) {
            for (let i = 0; i < Math.min(3, ytResponse.results.length); i++) {
                const r = ytResponse.results[i];
                if (r.content) {
                    parts.push(`[YouTube 전문가: ${r.title || ""}]\n${r.content.slice(0, 400)}`);
                }
            }
        }
        if (ytResponse?.answer) {
            parts.push(`[YouTube 요약] ${ytResponse.answer}`);
        }

        return parts.join("\n\n");
    } catch {
        return "";
    }
}

// ============================================================
// 텔레그램 전송
// ============================================================

async function sendToTelegram(header: string, body: string): Promise<void> {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
    const CHAT_ID = process.env.TELEGRAM_CHAT_SYSTEM || process.env.TELEGRAM_CHAT_ID || "";
    if (!BOT_TOKEN || !CHAT_ID) return;

    const send = async (text: string, parseMode?: string) => {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text,
                ...(parseMode ? { parse_mode: parseMode } : {}),
                disable_web_page_preview: true,
            }),
        });
    };

    await send(header, "HTML");

    // 본문 분할 (3500자씩)
    for (let i = 0; i < body.length; i += 3500) {
        await send(body.slice(i, i + 3500));
    }
}

// ============================================================
// 메인 핸들러
// ============================================================

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    try {
        const openaiKey = process.env.OPENAI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: "OPENAI_API_KEY_MISSING" }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey: openaiKey });
        const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
        const { dateStr } = getKstTime();
        const currentMonth = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCMonth() + 1;

        // 현재 월에 맞는 토픽만 필터 (계절 한정 + 연중)
        const seasonalFiltered = BLOG_TOPICS.filter(
            t => !t.seasonal || t.seasonal.includes(currentMonth)
        );

        // 최근 14일 이내 전송된 topic은 제외 (중복 방지)
        // + 최근 4주 매거진 제목도 조회해 프롬프트에 피해야 할 목록으로 전달
        const supabaseAdmin = getAdminSupabase();
        let recentSentTopics = new Set<string>();
        let recentTitles: string[] = [];
        if (supabaseAdmin) {
            try {
                const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
                const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

                const [{ data: histRows }, { data: magazineRows }] = await Promise.all([
                    supabaseAdmin
                        .from("blog_topic_history")
                        .select("topic, title")
                        .gte("sent_at", fourteenDaysAgo),
                    supabaseAdmin
                        .from("magazine_articles")
                        .select("title")
                        .eq("status", "published")
                        .gte("published_at", fourWeeksAgo)
                        .limit(40),
                ]);

                recentSentTopics = new Set((histRows || []).map(r => r.topic as string));
                recentTitles = [
                    ...(histRows || []).map(r => r.title as string).filter(Boolean),
                    ...(magazineRows || []).map(r => r.title as string).filter(Boolean),
                ];
            } catch (err) {
                console.warn("[blog-generate] 중복 필터 조회 실패, 전체 풀에서 선택:", err);
            }
        }

        // 중복 topic 제외된 풀
        const dedupedTopics = seasonalFiltered.filter(t => !recentSentTopics.has(t.topic));
        // 전부 제외됐으면 (엣지 케이스) 원본 풀 사용
        const availableTopics = dedupedTopics.length > 0 ? dedupedTopics : seasonalFiltered;

        // 7일 요일 기반 가중 로테이션 (이전: 3일 주기 33%씩 동등 → 펫로스 편중 발생)
        // 정보 4/7 (57%), 소식 2/7 (29%), 펫로스 1/7 (14%)
        // 폴백 시 펫로스 제외 — 정보/소식 풀이 14일 중복필터로 고갈되면 펫로스로 빠지던 기존 버그 차단
        const infoTopics = availableTopics.filter(t => t.category === "반려동물 정보");
        const petlossTopics = availableTopics.filter(t => t.category === "펫로스를 이겨내기");
        const newsTopics = availableTopics.filter(t => t.category === "메멘토애니 소식");

        const daysSinceEpoch = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
        // KST 기준 요일 (0=일, 1=월, ..., 6=토)
        const kstDayOfWeek = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDay();

        // 요일 매핑
        // 월/화/목/금/토 = 정보 (5일)
        // 수/일 = 소식 (2일)  ※ 펫로스가 주 1회도 안 나오게 소식 포함
        // 14일에 1회만 펫로스 (= daysSinceEpoch % 14 === 0일 때 강제 오버라이드)
        let categoryKey: "info" | "news" | "petloss";
        const isPetlossDay = daysSinceEpoch % 14 === 0; // 2주 1회
        if (isPetlossDay) {
            categoryKey = "petloss";
        } else if (kstDayOfWeek === 3 || kstDayOfWeek === 0) {
            categoryKey = "news";
        } else {
            categoryKey = "info";
        }

        // 같은 카테고리 내 순환 선택 (인덱스는 누적 일수로 단조증가)
        const cycleCount = daysSinceEpoch;

        let selectedTopic: BlogTopic;
        let selectionReason: string;

        const pickFromPool = (pool: BlogTopic[]): BlogTopic =>
            pool[cycleCount % pool.length];

        // 폴백 전용 풀: 펫로스 제외한 전체 (펫로스 편중 방지)
        const nonPetlossPool = availableTopics.filter(t => t.category !== "펫로스를 이겨내기");

        if (categoryKey === "info" && infoTopics.length > 0) {
            selectedTopic = pickFromPool(infoTopics);
            selectionReason = `요일 기반 (정보, KST ${kstDayOfWeek}요일)`;
        } else if (categoryKey === "news" && newsTopics.length > 0) {
            selectedTopic = pickFromPool(newsTopics);
            selectionReason = `요일 기반 (소식, KST ${kstDayOfWeek}요일)`;
        } else if (categoryKey === "petloss" && petlossTopics.length > 0) {
            selectedTopic = pickFromPool(petlossTopics);
            selectionReason = `2주 1회 (펫로스, day ${daysSinceEpoch})`;
        } else if (nonPetlossPool.length > 0) {
            // 폴백 1차: 펫로스 제외한 풀에서
            selectedTopic = pickFromPool(nonPetlossPool);
            selectionReason = `폴백 — 원래 ${categoryKey} 풀 비어있음, 펫로스 제외하고 선택`;
        } else {
            // 폴백 2차: 정말 전부 비어있을 때만 전체 풀
            selectedTopic = pickFromPool(availableTopics);
            selectionReason = `최후 폴백 — 모든 카테고리 고갈`;
        }

        // 디버깅용 로그 (Vercel 로그에서 추적 가능)
        console.log(`[blog-generate] reason="${selectionReason}", category=${selectedTopic.category}, topic=${selectedTopic.topic}, pools={info:${infoTopics.length},news:${newsTopics.length},petloss:${petlossTopics.length}}`);

        // 릴스 대본은 daysSinceEpoch 기반 4일 주기 컨셉 로테이션 유지
        const dayIndex = daysSinceEpoch;

        // 1. Tavily로 최신 정보 검색 — 종별 특화 쿼리로 강화
        const speciesContext = SPECIES_CONTEXT[selectedTopic.species] || "";
        const enhancedSearchQuery = enhanceSearchQuery(selectedTopic);
        const searchContext = await searchTopicInfo(enhancedSearchQuery);

        // 2. 블로그 글 생성 (Claude Sonnet + Opus advisor 우선, OpenAI 폴백)
        const isExotic = isExoticSpecies(selectedTopic.species);
        const isPetloss = selectedTopic.category === "펫로스를 이겨내기";

        const systemPrompt = `당신은 수의학 + 동물행동학 + 종별 사육학을 갖춘 반려동물 전문 블로거입니다. 네이버 블로그에 게시할 정보성 글을 작성합니다.

## 오늘의 종: ${selectedTopic.species}

### 종별 핵심 컨텍스트 (반드시 본문에 반영할 것)
${speciesContext}

${isExotic ? `### 특수반려동물(엑조틱) 작성 시 추가 지침
- 한국에서 잘못 알려진 정보를 정확하게 교정하세요 (예: "예전에는 ~라고 알려졌지만, 최신 연구는 ~")
- 일반 반려동물(개/고양이) 보호자도 이해할 수 있도록 친절하게 설명
- 해당 종의 사육이 "쉬워 보이지만 실제로는 까다로운" 측면을 솔직하게 전달
- 분류학적 특징(야행성/주행성, 사회성/단독성, 변온/항온 등)을 자연스럽게 녹이세요
- 수의 진료 시 일반 동물병원이 아닌 "엑조틱 전문 동물병원"이 필요한 경우 명시
` : ""}
## 작성 규칙
- 한국어, 존댓말 (~해요/~됩니다 체)
- 1800~2500자 분량
- 소제목 4~5개로 구조화
- 수의사/전문가 의견을 인용하는 느낌으로 (예: "수의사들은 ~을 권장합니다")
- YouTube 전문가(강형욱, 수의사 채널, 엑조틱 전문가 등) 정보가 있으면 자연스럽게 인용
- 구체적 수치, 방법, 단계를 포함 (예: "케이지 최소 면적 60×40cm", "온도 24~28도 유지")
- 의학적 확정 진단은 피하고 반드시 "수의사 상담을 권장합니다" 포함
- 이모지 사용 금지
- 네이버 SEO: 핵심 키워드를 제목/소제목/본문에 자연스럽게 3~4회 반복
- 마지막 단락에서 메멘토애니(mementoani.com)를 자연스럽게 1회 언급
${isPetloss
    ? `  - "반려동물과의 소중한 추억을 따뜻하게 간직하고 싶다면 메멘토애니(mementoani.com)에서 디지털 메모리얼을 만들어보세요"`
    : isExotic
        ? `  - "${selectedTopic.species} 같은 특수반려동물의 케어 일정과 사육 환경 기록을 한곳에서 관리하고 싶다면 메멘토애니(mementoani.com)를 활용해보세요. 다양한 종을 함께 관리할 수 있어요."`
        : `  - "반려동물의 건강 기록과 케어 리마인더를 한곳에서 관리하고 싶다면 메멘토애니(mementoani.com)를 활용해보세요"`
}

## 절대 하지 말 것
- 근거 없는 민간요법 추천
- 특정 브랜드 사료/약품 직접 추천 (성분 기준으로만 설명)
- 수의사 진료를 대체하는 진단/처방
- 과장된 효과나 공포 마케팅
- 종별 특성을 무시한 일반론적 작성 (예: 햄스터 글에 "산책시키세요")
- "강아지/고양이만 반려동물"이라는 뉘앙스 (메멘토애니는 모든 종을 평등하게 다룸)

## 출력 형식
[제목]
(네이버 검색에 잘 걸리는 30자 이내 제목)

[본문]
(소제목과 본문, 줄바꿈으로 구분)

[태그]
(#해시태그1 #해시태그2 ... 12~15개)

## 어드바이저 활용
어려운 판단이 필요할 때 (예: 의학적 정확성 검증, SEO 구조 최적화, 톤 조정) advisor 툴을 호출해 Opus에게 가이던스를 요청하세요. 최대 2회까지 사용 가능합니다.`;

        // 최근 전송/게재된 제목을 프롬프트에 노출 → LLM이 서론/구조/CTA 중복 회피
        const recentTitlesBlock = recentTitles.length > 0
            ? `\n\n## 최근 전송/게재된 글 제목 (아래와 "서론 문장, 소제목 구조, CTA 문구, 예시 비유, 결말"이 **겹치지 않도록** 다른 앵글로 작성하세요)\n${recentTitles.slice(0, 20).map((t, i) => `${i + 1}. ${t}`).join("\n")}`
            : "";

        const userPrompt = `주제: ${selectedTopic.topic}
카테고리: ${selectedTopic.category}
핵심 키워드: ${selectedTopic.keywords.join(", ")}
${recentTitlesBlock}

${searchContext ? `## 참고 자료 (아래 검색 결과를 바탕으로 정확한 정보를 작성하세요)\n\n${searchContext}` : "## 참고 자료 없음\n일반적으로 알려진 수의학 지식을 바탕으로 작성하세요."}

## 중복 방지 원칙 (중요)
- 서론을 "많은 반려인들은 ~을 겪을 때" / "반려동물은 우리의 일상에서" 같은 전형적 오프닝으로 시작하지 마세요.
- "복합 애도 과정", "슬픔을 부정하지 말고 받아들이기", "감정 정리를 위한 활동" 같은 반복되는 소제목 표현을 피하고, 이 글만의 구체적 앵글로 소제목을 잡으세요.
- CTA는 매번 같은 문구가 되지 않도록 반려동물 종/상황/톤에 맞춰 자연스럽게 변주하세요 (메멘토애니 언급 1회는 유지).
- 구체적 사례·수치·최신 연구·한국 현실 데이터를 1개 이상 포함해 범용 글이 아닌 "이 주제만의" 글을 만드세요.`;

        let content = "";
        let modelUsed = "";

        if (anthropic) {
            // Claude Sonnet 4.6 executor + Opus 4.6 advisor (베타)
            try {
                const claudeResponse = await anthropic.beta.messages.create({
                    model: "claude-sonnet-4-6",
                    max_tokens: 4000,
                    temperature: 0.75,
                    system: systemPrompt,
                    messages: [{ role: "user", content: userPrompt }],
                    tools: [
                        {
                            type: "advisor_20260301" as never,
                            name: "advisor",
                            model: "claude-opus-4-6",
                            max_uses: 2,
                        } as never,
                    ],
                    betas: ["advisor-tool-2026-03-01"],
                });

                // 텍스트 블록만 추출
                for (const block of claudeResponse.content) {
                    if (block.type === "text") content += block.text;
                }
                modelUsed = "claude-sonnet-4-6 + opus-advisor";
            } catch (err) {
                // 어드바이저 베타 실패 시 일반 Sonnet으로 재시도
                console.error("[blog-generate] Advisor failed, retrying without:", err);
                try {
                    const claudeResponse = await anthropic.messages.create({
                        model: "claude-sonnet-4-6",
                        max_tokens: 4000,
                        temperature: 0.75,
                        system: systemPrompt,
                        messages: [{ role: "user", content: userPrompt }],
                    });
                    for (const block of claudeResponse.content) {
                        if (block.type === "text") content += block.text;
                    }
                    modelUsed = "claude-sonnet-4-6 (advisor failed)";
                } catch {
                    content = "";
                }
            }
        }

        // Claude 실패 또는 미설정 시 GPT-4o-mini 폴백
        if (!content) {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                max_tokens: 3000,
                temperature: 0.75,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
            });
            content = completion.choices[0]?.message?.content || "";
            modelUsed = "gpt-4o-mini (fallback)";
        }

        // 제목/본문/태그 파싱
        const titleMatch = content.match(/\[제목\]\s*\n(.+)/);
        const bodyMatch = content.match(/\[본문\]\s*\n([\s\S]+?)(?:\[태그\]|$)/);
        const tagMatch = content.match(/\[태그\]\s*\n(.+)/);

        const title = titleMatch?.[1]?.trim() || selectedTopic.topic;
        const body = bodyMatch?.[1]?.trim() || content;
        const tags = tagMatch?.[1]?.trim() || selectedTopic.keywords.map(k => `#${k}`).join(" ");

        // 3. 텔레그램 전송
        const header = [
            `<b>[블로그 초안 - ${dateStr}]</b>`,
            `카테고리: ${selectedTopic.category}`,
            `선택 이유: ${selectionReason}`,
            `풀 상태: 정보 ${infoTopics.length} / 소식 ${newsTopics.length} / 펫로스 ${petlossTopics.length}`,
            `제목: ${title}`,
            `모델: ${modelUsed}`,
            `검색 소스: ${searchContext ? "Tavily 검색 결과 반영" : "일반 지식 기반"}`,
            ``,
            `태그: ${tags}`,
            ``,
            `--- 본문 (아래 복사해서 네이버 블로그에 붙여넣기) ---`,
        ].join("\n");

        await sendToTelegram(header, body);

        // 전송 이력 기록 — 다음 실행부터 최근 14일 내 topic은 중복 선택 방지
        if (supabaseAdmin) {
            try {
                await supabaseAdmin.from("blog_topic_history").insert({
                    topic: selectedTopic.topic,
                    category: selectedTopic.category,
                    species: selectedTopic.species,
                    title,
                });
            } catch (err) {
                console.warn("[blog-generate] history insert 실패 (전송은 정상):", err);
            }
        }

        // 릴스/쇼츠 대본 자동 생성 제거 — 실사용 가치 낮음
        // (필요 시 수동으로 별도 툴에서 생성)

        return NextResponse.json({
            success: true,
            date: dateStr,
            category: selectedTopic.category,
            title,
            bodyLength: body.length,
            hasSearchContext: !!searchContext,
            modelUsed,
            tags,
            reels: false,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        import("@/lib/telegram").then(({ notifyError }) =>
            notifyError({ endpoint: "blog-generate", error: msg })
        ).catch(() => {});
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
