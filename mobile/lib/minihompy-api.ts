/**
 * 미니홈피 API 클라이언트 — 웹 API 그대로 호출.
 * 모든 함수는 access_token 필요. 실패 시 throw.
 */

import { API_BASE_URL } from "@/config/constants";
import type {
    MinihompySettings, GuestbookEntry,
    MinimiCatalogItem, UserMinimiRow,
    PlacedMinimi,
} from "@/types";

export type { PlacedMinimi };

interface FetchOpts {
    accessToken: string;
}

async function callApi<T>(
    path: string,
    opts: FetchOpts & {
        method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
        body?: unknown;
    },
): Promise<T> {
    const { accessToken, method = "GET", body } = opts;
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const err = await res.json();
            msg = err.error || err.message || msg;
        } catch {
            try { msg = (await res.text()).slice(0, 200) || msg; } catch {}
        }
        throw new Error(msg);
    }
    return (await res.json()) as T;
}

// ============================================================================
// 미니홈피 설정
// ============================================================================

interface SettingsResponse {
    settings: {
        isPublic: boolean;
        backgroundSlug: string;
        greeting: string | null;
        todayVisitors?: number;
        totalVisitors?: number;
        totalLikes?: number;
        placedMinimi?: PlacedMinimi[];
    };
}

function normalizeSettings(s: SettingsResponse["settings"]): MinihompySettings {
    return {
        isPublic: !!s.isPublic,
        backgroundSlug: s.backgroundSlug || "default_sky",
        greeting: s.greeting ?? "",
        todayVisitors: s.todayVisitors ?? 0,
        totalVisitors: s.totalVisitors ?? 0,
        totalLikes: s.totalLikes ?? 0,
        // **중요**: placedMinimi 매핑 추가. 누락하면 저장 후 다음 load에서
        // 빈 배열로 덮어써서 미니미가 사라져 보임.
        placedMinimi: Array.isArray(s.placedMinimi) ? s.placedMinimi : [],
    };
}

export async function getMyMinihompySettings(accessToken: string): Promise<MinihompySettings> {
    const data = await callApi<SettingsResponse>("/api/minihompy/settings", { accessToken });
    return normalizeSettings(data.settings);
}

export async function patchMinihompySettings(
    accessToken: string,
    update: Partial<{ isPublic: boolean; greeting: string; backgroundSlug: string }>,
): Promise<MinihompySettings> {
    const data = await callApi<SettingsResponse>("/api/minihompy/settings", {
        accessToken,
        method: "PATCH",
        body: update,
    });
    return normalizeSettings(data.settings);
}

// ============================================================================
// 미니미 카탈로그 / 인벤토리 / 구매·장착·판매
// ============================================================================

interface CatalogResponse {
    characters: MinimiCatalogItem[];
}

export async function getMinimiCatalog(accessToken: string, category?: string): Promise<MinimiCatalogItem[]> {
    const q = category && category !== "all" ? `?category=${encodeURIComponent(category)}` : "";
    const data = await callApi<CatalogResponse>(`/api/minimi/catalog${q}`, { accessToken });
    return (data.characters || []).map((c) => ({
        ...c,
        imageUrl: /^https?:\/\//i.test(c.imageUrl) ? c.imageUrl : `${API_BASE_URL}${c.imageUrl}`,
    }));
}

interface InventoryResponse {
    characters: UserMinimiRow[];
    equipped: { minimiId: string | null; pixelData: unknown };
}

export async function getMinimiInventory(accessToken: string): Promise<{
    owned: UserMinimiRow[];
    equippedSlug: string | null;
}> {
    const data = await callApi<InventoryResponse>("/api/minimi/inventory", { accessToken });
    return {
        owned: data.characters || [],
        equippedSlug: data.equipped?.minimiId ?? null,
    };
}

export async function purchaseMinimi(accessToken: string, minimiId: string): Promise<void> {
    await callApi<unknown>("/api/minimi/purchase", {
        accessToken,
        method: "POST",
        body: { minimiId },
    });
}

export async function equipMinimi(accessToken: string, minimiSlug: string | null): Promise<void> {
    await callApi<unknown>("/api/minimi/equip", {
        accessToken,
        method: "POST",
        body: { minimiSlug },
    });
}

export async function sellMinimi(accessToken: string, userMinimiId: string): Promise<{ refundedPoints: number }> {
    return await callApi<{ refundedPoints: number }>("/api/minimi/sell", {
        accessToken,
        method: "POST",
        body: { userMinimiId },
    });
}

// ============================================================================
// 배경 (구매 / 보유 목록)
// ============================================================================

interface BackgroundsResponse {
    owned: string[]; // background slug 목록
}

export async function getOwnedBackgrounds(accessToken: string): Promise<string[]> {
    const data = await callApi<BackgroundsResponse>("/api/minihompy/backgrounds", { accessToken });
    return data.owned || [];
}

export async function purchaseBackground(accessToken: string, slug: string): Promise<void> {
    await callApi<unknown>("/api/minihompy/backgrounds/purchase", {
        accessToken,
        method: "POST",
        body: { slug },
    });
}

// ============================================================================
// 미니미 배치 (스테이지 자유 배치)
// ============================================================================

export async function putPlacedMinimi(
    accessToken: string,
    placedMinimi: PlacedMinimi[],
): Promise<void> {
    await callApi<unknown>("/api/minihompy/settings/placed-minimi", {
        accessToken,
        method: "PUT",
        body: { placedMinimi },
    });
}

// ============================================================================
// 다른 유저 미니홈피 방문
// ============================================================================

/**
 * 웹 응답 형태 (src/app/api/minihompy/[userId]/route.ts):
 * {
 *   settings: { isPublic, backgroundSlug, greeting, todayVisitors, totalVisitors, totalLikes, placedMinimi },
 *   ownerNickname, ownerPetType, ownerMinimiEquip: { minimiId, ... },
 *   guestbook, guestbookTotal,
 *   isLiked
 * }
 */
interface VisitProfileResponse {
    settings?: {
        isPublic: boolean;
        backgroundSlug: string;
        greeting: string | null;
        todayVisitors?: number;
        totalVisitors?: number;
        totalLikes?: number;
        placedMinimi?: PlacedMinimi[];
    };
    ownerNickname?: string;
    ownerPetType?: string;
    ownerMinimiEquip?: {
        minimiId?: string | null;
    };
    // 옛 형태 (혹시 모를 호환)
    owner?: {
        id?: string;
        nickname?: string;
        avatar_url?: string;
        avatar?: string;
        equipped_minimi_slug?: string | null;
        equippedMinimiSlug?: string | null;
    };
    isLiked?: boolean;
}

export interface VisitedMinihompy {
    isPublic: boolean;
    backgroundSlug: string;
    greeting: string;
    todayVisitors: number;
    totalVisitors: number;
    totalLikes: number;
    ownerNickname: string;
    ownerAvatar: string | null;
    equippedMinimiSlug: string | null;
    placedMinimi: PlacedMinimi[];
    isLiked: boolean;
}

export async function visitMinihompy(
    accessToken: string,
    ownerUserId: string,
): Promise<VisitedMinihompy> {
    const data = await callApi<VisitProfileResponse>(`/api/minihompy/${ownerUserId}`, { accessToken });
    return {
        isPublic: !!data.settings?.isPublic,
        backgroundSlug: data.settings?.backgroundSlug || "default_sky",
        greeting: data.settings?.greeting ?? "",
        todayVisitors: data.settings?.todayVisitors ?? 0,
        totalVisitors: data.settings?.totalVisitors ?? 0,
        totalLikes: data.settings?.totalLikes ?? 0,
        // 서버는 ownerNickname을 top-level로 보냄 (data.owner.nickname 아님)
        ownerNickname: data.ownerNickname ?? data.owner?.nickname ?? "익명",
        ownerAvatar: data.owner?.avatar_url ?? data.owner?.avatar ?? null,
        equippedMinimiSlug: data.ownerMinimiEquip?.minimiId
            ?? data.owner?.equippedMinimiSlug
            ?? data.owner?.equipped_minimi_slug
            ?? null,
        placedMinimi: Array.isArray(data.settings?.placedMinimi) ? data.settings!.placedMinimi : [],
        isLiked: !!data.isLiked,
    };
}

export async function postMinihompyVisit(
    accessToken: string,
    ownerUserId: string,
): Promise<void> {
    // 방문 카운트 +1 (서버가 중복 방문 처리)
    await callApi<unknown>(`/api/minihompy/${ownerUserId}/visit`, {
        accessToken,
        method: "POST",
    });
}

export async function toggleMinihompyLike(
    accessToken: string,
    ownerUserId: string,
): Promise<{ liked: boolean; totalLikes: number }> {
    return await callApi<{ liked: boolean; totalLikes: number }>(
        `/api/minihompy/${ownerUserId}/like`,
        { accessToken, method: "POST" },
    );
}

// ============================================================================
// 방명록
// ============================================================================

// 서버 응답: { guestbook: [{id, ownerId, visitorId, visitorNickname, visitorMinimiData, content, createdAt}], total, hasMore }
// (snake_case가 아니라 camelCase + visitor 키 — 절대 entries/writer_id 사용 금지)
interface GuestbookResponse {
    guestbook: Array<{
        id: string;
        ownerId?: string;
        visitorId: string;
        visitorNickname?: string;
        visitorMinimiData?: unknown;
        content: string;
        createdAt: string;
    }>;
    total?: number;
    hasMore?: boolean;
}

export async function getGuestbook(
    accessToken: string,
    ownerUserId: string,
): Promise<GuestbookEntry[]> {
    const data = await callApi<GuestbookResponse>(`/api/minihompy/${ownerUserId}/guestbook`, { accessToken });
    return (data.guestbook || []).map((e) => ({
        id: e.id,
        writerId: e.visitorId,
        writerNickname: e.visitorNickname,
        // 서버는 minimi 픽셀 데이터(JSON)를 주지 avatar URL이 아님 → 일단 빈값.
        // 미니미 그리기는 별도 컴포넌트로 후속 작업.
        writerAvatar: undefined,
        content: e.content,
        createdAt: e.createdAt,
    }));
}

export async function postGuestbookEntry(
    accessToken: string,
    ownerUserId: string,
    content: string,
): Promise<void> {
    await callApi<unknown>(`/api/minihompy/${ownerUserId}/guestbook`, {
        accessToken,
        method: "POST",
        body: { content },
    });
}

// ============================================================================
// 방문자 목록 (본인만)
// ============================================================================

export interface VisitorEntry {
    id: string;
    visitorId: string | null;
    visitorNickname: string;
    visitorAvatar: string | null;
    visitedAt: string;
}

interface VisitorsResponse {
    visitors: VisitorEntry[];
}

export async function getMyVisitors(
    accessToken: string,
    ownerUserId: string,
): Promise<VisitorEntry[]> {
    const data = await callApi<VisitorsResponse>(
        `/api/minihompy/${ownerUserId}/visitors`,
        { accessToken },
    );
    return data.visitors ?? [];
}
