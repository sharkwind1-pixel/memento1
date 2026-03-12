/**
 * Global Error Boundary
 * layout.tsx(AuthProvider/PetProvider) 레벨에서 발생하는 에러도 포착
 * error.tsx는 layout 내부 에러만 잡으므로, layout 자체의 크래시는 이 파일이 담당
 */
"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="ko">
            <body style={{ margin: 0, fontFamily: "sans-serif" }}>
                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(to bottom, #f0f9ff, #ffffff)",
                        padding: "1rem",
                    }}
                >
                    <div
                        style={{
                            maxWidth: "24rem",
                            width: "100%",
                            background: "rgba(255,255,255,0.9)",
                            borderRadius: "1.5rem",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
                            padding: "2rem",
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                width: "4rem",
                                height: "4rem",
                                borderRadius: "1rem",
                                background: "#e0f2fe",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 1rem",
                                fontSize: "1.5rem",
                            }}
                        >
                            &#x1F43E;
                        </div>
                        <h2
                            style={{
                                fontSize: "1.25rem",
                                fontWeight: "bold",
                                color: "#1f2937",
                                marginBottom: "0.5rem",
                            }}
                        >
                            잠깐, 문제가 생겼어요
                        </h2>
                        <p
                            style={{
                                fontSize: "0.875rem",
                                color: "#6b7280",
                                marginBottom: "1rem",
                                lineHeight: 1.6,
                            }}
                        >
                            일시적인 오류가 발생했습니다.
                            <br />
                            아래 버튼을 눌러 다시 시도해주세요.
                        </p>
                        <pre
                            style={{
                                fontSize: "0.65rem",
                                color: "#ef4444",
                                background: "#fef2f2",
                                borderRadius: "0.5rem",
                                padding: "0.75rem",
                                marginBottom: "1rem",
                                textAlign: "left",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all",
                                maxHeight: "8rem",
                                overflow: "auto",
                            }}
                        >
                            {error?.message || "Unknown error"}
                            {error?.stack ? `\n\n${error.stack.slice(0, 500)}` : ""}
                        </pre>
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                            <button
                                onClick={() => (window.location.href = "/")}
                                style={{
                                    padding: "0.625rem 1.25rem",
                                    borderRadius: "0.75rem",
                                    border: "1px solid #d1d5db",
                                    background: "#ffffff",
                                    color: "#374151",
                                    fontSize: "0.875rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                            >
                                홈으로
                            </button>
                            <button
                                onClick={() => reset()}
                                style={{
                                    padding: "0.625rem 1.25rem",
                                    borderRadius: "0.75rem",
                                    border: "none",
                                    background: "linear-gradient(to right, #0ea5e9, #3b82f6)",
                                    color: "#ffffff",
                                    fontSize: "0.875rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                            >
                                다시 시도
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
