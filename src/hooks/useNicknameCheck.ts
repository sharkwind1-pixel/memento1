/**
 * 닉네임 중복 체크 커스텀 훅
 * AuthModal, AccountSettingsModal에서 공통 사용
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UI } from "@/config/constants";

export type NicknameStatus = "idle" | "checking" | "available" | "taken" | "same" | "invalid";

interface UseNicknameCheckOptions {
    /** 체크 활성화 여부 */
    enabled?: boolean;
    /** 현재 닉네임 (변경 시 same 상태 체크용) */
    currentNickname?: string;
    /** 디바운스 시간 (ms) */
    debounceMs?: number;
}

interface UseNicknameCheckReturn {
    status: NicknameStatus;
    isValid: boolean;
    isChecking: boolean;
    message: string;
    reset: () => void;
}

export function useNicknameCheck(
    nickname: string,
    options: UseNicknameCheckOptions = {}
): UseNicknameCheckReturn {
    const {
        enabled = true,
        currentNickname,
        debounceMs = 500,
    } = options;

    const { checkNickname } = useAuth();
    const [status, setStatus] = useState<NicknameStatus>("idle");

    // 상태 리셋
    const reset = useCallback(() => {
        setStatus("idle");
    }, []);

    // 닉네임 변경 시 중복 체크 (디바운스)
    useEffect(() => {
        // 비활성화 상태면 체크 안함
        if (!enabled || !nickname.trim()) {
            setStatus("idle");
            return;
        }

        const trimmed = nickname.trim();

        // 최소 길이 체크
        if (trimmed.length < UI.MIN_NICKNAME_LENGTH) {
            setStatus("invalid");
            return;
        }

        // 최대 길이 체크
        if (trimmed.length > UI.MAX_NICKNAME_LENGTH) {
            setStatus("invalid");
            return;
        }

        // 현재 닉네임과 같으면 (수정 모드에서)
        if (currentNickname && trimmed === currentNickname) {
            setStatus("same");
            return;
        }

        setStatus("checking");

        const timer = setTimeout(async () => {
            const { available } = await checkNickname(trimmed);
            setStatus(available ? "available" : "taken");
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [nickname, enabled, currentNickname, checkNickname, debounceMs]);

    // 상태별 메시지
    const getMessage = (): string => {
        switch (status) {
            case "checking":
                return "확인 중...";
            case "available":
                return "사용 가능한 닉네임입니다";
            case "taken":
                return "이미 사용 중인 닉네임입니다";
            case "same":
                return "현재 사용 중인 닉네임입니다";
            case "invalid":
                return `닉네임은 ${UI.MIN_NICKNAME_LENGTH}-${UI.MAX_NICKNAME_LENGTH}자 사이여야 합니다`;
            default:
                return "";
        }
    };

    return {
        status,
        isValid: status === "available",
        isChecking: status === "checking",
        message: getMessage(),
        reset,
    };
}

export default useNicknameCheck;
