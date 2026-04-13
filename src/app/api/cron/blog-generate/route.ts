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
import { verifyCronSecret, getKstTime } from "@/lib/cron-utils";
import {
    type PetSpecies,
    SPECIES_CONTEXT,
    SPECIES_ENGLISH_KEYWORDS,
    isExoticSpecies,
} from "@/lib/species-context";

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
    // 햄스터 (소형 설치류)
    // ============================================================
    { category: "반려동물 정보", species: "햄스터", topic: "햄스터 케이지 크기 — 시리안과 드워프의 적정 면적", searchQuery: "햄스터 케이지 크기 시리안 드워프 적정 면적 동물복지 영국", keywords: ["햄스터케이지", "햄스터사육", "햄스터복지"] },
    { category: "반려동물 정보", species: "햄스터", topic: "햄스터 쳇바퀴 크기와 척추 건강의 관계", searchQuery: "햄스터 쳇바퀴 크기 척추 건강 시리안 21cm 드워프 17cm", keywords: ["햄스터쳇바퀴", "햄스터척추", "햄스터운동"] },
    { category: "반려동물 정보", species: "햄스터", topic: "햄스터 합사가 위험한 이유 — 종별 사회성 차이", searchQuery: "햄스터 합사 위험 시리안 드워프 사회성 단독사육 동물행동학", keywords: ["햄스터합사", "햄스터단독", "햄스터행동"] },
    { category: "반려동물 정보", species: "햄스터", topic: "햄스터 종양 — 노령 햄스터에서 흔한 이유와 케어", searchQuery: "햄스터 종양 노령 케어 수의사 엑조틱 반려동물 종양", keywords: ["햄스터종양", "햄스터노화", "햄스터수명"] },
    { category: "반려동물 정보", species: "햄스터", topic: "햄스터 식단 — 씨앗믹스 vs 펠릿 vs 자연식 비교", searchQuery: "햄스터 사료 씨앗믹스 펠릿 자연식 영양 균형 햄스터복지", keywords: ["햄스터사료", "햄스터식단", "햄스터영양"] },
    { category: "반려동물 정보", species: "햄스터", topic: "햄스터 베딩 선택 — 솔방울 톱밥이 위험한 이유", searchQuery: "햄스터 베딩 톱밥 솔방울 호흡기 안전 종이 베딩", keywords: ["햄스터베딩", "햄스터바닥재", "햄스터호흡기"] },
    { category: "반려동물 정보", species: "햄스터", topic: "햄스터가 친해지는 신호와 손올림 단계 훈련법", searchQuery: "햄스터 핸들링 친해지기 사회화 훈련 단계 행동", keywords: ["햄스터핸들링", "햄스터친해지기", "햄스터훈련"] },

    // ============================================================
    // 기니피그
    // ============================================================
    { category: "반려동물 정보", species: "기니피그", topic: "기니피그는 왜 한 마리만 키우면 안 될까 — 군집성의 진실", searchQuery: "기니피그 단독사육 금지 군집성 동물복지 스위스 법", keywords: ["기니피그합사", "기니피그군집", "기니피그복지"] },
    { category: "반려동물 정보", species: "기니피그", topic: "기니피그 비타민C 보충 — 매일 필요한 양과 급여 방법", searchQuery: "기니피그 비타민C 일일 권장량 채소 사료 결핍 괴혈병", keywords: ["기니피그비타민C", "기니피그영양", "기니피그건강"] },
    { category: "반려동물 정보", species: "기니피그", topic: "기니피그 부정교합 — 원인과 조기 발견법", searchQuery: "기니피그 부정교합 치아 건초 수의사 엑조틱", keywords: ["기니피그부정교합", "기니피그치아", "기니피그건강"] },
    { category: "반려동물 정보", species: "기니피그", topic: "기니피그 케이지와 방사 환경 만들기", searchQuery: "기니피그 케이지 크기 방사 환경 풍부화 미드웨스트", keywords: ["기니피그케이지", "기니피그사육", "기니피그방사"] },

    // ============================================================
    // 토끼
    // ============================================================
    { category: "반려동물 정보", species: "토끼", topic: "토끼 식단의 80%는 건초 — 한국 보호자가 흔히 하는 오해", searchQuery: "토끼 건초 80퍼센트 식단 펠릿 과다 위정체 동물병원", keywords: ["토끼건초", "토끼식단", "토끼위정체"] },
    { category: "반려동물 정보", species: "토끼", topic: "토끼 위정체(GI Stasis) — 응급상황 신호와 예방", searchQuery: "토끼 위정체 GI stasis 응급 증상 변비 식욕부진 수의사", keywords: ["토끼위정체", "토끼응급", "토끼소화"] },
    { category: "반려동물 정보", species: "토끼", topic: "토끼 케이지 사육 vs 방사 사육 — 무엇이 옳을까", searchQuery: "토끼 방사 사육 케이지 동물복지 운동 영국 RSPCA", keywords: ["토끼방사", "토끼케이지", "토끼복지"] },
    { category: "반려동물 정보", species: "토끼", topic: "토끼 부정교합과 치아 관리 — 평생 자라는 이빨", searchQuery: "토끼 부정교합 이빨 평생 자라 마모 건초 수의사", keywords: ["토끼부정교합", "토끼치아", "토끼건강"] },
    { category: "반려동물 정보", species: "토끼", topic: "토끼 중성화 — 시기, 비용, 회복 관리", searchQuery: "토끼 중성화 시기 비용 회복 자궁암 예방 수의사", keywords: ["토끼중성화", "토끼자궁암", "토끼수술"] },

    // ============================================================
    // 고슴도치
    // ============================================================
    { category: "반려동물 정보", species: "고슴도치", topic: "고슴도치 적정 온도 — 24~28도가 생명을 가르는 이유", searchQuery: "고슴도치 적정 온도 hibernation 위면 사망 보온 24도", keywords: ["고슴도치온도", "고슴도치보온", "고슴도치사육"] },
    { category: "반려동물 정보", species: "고슴도치", topic: "고슴도치 식단 — 곤충식과 고품질 사료의 균형", searchQuery: "고슴도치 사료 곤충식 밀웜 단백질 지방 영양 엑조틱", keywords: ["고슴도치사료", "고슴도치식단", "고슴도치영양"] },
    { category: "반려동물 정보", species: "고슴도치", topic: "WHS(Wobbly Hedgehog Syndrome) — 알아둬야 할 신경 질환", searchQuery: "WHS Wobbly Hedgehog Syndrome 고슴도치 신경 질환 증상 진행", keywords: ["WHS", "고슴도치질병", "고슴도치신경"] },
    { category: "반려동물 정보", species: "고슴도치", topic: "고슴도치 케이지 환경 — 쳇바퀴와 은신처의 중요성", searchQuery: "고슴도치 케이지 쳇바퀴 은신처 환경 풍부화 사육", keywords: ["고슴도치케이지", "고슴도치환경", "고슴도치쳇바퀴"] },

    // ============================================================
    // 페럿
    // ============================================================
    { category: "반려동물 정보", species: "페럿", topic: "페럿 인슐린종 — 노령 페럿의 가장 흔한 사망 원인", searchQuery: "페럿 인슐린종 증상 진단 치료 노령 췌장 수의사", keywords: ["페럿인슐린종", "페럿노화", "페럿건강"] },
    { category: "반려동물 정보", species: "페럿", topic: "페럿 식단 — 의무적 육식동물의 영양 요구", searchQuery: "페럿 식단 육식동물 동물성단백질 사료 곡물 금지", keywords: ["페럿식단", "페럿사료", "페럿영양"] },
    { category: "반려동물 정보", species: "페럿", topic: "페럿 부신질환 — 호르몬 이상의 신호와 치료", searchQuery: "페럿 부신질환 탈모 가려움 호르몬 데슬로렐린 수의사", keywords: ["페럿부신질환", "페럿탈모", "페럿질병"] },
    { category: "반려동물 정보", species: "페럿", topic: "페럿 방사 시간과 안전 점검 — 페럿 프루핑(ferret proofing)", searchQuery: "페럿 방사 환경 안전 페럿 프루핑 가구 위험요소", keywords: ["페럿방사", "페럿환경", "페럿안전"] },
    { category: "반려동물 정보", species: "페럿", topic: "페럿 예방접종 — 디스템퍼와 광견병의 필요성", searchQuery: "페럿 예방접종 디스템퍼 광견병 백신 시기 수의사", keywords: ["페럿예방접종", "페럿백신", "페럿건강"] },

    // ============================================================
    // 친칠라
    // ============================================================
    { category: "반려동물 정보", species: "친칠라", topic: "친칠라 사육의 기본 — 25도를 넘지 않는 환경 만들기", searchQuery: "친칠라 적정 온도 열사병 25도 에어컨 안데스 사육", keywords: ["친칠라온도", "친칠라사육", "친칠라열사병"] },
    { category: "반려동물 정보", species: "친칠라", topic: "친칠라 모래목욕 — 빈도와 모래 종류 선택", searchQuery: "친칠라 모래목욕 빈도 모래 종류 화산모래 곰팡이 예방", keywords: ["친칠라모래목욕", "친칠라케어", "친칠라위생"] },
    { category: "반려동물 정보", species: "친칠라", topic: "친칠라의 평균 수명과 장기 책임 — 15년의 약속", searchQuery: "친칠라 수명 15년 노화 장기 책임 사육", keywords: ["친칠라수명", "친칠라노화", "친칠라책임"] },

    // ============================================================
    // 앵무새
    // ============================================================
    { category: "반려동물 정보", species: "앵무새", topic: "앵무새 깃털뽑기(Feather Plucking) — 원인과 환경 개선", searchQuery: "앵무새 깃털뽑기 feather plucking 원인 스트레스 환경", keywords: ["앵무새깃털뽑기", "앵무새스트레스", "앵무새행동"] },
    { category: "반려동물 정보", species: "앵무새", topic: "앵무새가 절대 먹으면 안 되는 음식 (아보카도, 초콜릿)", searchQuery: "앵무새 위험 식품 아보카도 초콜릿 카페인 PTFE 테플론 사망", keywords: ["앵무새위험음식", "앵무새독성", "앵무새식단"] },
    { category: "반려동물 정보", species: "앵무새", topic: "PTFE(테플론) 가스가 새에게 치명적인 이유", searchQuery: "PTFE 테플론 새 사망 가스 코팅 후라이팬 앵무새", keywords: ["앵무새테플론", "PTFE", "새안전"] },
    { category: "반려동물 정보", species: "앵무새", topic: "앵무새 사회화와 지능 — 새장 밖 시간의 중요성", searchQuery: "앵무새 지능 사회화 방사 시간 환경 풍부화 인지", keywords: ["앵무새지능", "앵무새사회화", "앵무새훈련"] },
    { category: "반려동물 정보", species: "앵무새", topic: "코카티엘(왕관앵무) 키우기 — 초보자에게 적합한 이유", searchQuery: "코카티엘 왕관앵무 키우기 성격 초보 반려조", keywords: ["코카티엘", "왕관앵무", "초보반려조"] },
    { category: "반려동물 정보", species: "앵무새", topic: "회색앵무(아프리칸 그레이)의 인지 능력과 책임", searchQuery: "회색앵무 아프리칸 그레이 지능 인지 수명 50년 책임", keywords: ["회색앵무", "아프리칸그레이", "앵무새지능"] },
    { category: "반려동물 정보", species: "앵무새", topic: "사이타쿠스병(Psittacosis) — 사람에게 옮을 수 있는 인수공통감염병", searchQuery: "사이타쿠스병 psittacosis 앵무새 인수공통감염병 증상 예방", keywords: ["사이타쿠스병", "앵무새질병", "인수공통"] },

    // ============================================================
    // 문조 / 카나리아 / 핀치류
    // ============================================================
    { category: "반려동물 정보", species: "문조", topic: "문조 사육의 기본 — 사회적 새의 외로움 이해하기", searchQuery: "문조 단독사육 외로움 사회성 행동 사육 환경", keywords: ["문조사육", "문조외로움", "문조사회성"] },
    { category: "반려동물 정보", species: "문조", topic: "문조 알막힘(Egg Binding) — 응급 상황과 예방", searchQuery: "문조 알막힘 egg binding 응급 칼슘 산란 수의사", keywords: ["문조알막힘", "문조산란", "문조응급"] },
    { category: "반려동물 정보", species: "카나리아", topic: "카나리아 노래의 비밀 — 수컷만 부르는 이유", searchQuery: "카나리아 노래 수컷 호르몬 광주기 사육", keywords: ["카나리아노래", "카나리아수컷", "카나리아사육"] },

    // ============================================================
    // 거북이
    // ============================================================
    { category: "반려동물 정보", species: "거북이", topic: "거북이 UVB 조명 — 채광이 자외선이 아닌 이유", searchQuery: "거북이 UVB 조명 자외선 채광 유리 차단 MBD 골질환", keywords: ["거북이UVB", "거북이조명", "MBD"] },
    { category: "반려동물 정보", species: "거북이", topic: "수생/반수생/육생 거북이 — 종별 사육 환경 차이", searchQuery: "수생 반수생 육생 거북이 종별 환경 사육 수온 육지", keywords: ["거북이종류", "거북이사육", "수생거북이"] },
    { category: "반려동물 정보", species: "거북이", topic: "거북이 대사성 골질환(MBD) — 칼슘과 D3의 균형", searchQuery: "거북이 MBD 대사성 골질환 칼슘 비타민D3 UVB 식단", keywords: ["거북이MBD", "거북이칼슘", "거북이건강"] },
    { category: "반려동물 정보", species: "거북이", topic: "한국에서 사육 가능한 거북이 종류와 법적 주의점", searchQuery: "한국 사육 가능 거북이 CITES 멸종위기종 법 합법", keywords: ["거북이법", "거북이종류", "CITES"] },

    // ============================================================
    // 도마뱀 / 게코 / 이구아나
    // ============================================================
    { category: "반려동물 정보", species: "게코", topic: "레오파드 게코 사육 가이드 — 초보자에게 가장 적합한 도마뱀", searchQuery: "레오파드 게코 사육 초보 온도 사육장 식단 밀웜", keywords: ["레오파드게코", "게코사육", "초보파충류"] },
    { category: "반려동물 정보", species: "게코", topic: "크레스티드 게코 — UVB 없이도 키울 수 있을까", searchQuery: "크레스티드 게코 UVB D3 식단 CGD 사육", keywords: ["크레스티드게코", "게코UVB", "CGD"] },
    { category: "반려동물 정보", species: "게코", topic: "게코 탈피 문제 — 탈피 부전과 환경 습도", searchQuery: "게코 탈피 부전 습도 환경 발가락 탈피촉진", keywords: ["게코탈피", "게코습도", "파충류건강"] },
    { category: "반려동물 정보", species: "도마뱀", topic: "비어디 드래곤 사육 — 온도구배와 UVB의 핵심", searchQuery: "비어디 드래곤 bearded dragon 사육 온도구배 basking UVB", keywords: ["비어디드래곤", "도마뱀사육", "파충류"] },
    { category: "반려동물 정보", species: "도마뱀", topic: "파충류 사육의 기본 — 5가지 환경 매개변수", searchQuery: "파충류 사육 온도 습도 UVB 광주기 환경 매개변수", keywords: ["파충류사육", "파충류환경", "파충류기초"] },
    { category: "반려동물 정보", species: "이구아나", topic: "그린 이구아나 — 초식 식단과 평생 책임의 무게", searchQuery: "그린 이구아나 초식 식단 동물성단백질 신부전 수명 사육", keywords: ["이구아나", "이구아나식단", "이구아나사육"] },
    { category: "반려동물 정보", species: "이구아나", topic: "한국에서 이구아나가 유기되는 이유와 입양 전 고민", searchQuery: "이구아나 유기 한국 사육 환경 부족 입양 책임", keywords: ["이구아나유기", "이구아나책임", "파충류입양"] },

    // ============================================================
    // 물고기 / 새우 (관상어)
    // ============================================================
    { category: "반려동물 정보", species: "물고기", topic: "어항 사이클링 — 질소 사이클을 이해해야 하는 이유", searchQuery: "어항 사이클링 질소 사이클 박테리아 암모니아 아질산", keywords: ["어항사이클링", "질소사이클", "물고기사육"] },
    { category: "반려동물 정보", species: "물고기", topic: "베타 사육 가이드 — 한 컵 사육이 학대인 이유", searchQuery: "베타 사육 어항 크기 5리터 단독 환경 풍부화", keywords: ["베타사육", "베타어항", "베타복지"] },
    { category: "반려동물 정보", species: "물고기", topic: "구피 사육 — 가장 쉽지만 가장 많이 죽는 이유", searchQuery: "구피 사육 사이클링 합사 질병 백점병 초보", keywords: ["구피사육", "구피초보", "구피질병"] },
    { category: "반려동물 정보", species: "물고기", topic: "디스커스 사육의 어려움 — 수질과 사료 관리", searchQuery: "디스커스 사육 수질 사료 PH 디스커스 비프하트", keywords: ["디스커스", "디스커스사육", "디스커스수질"] },
    { category: "반려동물 정보", species: "새우", topic: "체리쉬림프 사육 — 가장 쉬운 관상새우의 비밀", searchQuery: "체리쉬림프 사육 수질 PH GH KH 합사 번식", keywords: ["체리쉬림프", "관상새우", "쉬림프사육"] },
    { category: "반려동물 정보", species: "새우", topic: "관상새우와 구리(Cu) — 약품 한 방울에 전멸하는 이유", searchQuery: "관상새우 구리 사망 약품 백점병 안전한 약 쉬림프", keywords: ["관상새우", "쉬림프구리", "쉬림프약품"] },

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
        const availableTopics = BLOG_TOPICS.filter(
            t => !t.seasonal || t.seasonal.includes(currentMonth)
        );

        // 3카테고리 균형 로테이션: 정보 → 소식 → 펫로스 → 정보 → 소식 → 펫로스 ...
        // 매일 카테고리가 바뀌고, 같은 카테고리 안에서는 순환
        const infoTopics = availableTopics.filter(t => t.category === "반려동물 정보");
        const petlossTopics = availableTopics.filter(t => t.category === "펫로스를 이겨내기");
        const newsTopics = availableTopics.filter(t => t.category === "메멘토애니 소식");

        const daysSinceEpoch = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
        const categoryIndex = daysSinceEpoch % 3; // 0=정보, 1=소식, 2=펫로스
        const cycleCount = Math.floor(daysSinceEpoch / 3); // 3일 주기 몇 번째

        let selectedTopic: BlogTopic;

        if (categoryIndex === 0 && infoTopics.length > 0) {
            // 정보글 — 강아지/고양이 70%, 나머지 종 30% 가중치
            // 대부분의 유저가 강아지/고양이이므로 메인 종 위주로 발송
            const mainTopics = infoTopics.filter(t => t.species === "강아지" || t.species === "고양이");
            const otherTopics = infoTopics.filter(t => t.species !== "강아지" && t.species !== "고양이" && t.species !== "공통");
            const commonTopics = infoTopics.filter(t => t.species === "공통");

            // 10일 주기: 7일은 메인(강아지/고양이), 2일은 기타 종, 1일은 공통
            const infoSlot = cycleCount % 10;
            if (infoSlot < 7 && mainTopics.length > 0) {
                // 강아지/고양이 (70%)
                selectedTopic = mainTopics[cycleCount % mainTopics.length];
            } else if (infoSlot < 9 && otherTopics.length > 0) {
                // 햄스터/토끼/앵무새/파충류 등 (20%)
                selectedTopic = otherTopics[cycleCount % otherTopics.length];
            } else if (commonTopics.length > 0) {
                // 공통 (10%)
                selectedTopic = commonTopics[cycleCount % commonTopics.length];
            } else {
                selectedTopic = infoTopics[cycleCount % infoTopics.length];
            }
        } else if (categoryIndex === 1 && newsTopics.length > 0) {
            // 메멘토애니 소식 (기능 소개/활용법/서비스 스토리)
            selectedTopic = newsTopics[cycleCount % newsTopics.length];
        } else if (categoryIndex === 2 && petlossTopics.length > 0) {
            // 펫로스 (극복/추모/장례/재입양)
            selectedTopic = petlossTopics[cycleCount % petlossTopics.length];
        } else {
            // 폴백: 어떤 카테고리든 비어있으면 전체 풀에서
            selectedTopic = availableTopics[daysSinceEpoch % availableTopics.length];
        }

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

        const userPrompt = `주제: ${selectedTopic.topic}
카테고리: ${selectedTopic.category}
핵심 키워드: ${selectedTopic.keywords.join(", ")}

${searchContext ? `## 참고 자료 (아래 검색 결과를 바탕으로 정확한 정보를 작성하세요)\n\n${searchContext}` : "## 참고 자료 없음\n일반적으로 알려진 수의학 지식을 바탕으로 작성하세요."}`;

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
            `제목: ${title}`,
            `모델: ${modelUsed}`,
            `검색 소스: ${searchContext ? "Tavily 검색 결과 반영" : "일반 지식 기반"}`,
            ``,
            `태그: ${tags}`,
            ``,
            `--- 본문 (아래 복사해서 네이버 블로그에 붙여넣기) ---`,
        ].join("\n");

        await sendToTelegram(header, body);

        // 4. 오늘의 릴스/쇼츠 대본 생성 + 전송
        // 컨셉 7일 로테이션 (이전 4일 → 7일로 확장, 더 다양한 톤)
        const REEL_CONCEPTS = [
            {
                name: "감성/공감",
                description: "반려동물과의 일상, 이별, 그리움. 잔잔하고 따뜻한 톤.",
                hookExample: "처음 만난 그날을 기억하시나요?",
                outroStyle: "마지막 한 줄로 여운을 남기고, 메멘토애니가 그 추억을 지킨다는 메시지로 마무리",
            },
            {
                name: "정보/꿀팁",
                description: "수의학 기반 건강/케어/사료 정보. 빠른 템포, 숫자 강조.",
                hookExample: "이거 모르면 우리 아이 위험해요",
                outroStyle: "체크리스트 형식으로 정리, 메멘토애니의 케어 리마인더 기능 자연 연결",
            },
            {
                name: "공감 챌린지",
                description: "보호자라면 누구나 공감하는 장면 모음. 짧은 컷 빠른 전환.",
                hookExample: "강아지 집사 vs 햄스터 집사 차이점 5가지",
                outroStyle: "마지막 컷에서 모든 종을 함께 사랑하는 메멘토애니 어필",
            },
            {
                name: "스토리텔링",
                description: "한 보호자의 짧은 사연을 1인칭으로. 후크 → 갈등 → 반전.",
                hookExample: "이 아이를 만나기 전엔 몰랐던 것",
                outroStyle: "이야기 끝에 자연스럽게 메멘토애니로 추억을 기록한다는 것",
            },
            {
                name: "트렌딩/밈",
                description: "유행 포맷 활용. 빠른 컷, 자막 위주. 가벼운 유머.",
                hookExample: "POV: 우리집 페럿이 새벽 3시에 한 일",
                outroStyle: "밈 마지막에 메멘토애니 로고/배지 한 번 띄움",
            },
            {
                name: "서비스 소개",
                description: "메멘토애니 핵심 기능 1개를 30초로. UI 캡처 + 자막.",
                hookExample: "이 앱 하나면 우리집 4마리 다 관리됨",
                outroStyle: "기능 데모 → 직접 써보세요 CTA",
            },
            {
                name: "특수반려동물 스포트라이트",
                description: "햄스터/페럿/토끼/파충류/새 등 한 종을 집중 조명. 잘 알려지지 않은 사실 위주.",
                hookExample: "고슴도치 이거 모르면 죽일 수도 있어요",
                outroStyle: "엑조틱 종 보호자에게 실용적 정보, 메멘토애니의 다종 관리 강점 강조",
            },
        ];

        const reelConceptIdx = dayIndex % REEL_CONCEPTS.length;
        const reelConcept = REEL_CONCEPTS[reelConceptIdx];
        const reelExoticHint = isExotic
            ? `\n\n오늘의 종이 ${selectedTopic.species}(특수반려동물)이므로, 일반 강아지/고양이 보호자에게도 신선하게 느껴지도록 ${selectedTopic.species}만의 특이한 사실/매력을 강조하세요. ${SPECIES_CONTEXT[selectedTopic.species]}`
            : "";

        const reelsCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 900,
            temperature: 0.9,
            messages: [
                {
                    role: "system",
                    content: `당신은 메멘토애니(반려동물 메모리얼 플랫폼)의 숏폼 콘텐츠 기획자입니다.
인스타그램 릴스/유튜브 쇼츠용 15~30초 대본을 작성합니다.

## 메멘토애니 핵심 USP
- 일상부터 이별까지 모든 순간을 함께
- 강아지/고양이뿐 아니라 햄스터/토끼/페럿/앵무새/파충류까지 모든 반려동물 평등하게 관리
- AI 펫톡으로 떠난 아이와도 대화 가능
- 듀얼 모드: 일상 모드(따뜻한 케어) + 추모 모드(기억의 공간)

## 작성 규칙
- 첫 1초에 강한 훅 (질문, 숫자, 감성 문장 등)
- 자막 기반 (음소거로 보는 유저 대응) — 자막 한 줄 12자 이내 권장
- 마지막에 메멘토애니 자연스럽게 언급 (매번 다른 방식, 광고 톤 X)
- 존댓말, 이모지 사용 금지
- "강아지/고양이만 반려동물" 같은 뉘앙스 절대 금지

## 오늘의 컨셉
**${reelConcept.name}**
${reelConcept.description}
훅 예시: "${reelConcept.hookExample}"
아웃트로 스타일: ${reelConcept.outroStyle}

## 출력 형식
[컨셉] (한 줄 설명)
[대본] (자막 텍스트, 줄바꿈으로 구분 — 한 줄 12자 이내)
[영상 연출] (촬영/편집 가이드 3줄)
[해시태그] (12~15개, 한국어 + 영어 섞기)`,
                },
                {
                    role: "user",
                    content: `오늘 날짜: ${dateStr}
오늘의 종: ${selectedTopic.species}
오늘의 블로그 주제: "${selectedTopic.topic}" (${selectedTopic.category})

이 주제와 관련 있되 형식은 완전히 다르게 (짧고 임팩트 있게) 작성하세요.${reelExoticHint}`,
                },
            ],
        });

        const reelsContent = reelsCompletion.choices[0]?.message?.content || "";

        const reelsHeader = [
            ``,
            `<b>[오늘의 릴스/쇼츠 대본 - ${dateStr}]</b>`,
            `컨셉 타입: ${reelConcept.name}`,
            `오늘의 종: ${selectedTopic.species}`,
            ``,
            `--- 아래 복사해서 촬영/편집 ---`,
        ].join("\n");

        await sendToTelegram(reelsHeader, reelsContent);

        return NextResponse.json({
            success: true,
            date: dateStr,
            category: selectedTopic.category,
            title,
            bodyLength: body.length,
            hasSearchContext: !!searchContext,
            modelUsed,
            tags,
            reels: true,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        import("@/lib/telegram").then(({ notifyError }) =>
            notifyError({ endpoint: "blog-generate", error: msg })
        ).catch(() => {});
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
