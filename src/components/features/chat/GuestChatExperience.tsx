/**
 * GuestChatExperience.tsx
 * 비로그인 사용자 AI 펫톡 "맛보기" 체험 (펫홈 Phase 0 ③).
 *
 * 데모펫(초코)과 기본 3회 대화 → 가입 전환 유도.
 * 경량 경로 /api/chat/guest 호출 (인증·DB 없음). 횟수는 localStorage(UX) + 서버 가드(비용).
 * 소진 시 openAuthModal(detail.message)로 맥락 가입후크 연결 (①과 동일 패턴).
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { API } from "@/config/apiEndpoints";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

const TRIAL_LIMIT = 3;
const TRIALS_KEY = "guestChatTrials";
const DEMO_PET_NAME = "초코";

interface GuestMessage {
    id: string;
    role: "user" | "pet";
    content: string;
    streaming?: boolean;
}

let msgSeq = 0;
const nextId = () => `g${Date.now()}_${msgSeq++}`;

function openSignup(message: string) {
    window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { message } }));
}

export default function GuestChatExperience() {
    const [messages, setMessages] = useState<GuestMessage[]>([
        {
            id: nextId(),
            role: "pet",
            content: `안녕! 나는 ${DEMO_PET_NAME}야. 오늘 뭐 하고 지냈어? 나랑 얘기해보자!`,
        },
    ]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [trialsUsed, setTrialsUsed] = useState(0);
    const [suggestions, setSuggestions] = useState<string[]>([
        "오늘 산책 갔어?",
        "뭐 하고 놀까?",
        "간식 뭐 먹었어?",
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const stored = parseInt(safeGetItem(TRIALS_KEY) || "0", 10);
        setTrialsUsed(Number.isFinite(stored) ? stored : 0);
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const exhausted = trialsUsed >= TRIAL_LIMIT;
    const remaining = Math.max(0, TRIAL_LIMIT - trialsUsed);

    const send = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || sending) return;
        if (trialsUsed >= TRIAL_LIMIT) {
            openSignup("체험은 여기까지예요. 무료로 가입하면 우리 아이와 매일 대화할 수 있어요.");
            return;
        }

        setInput("");
        setSuggestions([]);
        setSending(true);
        const userMsg: GuestMessage = { id: nextId(), role: "user", content: trimmed };
        const petMsgId = nextId();
        setMessages((prev) => [
            ...prev,
            userMsg,
            { id: petMsgId, role: "pet", content: "", streaming: true },
        ]);

        try {
            const res = await fetch(API.CHAT_GUEST, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: trimmed, trialCount: trialsUsed, petName: DEMO_PET_NAME }),
            });

            if (res.status === 403) {
                // 서버가 체험 소진 판단 → 가입 유도
                const used = TRIAL_LIMIT;
                setTrialsUsed(used);
                safeSetItem(TRIALS_KEY, String(used));
                setMessages((prev) => prev.filter((m) => m.id !== petMsgId));
                openSignup("체험은 여기까지예요. 무료로 가입하면 우리 아이와 매일 대화할 수 있어요.");
                return;
            }
            if (!res.ok || !res.body) {
                throw new Error("guest chat failed");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let streamed = "";
            let buffer = "";
            let finalReply = "";
            let nextSuggestions: string[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split("\n\n");
                buffer = parts.pop() || "";
                for (const part of parts) {
                    const dataLine = part.trim();
                    if (!dataLine.startsWith("data: ")) continue;
                    try {
                        const event = JSON.parse(dataLine.slice(6));
                        if (event.type === "delta") {
                            streamed += event.content;
                            const cur = streamed;
                            setMessages((prev) => prev.map((m) => (m.id === petMsgId ? { ...m, content: cur } : m)));
                        } else if (event.type === "done") {
                            finalReply = event.reply || streamed;
                            nextSuggestions = Array.isArray(event.suggestedQuestions) ? event.suggestedQuestions : [];
                        } else if (event.type === "error") {
                            throw new Error(event.error || "stream error");
                        }
                    } catch {
                        // 개별 이벤트 파싱 실패는 무시
                    }
                }
            }

            setMessages((prev) =>
                prev.map((m) => (m.id === petMsgId ? { ...m, content: finalReply || streamed, streaming: false } : m)),
            );

            const used = trialsUsed + 1;
            setTrialsUsed(used);
            safeSetItem(TRIALS_KEY, String(used));
            if (used >= TRIAL_LIMIT) {
                setSuggestions([]);
            } else if (nextSuggestions.length > 0) {
                setSuggestions(nextSuggestions);
            }
        } catch {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === petMsgId
                        ? { ...m, content: "앗, 지금은 대답하기 어려워. 잠시 후 다시 말 걸어줄래?", streaming: false }
                        : m,
                ),
            );
        } finally {
            setSending(false);
        }
    }, [sending, trialsUsed]);

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-b from-memento-50 via-memento-75 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />

            <div className="relative z-10 flex flex-col flex-1 max-w-md mx-auto w-full px-4 pt-6 pb-4">
                {/* 헤더 */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-memento-200 to-violet-100 flex items-center justify-center shadow">
                        <Sparkles className="w-6 h-6 text-violet-500" />
                    </div>
                    <div>
                        <h2 className="font-display font-bold text-memento-900 dark:text-white leading-tight">
                            {DEMO_PET_NAME}와 미리 대화해보기
                        </h2>
                        <p className="text-xs text-memento-500 dark:text-gray-400">
                            {exhausted ? "체험을 모두 사용했어요" : `무료 체험 ${remaining}회 남음`}
                        </p>
                    </div>
                </div>

                {/* 메시지 */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-2">
                    {messages.map((m) => (
                        <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                    m.role === "user"
                                        ? "bg-memento-500 text-white rounded-br-md"
                                        : "bg-white dark:bg-gray-800 text-memento-900 dark:text-gray-100 rounded-bl-md shadow-sm"
                                }`}
                            >
                                {m.content || (m.streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : "")}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 추천 질문 */}
                {!exhausted && suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => send(s)}
                                disabled={sending}
                                className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 border border-memento-200 dark:border-gray-700 text-xs text-memento-700 dark:text-gray-200 hover:bg-memento-50 transition-colors disabled:opacity-50"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* 입력 또는 가입 CTA */}
                {exhausted ? (
                    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-4 text-center space-y-3">
                        <p className="text-sm text-memento-700 dark:text-gray-200 leading-relaxed">
                            우리 아이만의 성격과 추억을 담아<br />
                            매일 대화하려면 무료로 시작하세요.
                        </p>
                        <Button
                            onClick={() => openSignup("무료로 가입하면 우리 아이와 매일 대화할 수 있어요.")}
                            className="w-full bg-gradient-to-r from-memento-500 to-violet-500 hover:from-memento-600 hover:to-violet-600 text-white py-5 rounded-xl font-bold"
                        >
                            무료로 시작하기
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                    e.preventDefault();
                                    send(input);
                                }
                            }}
                            maxLength={200}
                            placeholder={`${DEMO_PET_NAME}에게 말을 걸어보세요`}
                            disabled={sending}
                            className="flex-1 px-4 py-3 rounded-full bg-white dark:bg-gray-800 border border-memento-200 dark:border-gray-700 text-sm text-memento-900 dark:text-gray-100 outline-none focus:border-memento-400 disabled:opacity-60"
                        />
                        <button
                            onClick={() => send(input)}
                            disabled={sending || !input.trim()}
                            aria-label="보내기"
                            className="w-11 h-11 flex-shrink-0 rounded-full bg-memento-500 hover:bg-memento-600 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                )}

                {/* 로그인 링크 */}
                <button
                    onClick={() => openSignup("로그인하고 우리 아이와 대화를 이어가세요.")}
                    className="mt-3 text-center text-xs text-memento-400 hover:text-memento-600 transition-colors"
                >
                    이미 계정이 있어요
                </button>
            </div>
        </div>
    );
}
