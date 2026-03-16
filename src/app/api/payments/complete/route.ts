/**
 * 결제 완료 검증 API
 * POST /api/payments/complete
 *
 * 클라이언트에서 포트원 결제 완료 후 paymentId를 보내면:
 * 1. 포트원 API로 결제 내역 조회 (금액 위변조 방지)
 * 2. payments 테이블의 pending 레코드를 atomic UPDATE (race condition 방지)
 * 3. 일치하면 payments 상태를 paid로 변경
 * 4. grant_premium RPC 호출 → 프리미엄 활성화
 *
 * 보안:
 * - Atomic UPDATE ... WHERE status='pending' 으로 중복 처리 방지
 * - grant_premium 실패 시 에러 반환 (success: false)
 * - payments update 실패 시 grant_premium 호출 안 함
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { PLAN_DURATION_DAYS } from "@/config/constants";

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET || "";

export async function POST(request: NextRequest) {
    try {
        // 1. 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        // 2. paymentId 받기
        const body = await request.json();
        const { paymentId } = body;

        if (!paymentId || typeof paymentId !== "string") {
            return NextResponse.json(
                { error: "결제 ID가 필요합니다." },
                { status: 400 }
            );
        }

        const adminSupabase = createAdminSupabase();

        // 3. Atomic UPDATE: pending → verifying (race condition 방지)
        // 두 요청이 동시에 오면 하나만 성공하고 나머지는 빈 배열 반환
        const { data: claimedPayments, error: claimError } = await adminSupabase
            .from("payments")
            .update({ status: "verifying" })
            .eq("merchant_uid", paymentId)
            .eq("user_id", user.id)
            .eq("status", "pending")
            .select("*");

        if (claimError) {
            console.error("[payments/complete] claim 오류:", claimError.message);
            return NextResponse.json(
                { error: "결제 처리 중 오류가 발생했습니다." },
                { status: 500 }
            );
        }

        if (!claimedPayments || claimedPayments.length === 0) {
            // 이미 다른 요청이 처리했거나 존재하지 않는 결제
            return NextResponse.json(
                { error: "결제 내역을 찾을 수 없거나 이미 처리된 결제입니다." },
                { status: 409 }
            );
        }

        const payment = claimedPayments[0];

        // 4. 포트원 API로 결제 검증
        if (!PORTONE_API_SECRET) {
            console.error("[payments/complete] PORTONE_API_SECRET 미설정");
            // verifying → failed 롤백
            await adminSupabase
                .from("payments")
                .update({ status: "failed", metadata: { ...payment.metadata, error: "PORTONE_API_SECRET 미설정" } })
                .eq("id", payment.id);
            return NextResponse.json(
                { error: "결제 검증 설정 오류" },
                { status: 500 }
            );
        }

        const portoneResponse = await fetch(
            `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
            {
                headers: {
                    Authorization: `PortOne ${PORTONE_API_SECRET}`,
                },
            }
        );

        if (!portoneResponse.ok) {
            const errText = await portoneResponse.text();
            console.error("[payments/complete] 포트원 API 오류:", errText);
            // verifying → failed 롤백
            await adminSupabase
                .from("payments")
                .update({ status: "failed", metadata: { ...payment.metadata, portone_api_error: errText } })
                .eq("id", payment.id);
            return NextResponse.json(
                { error: "결제 검증에 실패했습니다." },
                { status: 500 }
            );
        }

        const portoneData = await portoneResponse.json();

        // 5. 결제 상태 확인
        if (portoneData.status !== "PAID") {
            await adminSupabase
                .from("payments")
                .update({
                    status: "failed",
                    metadata: { ...payment.metadata, portone_status: portoneData.status },
                })
                .eq("id", payment.id);

            return NextResponse.json(
                { error: `결제가 완료되지 않았습니다. (${portoneData.status})` },
                { status: 400 }
            );
        }

        // 6. 금액 검증 (위변조 방지)
        const paidAmount = portoneData.amount?.total;
        if (paidAmount !== payment.amount) {
            console.error(
                `[payments/complete] 금액 불일치! DB: ${payment.amount}, 포트원: ${paidAmount}`
            );
            await adminSupabase
                .from("payments")
                .update({
                    status: "failed",
                    metadata: {
                        ...payment.metadata,
                        amount_mismatch: true,
                        portone_amount: paidAmount,
                    },
                })
                .eq("id", payment.id);

            return NextResponse.json(
                { error: "결제 금액이 일치하지 않습니다." },
                { status: 400 }
            );
        }

        // 7. payments 상태 업데이트 → paid (update 실패 시 grant_premium 호출 안 함)
        const { error: updateError } = await adminSupabase
            .from("payments")
            .update({
                status: "paid",
                payment_id: portoneData.id || paymentId,
                paid_at: new Date().toISOString(),
                metadata: {
                    ...payment.metadata,
                    portone_method: portoneData.method?.type,
                    portone_card: portoneData.method?.card?.name,
                },
            })
            .eq("id", payment.id)
            .eq("status", "verifying"); // 한번 더 보호

        if (updateError) {
            console.error("[payments/complete] payments 업데이트 오류:", updateError.message);
            return NextResponse.json(
                { error: "결제 상태 업데이트에 실패했습니다. 고객센터에 문의해주세요." },
                { status: 500 }
            );
        }

        // 8. 프리미엄 부여 (grant_premium RPC)
        const plan = payment.plan;
        const durationDays = PLAN_DURATION_DAYS[plan as keyof typeof PLAN_DURATION_DAYS] || 30;

        const { error: grantError } = await adminSupabase.rpc("grant_premium", {
            p_user_id: user.id,
            p_plan: plan,
            p_duration_days: durationDays,
            p_granted_by: null,
            p_reason: `포트원 결제 (${paymentId})`,
        });

        if (grantError) {
            console.error("[payments/complete] grant_premium 오류:", grantError.message);
            // 결제는 됐는데 프리미엄 부여 실패 → grant_failed 마킹 + 에러 반환
            await adminSupabase
                .from("payments")
                .update({
                    metadata: {
                        ...payment.metadata,
                        grant_failed: true,
                        grant_error: grantError.message,
                    },
                })
                .eq("id", payment.id);

            return NextResponse.json(
                {
                    error: "결제는 완료되었으나 프리미엄 활성화에 실패했습니다. 자동으로 처리되며, 지속될 경우 고객센터에 문의해주세요.",
                    paymentCompleted: true,
                    grantFailed: true,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            plan,
            message: "프리미엄이 활성화되었습니다!",
        });
    } catch (err) {
        console.error("[payments/complete] 에러:", err instanceof Error ? err.message : err);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
