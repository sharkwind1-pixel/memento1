/**
 * NicknameSetupModal.tsx
 * OAuth 회원가입 후 닉네임 설정 모달
 * 튜토리얼/온보딩 전에 먼저 표시
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
    User,
    CheckCircle,
    AlertCircle,
    Loader2,
    Sparkles,
} from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";

interface NicknameSetupModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

export default function NicknameSetupModal({
    isOpen,
    onComplete,
}: NicknameSetupModalProps) {
    const { user, checkNickname, updateProfile } = useAuth();

    const [nickname, setNickname] = useState("");
    const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 닉네임 변경 시 중복 체크 (디바운스)
    useEffect(() => {
        if (!nickname.trim() || nickname.trim().length < 2) {
            setNicknameStatus("idle");
            return;
        }

        setNicknameStatus("checking");

        const timer = setTimeout(async () => {
            const { available } = await checkNickname(nickname.trim());
            setNicknameStatus(available ? "available" : "taken");
        }, 500);

        return () => clearTimeout(timer);
    }, [nickname, checkNickname]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (nickname.trim().length < 2) {
            setError("닉네임은 2자 이상이어야 합니다.");
            return;
        }

        if (nicknameStatus === "taken") {
            setError("이미 사용 중인 닉네임입니다.");
            return;
        }

        if (nicknameStatus === "checking") {
            setError("닉네임 확인 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Auth user_metadata 업데이트
            const { error: authError } = await updateProfile({ nickname: nickname.trim() });
            if (authError) throw authError;

            // 2. profiles 테이블 업데이트
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ nickname: nickname.trim() })
                .eq("id", user?.id);

            if (profileError) throw profileError;

            onComplete();
        } catch (err) {
            setError("닉네임 설정에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
            <div className="min-h-full flex items-center justify-center pt-16 pb-20 px-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl relative" role="dialog" aria-modal="true" aria-labelledby="nickname-setup-title">
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <h2 id="nickname-setup-title" className="text-2xl font-bold">환영합니다!</h2>
                    <p className="text-white/80 mt-1">
                        메멘토애니에서 사용할 닉네임을 설정해주세요
                    </p>
                </div>

                {/* 폼 */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* 에러 메시지 */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* 닉네임 입력 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            닉네임 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="닉네임을 입력하세요 (2~20자)"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className={`pl-10 pr-10 h-12 rounded-xl ${
                                    nicknameStatus === "taken"
                                        ? "border-red-500 focus:border-red-500"
                                        : nicknameStatus === "available"
                                            ? "border-green-500 focus:border-green-500"
                                            : ""
                                }`}
                                autoFocus
                                minLength={2}
                                maxLength={20}
                            />
                            {/* 상태 아이콘 */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {nicknameStatus === "checking" && (
                                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                )}
                                {nicknameStatus === "available" && (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                )}
                                {nicknameStatus === "taken" && (
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                )}
                            </div>
                        </div>
                        {/* 상태 메시지 */}
                        {nicknameStatus === "available" && (
                            <p className="text-xs text-green-600">
                                사용 가능한 닉네임입니다
                            </p>
                        )}
                        {nicknameStatus === "taken" && (
                            <p className="text-xs text-red-600">
                                이미 사용 중인 닉네임입니다
                            </p>
                        )}
                        {nicknameStatus === "idle" && nickname.length > 0 && nickname.length < 2 && (
                            <p className="text-xs text-gray-500">
                                2자 이상 입력해주세요
                            </p>
                        )}
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        닉네임은 다른 사용자에게 표시되며,<br />
                        커뮤니티 활동 시 사용됩니다.
                    </p>

                    {/* 제출 버튼 */}
                    <Button
                        type="submit"
                        disabled={loading || nicknameStatus === "taken" || nicknameStatus === "checking" || nickname.trim().length < 2}
                        className="w-full h-12 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-blue-600 hover:to-sky-600 rounded-xl text-base disabled:opacity-50"
                    >
                        {loading ? (
                            <InlineLoading />
                        ) : (
                            "시작하기"
                        )}
                    </Button>
                </form>
            </div>
            </div>
        </div>
    );
}
