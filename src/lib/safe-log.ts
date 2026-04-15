/**
 * 민감 정보 포함된 로그 메시지 마스킹
 * PortOne 에러 응답에 우리가 보낸 API 키가 에코되어 로그에 노출되는 경우 방지
 */

/** 20자 이상 연속 영숫자는 앞4+뒷4만 남기고 마스킹 */
export function maskSensitive(msg: unknown): string {
    const text = typeof msg === "string" ? msg : JSON.stringify(msg);
    return text.replace(/[A-Za-z0-9+/=_-]{20,}/g, (m) =>
        m.length > 10 ? `${m.slice(0, 4)}***${m.slice(-4)}` : "***"
    );
}
