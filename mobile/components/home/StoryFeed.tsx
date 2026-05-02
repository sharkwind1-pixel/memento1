/**
 * StoryFeed — 24시간 스토리 가로 피드 (웹 src/components/features/home/StoryFeed.tsx 매칭)
 * GET /api/stories
 *
 * 첫 번째: 내 스토리 추가 (+ 버튼) → StoryCreateModal
 * 유저 아바타 클릭 → StoryViewer (풀스크린)
 */

import { useEffect, useState, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import StoryViewer from "./StoryViewer";
import StoryCreateModal from "./StoryCreateModal";

interface StoryItem {
    id: string;
    image_url: string | null;
    text_content: string | null;
    background_color: string;
    created_at: string;
}

interface StoryUser {
    userId: string;
    nickname: string;
    avatar: string | null;
    stories: StoryItem[];
}

export default function StoryFeed() {
    const { user, session } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [feed, setFeed] = useState<StoryUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<StoryUser | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const load = useCallback(async () => {
        try {
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
            const res = await fetch(`${API_BASE_URL}/api/stories`, { headers });
            if (!res.ok) return;
            const data = await res.json();
            const raw = Array.isArray(data?.feed) ? data.feed : [];
            setFeed(raw.map((u: any): StoryUser => ({
                userId: typeof u.userId === "string" ? u.userId : "",
                nickname: typeof u.nickname === "string" ? u.nickname : "익명",
                avatar: typeof u.avatar === "string" ? u.avatar : null,
                stories: Array.isArray(u.stories) ? u.stories : [],
            })));
        } catch {
            // ignore
        }
    }, [session]);

    useEffect(() => { load(); }, [load]);

    function handleCreateSuccess() {
        setShowCreate(false);
        load();
    }

    if (!user && feed.length === 0) return null;

    const addBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const avatarInnerBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const emptyColor = isDarkMode ? COLORS.gray[500] : COLORS.gray[400];

    return (
        <View style={styles.section}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{ flexGrow: 0 }}
            >
                {/* 내 스토리 추가 */}
                {user ? (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => setShowCreate(true)}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.addCircle, { backgroundColor: addBg }]}>
                            <Ionicons name="add" size={22} color={COLORS.memento[500]} />
                        </View>
                        <Text style={[styles.label, { color: labelColor }]}>내 스토리</Text>
                    </TouchableOpacity>
                ) : null}

                {/* 유저 아바타 */}
                {feed.map((su) => (
                    <TouchableOpacity
                        key={su.userId}
                        style={styles.item}
                        onPress={() => setSelectedUser(su)}
                        activeOpacity={0.75}
                    >
                        <LinearGradient
                            colors={[COLORS.memento[500], "#8B5CF6"]}
                            style={styles.avatarBorder}
                        >
                            <View style={[styles.avatarInner, { backgroundColor: avatarInnerBg }]}>
                                {su.avatar ? (
                                    <Image source={{ uri: su.avatar }} style={styles.avatarImg} />
                                ) : (
                                    <View style={[styles.avatarImg, styles.avatarFallback]}>
                                        <Ionicons name="camera-outline" size={16} color={COLORS.memento[500]} />
                                    </View>
                                )}
                            </View>
                        </LinearGradient>
                        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>{su.nickname}</Text>
                    </TouchableOpacity>
                ))}

                {/* 빈 피드 안내 */}
                {feed.length === 0 && user ? (
                    <Text style={[styles.emptyHint, { color: emptyColor }]}>첫 번째 스토리를 올려보세요</Text>
                ) : null}
            </ScrollView>

            <StoryViewer
                user={selectedUser}
                visible={!!selectedUser}
                onClose={() => setSelectedUser(null)}
            />
            <StoryCreateModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={handleCreateSuccess}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginTop: 12,
        marginBottom: 16,
        minHeight: 92,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 4,
        alignItems: "flex-start",
    },
    item: {
        alignItems: "center",
        width: 68,
        marginRight: 12,
    },
    addCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: COLORS.memento[400],
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    avatarBorder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        padding: 2,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    avatarInner: {
        width: "100%",
        height: "100%",
        borderRadius: 28,
        padding: 2,
    },
    avatarImg: { width: "100%", height: "100%", borderRadius: 28 },
    avatarFallback: {
        backgroundColor: COLORS.memento[100],
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        fontSize: 11,
        textAlign: "center",
        maxWidth: 68,
    },
    emptyHint: {
        fontSize: 12,
        marginLeft: 8,
        alignSelf: "center",
    },
});
