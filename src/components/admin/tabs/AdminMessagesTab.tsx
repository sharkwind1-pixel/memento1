/**
 * ============================================================================
 * tabs/AdminMessagesTab.tsx
 * ============================================================================
 * 관리자 메시지/공지 발송 탭
 *
 * 기능:
 * - 전체/그룹/개별 유저에게 인앱 알림 메시지 발송
 * - 발송 이력 조회 (최근 50건)
 * - type: admin_notice (공지) / admin_message (개별 안내)
 * ============================================================================
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Send,
    Megaphone,
    Mail,
    Users as UsersIcon,
    Crown,
    User as UserIcon,
    Heart,
    RefreshCw,
    Loader2,
} from "lucide-react";

// ============================================================================
// 타입
// ============================================================================

type RecipientGroup = "all" | "premium" | "free" | "memorial" | "individual";
type MessageType = "admin_notice" | "admin_message";

interface SentMessage {
    id: string;
    type: string;
    title: string;
    body: string;
    sentAt: string;
    senderEmail: string | null;
    recipientCount: number;
    readCount: number;
}

const RECIPIENT_OPTIONS: Array<{
    value: RecipientGroup;
    label: string;
    icon: typeof UsersIcon;
    description: string;
}> = [
    { value: "all", label: "전체 유저", icon: UsersIcon, description: "모든 유저에게 발송 (차단 유저 자동 제외)" },
    { value: "premium", label: "유료 회원", icon: Crown, description: "프리미엄/베이직 구독 중인 유저만" },
    { value: "free", label: "무료 회원", icon: UserIcon, description: "무료 플랜 유저만 (구독 유도 안내 등)" },
    { value: "memorial", label: "추모 모드 유저", icon: Heart, description: "추모 모드 펫을 보유한 유저만" },
    { value: "individual", label: "개별 유저 (ID)", icon: Mail, description: "특정 유저 ID를 지정해서 발송" },
];

// ============================================================================
// 컴포넌트
// ============================================================================

export default function AdminMessagesTab() {
    const [recipientGroup, setRecipientGroup] = useState<RecipientGroup>("all");
    const [individualIds, setIndividualIds] = useState("");
    const [type, setType] = useState<MessageType>("admin_message");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [history, setHistory] = useState<SentMessage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // 발송 이력 로드
    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch("/api/admin/messages");
            const data = await res.json();
            if (res.ok) {
                setHistory(data.messages || []);
            }
        } catch {
            // 무시
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        void loadHistory();
    }, [loadHistory]);

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error("제목과 본문을 입력하세요");
            return;
        }
        if (title.length > 100) {
            toast.error("제목은 100자 이내");
            return;
        }
        if (body.length > 2000) {
            toast.error("본문은 2000자 이내");
            return;
        }
        if (recipientGroup === "individual" && !individualIds.trim()) {
            toast.error("유저 ID를 입력하세요");
            return;
        }

        setSending(true);
        try {
            // recipient 페이로드 구성
            let recipient: unknown;
            if (recipientGroup === "individual") {
                const ids = individualIds
                    .split(/[\s,]+/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (ids.length === 0) {
                    toast.error("유효한 유저 ID가 없습니다");
                    return;
                }
                recipient = { userIds: ids };
            } else {
                recipient = recipientGroup;
            }

            const res = await fetch("/api/admin/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient,
                    title: title.trim(),
                    body: body.trim(),
                    type,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "발송 실패");
            }

            toast.success(
                `발송 완료: ${data.recipientCount}명 중 ${data.inserted}명 성공${data.failed > 0 ? `, ${data.failed}명 실패` : ""}`
            );

            // 폼 초기화
            setTitle("");
            setBody("");
            setIndividualIds("");
            setShowConfirm(false);
            void loadHistory();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "발송 실패";
            toast.error(msg);
        } finally {
            setSending(false);
        }
    };

    const formatRelativeTime = (iso: string): string => {
        const diff = Date.now() - new Date(iso).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${Math.max(1, minutes)}분 전`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}시간 전`;
        return `${Math.floor(hours / 24)}일 전`;
    };

    return (
        <div className="space-y-4">
            {/* 발송 폼 */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-memento-500" />
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            메시지/공지 발송
                        </h3>
                    </div>

                    {/* 메시지 타입 */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            메시지 유형
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setType("admin_message")}
                                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                    type === "admin_message"
                                        ? "bg-memento-500 text-white border-memento-500"
                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                                }`}
                            >
                                <Mail className="w-3.5 h-3.5 inline mr-1" />
                                개별 안내
                            </button>
                            <button
                                type="button"
                                onClick={() => setType("admin_notice")}
                                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                    type === "admin_notice"
                                        ? "bg-memorial-500 text-white border-memorial-500"
                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                                }`}
                            >
                                <Megaphone className="w-3.5 h-3.5 inline mr-1" />
                                공지사항
                            </button>
                        </div>
                    </div>

                    {/* 수신자 그룹 */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            수신자
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {RECIPIENT_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const selected = recipientGroup === opt.value;
                                return (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        onClick={() => setRecipientGroup(opt.value)}
                                        className={`px-3 py-2 rounded-lg text-left border transition-colors ${
                                            selected
                                                ? "bg-memento-100 border-memento-400 dark:bg-memento-900/30 dark:border-memento-700"
                                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <Icon className={`w-3.5 h-3.5 ${selected ? "text-memento-600 dark:text-memento-300" : "text-gray-500"}`} />
                                            <span className={`text-xs font-medium ${selected ? "text-memento-700 dark:text-memento-200" : "text-gray-700 dark:text-gray-300"}`}>
                                                {opt.label}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 ml-5">
                                            {opt.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 개별 유저 ID 입력 */}
                    {recipientGroup === "individual" && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                유저 ID (여러 개 입력 시 쉼표 또는 공백으로 구분)
                            </label>
                            <Textarea
                                value={individualIds}
                                onChange={(e) => setIndividualIds(e.target.value)}
                                placeholder="user_uuid_1, user_uuid_2, ..."
                                rows={2}
                                className="text-xs font-mono"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                팁: 유저 관리 탭에서 ID를 복사할 수 있어요
                            </p>
                        </div>
                    )}

                    {/* 제목 */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            제목 ({title.length}/100)
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="예: 12월 정기 점검 안내"
                            maxLength={100}
                        />
                    </div>

                    {/* 본문 */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            본문 ({body.length}/2000)
                        </label>
                        <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="유저에게 전달할 메시지를 입력하세요..."
                            rows={6}
                            maxLength={2000}
                        />
                    </div>

                    {/* 발송 버튼 */}
                    {!showConfirm ? (
                        <Button
                            onClick={() => setShowConfirm(true)}
                            disabled={!title.trim() || !body.trim() || (recipientGroup === "individual" && !individualIds.trim())}
                            className="w-full bg-memento-500 hover:bg-memento-600 text-white"
                        >
                            <Send className="w-4 h-4 mr-1.5" />
                            발송 검토
                        </Button>
                    ) : (
                        <div className="p-3 bg-memorial-50 dark:bg-memorial-900/20 border border-memorial-300 dark:border-memorial-700 rounded-lg space-y-2">
                            <p className="text-xs text-memorial-800 dark:text-memorial-200 font-medium">
                                {recipientGroup === "all" && "전체 유저에게 발송됩니다."}
                                {recipientGroup === "premium" && "유료 회원에게만 발송됩니다."}
                                {recipientGroup === "free" && "무료 회원에게만 발송됩니다."}
                                {recipientGroup === "memorial" && "추모 모드 유저에게만 발송됩니다."}
                                {recipientGroup === "individual" && "지정한 유저에게만 발송됩니다."}
                            </p>
                            <p className="text-[11px] text-memorial-700 dark:text-memorial-300">
                                ⚠️ 발송 후에는 취소할 수 없습니다. 내용을 다시 한번 확인하세요.
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setShowConfirm(false)}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    disabled={sending}
                                >
                                    취소
                                </Button>
                                <Button
                                    onClick={handleSend}
                                    size="sm"
                                    disabled={sending}
                                    className="flex-1 bg-memento-500 hover:bg-memento-600 text-white"
                                >
                                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                                    발송
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 발송 이력 */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            최근 발송 이력
                        </h3>
                        <button
                            type="button"
                            onClick={() => void loadHistory()}
                            disabled={loadingHistory}
                            className="text-xs text-memento-600 dark:text-memento-400 hover:underline flex items-center gap-1"
                        >
                            <RefreshCw className={`w-3 h-3 ${loadingHistory ? "animate-spin" : ""}`} />
                            새로고침
                        </button>
                    </div>

                    {history.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                            {loadingHistory ? "불러오는 중..." : "발송 이력이 없습니다"}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {history.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Badge
                                                className={
                                                    msg.type === "admin_notice"
                                                        ? "bg-memorial-100 text-memorial-700 dark:bg-memorial-900/30 dark:text-memorial-300 text-[10px]"
                                                        : "bg-memento-100 text-memento-700 dark:bg-memento-900/30 dark:text-memento-300 text-[10px]"
                                                }
                                            >
                                                {msg.type === "admin_notice" ? "공지" : "안내"}
                                            </Badge>
                                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                                {msg.title}
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                                            {formatRelativeTime(msg.sentAt)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 mb-1.5">
                                        {msg.body}
                                    </p>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                        <span>수신자 {msg.recipientCount}명</span>
                                        <span>읽음 {msg.readCount}명 ({msg.recipientCount > 0 ? Math.round((msg.readCount / msg.recipientCount) * 100) : 0}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
