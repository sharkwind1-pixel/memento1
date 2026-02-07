/**
 * 쪽지함 모달
 * - 받은 쪽지 / 보낸 쪽지 탭
 * - 쪽지 목록 및 상세 보기
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    X,
    Mail,
    Send,
    Inbox,
    Trash2,
    RefreshCw,
    ChevronLeft,
    Clock,
    CheckCheck,
    User,
    MailPlus,
} from "lucide-react";
import { InlineLoading, SectionLoading } from "@/components/ui/PawLoading";
import { useAuth } from "@/contexts/AuthContext";
import SendMessageModal from "./SendMessageModal";

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    title: string;
    content: string;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
    sender?: {
        id: string;
        nickname: string;
        email: string;
    };
    receiver?: {
        id: string;
        nickname: string;
        email: string;
    };
}

interface MessageInboxProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = "received" | "sent";

export default function MessageInbox({ isOpen, onClose }: MessageInboxProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>("received");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);

    // 쪽지 목록 로드
    const loadMessages = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/messages?type=${activeTab}`);
            const data = await response.json();

            if (response.ok) {
                setMessages(data.messages || []);
                setUnreadCount(data.unread || 0);
            }
        } catch (err) {
            console.error("Failed to load messages:", err);
        } finally {
            setLoading(false);
        }
    }, [user, activeTab]);

    // 쪽지 상세 보기
    const viewMessage = async (message: Message) => {
        try {
            const response = await fetch(`/api/messages/${message.id}`);
            const data = await response.json();

            if (response.ok) {
                setSelectedMessage(data.message);
                // 읽지 않은 메시지였다면 목록 업데이트
                if (!message.is_read && activeTab === "received") {
                    setMessages(prev => prev.map(m =>
                        m.id === message.id ? { ...m, is_read: true } : m
                    ));
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
            }
        } catch (err) {
            console.error("Failed to view message:", err);
        }
    };

    // 쪽지 삭제
    const deleteMessage = async (messageId: string) => {
        if (!confirm("쪽지를 삭제하시겠습니까?")) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/messages/${messageId}`, {
                method: "PATCH",
            });

            if (response.ok) {
                setMessages(prev => prev.filter(m => m.id !== messageId));
                if (selectedMessage?.id === messageId) {
                    setSelectedMessage(null);
                }
            }
        } catch (err) {
            console.error("Failed to delete message:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    // 답장하기
    const handleReply = () => {
        if (!selectedMessage) return;

        const senderId = selectedMessage.sender_id;
        const senderInfo = selectedMessage.sender;

        if (senderId === user?.id) return; // 자기 자신에게는 답장 불가

        setReplyTo({
            id: senderId,
            nickname: senderInfo?.nickname || senderInfo?.email || "사용자",
        });
        setShowSendModal(true);
    };

    useEffect(() => {
        if (isOpen && user) {
            loadMessages();
        }
    }, [isOpen, user, loadMessages]);

    useEffect(() => {
        if (isOpen) {
            loadMessages();
        }
    }, [activeTab, loadMessages, isOpen]);

    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
        } else if (days === 1) {
            return "어제";
        } else if (days < 7) {
            return `${days}일 전`;
        } else {
            return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
        }
    };

    return (
        <>
            {/* 모바일: 하단 시트 / 데스크톱: 중앙 모달 */}
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
                {/* 배경 */}
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* 모달 */}
                <div className="relative w-full sm:max-w-2xl sm:mx-4 h-[calc(100vh-60px)] sm:h-[80vh] bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col">
                    {/* 헤더 */}
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b dark:border-gray-700 bg-sky-50 dark:bg-sky-900/20">
                        <div className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-sky-500" />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                                쪽지함
                            </h2>
                            {unreadCount > 0 && (
                                <Badge className="bg-red-500 text-white">
                                    {unreadCount}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setReplyTo(null);
                                    setShowSendModal(true);
                                }}
                                className="gap-1"
                            >
                                <MailPlus className="w-4 h-4" />
                                쪽지 쓰기
                            </Button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {selectedMessage ? (
                        // 쪽지 상세 보기
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-shrink-0 p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                <button
                                    onClick={() => setSelectedMessage(null)}
                                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    목록으로
                                </button>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                                    {selectedMessage.title}
                                </h3>
                                <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        <span>
                                            {activeTab === "received"
                                                ? `보낸 사람: ${selectedMessage.sender?.nickname || selectedMessage.sender?.email || "알 수 없음"}`
                                                : `받는 사람: ${selectedMessage.receiver?.nickname || selectedMessage.receiver?.email || "알 수 없음"}`
                                            }
                                        </span>
                                    </div>
                                    <span>{formatDate(selectedMessage.created_at)}</span>
                                </div>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto">
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {selectedMessage.content}
                                </p>
                            </div>
                            <div className="flex-shrink-0 p-4 border-t dark:border-gray-700 flex justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteMessage(selectedMessage.id)}
                                    disabled={isDeleting}
                                    className="text-red-500 border-red-200 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    삭제
                                </Button>
                                {activeTab === "received" && selectedMessage.sender_id !== user?.id && (
                                    <Button
                                        size="sm"
                                        onClick={handleReply}
                                        className="bg-sky-500 hover:bg-sky-600"
                                    >
                                        <Send className="w-4 h-4 mr-1" />
                                        답장
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        // 쪽지 목록
                        <>
                            {/* 탭 */}
                            <div className="flex-shrink-0 flex border-b dark:border-gray-700">
                                <button
                                    onClick={() => setActiveTab("received")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                                        activeTab === "received"
                                            ? "text-sky-600 border-b-2 border-sky-500 bg-sky-50/50 dark:bg-sky-900/20"
                                            : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    <Inbox className="w-4 h-4" />
                                    받은 쪽지
                                    {unreadCount > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                            {unreadCount}
                                        </Badge>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab("sent")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                                        activeTab === "sent"
                                            ? "text-sky-600 border-b-2 border-sky-500 bg-sky-50/50 dark:bg-sky-900/20"
                                            : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    <Send className="w-4 h-4" />
                                    보낸 쪽지
                                </button>
                            </div>

                            {/* 목록 */}
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <SectionLoading />
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <Mail className="w-12 h-12 mb-2" />
                                        <p>
                                            {activeTab === "received"
                                                ? "받은 쪽지가 없습니다"
                                                : "보낸 쪽지가 없습니다"
                                            }
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y dark:divide-gray-700">
                                        {messages.map((message) => (
                                            <button
                                                key={message.id}
                                                onClick={() => viewMessage(message)}
                                                className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                                    !message.is_read && activeTab === "received"
                                                        ? "bg-sky-50/50 dark:bg-sky-900/10"
                                                        : ""
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {!message.is_read && activeTab === "received" && (
                                                                <div className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0" />
                                                            )}
                                                            <p className={`font-medium truncate ${
                                                                !message.is_read && activeTab === "received"
                                                                    ? "text-gray-900 dark:text-white"
                                                                    : "text-gray-700 dark:text-gray-300"
                                                            }`}>
                                                                {message.title}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm text-gray-500 truncate">
                                                            {activeTab === "received"
                                                                ? message.sender?.nickname || message.sender?.email || "알 수 없음"
                                                                : message.receiver?.nickname || message.receiver?.email || "알 수 없음"
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                        <span className="text-xs text-gray-400">
                                                            {formatDate(message.created_at)}
                                                        </span>
                                                        {activeTab === "sent" && message.is_read && (
                                                            <span className="text-xs text-green-500 flex items-center gap-0.5">
                                                                <CheckCheck className="w-3 h-3" />
                                                                읽음
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 새로고침 */}
                            <div className="flex-shrink-0 p-2 border-t dark:border-gray-700 flex justify-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={loadMessages}
                                    disabled={loading}
                                    className="gap-1 text-gray-500"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                    새로고침
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 쪽지 보내기 모달 */}
            <SendMessageModal
                isOpen={showSendModal}
                onClose={() => {
                    setShowSendModal(false);
                    setReplyTo(null);
                }}
                onSuccess={() => {
                    setShowSendModal(false);
                    setReplyTo(null);
                    if (activeTab === "sent") {
                        loadMessages();
                    }
                }}
                replyTo={replyTo}
            />
        </>
    );
}
