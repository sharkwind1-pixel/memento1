/**
 * MiniHomepyTab.tsx
 * RecordPage 내 미니홈피 탭
 * - 내 미니홈피 스테이지 표시
 * - 미니미 배치 편집모드
 * - 설정 (인사말, 배경, 공개/비공개)
 * - 방명록 목록
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, MessageSquare, Trash2, ChevronDown, Archive, Plus, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMemorialMode } from "@/contexts/PetContext";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { MINIHOMPY } from "@/config/constants";
import type { MinihompySettings, GuestbookEntry, PlacedMinimi } from "@/types";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import MinihompyStage from "./MinihompyStage";
import MinihompySettingsSection from "./MinihompySettingsSection";
import MinimiCollection from "./MinimiCollection";
import MinimiShopModal from "@/components/features/minimi/MinimiShopModal";
import Image from "next/image";

interface OwnedChar {
    slug: string;
    name: string;
    imageUrl: string;
}

export default function MiniHomepyTab({ isActive = true }: { isActive?: boolean }) {
    const { user, minimiEquip } = useAuth();
    const { isMemorialMode } = useMemorialMode();
    const nickname = user?.user_metadata?.nickname || user?.email?.split("@")[0] || "익명";

    const [settings, setSettings] = useState<MinihompySettings | null>(null);
    const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
    const [guestbookTotal, setGuestbookTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // 미니미 배치 편집모드
    const [editMode, setEditMode] = useState(false);
    const [editPlaced, setEditPlaced] = useState<PlacedMinimi[]>([]);
    const [saving, setSaving] = useState(false);

    // 보관함 (보유 미니미 목록)
    const [ownedMinimis, setOwnedMinimis] = useState<OwnedChar[]>([]);
    const [loadingOwned, setLoadingOwned] = useState(false);

    // 미니미 상점 모달 (도감/스테이지에서 진입)
    const [shopOpen, setShopOpen] = useState(false);
    const [shopInitialSlug, setShopInitialSlug] = useState<string | undefined>();

    const openShop = useCallback((initialSlug?: string) => {
        setShopInitialSlug(initialSlug);
        setShopOpen(true);
    }, []);

    const closeShop = useCallback(() => {
        setShopOpen(false);
        setShopInitialSlug(undefined);
    }, []);

    // 설정 로드
    const loadSettings = useCallback(async () => {
        try {
            const res = await authFetch(API.MINIHOMPY_SETTINGS);
            if (res.ok) {
                const data = await res.json();
                setSettings(data.settings);
            }
        } catch {
            toast.error("미니홈피 설정을 불러오지 못했습니다.");
        }
    }, []);

    // 보유 미니미 로드
    const loadOwnedMinimis = useCallback(async () => {
        setLoadingOwned(true);
        try {
            const res = await authFetch(API.MINIMI_INVENTORY);
            if (!res.ok) return;
            const data = await res.json();
            const chars: OwnedChar[] = (data.characters || [])
                .map((c: { minimi_id: string }) => {
                    const catalog = CHARACTER_CATALOG.find(cat => cat.slug === c.minimi_id);
                    if (!catalog) return null;
                    return { slug: catalog.slug, name: catalog.name, imageUrl: catalog.imageUrl };
                })
                .filter(Boolean) as OwnedChar[];
            setOwnedMinimis(chars);
        } catch {
            // ignore
        } finally {
            setLoadingOwned(false);
        }
    }, []);

    // 방명록 로드
    const loadGuestbook = useCallback(async (offset = 0, append = false) => {
        if (!user) return;
        try {
            const res = await authFetch(`${API.MINIHOMPY_GUESTBOOK(user.id)}?offset=${offset}`);
            if (res.ok) {
                const data = await res.json();
                if (append) {
                    setGuestbook(prev => [...prev, ...data.guestbook]);
                } else {
                    setGuestbook(data.guestbook);
                }
                setGuestbookTotal(data.total);
            }
        } catch {
            toast.error("방명록을 불러오지 못했습니다.");
        }
    }, [user]);

    // 초기 로드
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        Promise.all([loadSettings(), loadGuestbook()]).finally(() => setLoading(false));
    }, [user, loadSettings, loadGuestbook]);

    // 설정 업데이트 핸들러
    const handleSettingsUpdate = useCallback(async (updates: Partial<MinihompySettings>) => {
        try {
            const res = await authFetch(API.MINIHOMPY_SETTINGS, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data.settings);
                toast.success("설정이 저장되었습니다");
            } else {
                const err = await res.json();
                toast.error(err.error || "설정 저장 실패");
            }
        } catch {
            toast.error("설정 저장 실패");
        }
    }, []);

    // 편집모드 진입 - 장착 미니미가 배치 배열에 없으면 자동 포함
    const enterEditMode = () => {
        const current = settings?.placedMinimi || [];
        let initial = [...current];

        // 장착된 미니미가 있는데 배치 배열에 없으면 자동 추가
        if (minimiEquip.minimiId && !initial.some(p => p.slug === minimiEquip.minimiId)) {
            initial.push({
                slug: minimiEquip.minimiId,
                x: 50,
                y: 50,
                zIndex: initial.length + 1,
            });
        }

        setEditPlaced(initial);
        setEditMode(true);
        loadOwnedMinimis();
    };

    // 편집모드 종료 + 저장
    const saveAndExitEditMode = async () => {
        setSaving(true);
        try {
            const res = await authFetch(API.MINIHOMPY_PLACED_MINIMI, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ placedMinimi: editPlaced }),
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => prev ? { ...prev, placedMinimi: data.placedMinimi } : prev);
                toast.success("미니미 배치가 저장되었습니다");
            } else {
                const err = await res.json();
                toast.error(err.error || "저장 실패");
            }
        } catch {
            toast.error("저장 실패");
        } finally {
            setSaving(false);
            setEditMode(false);
        }
    };

    // 편집 취소
    const cancelEditMode = () => {
        setEditMode(false);
        setEditPlaced([]);
    };

    // 보관함에서 미니미 꺼내 배치
    const handleAddMinimi = (slug: string) => {
        if (editPlaced.length >= MINIHOMPY.MAX_PLACED_MINIMI) {
            toast.error(`최대 ${MINIHOMPY.MAX_PLACED_MINIMI}마리까지 배치할 수 있습니다`);
            return;
        }
        const newItem: PlacedMinimi = {
            slug,
            x: 50,
            y: 50,
            zIndex: editPlaced.length + 1,
        };
        setEditPlaced(prev => [...prev, newItem]);
    };

    // 드래그로 보관함에 넣기
    const handleRemoveMinimi = (index: number) => {
        setEditPlaced(prev => prev.filter((_, i) => i !== index));
    };

    // 방명록 삭제
    const handleDeleteGuestbook = useCallback(async (entryId: string) => {
        if (!user) return;
        try {
            const res = await authFetch(
                `${API.MINIHOMPY_GUESTBOOK(user.id)}?entryId=${entryId}`,
                { method: "DELETE" }
            );
            if (res.ok) {
                setGuestbook(prev => prev.filter(g => g.id !== entryId));
                setGuestbookTotal(prev => prev - 1);
                toast.success("방명록이 삭제되었습니다");
            } else {
                toast.error("삭제 실패");
            }
        } catch {
            toast.error("삭제 실패");
        }
    }, [user]);

    // 더보기
    const handleLoadMore = async () => {
        setLoadingMore(true);
        await loadGuestbook(guestbook.length, true);
        setLoadingMore(false);
    };

    if (!user) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-memento-600 animate-spin" />
            </div>
        );
    }

    const currentSettings = settings || {
        userId: user.id,
        isPublic: true,
        backgroundSlug: "default_sky",
        greeting: "",
        todayVisitors: 0,
        totalVisitors: 0,
        totalLikes: 0,
        placedMinimi: [],
    };

    const displayPlaced = editMode ? editPlaced : (currentSettings.placedMinimi || []);

    return (
        <div className="space-y-4">
            {/* 미니홈피 스테이지 */}
            <MinihompyStage
                backgroundSlug={currentSettings.backgroundSlug}
                minimiEquip={minimiEquip}
                greeting={currentSettings.greeting}
                ownerNickname={nickname}
                todayVisitors={currentSettings.todayVisitors}
                totalVisitors={currentSettings.totalVisitors}
                isOwner
                isMemorialMode={isMemorialMode}
                placedMinimi={displayPlaced}
                editMode={editMode}
                onPlacementChange={editMode ? setEditPlaced : undefined}
                onRemoveMinimi={editMode ? handleRemoveMinimi : undefined}
                onEnterEdit={enterEditMode}
                onCancelEdit={cancelEditMode}
                onSaveEdit={saveAndExitEditMode}
                saving={saving}
            />

            {/* 스테이지 바로 아래 "미니미 상점" 바로가기 — 치타 피드백:
                "이 화면에서 구매하기 기능이 있는 줄 알고 한참 찾았어".
                편집모드에선 보관함 트레이와 겹치므로 숨김. */}
            {!editMode && (
                <button
                    type="button"
                    onClick={() => openShop()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-white font-semibold shadow-md hover:shadow-lg active:scale-[0.99] transition-all"
                >
                    <ShoppingBag className="w-5 h-5" />
                    <span>미니미 상점</span>
                    <span className="text-white/80 text-xs font-normal">새 캐릭터 구매하기</span>
                </button>
            )}

            {/* 편집모드: 인라인 보관함 트레이 */}
            {editMode && (
                <StorageTray
                    ownedMinimis={ownedMinimis}
                    placedMinimi={editPlaced}
                    loading={loadingOwned}
                    onSelect={handleAddMinimi}
                    maxPlaced={MINIHOMPY.MAX_PLACED_MINIMI}
                />
            )}

            {/* 설정 섹션 */}
            <MinihompySettingsSection
                settings={currentSettings}
                onUpdate={handleSettingsUpdate}
                isActive={isActive}
            />

            {/* 미니미 도감 — 미보유 클릭 시 상점 자동 오픈, 헤더에 "상점 열기" 버튼 */}
            <MinimiCollection onOpenShop={openShop} />

            {/* 미니미 상점 모달 */}
            <MinimiShopModal
                isOpen={shopOpen}
                onClose={closeShop}
                ownedCharacters={ownedMinimis.map((m) => m.slug)}
                initialSlug={shopInitialSlug}
                onPurchased={() => {
                    loadOwnedMinimis();
                }}
            />

            {/* 방명록 섹션 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-0 shadow-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-pink-500" />
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                        방명록
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({guestbookTotal})
                    </span>
                </div>

                {guestbook.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">아직 방명록이 없어요</p>
                        <p className="text-xs mt-1">
                            다른 사용자가 미니홈피에 놀러오면 방명록을 남겨줄 거에요
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {guestbook.map((entry) => (
                            <GuestbookItem
                                key={entry.id}
                                entry={entry}
                                isOwner={true}
                                currentUserId={user.id}
                                onDelete={handleDeleteGuestbook}
                            />
                        ))}

                        {guestbook.length < guestbookTotal && (
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl",
                                    "text-sm font-medium text-gray-500 dark:text-gray-400",
                                    "bg-gray-50 dark:bg-gray-700/50",
                                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                                    "transition-colors"
                                )}
                            >
                                {loadingMore ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <ChevronDown className="w-4 h-4" />
                                        더보기
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// 방명록 아이템 서브컴포넌트
function GuestbookItem({
    entry,
    isOwner,
    currentUserId,
    onDelete,
}: {
    entry: GuestbookEntry;
    isOwner: boolean;
    currentUserId: string;
    onDelete: (id: string) => void;
}) {
    const canDelete = isOwner || entry.visitorId === currentUserId;
    const timeAgo = getTimeAgo(entry.createdAt);

    return (
        <div className="flex gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30">
            {/* 방문자 미니미 */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center overflow-hidden">
                {entry.visitorImageUrl ? (
                    <Image
                        src={entry.visitorImageUrl}
                        alt={entry.visitorNickname}
                        width={24}
                        height={24}
                        className="object-contain"
                        style={{ imageRendering: "pixelated" }}
                    />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">
                            {entry.visitorNickname.charAt(0)}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                        {entry.visitorNickname}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {timeAgo}
                    </span>
                    {canDelete && (
                        <button
                            onClick={() => onDelete(entry.id)}
                            className="ml-auto text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
                    {entry.content}
                </p>
            </div>
        </div>
    );
}

/** 보관함 트레이 - 편집모드에서 스테이지 바로 아래에 표시 */
function StorageTray({
    ownedMinimis,
    placedMinimi,
    loading,
    onSelect,
    maxPlaced,
}: {
    ownedMinimis: OwnedChar[];
    placedMinimi: PlacedMinimi[];
    loading: boolean;
    onSelect: (slug: string) => void;
    maxPlaced: number;
}) {
    const placedSlugs = new Set(placedMinimi.map(p => p.slug));
    const available = ownedMinimis.filter(o => !placedSlugs.has(o.slug));
    const isFull = placedMinimi.length >= maxPlaced;

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-0 shadow-lg p-3">
            <div className="flex items-center gap-2 mb-2">
                <Archive className="w-4 h-4 text-memorial-500" />
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    보관함
                </h4>
                <span className="text-[10px] text-gray-400">
                    터치하여 배치 / 스테이지에서 아래로 끌어서 보관
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 text-memorial-500 animate-spin" />
                </div>
            ) : available.length === 0 ? (
                <div className="text-center py-3 text-gray-400 dark:text-gray-500">
                    <p className="text-xs">
                        {ownedMinimis.length === 0
                            ? "보관함이 비어있어요. 미니미 상점에서 구매해보세요!"
                            : "모든 미니미가 스테이지에 배치중이에요"}
                    </p>
                </div>
            ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {available.map((char) => (
                        <button
                            key={char.slug}
                            onClick={() => !isFull && onSelect(char.slug)}
                            disabled={isFull}
                            className={cn(
                                "flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl",
                                "bg-gray-50 dark:bg-gray-700/50",
                                isFull
                                    ? "opacity-40 cursor-not-allowed"
                                    : "hover:bg-memento-200 dark:hover:bg-memento-900/20 active:scale-95",
                                "border border-transparent hover:border-memento-300 dark:hover:border-memento-600",
                                "transition-all"
                            )}
                        >
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <Image
                                    src={char.imageUrl}
                                    alt={char.name}
                                    width={40}
                                    height={40}
                                    className="object-contain"
                                    style={{ imageRendering: "pixelated" }}
                                />
                                {!isFull && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-memento-500 rounded-full flex items-center justify-center">
                                        <Plus className="w-2.5 h-2.5 text-white" />
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate w-full text-center">
                                {char.name}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "방금";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHr < 24) return `${diffHr}시간 전`;
    if (diffDay < 30) return `${diffDay}일 전`;
    return date.toLocaleDateString("ko-KR");
}
