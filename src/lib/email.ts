/**
 * email.ts
 * Resend 기반 트랜잭션 이메일 발송 유틸
 *
 * 사용처 (2026-04-11 추가):
 * - 구독 해지 라이프사이클 카운트다운 (D-10, D-5, D-1)
 * - 추후 결제 실패, 비밀번호 재설정 등으로 확장 가능
 *
 * 환경변수:
 * - RESEND_API_KEY: Resend API 키 (미설정 시 발송 skip, 에러 없음)
 * - RESEND_FROM_EMAIL: 발신자 (기본 "noreply@mementoani.com")
 *
 * 실패해도 throw하지 않음 — 이메일은 보조 채널, 실패해도 앱 로직 진행.
 */

interface SendEmailParams {
    to: string;
    subject: string;
    /** HTML 본문 */
    html: string;
    /** 플레인 텍스트 본문 (선택, HTML fallback) */
    text?: string;
    /** 태그 (Resend 대시보드 필터용) */
    tags?: { name: string; value: string }[];
}

interface SendEmailResult {
    success: boolean;
    error?: string;
    messageId?: string;
}

/**
 * Resend API 호출
 * @returns 성공/실패 정보 (실패해도 throw X)
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        // 환경변수 미설정 — 개발 환경이나 이메일 비활성화 상태
        return { success: false, error: "RESEND_API_KEY_MISSING" };
    }

    const from = process.env.RESEND_FROM_EMAIL || "메멘토애니 <noreply@mementoani.com>";

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from,
                to: params.to,
                subject: params.subject,
                html: params.html,
                text: params.text,
                tags: params.tags,
            }),
        });

        const data = await res.json() as { id?: string; message?: string };

        if (!res.ok) {
            return {
                success: false,
                error: data.message || `HTTP ${res.status}`,
            };
        }

        return { success: true, messageId: data.id };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "unknown",
        };
    }
}

// ===== 구독 라이프사이클 이메일 템플릿 =====

/**
 * 구독 해지 완료 이메일.
 * 2026-04-20 "즉시 환불" 정책 전환: premiumExpiresAt은 더 이상 사용하지 않지만
 * 하위 호환을 위해 파라미터는 유지 (null 허용).
 * 문구는 즉시 환불/즉시 차단 기반으로 작성.
 */
export async function sendSubscriptionCancelledEmail(
    to: string,
    nickname: string | null,
    premiumExpiresAt: string | null,
): Promise<SendEmailResult> {
    void premiumExpiresAt; // 호환용 파라미터 — 현재 템플릿에서는 미사용
    const name = nickname || "회원";

    return sendEmail({
        to,
        subject: "[메멘토애니] 구독 해지 및 환불이 완료되었습니다",
        html: `
            <div style="font-family: 'Pretendard', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
                <h1 style="color: #05B2DC; font-size: 20px; margin-bottom: 16px;">구독 해지 및 환불 완료</h1>
                <p>${name}님,</p>
                <p>메멘토애니 구독 해지 및 결제 환불이 완료되었습니다.</p>
                <div style="background: #FFF3E8; padding: 16px; border-radius: 12px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px;"><strong>카드 환불은 카드사 영업일 기준 3~5일 이내</strong> 반영됩니다.</p>
                    <p style="margin: 8px 0 0; font-size: 13px; color: #666;">유료 기능은 즉시 종료되며, 초과 데이터는 40일간 보관 후 영구 삭제됩니다.</p>
                </div>
                <p>그 전에 재구독하시면 모든 데이터가 즉시 복구됩니다.</p>
                <p style="margin-top: 32px;"><a href="https://www.mementoani.com" style="display: inline-block; padding: 12px 24px; background: #05B2DC; color: white; text-decoration: none; border-radius: 8px;">메멘토애니 방문</a></p>
                <p style="margin-top: 32px; font-size: 12px; color: #999;">문의: sharkwind1@gmail.com</p>
            </div>
        `,
        text: `${name}님, 메멘토애니 구독 해지 및 결제 환불이 완료되었습니다. 카드 환불은 3~5영업일 내 반영됩니다. https://www.mementoani.com`,
        tags: [{ name: "category", value: "subscription_cancelled" }],
    });
}

/**
 * 가입 환영 이메일 (베타 프로모션 안내 포함)
 * 가입 직후 1회만 발송. profiles.welcome_email_sent_at으로 중복 방지.
 */
export async function sendWelcomeEmail(
    to: string,
    nickname: string | null,
    options?: { betaPromotion?: boolean; betaPoints?: number; betaDiscountPercent?: number },
): Promise<SendEmailResult> {
    const name = nickname || "회원";
    const betaPromotion = options?.betaPromotion ?? true;
    const betaPoints = options?.betaPoints ?? 3000;
    const betaDiscountPercent = options?.betaDiscountPercent ?? 50;

    const betaBlock = betaPromotion ? `
        <div style="background: linear-gradient(135deg, #FEF3C7, #FFEDD5); padding: 20px; border-radius: 16px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #92400E;">🎁 베타 프로모션 자동 적용</p>
            <ul style="margin: 0; padding-left: 18px; color: #78350F; font-size: 13px; line-height: 1.7;">
                <li><strong>${betaPoints.toLocaleString()}P</strong> 보너스 포인트 지급</li>
                <li>구독 첫 3개월 <strong>${betaDiscountPercent}% 할인</strong></li>
            </ul>
        </div>
    ` : "";

    return sendEmail({
        to,
        subject: "[메멘토애니] 가입을 환영해요!",
        html: `
            <div style="font-family: 'Pretendard', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #05B2DC; font-size: 24px; margin-bottom: 8px;">환영합니다, ${name}님</h1>
                    <p style="color: #6B7280; font-size: 14px; margin: 0;">반려동물과 함께하는 모든 순간을 기록하는 곳</p>
                </div>

                ${betaBlock}

                <div style="background: #F9FAFB; padding: 20px; border-radius: 16px; margin: 20px 0;">
                    <p style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #1F2937;">먼저 해볼 수 있는 것</p>
                    <ul style="margin: 0; padding-left: 18px; color: #4B5563; font-size: 13px; line-height: 1.8;">
                        <li>반려동물 등록하고 첫 사진 올리기</li>
                        <li><strong>평생 무료 AI 영상 1회</strong> 만들기 — 우리 아이의 특별한 영상</li>
                        <li>AI 펫톡으로 아이와 대화 나누기</li>
                        <li>커뮤니티 자랑하기 게시판에서 다른 보호자와 소통</li>
                    </ul>
                </div>

                <p style="margin: 20px 0;">시간이 흘러 추억이 더 소중해질 때, 메멘토애니는 그 추억을 따뜻하게 간직해 드릴게요.</p>

                <p style="text-align: center; margin-top: 32px;">
                    <a href="https://www.mementoani.com" style="display: inline-block; padding: 14px 32px; background: #05B2DC; color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">메멘토애니 시작하기</a>
                </p>

                <p style="margin-top: 32px; font-size: 12px; color: #9CA3AF; text-align: center;">
                    문의: sharkwind1@gmail.com<br>
                    <a href="https://www.mementoani.com" style="color: #9CA3AF;">mementoani.com</a>
                </p>
            </div>
        `,
        text: `${name}님, 메멘토애니에 가입해주셔서 감사합니다. ${betaPromotion ? `베타 프로모션으로 ${betaPoints.toLocaleString()}P + 구독 ${betaDiscountPercent}% 할인이 자동 적용됐어요. ` : ""}https://www.mementoani.com`,
        tags: [{ name: "category", value: "welcome" }],
    });
}

/**
 * 카운트다운 이메일 (D-10, D-5, D-1)
 * 보관 데이터 영구 삭제 경고
 */
export async function sendArchiveCountdownEmail(
    to: string,
    nickname: string | null,
    daysRemaining: number,
    archivedPetCount: number,
): Promise<SendEmailResult> {
    const name = nickname || "회원";
    const urgency = daysRemaining === 1
        ? "내일 자정에"
        : `${daysRemaining}일 후`;

    const subject = daysRemaining === 1
        ? "[메멘토애니] 내일 데이터가 영구 삭제됩니다"
        : `[메멘토애니] ${daysRemaining}일 후 보관 데이터가 삭제됩니다`;

    return sendEmail({
        to,
        subject,
        html: `
            <div style="font-family: 'Pretendard', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
                <h1 style="color: ${daysRemaining <= 3 ? "#DC2626" : "#F59E0B"}; font-size: 20px; margin-bottom: 16px;">
                    ${daysRemaining === 1 ? "마지막 안내" : "보관 데이터 삭제 예정 안내"}
                </h1>
                <p>${name}님,</p>
                <p>메멘토애니에 보관 중인 반려동물 <strong>${archivedPetCount}마리</strong>의 데이터가 ${urgency} 영구 삭제됩니다.</p>
                <div style="background: ${daysRemaining <= 3 ? "#FEE2E2" : "#FEF3C7"}; padding: 16px; border-radius: 12px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px;"><strong>${urgency} 영구 삭제됩니다.</strong></p>
                    <p style="margin: 8px 0 0; font-size: 13px; color: #666;">지금 재구독하시면 모든 데이터가 즉시 복구됩니다.</p>
                </div>
                <p>소중한 추억을 지키고 싶으시다면, 지금 바로 재구독해주세요.</p>
                <p style="margin-top: 32px;"><a href="https://www.mementoani.com" style="display: inline-block; padding: 12px 24px; background: #05B2DC; color: white; text-decoration: none; border-radius: 8px;">지금 재구독하기</a></p>
                <p style="margin-top: 32px; font-size: 12px; color: #999;">문의: sharkwind1@gmail.com</p>
            </div>
        `,
        text: `${name}님, 메멘토애니에 보관 중인 반려동물 ${archivedPetCount}마리의 데이터가 ${urgency} 영구 삭제됩니다. 재구독하면 즉시 복구됩니다. https://www.mementoani.com`,
        tags: [
            { name: "category", value: "archive_countdown" },
            { name: "days_remaining", value: String(daysRemaining) },
        ],
    });
}
