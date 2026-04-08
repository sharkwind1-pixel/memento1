/**
 * 카카오톡 공유 유틸리티
 * Kakao JavaScript SDK 지연 로드 + 공유 기능
 *
 * 폴백: Web Share API → 클립보드 복사
 */

declare global {
    interface Window {
        Kakao?: {
            init: (appKey: string) => void;
            isInitialized: () => boolean;
            Share: {
                sendDefault: (params: KakaoShareParams) => void;
            };
        };
    }
}

interface KakaoShareParams {
    objectType: "feed";
    content: {
        title: string;
        description: string;
        imageUrl: string;
        link: { mobileWebUrl: string; webUrl: string };
    };
    buttons: Array<{
        title: string;
        link: { mobileWebUrl: string; webUrl: string };
    }>;
}

export interface ShareParams {
    title: string;
    description: string;
    imageUrl?: string;
    pageUrl: string; // 절대 또는 상대 URL
}

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
const getAppKey = () => process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "";
const getSiteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://mementoani.com";

let loadPromise: Promise<void> | null = null;

/** Kakao SDK 지연 로드 (첫 공유 시에만) */
function loadKakaoSDK(): Promise<void> {
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
        if (window.Kakao) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = KAKAO_SDK_URL;
        script.onload = () => resolve();
        script.onerror = () => {
            loadPromise = null;
            reject(new Error("카카오 SDK 로드 실패"));
        };
        document.head.appendChild(script);
    });

    return loadPromise;
}

/** Kakao SDK 초기화 */
function initKakao(): boolean {
    const appKey = getAppKey();
    if (!appKey || !window.Kakao) return false;

    if (!window.Kakao.isInitialized()) {
        window.Kakao.init(appKey);
    }
    return window.Kakao.isInitialized();
}

/** 절대 URL 생성 */
function toAbsoluteUrl(pageUrl: string): string {
    if (pageUrl.startsWith("http")) return pageUrl;
    const base = getSiteUrl().replace(/\/$/, "");
    const path = pageUrl.startsWith("/") ? pageUrl : `/${pageUrl}`;
    return `${base}${path}`;
}

/**
 * 카카오톡으로 공유 (폴백: Web Share API → 클립보드)
 * @returns "kakao" | "webshare" | "clipboard" | "failed"
 */
export async function shareViaKakao(params: ShareParams): Promise<string> {
    const absoluteUrl = toAbsoluteUrl(params.pageUrl);
    const imageUrl = params.imageUrl || `${getSiteUrl()}/og-image.png`;

    // 1차: 카카오 SDK
    try {
        await loadKakaoSDK();
        if (initKakao() && window.Kakao) {
            window.Kakao.Share.sendDefault({
                objectType: "feed",
                content: {
                    title: params.title,
                    description: params.description.slice(0, 200),
                    imageUrl,
                    link: { mobileWebUrl: absoluteUrl, webUrl: absoluteUrl },
                },
                buttons: [
                    {
                        title: "자세히 보기",
                        link: { mobileWebUrl: absoluteUrl, webUrl: absoluteUrl },
                    },
                ],
            });
            return "kakao";
        }
    } catch {
        // 카카오 실패 시 폴백
    }

    // 2차: Web Share API
    if (navigator.share) {
        try {
            await navigator.share({
                title: params.title,
                text: params.description,
                url: absoluteUrl,
            });
            return "webshare";
        } catch {
            // 유저가 취소하거나 실패
        }
    }

    // 3차: 클립보드 복사
    try {
        await navigator.clipboard.writeText(absoluteUrl);
        return "clipboard";
    } catch {
        return "failed";
    }
}
