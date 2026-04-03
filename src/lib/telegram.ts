/**
 * 텔레그램 관리자 알림 유틸리티
 * 신고, 크론 결과, 신규 가입, 결제, 에러 등을 텔레그램으로 실시간 알림
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

/** 텔레그램 메시지 전송 (실패해도 throw하지 않음) */
async function sendTelegram(text: string): Promise<boolean> {
    if (!BOT_TOKEN || !CHAT_ID) return false;

    try {
        const res = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                }),
            }
        );
        return res.ok;
    } catch {
        return false;
    }
}

// ============================================================
// 알림 유형별 함수
// ============================================================

/** 신고 접수 알림 */
export async function notifyReport(params: {
    reporterEmail?: string;
    targetType: string;
    targetId: string;
    reason: string;
}) {
    const lines = [
        "<b>[신고 접수]</b>",
        `유형: ${params.targetType}`,
        `사유: ${params.reason}`,
        `신고자: ${params.reporterEmail || "익명"}`,
        `ID: ${params.targetId}`,
    ];
    return sendTelegram(lines.join("\n"));
}

/** 신규 회원 가입 알림 */
export async function notifyNewUser(params: {
    email: string;
    provider?: string;
}) {
    const lines = [
        "<b>[신규 가입]</b>",
        `이메일: ${params.email}`,
        `방법: ${params.provider || "이메일"}`,
        `시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
    ];
    return sendTelegram(lines.join("\n"));
}

/** 결제 완료 알림 */
export async function notifyPayment(params: {
    email: string;
    plan: string;
    amount: number;
}) {
    const lines = [
        "<b>[결제 완료]</b>",
        `회원: ${params.email}`,
        `플랜: ${params.plan}`,
        `금액: ${params.amount.toLocaleString()}원`,
        `시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
    ];
    return sendTelegram(lines.join("\n"));
}

/** 크론 실행 결과 알림 (에러 있을 때만) */
export async function notifyCronResult(params: {
    phase: string;
    kstHour: number;
    error?: string;
    sent?: number;
    failed?: number;
}) {
    if (!params.error && (params.failed || 0) === 0) return false;

    const lines = [
        `<b>[크론 ${params.error ? "에러" : "경고"}]</b>`,
        `Phase: ${params.phase}`,
        `시간: KST ${params.kstHour}시`,
    ];
    if (params.error) lines.push(`에러: ${params.error.slice(0, 200)}`);
    if (params.sent) lines.push(`발송: ${params.sent}건`);
    if (params.failed) lines.push(`실패: ${params.failed}건`);
    return sendTelegram(lines.join("\n"));
}

/** 서버 에러 알림 (심각한 에러만) */
export async function notifyError(params: {
    endpoint: string;
    error: string;
    userId?: string;
}) {
    const lines = [
        "<b>[서버 에러]</b>",
        `API: ${params.endpoint}`,
        `에러: ${params.error.slice(0, 300)}`,
    ];
    if (params.userId) lines.push(`유저: ${params.userId}`);
    lines.push(`시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`);
    return sendTelegram(lines.join("\n"));
}

/** 일일 요약 알림 */
export async function notifyDailySummary(params: {
    totalUsers: number;
    newUsers: number;
    totalChats: number;
    totalPosts: number;
    reports: number;
}) {
    const lines = [
        "<b>[일일 요약]</b>",
        `전체 회원: ${params.totalUsers}명`,
        `오늘 가입: ${params.newUsers}명`,
        `AI 대화: ${params.totalChats}건`,
        `게시글: ${params.totalPosts}건`,
        `신고: ${params.reports}건`,
        `날짜: ${new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}`,
    ];
    return sendTelegram(lines.join("\n"));
}

/** 테스트 메시지 */
export async function notifyTest() {
    return sendTelegram(
        "<b>[테스트]</b>\n메멘토애니 관리 알림 연결 성공!"
    );
}
