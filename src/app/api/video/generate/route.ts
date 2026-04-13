/**
 * AI 영상 생성 API
 * POST: 반려동물 사진 기반 AI 영상 생성 요청
 *
 * 보안:
 * - 세션 기반 인증 필수
 * - Rate Limiting (write)
 * - VPN/프록시 차단
 * - 서버 사이드 쿼터 검증 (무료: 평생 1회, 프리미엄: 월 3회)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    sanitizeInput,
    checkVPN,
    getVPNBlockResponse,
} from "@/lib/rate-limit";
import { submitVideoGeneration } from "@/lib/fal";
import { VIDEO, type SubscriptionTier, getVideoMonthlyQuota } from "@/config/constants";
import { VIDEO_TEMPLATES } from "@/config/videoTemplates";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    try {
        // 1. Rate Limiting (스팸 방지)
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요." },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn),
                }
            );
        }

        // 2. VPN/프록시 감지
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[Security] VPN blocked (video generate): ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = await createServerSupabase();
        const body = await request.json();

        const { petId, petName, sourcePhotoUrl, templateId, customPrompt } = body;

        // 4. 필수 필드 검증
        if (!sourcePhotoUrl) {
            return NextResponse.json(
                { error: "원본 사진 URL이 필요합니다." },
                { status: 400 }
            );
        }

        // 4-1. 이미지 모더레이션 (반려동물 사진인지 검증)
        const { moderateImage } = await import("@/lib/image-moderation");
        const modResult = await moderateImage(sourcePhotoUrl);
        if (!modResult.allowed) {
            return NextResponse.json(
                { error: modResult.reason || "반려동물 사진만 사용할 수 있어요." },
                { status: 400 }
            );
        }

        // 5. 서버 사이드 쿼터 검증
        // 5-1. 프리미엄/구독 등급 확인
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at, subscription_tier")
            .eq("id", user.id)
            .single();

        const isPremium = profile?.is_premium &&
            (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

        // subscription_tier 결정 (DB 값 우선, 하위호환)
        const subscriptionTier: SubscriptionTier = isPremium
            ? ((profile?.subscription_tier as SubscriptionTier) || "premium")
            : "free";
        const monthlyQuota = getVideoMonthlyQuota(subscriptionTier);

        // 5-2. 이번 달 생성 횟수 (월간 쿼터용, 실패 제외, KST 기준)
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstNow = new Date(Date.now() + kstOffset);
        const monthStart = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1) - kstOffset).toISOString();

        const { count: monthlyCount } = await supabase
            .from("video_generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .neq("status", "failed")
            .gte("created_at", monthStart);

        // 5-3. 전체 생성 횟수 (평생 무료 쿼터용, 실패 제외)
        const { count: lifetimeCount } = await supabase
            .from("video_generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .neq("status", "failed");

        // 5-4. 쿼터 초과 검사 (tier별 분기)
        if (subscriptionTier === "free") {
            // 무료 회원: 평생 FREE_LIFETIME회
            if ((lifetimeCount ?? 0) >= VIDEO.FREE_LIFETIME) {
                return NextResponse.json(
                    { error: "무료 체험 영상 생성 횟수를 모두 사용했습니다. 구독하면 매달 더 많은 영상을 만들 수 있어요." },
                    { status: 403 }
                );
            }
        } else {
            // 베이직/프리미엄: 월간 쿼터
            if ((monthlyCount ?? 0) >= monthlyQuota) {
                return NextResponse.json(
                    { error: `이번 달 영상 생성 횟수(${monthlyQuota}회)를 모두 사용했습니다. 다음 달에 다시 이용해주세요.` },
                    { status: 403 }
                );
            }
        }

        // 6. 프롬프트 결정
        let finalPrompt: string | null = null;

        if (templateId) {
            const template = VIDEO_TEMPLATES.find(t => t.id === templateId);
            if (!template) {
                return NextResponse.json(
                    { error: "존재하지 않는 템플릿입니다." },
                    { status: 400 }
                );
            }
            finalPrompt = template.prompt;
        } else if (customPrompt) {
            finalPrompt = sanitizeInput(customPrompt);
        }

        if (!finalPrompt) {
            return NextResponse.json(
                { error: "템플릿 또는 커스텀 프롬프트를 선택해주세요." },
                { status: 400 }
            );
        }

        // 6.5. 환경변수 확인
        if (!process.env.FAL_KEY) {
            console.error("[Video Generate] FAL_KEY 환경변수가 설정되지 않았습니다.");
            return NextResponse.json(
                { error: "영상 생성 서비스가 아직 설정되지 않았습니다. 관리자에게 문의해주세요." },
                { status: 503 }
            );
        }

        // 7. Webhook URL 구성 (HMAC 서명 기반 - 시크릿 노출 방지)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mementoani.com";
        const webhookSecret = process.env.VIDEO_WEBHOOK_SECRET || "";
        const timestamp = Date.now().toString();
        const hmacSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(`${user.id}:${timestamp}`)
            .digest("hex");
        const webhookUrl = `${baseUrl}/api/video/webhook?ts=${timestamp}&sig=${hmacSignature}&uid=${user.id}`;

        // 8. fal.ai 큐에 영상 생성 요청 제출
        let falRequestId: string;
        try {
            falRequestId = await submitVideoGeneration(sourcePhotoUrl, finalPrompt, webhookUrl);
        } catch (falErr) {
            const msg = falErr instanceof Error ? falErr.message : String(falErr);
            console.error("[Video Generate] fal.ai 요청 실패:", msg);
            return NextResponse.json(
                { error: "AI 영상 생성 서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.", detail: msg },
                { status: 502 }
            );
        }

        // 9. DB에 생성 기록 저장
        const { data: generation, error: insertError } = await supabase
            .from("video_generations")
            .insert({
                user_id: user.id,
                pet_id: petId || null,
                pet_name: petName ? sanitizeInput(petName) : null,
                source_photo_url: sourcePhotoUrl,
                template_id: templateId || null,
                custom_prompt: customPrompt ? sanitizeInput(customPrompt) : null,
                fal_request_id: falRequestId,
                status: "pending",
            })
            .select("id, status")
            .single();

        if (insertError) {
            console.error("[Video Generate] DB 저장 에러:", insertError);
            return NextResponse.json(
                { error: "영상 생성 요청 저장 중 오류가 발생했습니다." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            id: generation.id,
            status: "pending",
        });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errStack = err instanceof Error ? err.stack : "";
        console.error("[Video Generate] 서버 오류:", errMsg, errStack);
        return NextResponse.json(
            { error: "영상 생성 요청 중 오류가 발생했습니다.", detail: errMsg },
            { status: 500 }
        );
    }
}
