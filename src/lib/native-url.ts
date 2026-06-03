/**
 * native-url.ts
 *
 * 모바일 딥링크 `nativeUrl` 검증 — 오픈 리다이렉트 / 매직링크 토큰 탈취 방지.
 *
 * OAuth·네이버 매직링크 콜백은 인증 성공 후 `token_hash`/`code`를 `nativeUrl`로
 * forward하여 앱을 연다. 만약 임의의 https URL을 허용하면 공격자가
 * `nativeUrl=https://evil.com`을 심어 1회용 토큰을 자기 서버로 빼돌려
 * 세션을 탈취할 수 있다. → 앱 커스텀 스킴만 허용한다.
 *
 *  - `mementoani://` : 프로덕션 앱 스킴 (mobile/app.json scheme)
 *  - `exp://`        : Expo 개발 클라이언트
 */
const ALLOWED_NATIVE_SCHEMES = ["mementoani://", "exp://"];

export function isAllowedNativeUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== "string") return false;
    const lower = url.trim().toLowerCase();
    return ALLOWED_NATIVE_SCHEMES.some((scheme) => lower.startsWith(scheme));
}
