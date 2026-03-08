/**
 * 앱 전역 ErrorBoundary
 * 렌더링 에러 발생 시 흰 화면 대신 복구 가능한 폴백 UI 표시
 */

"use client";

import React from "react";
import { PawPrint, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // 프로덕션에서는 에러 리포팅 서비스로 전송 가능
        if (process.env.NODE_ENV === "development") {
            console.error("[ErrorBoundary]", error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white dark:from-gray-900 dark:to-gray-800 px-4">
                    <div className="text-center max-w-sm">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                            <PawPrint className="w-8 h-8 text-sky-400 dark:text-sky-300" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            앗, 잠시 문제가 생겼어요
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            걱정 마세요, 데이터는 안전합니다.
                            <br />
                            다시 시도해 주세요.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm font-medium"
                            >
                                <RefreshCw className="w-4 h-4" />
                                다시 시도
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                            >
                                새로고침
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
