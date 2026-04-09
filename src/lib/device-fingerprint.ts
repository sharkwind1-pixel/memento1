/**
 * 디바이스 핑거프린팅 — 외부 라이브러리 없이 브라우저 특성으로 고유 ID 생성
 * 같은 기기에서 다중 계정 생성 방지용
 * 100% 정확하진 않지만 캐주얼 악용은 충분히 방지
 */

async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function getCanvasFingerprint(): string {
    try {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";

        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("memento-fp", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("memento-fp", 4, 17);

        return canvas.toDataURL();
    } catch {
        return "";
    }
}

export async function generateDeviceFingerprint(): Promise<string> {
    const components = [
        navigator.userAgent,
        `${screen.width}x${screen.height}x${screen.colorDepth}`,
        navigator.language,
        new Date().getTimezoneOffset().toString(),
        navigator.hardwareConcurrency?.toString() || "",
        navigator.maxTouchPoints?.toString() || "",
        (navigator as unknown as Record<string, string>).vendor || "",
        getCanvasFingerprint(),
    ];

    const raw = components.join("|");
    return hashString(raw);
}
