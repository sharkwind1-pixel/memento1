/**
 * 매거진 기사 리더 — WebView로 웹 페이지 그대로 렌더링.
 *
 * 변경 이유: 자체 카드 분할/스타일링이 웹과 시각적으로 달라서 사용자 혼란.
 * 웹 레이아웃(폰트/볼드/이미지 정렬)을 그대로 가져오기 위해 WebView 사용.
 *
 * 구조:
 *  - 상단 native 헤더: 뒤로 / 좋아요 / 공유
 *  - 본문: WebView로 https://mementoani.com/magazine/{id} 로드
 *  - injectedJS로 web의 header/footer/nav 숨김
 *  - 좋아요/조회수: native API 호출로 직접 처리 (WebView는 anonymous)
 */

import { useState, useEffect, useRef } from "react";
import {
    View, Text, TouchableOpacity, ActivityIndicator,
    Share, Alert, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

const ORIGIN = API_BASE_URL.replace(/^https:\/\/www\./, "https://").replace(/\/$/, "");

/**
 * 웹 페이지 로드 후 inject할 CSS — 모바일 앱 전용 chrome 숨김.
 * 웹의 글로벌 header/footer/네비/홈 링크 등을 가려서 앱 내 임베드 느낌으로 만듦.
 */
const INJECTED_CSS = `
(function() {
    const style = document.createElement('style');
    style.textContent = \`
        /* 글로벌 chrome 숨김 — 매거진 콘텐츠만 보이게 */
        body > header,
        body > nav,
        body > footer,
        header[data-app-header],
        nav[data-app-nav],
        footer,
        .app-header,
        .app-footer,
        .global-nav,
        [role="banner"],
        [role="navigation"]:not([role="navigation"][aria-label*="카드"]),
        [role="contentinfo"] {
            display: none !important;
        }
        /* 매거진 본문 영역 상단 패딩 줄이기 (앱 헤더가 있으니까) */
        main, article {
            padding-top: 0 !important;
        }
        /* 모바일 가독성: 좀 더 큰 줄간격 */
        body {
            -webkit-text-size-adjust: 100%;
        }
    \`;
    document.head.appendChild(style);
    true;
})();
`;

interface ArticleMeta {
    id: string;
    title: string;
    summary?: string;
    likes: number;
    views: number;
    liked?: boolean;
}

export default function MagazineReaderScreen() {
    const { isDarkMode } = useDarkMode();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const webviewRef = useRef<WebView>(null);

    const [meta, setMeta] = useState<ArticleMeta | null>(null);
    const [isLiking, setIsLiking] = useState(false);
    const [webLoading, setWebLoading] = useState(true);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    // 좋아요 상태 / 메타 데이터 별도 fetch (WebView는 anonymous라 likes 못 받음)
    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        (async () => {
            try {
                const { data: row } = await supabase
                    .from("magazine_articles")
                    .select("id, title, summary, likes, views")
                    .eq("id", id)
                    .eq("status", "published")
                    .maybeSingle();
                if (cancelled || !row) return;

                let liked = false;
                if (session?.access_token) {
                    const { data: likeRow } = await supabase
                        .from("magazine_likes")
                        .select("id")
                        .eq("article_id", row.id)
                        .maybeSingle();
                    liked = !!likeRow;
                }
                setMeta({
                    id: row.id,
                    title: row.title,
                    summary: row.summary ?? undefined,
                    likes: row.likes ?? 0,
                    views: row.views ?? 0,
                    liked,
                });
            } catch {
                // silent
            }
        })();
        return () => { cancelled = true; };
    }, [id, session?.access_token]);

    // 조회수 +1 — session 준비된 후 1회 (서버는 인증 필수)
    useEffect(() => {
        if (!id || !session?.access_token) return;
        fetch(`${API_BASE_URL}/api/magazine`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ articleId: id, action: "view" }),
        }).catch(() => {});
    }, [id, session?.access_token]);

    async function handleLike() {
        if (!session || !meta || isLiking) return;
        setIsLiking(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const prevLiked = meta.liked;
        const prevLikes = meta.likes;
        const newLiked = !prevLiked;
        // 낙관적 업데이트
        setMeta((m) => m ? { ...m, liked: newLiked, likes: m.likes + (newLiked ? 1 : -1) } : m);
        try {
            const res = await fetch(`${API_BASE_URL}/api/magazine`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ articleId: id, action: newLiked ? "like" : "unlike" }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (typeof data.liked === "boolean" && typeof data.likes === "number") {
                setMeta((m) => m ? { ...m, liked: data.liked, likes: data.likes } : m);
            }
        } catch {
            // 롤백
            setMeta((m) => m ? { ...m, liked: prevLiked, likes: prevLikes } : m);
        } finally {
            setIsLiking(false);
        }
    }

    async function handleShare() {
        if (!meta) return;
        const url = `${ORIGIN}/magazine/${id}`;
        try {
            await Share.share({
                title: meta.title,
                message: meta.summary ? `${meta.title}\n\n${meta.summary}\n\n${url}` : `${meta.title}\n\n${url}`,
                url,
            });
        } catch {
            // 사용자 취소
        }
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const headerBorderColor = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const iconColor = isDarkMode ? COLORS.white : COLORS.gray[800];
    const articleUrl = `${ORIGIN}/magazine/${id}`;

    if (!id) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]}>
                <View style={styles.center}>
                    <Text style={{ color: COLORS.gray[500] }}>잘못된 접근입니다.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* native 상단 바 */}
            <View style={[styles.header, { borderBottomColor: headerBorderColor }]}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={22} color={iconColor} />
                </TouchableOpacity>

                <Text
                    style={[styles.headerTitle, { color: iconColor }]}
                    numberOfLines={1}
                >
                    {meta?.title ?? "매거진"}
                </Text>

                <View style={{ flexDirection: "row", gap: 4 }}>
                    {meta && session && (
                        <TouchableOpacity
                            onPress={handleLike}
                            disabled={isLiking}
                            hitSlop={8}
                            style={styles.headerBtn}
                        >
                            <Ionicons
                                name={meta.liked ? "heart" : "heart-outline"}
                                size={22}
                                color={meta.liked ? "#EF4444" : iconColor}
                            />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleShare} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="share-outline" size={22} color={iconColor} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 좋아요/조회수 카운트 (메타 정보) */}
            {meta && (
                <View style={[styles.metaRow, { borderBottomColor: headerBorderColor }]}>
                    <View style={styles.metaItem}>
                        <Ionicons
                            name={meta.liked ? "heart" : "heart-outline"}
                            size={13}
                            color={meta.liked ? "#EF4444" : COLORS.gray[500]}
                        />
                        <Text style={styles.metaText}>{meta.likes}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="eye-outline" size={13} color={COLORS.gray[500]} />
                        <Text style={styles.metaText}>{meta.views.toLocaleString()}</Text>
                    </View>
                </View>
            )}

            {/* 본문: WebView로 웹 페이지 그대로 렌더 */}
            <View style={styles.flex1}>
                <WebView
                    ref={webviewRef}
                    source={{ uri: articleUrl }}
                    style={styles.flex1}
                    injectedJavaScript={INJECTED_CSS}
                    onLoadStart={() => setWebLoading(true)}
                    onLoadEnd={() => setWebLoading(false)}
                    onShouldStartLoadWithRequest={(req) => {
                        // 다른 매거진 글로 이동 시 같은 화면에서 로드 (앱 내 유지)
                        if (req.url.includes("/magazine/")) return true;
                        // 외부 링크는 네이티브 브라우저로
                        if (req.url.startsWith("http") && !req.url.includes("mementoani.com")) {
                            // 단, 이미지/CDN 등 같은 도메인 리소스는 통과
                            // 사용자가 클릭한 링크라면 막고 외부 처리
                            if (req.navigationType === "click") {
                                Alert.alert(
                                    "외부 링크",
                                    "외부 페이지로 이동하시겠어요?",
                                    [
                                        { text: "취소", style: "cancel" },
                                        { text: "이동", onPress: () => { /* 외부 브라우저 */ } },
                                    ],
                                );
                                return false;
                            }
                        }
                        return true;
                    }}
                    javaScriptEnabled
                    domStorageEnabled
                    sharedCookiesEnabled
                    originWhitelist={["*"]}
                />
                {webLoading && (
                    <View style={[styles.loadingOverlay, { backgroundColor: bgColor }]}>
                        <ActivityIndicator size="large" color={accentColor} />
                        <Text style={{ marginTop: 12, color: COLORS.gray[500], fontSize: 13 }}>
                            기사를 불러오고 있어요
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
    metaRow: {
        flexDirection: "row",
        gap: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 12, color: COLORS.gray[500] },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
});
