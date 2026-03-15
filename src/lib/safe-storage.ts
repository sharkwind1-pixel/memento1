/**
 * 안전한 localStorage / sessionStorage 래퍼
 *
 * iOS Safari Private Mode, 용량 초과, 보안 정책 등으로
 * Storage API 접근이 차단될 수 있음. 모든 호출을 try-catch로 감싸서
 * 앱 크래시를 방지한다.
 */

// ── localStorage ────────────────────────────────────────

export function safeGetItem(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function safeSetItem(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

export function safeRemoveItem(key: string): boolean {
    try {
        localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

// ── sessionStorage ──────────────────────────────────────

export function safeSessionGetItem(key: string): string | null {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

export function safeSessionSetItem(key: string, value: string): boolean {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

export function safeSessionRemoveItem(key: string): boolean {
    try {
        sessionStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

// ── JSON 헬퍼 ───────────────────────────────────────────

export function safeGetJSON<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function safeSetJSON(key: string, value: unknown): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}
