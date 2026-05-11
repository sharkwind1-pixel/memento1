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

        // subscription_tier 결정
        // is_premium = true 이지만 subscription_tier가 NULL/"free" 같은 모순 상태일 때
        // "premium"으로 자동 보정 (관리자 부여 시 tier 누락된 과거 데이터 대응)
        const rawTier = profile?.subscription_tier as SubscriptionTier | null | undefined;
        const subscriptionTier: SubscriptionTier = isPremium
            ? (rawTier === "basic" ? "basic" : "premium")
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

        // 5-3-b. 단품/묶음 보너스 크레딧 합산 (metadata.video_credits 기준)
        const { createAdminSupabase: createAdmin } = await import("@/lib/supabase-server");
        const adminSupabase = createAdmin();
        const videoPlans = ["video_single", "video_bundle_5", "video_bundle_10"];

        let bonusCredits = 0;
        if (subscriptionTier !== "free") {
            const { data: paidPurchases } = await adminSupabase
                .from("payments")
                .select("metadata")
                .eq("user_id", user.id)
                .in("plan", videoPlans)
                .eq("status", "paid")
                .gte("paid_at", monthStart);
            bonusCredits = (paidPurchases ?? []).reduce((sum, p) => {
                const credits = typeof p.metadata?.video_credits === "number" ? p.metadata.video_credits : 1;
                return sum + credits;
            }, 0);
        } else {
            const { data: paidPurchases } = await adminSupabase
                .from("payments")
                .select("metadata")
                .eq("user_id", user.id)
                .in("plan", videoPlans)
                .eq("status", "paid");
            bonusCredits = (paidPurchases ?? []).reduce((sum, p) => {
                const credits = typeof p.metadata?.video_credits === "number" ? p.metadata.video_credits : 1;
                return sum + credits;
            }, 0);
        }

        // 5-4. 쿼터 초과 검사 (tier별 분기) — 보너스 크레딧 합산
        if (subscriptionTier === "free") {
            // 무료 회원: 평생 FREE_LIFETIME회 + 보너스 크레딧
            const effectiveLimit = VIDEO.FREE_LIFETIME + bonusCredits;
            if ((lifetimeCount ?? 0) >= effectiveLimit) {
                return NextResponse.json(
                    { error: "무료 체험 영상 생성 횟수를 모두 사용했습니다. 단품 또는 묶음권을 구매하거나 구독하면 더 많이 만들 수 있어요." },
                    { status: 403 }
                );
            }
        } else {
            // 베이직/프리미엄: 월간 쿼터 + 보너스 크레딧
            const effectiveLimit = monthlyQuota + bonusCredits;
            if ((monthlyCount ?? 0) >= effectiveLimit) {
                return NextResponse.json(
                    { error: `이번 달 영상 생성 횟수(${effectiveLimit}회)를 모두 사용했습니다. 묶음권을 구매하거나 다음 달에 다시 이용해주세요.` },
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
            // 직접 입력 프롬프트: 한국어 → Veo 3.1 최적화 영문 프롬프트 변환
            // Google 공식 Veo 3.1 가이드 기반 5-part formula + 3-beat sequence 적용
            try {
                const openai = new (await import("openai")).default({
                    apiKey: process.env.OPENAI_API_KEY,
                });
                const translateResult = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    max_tokens: 500,
                    temperature: 0.4,
                    messages: [
                        {
                            role: "system",
                            content: `You are a Veo 3.1 image-to-video prompt engineer specializing in pet videos.
Convert the user's Korean description into a structured English prompt using Google's official 5-part formula:

STRUCTURE (in this exact order):
1. [Camera Shot/Movement] — START with this. Examples:
   - "Wide tracking shot following the pet from the side..."
   - "Slow cinematic push-in toward..."
   - "Medium shot from a low angle..."
   - "Slow dolly-out revealing..."
   - "Intimate close-up of..."
2. [Subject + 3-Beat Action] — Describe action as 3 beats happening in 8 seconds:
   - "Beat 1: ... Beat 2: ... Beat 3: ..."
   - Each beat is a distinct, photographable moment
   - Include subtle motion: blinking, breathing, ear twitch, tail flick
3. [Context Sensory Details] — Environment with sensory texture:
   - What surrounds the pet, what moves in the scene (leaves drift, mist swirls, etc.)
4. [Lighting] — Specific lighting type:
   - "Golden hour backlight", "rim lighting", "volumetric god rays", "soft window light"
5. [Style/Lens Reference] — End with cinematic reference:
   - "Shot on 35mm film with shallow depth of field" (daily, vibrant)
   - "85mm portrait lens with creamy bokeh, Studio Ghibli aesthetic" (memorial, dreamy)
   - "Pixar-style painterly textures" (fantasy/playful)
   - Add: "Maintain consistent subject features, no morphing, no glitches"

RULES:
- Output ONLY the final English prompt, no explanation
- Total length 250-450 characters
- Use present tense, filmmaker-like visual direction
- Do NOT use "Place this pet" — the model auto-recognizes subject from the input image
- Do NOT use vague terms like "4K quality" or "high definition" — use specific cinematic references instead
- If user's tone is sad/memorial, use S_MEMORIAL style (soft golden, peaceful)
- If user's tone is playful/joyful, use S_DAILY style (vibrant, energetic)
- If user describes costume/transformation, use S_FANTASY style (Pixar-like)`,
                        },
                        { role: "user", content: sanitizeInput(customPrompt) },
                    ],
                });
                finalPrompt = translateResult.choices[0]?.message?.content?.trim() || sanitizeInput(customPrompt);
            } catch {
                // 번역 실패 시 원본 그대로
                finalPrompt = sanitizeInput(customPrompt);
            }
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
