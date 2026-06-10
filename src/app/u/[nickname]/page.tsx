/**
 * /u/[nickname] — 공개 펫홈 페이지 (펫홈 Phase 1)
 *
 * 닉네임(=펫홈 주소)으로 진입하는 독립 공개 페이지. 비회원도 열람 가능(바이럴 입구).
 * 재사용: MinihompyVisitModal(뷰 전체) + /api/minihompy/[userId] GET(비공개 403 처리 포함).
 * 신규 최소: nickname→userId lookup + OG 메타 + 독립 페이지용 AuthModal 마운트.
 *
 * 비공개 펫홈: API가 403 반환 → 모달이 "비공개 펫홈입니다" 표시 (콘텐츠 노출 0).
 * 추모 영상/목소리: 이 페이지 범위에 없음 (record 본인 전용 — pet-media public 버킷 노출 금지 원칙).
 */

import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase-server";
import PethomePublicView from "@/components/features/minihompy/PethomePublicView";

export const dynamic = "force-dynamic";

// 닉네임 핸들 규칙 (NicknameSetupModal HANDLE_REGEX와 동일)
const HANDLE_REGEX = /^[가-힣a-zA-Z0-9_]{2,20}$/;

/**
 * 닉네임 → userId 조회. 대소문자 무시(unique(lower(nickname)) 인덱스와 동일 기준).
 * - 비공개 펫홈(is_public=false 명시)은 null 반환 → 404. 존재 여부 오라클/닉네임 타이틀 노출/색인 차단.
 *   (settings 행이 없으면 기본 공개 — 스펙 §1 #2 "비회원 구경 OK" + 기존 GET 동작과 동일 기준)
 * - React cache(): generateMetadata와 page가 같은 요청에서 중복 조회하지 않도록 1회화.
 */
const lookupByNickname = cache(async (raw: string): Promise<{ id: string; nickname: string } | null> => {
    let nickname: string;
    try {
        nickname = decodeURIComponent(raw);
    } catch {
        return null;
    }
    if (!HANDLE_REGEX.test(nickname)) return null;

    const admin = createAdminSupabase();
    // ilike = 대소문자 무시 매치. 핸들에 허용된 "_"는 ilike 와일드카드라 이스케이프해 정확 매치 보장.
    const escaped = nickname.replace(/[%_]/g, (m) => `\\${m}`);
    const { data } = await admin
        .from("profiles")
        .select("id, nickname")
        .ilike("nickname", escaped)
        .maybeSingle();
    if (!data?.id || !data?.nickname) return null;

    // 비공개 펫홈은 404와 동일 취급 (닉네임 존재조차 노출하지 않음)
    const { data: settings } = await admin
        .from("minihompy_settings")
        .select("is_public")
        .eq("user_id", data.id)
        .maybeSingle();
    if (settings && settings.is_public === false) return null;

    return { id: data.id, nickname: data.nickname };
});

export async function generateMetadata(
    { params }: { params: Promise<{ nickname: string }> },
): Promise<Metadata> {
    const { nickname: raw } = await params;
    const found = await lookupByNickname(raw);
    if (!found) {
        return { title: "펫홈 | 메멘토애니" };
    }
    const title = `${found.nickname}님의 펫홈 | 메멘토애니`;
    const description = "반려동물과 함께하는 모든 순간을 기록하는 메멘토애니 펫홈에 놀러오세요.";
    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "profile",
            url: `/u/${encodeURIComponent(found.nickname)}`,
        },
        twitter: { card: "summary", title, description },
    };
}

export default async function PethomePublicPage(
    { params }: { params: Promise<{ nickname: string }> },
) {
    const { nickname: raw } = await params;
    const found = await lookupByNickname(raw);
    if (!found) notFound();

    return <PethomePublicView userId={found.id} nickname={found.nickname} />;
}
