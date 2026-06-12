/**
 * MiniHomepyTab.tsx
 * RecordPage 내 펫홈 탭
 * - 내 펫홈 스테이지 표시
 * - 꼬미 배치 편집모드
 * - 설정 (인사말, 배경, 공개/비공개)
 * - 방명록 목록
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, MessageSquare, Trash2, ChevronDown, Archive, Plus, ShoppingBag, Camera, X, PawPrint, PlayCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMemorialMode, usePets } from "@/contexts/PetContext";
import TimelineSection from "@/components/features/record/TimelineSection";
import RemindersSection from "@/components/features/reminders/RemindersSection";
import VideoGenerationSection from "@/components/features/video/VideoGenerationSection";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import type { MinihompySettings, GuestbookEntry, PlacedMinimi } from "@/types";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import { FURNITURE_CATALOG } from "@/data/furnitureCatalog";
import MinihompyStage from "./MinihompyStage";
import MinihompySettingsSection from "./MinihompySettingsSection";
import MinimiCollection from "./MinimiCollection";
import MinihompyShop from "./MinihompyShop";
import PethomeStartGuideModal from "./PethomeStartGuideModal";
import NeighborListModal from "./NeighborListModal";
import MinihompyVisitModal from "./MinihompyVisitModal";
import Image from "next/image";

interface OwnedChar {
    slug: string;
    name: string;
    imageUrl: string;
}

interface OwnedFurniture {
    slug: string;
    name: string;
    imageUrl: string;
}

/** 펫홈 섹션 탭 — 싸이월드 미니홈피 메뉴(홈/사진첩/다이어리/방명록) + 메멘토 고유(AI영상/케어) */
type PethomeSection = "home" | "photos" | "diary" | "video" | "guestbook" | "care";

export default function MiniHomepyTab({ isActive = true }: { isActive?: boolean }) {
    const { user, minimiEquip, isPremiumUser } = useAuth();
    const { isMemorialMode } = useMemorialMode();
    const { selectedPet } = usePets();
    const nickname = user?.user_metadata?.nickname || user?.email?.split("@")[0] || "익명";

    const [settings, setSettings] = useState<MinihompySettings | null>(null);
    const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
    const [guestbookTotal, setGuestbookTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // 꼬미 배치 편집모드
    const [editMode, setEditMode] = useState(false);
    const [editPlaced, setEditPlaced] = useState<PlacedMinimi[]>([]);
    const [saving, setSaving] = useState(false);

    // 보관함 (보유 꼬미 목록)
    const [ownedMinimis, setOwnedMinimis] = useState<OwnedChar[]>([]);
    const [loadingOwned, setLoadingOwned] = useState(false);

    // 보유 가구 목록
    const [ownedFurniture, setOwnedFurniture] = useState<OwnedFurniture[]>([]);

    // 통합 상점 모달 (꼬미/가구/배경 탭)
    const [shopOpen, setShopOpen] = useState(false);
    const [shopInitialTab, setShopInitialTab] = useState<"minimi" | "furniture" | "background">("minimi");

    // 새 유저 빈 펫홈 시작 가이드 모달
    const [guideOpen, setGuideOpen] = useState(false);

    // 펫홈 섹션 탭 (싸이월드식 메뉴) — 기존 프라이빗 기능들을 펫홈으로 집결
    const [activeSection, setActiveSection] = useState<PethomeSection>("home");

    // 이웃 카운트 + 목록 모달 + 이웃 펫홈 방문
    const [neighborCount, setNeighborCount] = useState(0);
    const [neighborModalOpen, setNeighborModalOpen] = useState(false);
    const [visitingUserId, setVisitingUserId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await authFetch(API.NEIGHBORS(user.id));
                if (!res.ok || cancelled) return;
                const d = await res.json();
                // 헤더 노출 카운트 = 나를 이웃으로 추가한 수 (인스타 팔로워 격)
                setNeighborCount(d.followerCount ?? 0);
            } catch { /* 무시 */ }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const openShop = useCallback((tab: "minimi" | "furniture" | "background" = "minimi") => {
        setShopInitialTab(tab);
        setShopOpen(true);
    }, []);

    const closeShop = useCallback(() => {
        setShopOpen(false);
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
            toast.error("펫홈 설정을 불러오지 못했습니다.");
        }
    }, []);

    // 보유 꼬미 로드
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

    // 보유 가구 로드
    const loadOwnedFurniture = useCallback(async () => {
        try {
            const res = await authFetch(API.FURNITURE_INVENTORY);
            if (!res.ok) return;
            const data = await res.json();
            const items: OwnedFurniture[] = (data.items || [])
                .map((row: { furniture_id: string }) => {
                    const catalog = FURNITURE_CATALOG.find(f => f.slug === row.furniture_id);
                    if (!catalog) return null;
                    return { slug: catalog.slug, name: catalog.name, imageUrl: catalog.imageUrl };
                })
                .filter(Boolean) as OwnedFurniture[];
            setOwnedFurniture(items);
        } catch {
            // ignore
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

    // 편집모드 진입 - 장착 꼬미가 배치 배열에 없으면 자동 포함
    const enterEditMode = () => {
        const current = settings?.placedMinimi || [];
        let initial = [...current];

        // 장착된 꼬미가 있는데 배치 배열에 없으면 자동 추가
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
        loadOwnedFurniture();
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
                toast.success("꼬미 배치가 저장되었습니다");
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

    // 보관함에서 아이템 꺼내 배치 (꼬미 또는 가구)
    const handleAddItem = (slug: string, type?: "minimi" | "furniture") => {
        const newItem: PlacedMinimi = {
            slug,
            x: 50,
            y: 50,
            zIndex: editPlaced.length + 1,
            ...(type === "furniture" ? { type: "furniture" as const } : {}),
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
        backgroundSlug: "room_default",
        greeting: "",
        todayVisitors: 0,
        totalVisitors: 0,
        totalLikes: 0,
        placedMinimi: [],
    };

    const displayPlaced = editMode ? editPlaced : (currentSettings.placedMinimi || []);

    // 새 유저 판단: 배치된 꼬미도 인사말도 없으면 빈 펫홈 → 시작 가이드 오버레이
    const isEmptyPethome = (currentSettings.placedMinimi?.length ?? 0) === 0 && !currentSettings.greeting;

    return (
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-5 lg:items-start">
            {/* 좌: 미니룸(스테이지) — 데스크탑 좌측, 모바일은 위 */}
            <div className="space-y-4 lg:sticky lg:top-2 lg:self-start">
            {/* 펫홈 스테이지 */}
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
                showStartGuide={isEmptyPethome}
                onStartDecorate={() => setGuideOpen(true)}
            />

            {/* 편집모드: 인라인 보관함 트레이 (꼬미 + 가구 탭) */}
            {editMode && (
                <StorageTray
                    ownedMinimis={ownedMinimis}
                    ownedFurniture={ownedFurniture}
                    placedMinimi={editPlaced}
                    loading={loadingOwned}
                    onSelectMinimi={(slug) => handleAddItem(slug)}
                    onSelectFurniture={(slug) => handleAddItem(slug, "furniture")}
                />
            )}
            </div>

            {/* 우: 메뉴 + 콘텐츠(섹션) — 데스크탑 우측 */}
            <div className="space-y-4 lg:min-w-0">
            {!editMode && (
                <>
                    {/* 펫 카운트 헤더 — 인스타 프로필 헤더 참고 (아바타 + 이름 + 카운트) */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-memento-100 dark:bg-memento-900/30 flex items-center justify-center flex-shrink-0">
                            {selectedPet?.photos?.[0]?.url ? (
                                <Image
                                    src={selectedPet.photos[0].url}
                                    alt={selectedPet.name}
                                    width={44}
                                    height={44}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <PawPrint className="w-5 h-5 text-memento-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                {selectedPet ? selectedPet.name : nickname}
                                {selectedPet && (
                                    <span className="ml-2 text-[11px] font-normal text-gray-400 dark:text-gray-500">
                                        {isMemorialMode ? "추억하는 중" : "함께하는 중"}
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                사진 <span className="font-semibold text-gray-700 dark:text-gray-200">{selectedPet?.photos?.length ?? 0}</span>
                                <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                                방명록 <span className="font-semibold text-gray-700 dark:text-gray-200">{guestbookTotal}</span>
                                <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                                방문 <span className="font-semibold text-gray-700 dark:text-gray-200">{(currentSettings.totalVisitors ?? 0).toLocaleString()}</span>
                            </p>
                        </div>
                        {/* 이웃 카운트 → 목록 모달 (싸이 일촌 격) */}
                        <button
                            onClick={() => setNeighborModalOpen(true)}
                            className={cn(
                                "flex flex-col items-center px-3 py-1.5 rounded-xl transition-colors flex-shrink-0",
                                isMemorialMode
                                    ? "bg-memorial-50 dark:bg-memorial-900/20 hover:bg-memorial-100"
                                    : "bg-memento-50 dark:bg-memento-900/20 hover:bg-memento-100"
                            )}
                        >
                            <span className={cn("text-sm font-bold", isMemorialMode ? "text-memorial-600" : "text-memento-600")}>
                                {neighborCount}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">이웃</span>
                        </button>
                    </div>

                    {/* 섹션 칩 내비 — 싸이월드 미니홈피 메뉴(홈/사진첩/다이어리/방명록) 참고 */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                        {SECTION_DEFS.filter(s => !(s.key === "care" && isMemorialMode)).map((s) => (
                            <button
                                key={s.key}
                                onClick={() => setActiveSection(s.key)}
                                className={cn(
                                    "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                                    activeSection === s.key
                                        ? (isMemorialMode ? "bg-memorial-500 text-white shadow-sm" : "bg-memento-500 text-white shadow-sm")
                                        : "bg-white/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800"
                                )}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* 홈: 상점 + 설정 + 꼬미 도감 (기존 구성) */}
                    {activeSection === "home" && (
                        <>
                            <button
                                type="button"
                                onClick={() => openShop("minimi")}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-white font-semibold shadow-md hover:shadow-lg active:scale-[0.99] transition-all"
                            >
                                <ShoppingBag className="w-5 h-5" />
                                <span>상점</span>
                                <span className="text-white/80 text-xs font-normal">꼬미 · 가구 · 배경 구매</span>
                            </button>
                            <MinihompySettingsSection
                                settings={currentSettings}
                                onUpdate={handleSettingsUpdate}
                                isActive={isActive}
                            />
                            <MinimiCollection onOpenShop={() => openShop("minimi")} />
                        </>
                    )}

                    {/* 사진첩: 인스타식 3열 그리드 (selectedPet.photos 재사용) */}
                    {activeSection === "photos" && (
                        selectedPet ? <PethomePhotoGrid pet={selectedPet} /> : <NoPetCard />
                    )}

                    {/* 다이어리: 타임라인 일기 (기존 TimelineSection 재사용) */}
                    {activeSection === "diary" && (
                        selectedPet
                            ? <TimelineSection petId={selectedPet.id} petName={selectedPet.name} />
                            : <NoPetCard />
                    )}

                    {/* AI영상: 기존 VideoGenerationSection 재사용 */}
                    {activeSection === "video" && (
                        selectedPet
                            ? <VideoGenerationSection pet={selectedPet} isPremium={isPremiumUser} />
                            : <NoPetCard />
                    )}

                    {/* 케어: 리마인더 (일상 모드 전용, 본인만 보는 프라이빗) */}
                    {activeSection === "care" && !isMemorialMode && (
                        selectedPet
                            ? <RemindersSection petId={selectedPet.id} petName={selectedPet.name} />
                            : <NoPetCard />
                    )}
                </>
            )}

            {/* 이웃 목록 모달 (탭: 나를/내가 이웃으로, 서로이웃 배지, 빈 상태 fallback) */}
            <NeighborListModal
                isOpen={neighborModalOpen}
                onClose={() => setNeighborModalOpen(false)}
                userId={user.id}
                onVisit={(uid) => { setNeighborModalOpen(false); setVisitingUserId(uid); }}
            />

            {/* 이웃 펫홈 방문 (목록에서 클릭 시) */}
            {visitingUserId && (
                <MinihompyVisitModal
                    isOpen={!!visitingUserId}
                    onClose={() => setVisitingUserId(null)}
                    userId={visitingUserId}
                />
            )}

            {/* 새 유저 빈 펫홈 시작 가이드 → 상점으로 안내 */}
            <PethomeStartGuideModal
                isOpen={guideOpen}
                onClose={() => setGuideOpen(false)}
                isMemorialMode={isMemorialMode}
                onStart={() => { setGuideOpen(false); openShop("minimi"); }}
            />

            {/* 통합 상점 모달 (꼬미/가구/배경) */}
            <MinihompyShop
                isOpen={shopOpen}
                onClose={closeShop}
                initialTab={shopInitialTab}
                onPurchased={() => {
                    loadOwnedMinimis();
                    loadOwnedFurniture();
                    loadSettings();
                }}
            />

            {/* 방명록 섹션 (펫홈 섹션 탭) */}
            {!editMode && activeSection === "guestbook" && (
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
                            다른 사용자가 펫홈에 놀러오면 방명록을 남겨줄 거에요
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
            )}
            </div>
        </div>
    );
}

// 펫홈 섹션 정의 (싸이월드 메뉴 참고: 홈/사진첩/다이어리/방명록 + 메멘토 고유: AI영상/케어)
const SECTION_DEFS: { key: PethomeSection; label: string }[] = [
    { key: "home", label: "홈" },
    { key: "photos", label: "사진첩" },
    { key: "diary", label: "다이어리" },
    { key: "video", label: "AI영상" },
    { key: "guestbook", label: "방명록" },
    { key: "care", label: "케어" },
];

/** 펫 미등록 시 섹션 빈 상태 — 반려동물 서브탭으로 안내 */
function NoPetCard() {
    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center">
            <PawPrint className="w-10 h-10 mx-auto mb-3 text-memento-300" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">반려동물을 먼저 등록해주세요</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">우리 아이를 등록하면 이곳에 기록이 모여요</p>
            <button
                onClick={() => window.dispatchEvent(new CustomEvent("navigateRecordSubTab", { detail: "pets" }))}
                className="mt-4 px-5 py-2.5 rounded-xl bg-memento-500 hover:bg-memento-600 text-white text-sm font-semibold transition-colors"
            >
                반려동물 등록하기
            </button>
        </div>
    );
}

/** 사진첩 — 인스타식 3열 그리드 (selectedPet.photos 재사용, 이미지/영상 뷰어 내장) */
function PethomePhotoGrid({ pet }: { pet: { id: string; name: string; photos: Array<{ id: string; url: string; type: string }> } }) {
    const [viewing, setViewing] = useState<{ url: string; type: string } | null>(null);
    const photos = pet.photos ?? [];

    if (photos.length === 0) {
        return (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center">
                <Camera className="w-10 h-10 mx-auto mb-3 text-memento-300" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">아직 사진이 없어요</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{pet.name}의 순간들을 담아보세요</p>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent("navigateRecordSubTab", { detail: "pets" }))}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-memento-500 hover:bg-memento-600 text-white text-sm font-semibold transition-colors"
                >
                    사진 추가하러 가기
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-3">
                <div className="flex items-center gap-2 px-1 pb-2">
                    <Camera className="w-4 h-4 text-memento-500" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">{pet.name}의 사진첩</span>
                    <span className="text-xs text-gray-400">({photos.length})</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                    {photos.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setViewing({ url: p.url, type: p.type })}
                            className="relative aspect-square overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700 group"
                        >
                            {p.type === "video" ? (
                                <>
                                    <video src={p.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                    <PlayCircle className="absolute top-1.5 right-1.5 w-4 h-4 text-white drop-shadow" />
                                </>
                            ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* 미니 뷰어 (이미지 + 영상) */}
            {viewing && (
                <div
                    className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
                    onClick={() => setViewing(null)}
                >
                    <button
                        onClick={() => setViewing(null)}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                    {viewing.type === "video" ? (
                        <video
                            src={viewing.url}
                            controls
                            autoPlay
                            playsInline
                            className="max-w-full max-h-[85vh] rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={viewing.url}
                            alt=""
                            className="max-w-full max-h-[85vh] object-contain rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            )}
        </>
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
            {/* 방문자 꼬미 */}
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

/** 보관함 트레이 - 편집모드에서 스테이지 바로 아래에 표시 (꼬미 + 가구 탭) */
function StorageTray({
    ownedMinimis,
    ownedFurniture,
    placedMinimi,
    loading,
    onSelectMinimi,
    onSelectFurniture,
}: {
    ownedMinimis: OwnedChar[];
    ownedFurniture: OwnedFurniture[];
    placedMinimi: PlacedMinimi[];
    loading: boolean;
    onSelectMinimi: (slug: string) => void;
    onSelectFurniture: (slug: string) => void;
}) {
    const [tab, setTab] = useState<"minimi" | "furniture">("minimi");

    // 꼬미: 배치된 slug 제외 (꼬미는 1개씩만)
    const placedMinimiSlugs = new Set(
        placedMinimi.filter(p => !p.type || p.type === "minimi").map(p => p.slug)
    );
    const availableMinimis = ownedMinimis.filter(o => !placedMinimiSlugs.has(o.slug));

    // 가구: 보유 개수 - 배치 개수 = 사용 가능 수
    const placedFurnitureCounts: Record<string, number> = {};
    for (const p of placedMinimi.filter(p => p.type === "furniture")) {
        placedFurnitureCounts[p.slug] = (placedFurnitureCounts[p.slug] ?? 0) + 1;
    }
    const furnitureOwnedCounts: Record<string, number> = {};
    for (const f of ownedFurniture) {
        furnitureOwnedCounts[f.slug] = (furnitureOwnedCounts[f.slug] ?? 0) + 1;
    }
    // 사용 가능한 가구 (보유 - 배치 > 0인 것만)
    const availableFurniture: (OwnedFurniture & { remaining: number })[] = [];
    const seen = new Set<string>();
    for (const f of ownedFurniture) {
        if (seen.has(f.slug)) continue;
        seen.add(f.slug);
        const owned = furnitureOwnedCounts[f.slug] ?? 0;
        const placed = placedFurnitureCounts[f.slug] ?? 0;
        const remaining = owned - placed;
        if (remaining > 0) {
            availableFurniture.push({ ...f, remaining });
        }
    }

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-0 shadow-lg p-3">
            {/* 탭 헤더 */}
            <div className="flex items-center gap-2 mb-2">
                <Archive className="w-4 h-4 text-memorial-500" />
                <div className="flex gap-1">
                    <button
                        onClick={() => setTab("minimi")}
                        className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                            tab === "minimi"
                                ? "bg-memento-500 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        )}
                    >
                        꼬미
                    </button>
                    <button
                        onClick={() => setTab("furniture")}
                        className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                            tab === "furniture"
                                ? "bg-amber-500 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        )}
                    >
                        가구
                    </button>
                </div>
                <span className="text-[10px] text-gray-400 ml-auto">
                    터치하여 배치
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 text-memorial-500 animate-spin" />
                </div>
            ) : tab === "minimi" ? (
                /* 꼬미 탭 */
                availableMinimis.length === 0 ? (
                    <div className="text-center py-3 text-gray-400 dark:text-gray-500">
                        <p className="text-xs">
                            {ownedMinimis.length === 0
                                ? "보관함이 비어있어요. 꼬미 상점에서 구매해보세요!"
                                : "모든 꼬미가 스테이지에 배치중이에요"}
                        </p>
                    </div>
                ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {availableMinimis.map((char) => (
                            <button
                                key={char.slug}
                                onClick={() => onSelectMinimi(char.slug)}
                                className={cn(
                                    "flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl",
                                    "bg-gray-50 dark:bg-gray-700/50",
                                    "hover:bg-memento-200 dark:hover:bg-memento-900/20 active:scale-95",
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
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-memento-500 rounded-full flex items-center justify-center">
                                        <Plus className="w-2.5 h-2.5 text-white" />
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate w-full text-center">
                                    {char.name}
                                </span>
                            </button>
                        ))}
                    </div>
                )
            ) : (
                /* 가구 탭 */
                availableFurniture.length === 0 ? (
                    <div className="text-center py-3 text-gray-400 dark:text-gray-500">
                        <p className="text-xs">
                            {ownedFurniture.length === 0
                                ? "보유한 가구가 없어요. 가구 상점에서 구매해보세요!"
                                : "모든 가구가 스테이지에 배치중이에요"}
                        </p>
                    </div>
                ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {availableFurniture.map((item) => (
                            <button
                                key={item.slug}
                                onClick={() => onSelectFurniture(item.slug)}
                                className={cn(
                                    "flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl",
                                    "bg-gray-50 dark:bg-gray-700/50",
                                    "hover:bg-amber-100 dark:hover:bg-amber-900/20 active:scale-95",
                                    "border border-transparent hover:border-amber-300 dark:hover:border-amber-600",
                                    "transition-all"
                                )}
                            >
                                <div className="relative w-12 h-12 flex items-center justify-center">
                                    <Image
                                        src={item.imageUrl}
                                        alt={item.name}
                                        width={40}
                                        height={40}
                                        className="object-contain"
                                        style={{ imageRendering: "pixelated" }}
                                    />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                                        <Plus className="w-2.5 h-2.5 text-white" />
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate w-full text-center">
                                    {item.name}
                                </span>
                                {item.remaining > 1 && (
                                    <span className="text-[9px] text-amber-500 font-bold">
                                        x{item.remaining}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )
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
