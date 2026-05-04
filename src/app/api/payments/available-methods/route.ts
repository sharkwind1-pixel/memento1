/**
 * 활성화된 결제 수단 조회
 * GET /api/payments/available-methods
 *
 * 서버가 보유한 PortOne 채널을 기반으로 사용 가능한 결제 수단을 알려줌.
 * 모바일/웹 picker UI가 이 응답을 보고 어떤 옵션을 노출할지 결정.
 *
 * 응답 예:
 *   { "methods": ["card"] }                     // KCP 카드만
 *   { "methods": ["card", "phone"] }            // KCP 카드 + 다날 휴대폰
 *   { "methods": ["card", "phone", "trans"] }  // 추가 채널 활성화 시
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const methods: string[] = [];

    // KCP 카드 채널 (현재 가입 중)
    if (process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY) {
        methods.push("card");
    }

    // 다날 채널 (휴대폰 결제 + 추가 본인확인)
    if (process.env.NEXT_PUBLIC_PORTONE_DANAL_CHANNEL_KEY) {
        methods.push("phone");
    }

    // KCP 추가 결제수단이 활성화되면 별도 ENV로 관리 가능 (현재는 미가입)
    // 예: NEXT_PUBLIC_PORTONE_KCP_TRANS_ENABLED=true 등 도입 검토

    return NextResponse.json({ methods });
}
