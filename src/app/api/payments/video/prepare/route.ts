/**
 * AI 영상 결제 준비 API (단품 + 묶음권)
 * POST /api/payments/video/prepare
 *
 * 영상 결제 옵션:
 *  - packageSize: 1 → 4,900원 (단품)
 *  - packageSize: 5 → 19,900원 (묶음, 영상당 3,980원)
 *  - packageSize: 10 → 34,900원 (묶음, 영상당 3,490원)
 *
 * 프리미엄 여부와 무관하게 추가 구매 가능.
 * 무료 회원도 평생 1회 무료 사용 후 구매 가능.
 *
 * 결제 완료 시 payments.metadata.video_credits에 횟수 저장.
 * video/quota API에서 이 값을 합산하여 보너스 크레딧으로 표시.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { VIDEO } from "@/config/constants";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

/** packageSize → { amount, orderName, credits } */
function getPackageDetails(packageSize: number): { amount: number; orderName: string; credits: number } | null {
    switch (packageSize) {
        case 1:
            return { amount: VIDEO.SINGLE_PRICE, orderName: "AI 영상 1회권", credits: 1 };
        case 5:
            return { amount: VIDEO.BUNDLE_5_PRICE, orderName: "AI 영상 5회 묶음권", credits: 5 };
        case 10:
            return { amount: VIDEO.BUNDLE_10_PRICE, orderName: "AI 영상 10회 묶음권", credits: 10 };
        default:
            return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        // packageSize 파라미터 (기본 1 — 기존 단품 흐름과 호환)
        let packageSize = 1;
        try {
            const body = await request.json().catch(() => ({}));
            const raw = body?.packageSize;
            if (typeof raw === "number" && [1, 5, 10].includes(raw)) {
                packageSize = raw;
            }
        } catch { /* body 없으면 1로 폴백 */ }

        const pkg = getPackageDetails(packageSize);
        if (!pkg) {
            return NextResponse.json({ error: "잘못된 묶음 옵션입니다." }, { status: 400 });
        }

        const paymentId = `memento_video_${randomUUID()}`;

        const adminSupabase = createAdminSupabase();

        // 기존 pending 정리 (모든 video_* plan)
        await adminSupabase
            .from("payments")
            .update({ status: "cancelled" })
            .eq("user_id", user.id)
            .in("plan", ["video_single", "video_bundle_5", "video_bundle_10"])
            .eq("status", "pending");

        const plan = packageSize === 1 ? "video_single" : `video_bundle_${packageSize}`;

        // pending 레코드 생성. metadata.video_credits 저장 → quota API가 합산.
        const { error: insertError } = await adminSupabase
            .from("payments")
            .insert({
                user_id: user.id,
                amount: pkg.amount,
                plan,
                merchant_uid: paymentId,
                status: "pending",
                metadata: {
                    orderName: pkg.orderName,
                    video_credits: pkg.credits,
                    package_size: packageSize,
                },
            });

        if (insertError) {
            console.error("[payments/video/prepare] DB 오류:", insertError.message);
            return NextResponse.json({ error: "결제 준비에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({
            paymentId,
            orderName: pkg.orderName,
            amount: pkg.amount,
            credits: pkg.credits,
        });
    } catch (err) {
        console.error("[payments/video/prepare] 에러:", err instanceof Error ? err.message : err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
