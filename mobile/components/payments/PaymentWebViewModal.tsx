/**
 * PaymentWebViewModal — 인앱 결제 (PortOne V1 webview wrapper)
 *
 * 흐름:
 *  1. WebView로 https://mementoani.com/payment/mobile?token=...&type=video 로드
 *  2. 웹 페이지가 /api/payments/.../prepare 호출 + IMP.request_pay 호출
 *  3. PortOne 결제창 (이미 WebView 내부에서 자동 popup)
 *  4. 결제 완료 → /payment/mobile-callback?status=success&paymentId=...&impUid=... 로 이동
 *  5. 모바일 onShouldStartLoadWithRequest가 sentinel URL 인터셉트 → 파라미터 추출
 *  6. /api/payments/video/complete (또는 subscribe/complete) 호출 → 검증
 *  7. 모달 닫기 + onSuccess
 *
 * Props:
 *  - type: "video" | "subscription"
 *  - plan: subscription일 때 "premium" | "premium_annual" (단일 프리미엄 통합 정책 2026-05-15)
 */

import { useState, useRef, useCallback } from "react";
import {
    View, Text, Modal, TouchableOpacity, Alert,
    StyleSheet, ActivityIndicator, Linking, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

export type PayMethod =
    | "card"      // 신용/체크카드 (KCP 안심클릭/ISP)
    | "phone"     // 휴대폰 소액결제 (SKT/KT/LGU+)
    | "trans"     // 실시간 계좌이체
    | "vbank"     // 가상계좌
    | "kakaopay"  // 카카오페이
    | "tosspay"   // 토스페이
    | "payco"     // 페이코
    | "naverpay"  // 네이버페이
    | "samsung"   // 삼성페이
    | "lpay";     // L.pay

interface Props {
    visible: boolean;
    type: "video" | "subscription";
    plan?: "premium" | "premium_annual"; // subscription일 때만. premium_annual = 연 구독. (단일 프리미엄 통합)
    method?: PayMethod;          // 단건 결제 수단. 미지정 시 card.
    packageSize?: 1 | 5 | 10;    // video일 때 묶음 사이즈 (1=단품, 5=5회 묶음, 10=10회 묶음)
    onClose: () => void;
    onSuccess: () => void;
}

const ORIGIN = API_BASE_URL.replace(/^https:\/\/www\./, "https://").replace(/\/$/, "");
const CALLBACK_PATH = "/payment/mobile-callback";

export default function PaymentWebViewModal({ visible, type, plan, method, packageSize, onClose, onSuccess }: Props) {
    const { session, user, profile } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [verifying, setVerifying] = useState(false);
    const handledRef = useRef(false);
    const webviewRef = useRef<WebView>(null);

    const accessToken = session?.access_token;

    // 결제창 진입 URL 빌드
    const paymentUrl = (() => {
        if (!accessToken) return null;
        const url = new URL(`${ORIGIN}/payment/mobile`);
        url.searchParams.set("token", accessToken);
        url.searchParams.set("type", type);
        if (type === "subscription" && plan) url.searchParams.set("plan", plan);
        if (type === "video" && method) url.searchParams.set("method", method);
        if (type === "video" && packageSize && [1, 5, 10].includes(packageSize)) {
            url.searchParams.set("packageSize", String(packageSize));
        }
        if (user?.email) url.searchParams.set("email", user.email);
        if (profile?.nickname) url.searchParams.set("name", profile.nickname);
        return url.toString();
    })();

    /** 콜백 URL 인터셉트 → 결제 검증 → 모달 닫기 */
    const handleCallback = useCallback(async (cbUrl: string) => {
        if (handledRef.current) return;
        handledRef.current = true;

        try {
            const url = new URL(cbUrl);
            const status = url.searchParams.get("status") ?? url.searchParams.get("imp_success");
            const paymentId = url.searchParams.get("paymentId") ?? url.searchParams.get("merchant_uid");
            const impUid = url.searchParams.get("impUid") ?? url.searchParams.get("imp_uid");
            const reason = url.searchParams.get("reason") ?? url.searchParams.get("error_msg");

            // 사용자 취소
            if (status === "cancelled") {
                onClose();
                return;
            }

            // 실패
            if (status !== "success" && status !== "true") {
                Alert.alert("결제 실패", reason || "결제를 완료하지 못했어요.");
                onClose();
                return;
            }

            if (!paymentId || !accessToken) {
                Alert.alert("결제 검증 오류", "결제 정보를 받아오지 못했어요.");
                onClose();
                return;
            }

            // 서버 검증
            setVerifying(true);
            const completePath = type === "subscription"
                ? "/api/payments/subscribe/complete"
                : "/api/payments/video/complete";
            const res = await fetch(`${API_BASE_URL}${completePath}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ paymentId, impUid }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                Alert.alert("결제 검증 실패", err.error || `상태 코드: ${res.status}`);
                onClose();
                return;
            }

            Alert.alert(
                "결제 완료",
                type === "subscription"
                    ? "구독이 시작되었어요! 프리미엄 혜택을 바로 사용하실 수 있어요."
                    : "AI 영상 1건이 충전되었어요! 바로 만들어보세요.",
                [{ text: "확인", onPress: () => { onSuccess(); onClose(); } }],
            );
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "결제 처리 중 오류");
            onClose();
        } finally {
            setVerifying(false);
        }
    }, [accessToken, type, onClose, onSuccess]);

    /** WebView 네비게이션 인터셉트 */
    function shouldStartLoad(req: WebViewNavigation): boolean {
        const url = req.url;

        // 1. mobile-callback URL 감지 → handleCallback로 위임
        if (url.includes(CALLBACK_PATH)) {
            const hasStatus = url.includes("status=") || url.includes("imp_success=");
            if (hasStatus) {
                handleCallback(url);
                return false;
            }
        }

        // 2. 일반 http/https는 WebView가 처리
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return true;
        }

        // 3. 그 외 모든 URL scheme — 카드사/은행/페이 앱 (KCP 결제 시)
        //    예: ispmobile://, kakaopay://, kftc-bankpay://, mpocket.online.ansimclick://,
        //        kb-acp://, shinhan-sr-ansimclick://, hdcardappcardansimclick://,
        //        cloudpay://, payco://, samsungpay://, lpayapp://, smdmbapp://,
        //        nhappcardansimclick://, citimobileapp://, citispay://,
        //        nonceapp://, intent:// (Android), about:blank 등
        //    → OS에 위임하여 외부 앱 launch.
        if (Platform.OS === "android" && url.startsWith("intent://")) {
            // Android intent:// — fallback URL이 있으면 그걸로, 없으면 그냥 무시
            // KCP는 intent://...#Intent;scheme=kakaopay;...;end 형태 사용
            tryOpenExternal(url);
            return false;
        }

        // about:blank는 PortOne이 결제창 닫을 때 navigate함 — 무시
        if (url === "about:blank") {
            return false;
        }

        // 모든 다른 scheme은 외부 앱 호출 시도
        tryOpenExternal(url);
        return false;
    }

    /**
     * Android intent:// URL을 실제 앱 scheme URL로 변환.
     *
     * 형식: intent://<path>?<query>#Intent;scheme=<scheme>;package=<pkg>;...;end
     * 예: intent://launch?TID=ABC#Intent;scheme=ispmobile;package=kvp.jjy.MispAndroid320;end
     *  → ispmobile://launch?TID=ABC
     *
     * Linking.openURL은 intent:// 형식 자체를 못 처리 → 우리가 변환해서 직접 호출.
     */
    function intentToScheme(intentUrl: string): string | null {
        if (!intentUrl.startsWith("intent://")) return null;
        try {
            // path?query 추출 (intent:// 다음 ~ #Intent 직전까지)
            const hashIdx = intentUrl.indexOf("#Intent;");
            if (hashIdx < 0) return null;
            const pathAndQuery = intentUrl.slice("intent://".length, hashIdx);
            const intentParams = intentUrl.slice(hashIdx + "#Intent;".length);
            const schemeMatch = intentParams.match(/scheme=([^;]+)/);
            if (!schemeMatch) return null;
            return `${schemeMatch[1]}://${pathAndQuery}`;
        } catch {
            return null;
        }
    }

    /**
     * 외부 앱 URL scheme 열기.
     *
     * canOpenURL은 사용 X — Expo Go는 LSApplicationQueriesSchemes(iOS) 와
     * <queries> (Android API 30+)를 들고 있지 않아서 설치된 앱도 false 리턴.
     * 무조건 openURL 시도하고 throw일 때만 fallback.
     *
     * intent:// 처리 순서:
     *  1. intent://를 scheme://으로 변환 → openURL (가장 신뢰성 높음)
     *  2. 실패 시 원본 intent:// 그대로 시도 (일부 OS는 직접 처리 가능)
     *  3. 실패 시 browser_fallback_url 추출
     *  4. 다 실패하면 사용자에게 디버그 정보 포함 alert
     */
    async function tryOpenExternal(url: string) {
        const attempts: { label: string; url: string }[] = [];

        if (url.startsWith("intent://")) {
            const converted = intentToScheme(url);
            if (converted) attempts.push({ label: "intent→scheme", url: converted });
            attempts.push({ label: "intent 원본", url });
            const fallbackMatch = url.match(/S\.browser_fallback_url=([^;]+)/);
            if (fallbackMatch) {
                attempts.push({ label: "fallback URL", url: decodeURIComponent(fallbackMatch[1]) });
            }
        } else {
            attempts.push({ label: "직접", url });
        }

        const errors: string[] = [];
        for (const attempt of attempts) {
            try {
                await Linking.openURL(attempt.url);
                return; // 성공
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                errors.push(`[${attempt.label}] ${msg}`);
            }
        }

        // 다 실패
        Alert.alert(
            "결제 앱 실행 실패",
            `결제 앱을 실행할 수 없어요.\n\n시도한 URL: ${attempts[0]?.url.slice(0, 80) ?? url.slice(0, 80)}\n\n앱이 설치되어 있다면 한 번 더 시도하거나, 다른 결제 수단(예: 다른 카드)을 선택해주세요.`,
            [{ text: "확인" }],
        );
        // 실제 실패 경로 진단용 — warn 레벨 유지
        console.warn(`[Payment] all attempts failed:\n${errors.join("\n")}`);
    }

    function handleClose() {
        Alert.alert(
            "결제 취소",
            "결제를 취소하고 닫을까요?",
            [
                { text: "계속 진행", style: "cancel" },
                { text: "닫기", style: "destructive", onPress: onClose },
            ],
        );
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[styles.header, { borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
                    <TouchableOpacity onPress={handleClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={isDarkMode ? COLORS.white : COLORS.gray[800]} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                        {type === "subscription" ? "구독 결제" : "AI 영상 결제"}
                    </Text>
                    <View style={{ width: 32 }} />
                </View>

                {!paymentUrl ? (
                    <View style={styles.centerBox}>
                        <Text style={{ color: COLORS.gray[500] }}>
                            로그인이 필요해요
                        </Text>
                    </View>
                ) : (
                    <WebView
                        ref={webviewRef}
                        source={{ uri: paymentUrl }}
                        onShouldStartLoadWithRequest={shouldStartLoad}
                        startInLoadingState
                        renderLoading={() => (
                            <View style={styles.centerBox}>
                                <ActivityIndicator size="large" color={COLORS.memento[500]} />
                                <Text style={{ marginTop: 12, color: COLORS.gray[500], fontSize: 13 }}>
                                    결제 시스템 준비 중...
                                </Text>
                            </View>
                        )}
                        // KCP 결제창이 popup으로 뜨는데 WebView 내부에서 처리 가능하도록
                        javaScriptEnabled
                        domStorageEnabled
                        sharedCookiesEnabled
                        thirdPartyCookiesEnabled
                        // KCP/PortOne의 ISP/카드사 앱 호출 처리 (나중에 필요시 OS scheme 인터셉트 추가)
                        originWhitelist={["*"]}
                        // iOS는 inline media 허용
                        allowsInlineMediaPlayback
                        mediaPlaybackRequiresUserAction={false}
                    />
                )}

                {verifying && (
                    <View style={styles.verifyingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={{ color: "#fff", marginTop: 12 }}>결제 검증 중...</Text>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "center" },
    centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    verifyingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.7)",
        alignItems: "center",
        justifyContent: "center",
    },
});
