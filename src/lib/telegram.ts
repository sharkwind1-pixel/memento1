/**
 * 텔레그램 관리자 알림 유틸리티
 * 채널별로 분리: 신고, 결제, 시스템(크론/에러)
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

// 채널별 chat ID (그룹 분리)
const CHAT = {
    report: process.env.TELEGRAM_CHAT_REPORT || process.env.TELEGRAM_CHAT_ID || "",
    payment: process.env.TELEGRAM_CHAT_PAYMENT || process.env.TELEGRAM_CHAT_ID || "",
    system: process.env.TELEGRAM_CHAT_SYSTEM || process.env.TELEGRAM_CHAT_ID || "",
    default: process.env.TELEGRAM_CHAT_ID || "",
};

type Channel = keyof typeof CHAT;

/** HTML 특수문자 이스케이프 (사용자 입력 안전 처리) */
function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 텔레그램 메시지 전송 (실패해도 throw하지 않음) */
async function sendTelegram(text: string, channel: Channel = "default"): Promise<boolean> {
    const chatId = CHAT[channel];
    if (!BOT_TOKEN || !chatId) return false;

    try {
        const res = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
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
// 알림 유형별 함수 (채널 분리)
// ============================================================

/** 신고 접수 알림 -> 신고 알림 그룹 */
export async function notifyReport(params: {
    reporterEmail?: string;
    targetType: string;
    targetId: string;
    reason: string;
}) {
    const lines = [
        "<b>[신고 접수]</b>",
        `유형: ${escapeHtml(params.targetType)}`,
        `사유: ${escapeHtml(params.reason)}`,
        `신고자: ${escapeHtml(params.reporterEmail || "익명")}`,
        `ID: ${escapeHtml(params.targetId)}`,
        `시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
    ];
    return sendTelegram(lines.join("\n"), "report");
}

/** 신규 회원 가입 알림 -> 시스템 알림 그룹 */
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
    return sendTelegram(lines.join("\n"), "system");
}

/** 결제 완료 알림 -> 결제 알림 그룹 */
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
    return sendTelegram(lines.join("\n"), "payment");
}

/** 크론 실행 결과 알림 (에러 / 실패 / 만료 / 처리 건이 있을 때) -> 시스템 알림 그룹.
 *
 * 라벨 분기:
 *  - error 있으면 [크론 에러] (진짜 시스템 장애 — 토큰 발급 실패, DB 연결 끊김 등)
 *  - error 없고 failed/expired만 있으면 [크론 리포트] (정상 처리된 결제 실패/만료 보고)
 *
 * kstHour 미지정 시 호출 시점의 KST 시간 자동 계산.
 * (이전: subscription-renewal이 항상 7로 하드코드 → 수동 트리거 시 잘못된 시각 표시)
 */
export async function notifyCronResult(params: {
    phase: string;
    kstHour?: number;
    error?: string;
    renewed?: number;
    sent?: number;
    failed?: number;
    expired?: number;
}) {
    const renewed = params.renewed ?? 0;
    const sent = params.sent ?? 0;
    const failed = params.failed ?? 0;
    const expired = params.expired ?? 0;

    if (!params.error && failed === 0 && expired === 0) return false;

    const kstHour = typeof params.kstHour === "number"
        ? params.kstHour
        : Number(new Date().toLocaleString("en-US", {
              timeZone: "Asia/Seoul", hour: "2-digit", hour12: false,
          }));

    const label = params.error ? "크론 에러" : "크론 리포트";

    const lines = [
        `<b>[${label}]</b>`,
        `Phase: ${params.phase}`,
        `시간: KST ${kstHour}시`,
    ];
    if (params.error) lines.push(`에러: ${params.error.slice(0, 200)}`);
    if (renewed) lines.push(`갱신: ${renewed}건`);
    if (sent) lines.push(`발송: ${sent}건`);
    if (failed) lines.push(`실패: ${failed}건`);
    if (expired) lines.push(`만료: ${expired}건`);
    return sendTelegram(lines.join("\n"), "system");
}

/** 서버 에러 알림 -> 시스템 알림 그룹 */
export async function notifyError(params: {
    endpoint: string;
    error: string;
    userId?: string;
}) {
    const lines = [
        "<b>[서버 에러]</b>",
        `API: ${escapeHtml(params.endpoint)}`,
        `에러: ${params.error.slice(0, 300)}`,
    ];
    if (params.userId) lines.push(`유저: ${params.userId}`);
    lines.push(`시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`);
    return sendTelegram(lines.join("\n"), "system");
}

/** Open 100 이벤트 달성 알림 -> 시스템 알림 그룹 */
export async function notifyOpen100Award(params: {
    email: string;
    awardedCount: number;
    remaining: number;
}) {
    const lines = [
        "<b>[Open 100 달성]</b>",
        `진행률: ${params.awardedCount}/100`,
        `남은 자리: ${params.remaining}`,
        `유저: ${escapeHtml(params.email)}`,
    ];
    if (params.remaining === 0) lines.push("<b>[이벤트 완주] 100명 전원 달성</b>");
    return sendTelegram(lines.join("\n"), "system");
}

/** 일일 요약 알림 -> 시스템 알림 그룹 */
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
    return sendTelegram(lines.join("\n"), "system");
}

/** 테스트 메시지 -> 기본 채팅 */
export async function notifyTest() {
    return sendTelegram(
        "<b>[테스트]</b>\n메멘토애니 관리 알림 연결 성공!",
        "default"
    );
}
