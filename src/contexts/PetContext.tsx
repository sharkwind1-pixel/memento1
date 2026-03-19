/**
 * PetContext.tsx
 * 반려동물 데이터 전역 상태 관리
 * Supabase 연동 (로그인 시) + localStorage 폴백 (비로그인 시)
 *
 * 타입은 @/types/index.ts에서 통합 관리
 */

"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";
import {
    uploadMedia,
    deleteMedia,
    getMediaType,
    generateVideoThumbnail,
} from "@/lib/storage";
import { toast } from "sonner";
import { POINTS, FREE_LIMITS, PREMIUM_LIMITS, getLimitsForTier } from "@/config/constants";
import type { PointAction } from "@/types";

// 클라이언트에서 포인트 적립 (Supabase RPC 직접 호출, 실패해도 무시)
async function requestPointAward(actionType: PointAction, metadata?: Record<string, string>) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const points = POINTS.ACTIONS[actionType];
        const dailyCap = POINTS.DAILY_CAPS[actionType];
        const isOneTime = (POINTS.ONE_TIME as readonly string[]).includes(actionType);

        await supabase.rpc("increment_user_points", {
            p_user_id: user.id,
            p_action_type: actionType,
            p_points: points,
            p_daily_cap: dailyCap,
            p_is_one_time: isOneTime,
            p_metadata: metadata || null,
        });
    } catch {
        // 포인트 적립 실패해도 원본 기능에 영향 없음
    }
}

// 타입은 @/types에서 import (Single Source of Truth)
import type {
    Pet,
    PetPhoto,
    MediaType,
    CropPosition,
    TimelineEntry,
} from "@/types";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

// Re-export for backward compatibility
export type { Pet, PetPhoto, MediaType, TimelineEntry };

// ============================================================================
// Memorial Mode Context (분리): selectedPet.status 변경이 Layout/BottomNav에만 전파
// Layout은 isMemorialMode만 필요한데 usePets() 전체를 구독하면
// pets/selectedPetId 등 모든 변경에 리렌더됨 → 이 Context로 분리
// ============================================================================
interface MemorialModeContextType {
    isMemorialMode: boolean;
}

const MemorialModeContext = createContext<MemorialModeContextType>({ isMemorialMode: false });

// ============================================================================
// Timeline Context (분리): timeline 변경이 Layout/HomePage 등 비관련 컴포넌트를 리렌더하지 않도록
// timeline은 RecordPage(TimelineSection)과 AIChatPage에서만 사용됨
// ============================================================================
interface TimelineContextType {
    timeline: TimelineEntry[];
    fetchTimeline: (petId: string) => Promise<void>;
    addTimelineEntry: (
        petId: string,
        entry: Omit<TimelineEntry, "id" | "petId" | "createdAt">
    ) => Promise<TimelineEntry | null>;
    updateTimelineEntry: (
        entryId: string,
        data: Partial<TimelineEntry>
    ) => Promise<void>;
    deleteTimelineEntry: (entryId: string) => Promise<void>;
}

const TimelineContext = createContext<TimelineContextType | undefined>(undefined);

// ============================================================================
// Pet Context (timeline 제외): pets/selectedPet 변경만 전파
// Layout이 usePets()로 selectedPet을 구독하므로, timeline 변경이
// contextValue를 재생성하면 Layout + 모든 자식 페이지가 리렌더됨
// ============================================================================
interface PetContextType {
    pets: Pet[];
    selectedPetId: string | null;
    selectedPet: Pet | undefined;
    // 하위호환: timeline은 useTimeline()으로 접근 권장
    timeline: TimelineEntry[];

    // Pet CRUD
    addPet: (pet: Omit<Pet, "id" | "createdAt" | "photos">) => Promise<string>;
    updatePet: (id: string, data: Partial<Pet>) => Promise<void>;
    deletePet: (id: string) => Promise<void>;
    selectPet: (id: string) => void;

    // Photo/Video CRUD
    addMedia: (
        petId: string,
        files: File[],
        captions: string[],
        dates: string[],
        onProgress?: (current: number, total: number) => void
    ) => Promise<PetPhoto[]>;
    updatePhoto: (
        petId: string,
        photoId: string,
        data: Partial<PetPhoto>
    ) => Promise<void>;
    deletePhoto: (petId: string, photoId: string) => Promise<void>;
    deletePhotos: (petId: string, photoIds: string[]) => Promise<void>;

    // Timeline CRUD (하위호환 - useTimeline() 사용 권장)
    addTimelineEntry: (
        petId: string,
        entry: Omit<TimelineEntry, "id" | "petId" | "createdAt">
    ) => Promise<TimelineEntry | null>;
    updateTimelineEntry: (
        entryId: string,
        data: Partial<TimelineEntry>
    ) => Promise<void>;
    deleteTimelineEntry: (entryId: string) => Promise<void>;
    fetchTimeline: (petId: string) => Promise<void>;

    // 유틸리티
    getPetById: (id: string) => Pet | undefined;
    isLoading: boolean;
    isSyncing: boolean;
    loadError: string | null; // "로딩 실패"와 "데이터 없음" 구분
}

const PetContext = createContext<PetContextType | undefined>(undefined);

const STORAGE_KEY = "memento-ani-pets";
const SELECTED_PET_KEY = "memento-ani-selected-pet";

export function PetProvider({ children }: { children: React.ReactNode }) {
    const { user, isPremiumUser, subscriptionTier } = useAuth();
    const [pets, setPets] = useState<Pet[]>([]);
    const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // 최신 상태 참조용 ref (useCallback 의존성 최적화)
    const petsRef = useRef(pets);
    petsRef.current = pets;
    const timelineRef = useRef(timeline);
    timelineRef.current = timeline;
    const selectedPetIdRef = useRef(selectedPetId);
    selectedPetIdRef.current = selectedPetId;

    // Supabase에서 데이터 로드
    const loadFromSupabase = useCallback(async (userId: string) => {
        try {
            setIsLoading(true);
            setIsSyncing(true);

            // 반려동물 조회
            const { data: petsData, error: petsError } = await supabase
                .from("pets")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: true });

            if (petsError) throw petsError;

            // 모든 반려동물의 미디어를 한 번에 조회 (N+1 → 1 쿼리)
            const petIds = (petsData || []).map((p) => p.id);
            const { data: allMediaData } = petIds.length > 0
                ? await supabase
                    .from("pet_media")
                    .select("*")
                    .in("pet_id", petIds)
                    .order("date", { ascending: false })
                : { data: [] };

            // pet_id별로 미디어 그룹핑
            const mediaByPetId = new Map<string, PetPhoto[]>();
            for (const m of allMediaData || []) {
                const photos = mediaByPetId.get(m.pet_id) || [];
                photos.push({
                    id: m.id,
                    url: m.url,
                    storagePath: m.storage_path,
                    type: m.type as MediaType,
                    caption: m.caption || "",
                    date: m.date,
                    cropPosition: m.crop_position,
                    thumbnailUrl: m.thumbnail_url,
                });
                mediaByPetId.set(m.pet_id, photos);
            }

            const petsWithMedia: Pet[] = (petsData || []).map((pet) => ({
                id: pet.id,
                name: pet.name,
                type: pet.type,
                breed: pet.breed,
                birthday: pet.birthday || "",
                gender: pet.gender,
                weight: pet.weight || "",
                personality: pet.personality || "",
                profileImage: pet.profile_image || "",
                profileCropPosition: pet.profile_crop_position,
                photos: mediaByPetId.get(pet.id) || [],
                status: pet.status,
                memorialDate: pet.memorial_date,
                isPrimary: pet.is_primary,
                createdAt: pet.created_at,
                adoptedDate: pet.adopted_date || undefined,
                howWeMet: pet.how_we_met || undefined,
                nicknames: pet.nicknames || undefined,
                specialHabits: pet.special_habits || undefined,
                favoriteFood: pet.favorite_food || undefined,
                favoriteActivity: pet.favorite_activity || undefined,
                favoritePlace: pet.favorite_place || undefined,
                togetherPeriod: pet.together_period || undefined,
                memorableMemory: pet.memorable_memory || undefined,
            }));

            setPets(petsWithMedia);
            setLoadError(null);

            // 선택된 펫 설정
            const savedSelectedId = safeGetItem(SELECTED_PET_KEY);
            if (
                savedSelectedId &&
                petsWithMedia.some((p) => p.id === savedSelectedId)
            ) {
                setSelectedPetId(savedSelectedId);
            } else if (petsWithMedia.length > 0) {
                setSelectedPetId(petsWithMedia[0].id);
            }
        } catch (error) {
            console.error("[PetContext] loadFromSupabase failed:", error instanceof Error ? error.message : error);
            setLoadError("반려동물 정보를 불러오지 못했습니다");
            setPets([]);
            setSelectedPetId(null);
        } finally {
            setIsSyncing(false);
            setIsLoading(false);
        }
    }, []);

    // 비로그인 시 빈 상태로 초기화 (구경만 가능)
    const initEmptyState = useCallback(() => {
        setPets([]);
        setSelectedPetId(null);
        setIsLoading(false);
    }, []);

    // 초기 데이터 로드
    useEffect(() => {
        if (user) {
            loadFromSupabase(user.id);
        } else {
            // 비로그인 = 구경만 가능, 빈 상태로 초기화
            initEmptyState();
        }
    }, [user, loadFromSupabase, initEmptyState]);

    // 비로그인 사용자는 구경만 가능 (localStorage 저장 비활성화)

    // 선택된 펫 ID localStorage에 저장
    useEffect(() => {
        if (!isLoading && selectedPetId) {
            safeSetItem(SELECTED_PET_KEY, selectedPetId);
        }
    }, [selectedPetId, isLoading]);

    // useMemo로 메모이제이션: pets.find()는 매 렌더마다 새 레퍼런스를 반환하므로
    // contextValue useMemo의 deps가 항상 변경된 것으로 판단 → 모든 consumer 재렌더 유발
    const selectedPet = useMemo(
        () => pets.find((p) => p.id === selectedPetId),
        [pets, selectedPetId]
    );

    // ===== Pet CRUD =====
    const addPet = useCallback(
        async (
            petData: Omit<Pet, "id" | "createdAt" | "photos">
        ): Promise<string> => {
            // 비로그인 시 저장 불가
            if (!user) {
                return "";
            }
            try {
                const { data, error } = await supabase
                    .from("pets")
                    .insert([
                        {
                            user_id: user.id,
                            name: petData.name,
                            type: petData.type,
                            breed: petData.breed,
                            birthday: petData.birthday || null,
                            gender: petData.gender,
                            weight: petData.weight || null,
                            personality: petData.personality || null,
                            profile_image: petData.profileImage || null,
                            profile_crop_position: petData.profileCropPosition,
                            status: petData.status,
                            memorial_date: petData.memorialDate || null,
                            is_primary: petsRef.current.length === 0,
                            // AI 펫톡 개인화를 위한 추가 필드
                            adopted_date: petData.adoptedDate || null,
                            how_we_met: petData.howWeMet || null,
                            nicknames: petData.nicknames || null,
                            special_habits: petData.specialHabits || null,
                            favorite_food: petData.favoriteFood || null,
                            favorite_activity: petData.favoriteActivity || null,
                            favorite_place: petData.favoritePlace || null,
                            together_period: petData.togetherPeriod || null,
                            memorable_memory: petData.memorableMemory || null,
                        },
                    ])
                    .select()
                    .single();

                if (error) {
                    toast.error("등록에 실패했어요. 다시 시도해주세요.");
                    return "";
                }

                const newPet: Pet = {
                    id: data.id,
                    ...petData,
                    photos: [],
                    isPrimary: petsRef.current.length === 0,
                    createdAt: data.created_at,
                };

                setPets((prev) => [...prev, newPet]);
                setSelectedPetId(data.id);

                // 포인트 적립: 반려동물 등록 (+50P, 일회성)
                requestPointAward("pet_registration", { petId: data.id });

                return data.id;
            } catch {
                toast.error("등록에 실패했어요. 다시 시도해주세요.");
                return "";
            }
        },
        [user]
    );

    const updatePet = useCallback(
        async (id: string, data: Partial<Pet>) => {
            if (user) {
                // 낙관적 업데이트: 먼저 로컬 상태 반영
                const previousPets = petsRef.current;
                setPets((prev) =>
                    prev.map((pet) => (pet.id === id ? { ...pet, ...data } : pet))
                );

                try {
                    const updateData: Record<string, unknown> = {};
                    if (data.name !== undefined) updateData.name = data.name;
                    if (data.type !== undefined) updateData.type = data.type;
                    if (data.breed !== undefined) updateData.breed = data.breed;
                    if (data.birthday !== undefined)
                        updateData.birthday = data.birthday || null;
                    if (data.gender !== undefined) updateData.gender = data.gender;
                    if (data.weight !== undefined)
                        updateData.weight = data.weight || null;
                    if (data.personality !== undefined)
                        updateData.personality = data.personality || null;
                    if (data.profileImage !== undefined)
                        updateData.profile_image = data.profileImage || null;
                    if (data.profileCropPosition !== undefined)
                        updateData.profile_crop_position = data.profileCropPosition;
                    if (data.status !== undefined) updateData.status = data.status;
                    if (data.memorialDate !== undefined)
                        updateData.memorial_date = data.memorialDate || null;
                    if (data.isPrimary !== undefined)
                        updateData.is_primary = data.isPrimary;
                    // AI 펫톡 개인화를 위한 추가 필드
                    if (data.adoptedDate !== undefined)
                        updateData.adopted_date = data.adoptedDate || null;
                    if (data.howWeMet !== undefined)
                        updateData.how_we_met = data.howWeMet || null;
                    if (data.nicknames !== undefined)
                        updateData.nicknames = data.nicknames || null;
                    if (data.specialHabits !== undefined)
                        updateData.special_habits = data.specialHabits || null;
                    if (data.favoriteFood !== undefined)
                        updateData.favorite_food = data.favoriteFood || null;
                    if (data.favoriteActivity !== undefined)
                        updateData.favorite_activity = data.favoriteActivity || null;
                    if (data.favoritePlace !== undefined)
                        updateData.favorite_place = data.favoritePlace || null;
                    if (data.togetherPeriod !== undefined)
                        updateData.together_period = data.togetherPeriod || null;
                    if (data.memorableMemory !== undefined)
                        updateData.memorable_memory = data.memorableMemory || null;

                    const { error } = await supabase.from("pets").update(updateData).eq("id", id);
                    if (error) throw error;
                } catch {
                    // Supabase 업데이트 실패 - 로컬 상태 롤백
                    setPets(previousPets);
                    toast.error("정보 수정에 실패했어요. 다시 시도해주세요.");
                }
            } else {
                setPets((prev) =>
                    prev.map((pet) => (pet.id === id ? { ...pet, ...data } : pet))
                );
            }
        },
        [user]
    );

    const deletePet = useCallback(
        async (id: string) => {
            if (user) {
                try {
                    // Storage에서 파일들 삭제 시도
                    const pet = petsRef.current.find((p) => p.id === id);
                    if (pet) {
                        for (const photo of pet.photos) {
                            if (photo.storagePath) {
                                await deleteMedia(photo.storagePath);
                            }
                        }
                    }

                    const { error } = await supabase.from("pets").delete().eq("id", id);
                    if (error) throw error;
                } catch {
                    toast.error("삭제에 실패했어요. 다시 시도해주세요.");
                    return;
                }
            }

            setPets((prev) => {
                const filtered = prev.filter((pet) => pet.id !== id);

                if (selectedPetIdRef.current === id) {
                    const newSelected =
                        filtered.length > 0 ? filtered[0].id : null;
                    setSelectedPetId(newSelected);
                }

                if (filtered.length > 0 && !filtered.some((p) => p.isPrimary)) {
                    filtered[0] = { ...filtered[0], isPrimary: true };
                }

                return filtered;
            });
        },
        [user]
    );

    const selectPet = useCallback((id: string) => {
        setSelectedPetId(id);
    }, []);

    // ===== Media CRUD =====
    const addMedia = useCallback(
        async (
            petId: string,
            inputFiles: File[],
            inputCaptions: string[],
            inputDates: string[],
            onProgress?: (current: number, total: number) => void
        ): Promise<PetPhoto[]> => {
            let files = inputFiles;
            let captions = inputCaptions;
            let dates = inputDates;
            // 비로그인 시 업로드 불가
            if (!user) {
                return [];
            }

            // 사진 제한 체크
            const photoLimit = getLimitsForTier(subscriptionTier).PHOTOS_PER_PET;
            const { count: currentCount } = await supabase
                .from("pet_media")
                .select("id", { count: "exact", head: true })
                .eq("pet_id", petId)
                .eq("user_id", user.id);
            const existing = currentCount || 0;
            if (existing + files.length > photoLimit) {
                const canUpload = Math.max(0, photoLimit - existing);
                toast.error(
                    canUpload > 0
                        ? `사진 제한에 도달했습니다. ${canUpload}장만 업로드 가능합니다. (현재 ${existing}/${photoLimit}장)`
                        : `사진 저장 제한(${photoLimit}장)에 도달했습니다. ${subscriptionTier === "premium" ? "" : "상위 구독 시 더 많은 사진을 저장할 수 있습니다."}`
                );
                if (canUpload === 0) return [];
                // 가능한 만큼만 업로드
                files = files.slice(0, canUpload);
                captions = captions.slice(0, canUpload);
                dates = dates.slice(0, canUpload);
            }

            const newPhotos: PetPhoto[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const caption = captions[i] || "";
                const date = dates[i] || new Date().toISOString().split("T")[0];
                const mediaType = getMediaType(file.name);

                if (onProgress) {
                    onProgress(i + 1, files.length);
                }

                // 영상이면 썸네일 생성
                let thumbnailUrl: string | undefined;
                if (mediaType === "video") {
                    thumbnailUrl =
                        (await generateVideoThumbnail(file)) || undefined;
                }

                // Supabase에 업로드
                try {
                    const uploadResult = await uploadMedia(file, user.id, petId);

                    if (uploadResult.success && uploadResult.url) {
                        const { data, error } = await supabase
                            .from("pet_media")
                            .insert([
                                {
                                    pet_id: petId,
                                    user_id: user.id,
                                    url: uploadResult.url,
                                    storage_path: uploadResult.path,
                                    type: mediaType,
                                    caption,
                                    date,
                                    thumbnail_url: thumbnailUrl,
                                },
                            ])
                            .select()
                            .single();

                        if (!error && data) {
                            newPhotos.push({
                                id: data.id,
                                url: uploadResult.url,
                                storagePath: uploadResult.path,
                                type: mediaType,
                                caption,
                                date,
                                thumbnailUrl,
                            });
                        }
                    }
                } catch {
                    // 업로드 실패 - 다음 파일 계속 시도
                }
            }

            // 일부 또는 전체 업로드 실패 시 사용자에게 알림
            const failedCount = files.length - newPhotos.length;
            if (failedCount > 0 && newPhotos.length > 0) {
                toast.error(`${failedCount}개 파일 업로드에 실패했어요.`);
            } else if (failedCount > 0 && newPhotos.length === 0) {
                toast.error("업로드에 실패했어요. 다시 시도해주세요.");
            }

            // 상태 업데이트
            if (newPhotos.length > 0) {
                setPets((prev) =>
                    prev.map((pet) =>
                        pet.id === petId
                            ? { ...pet, photos: [...newPhotos, ...pet.photos] }
                            : pet
                    )
                );

                // 포인트 적립: 사진 업로드 (+3P × 업로드 수, 일일 10회 상한)
                for (const photo of newPhotos) {
                    requestPointAward("photo_upload", { photoId: photo.id });
                }
            }

            return newPhotos;
        },
        [user, isPremiumUser, subscriptionTier]
    );

    const updatePhoto = useCallback(
        async (petId: string, photoId: string, data: Partial<PetPhoto>) => {
            if (user) {
                // 낙관적 업데이트: 먼저 로컬 상태 반영
                const previousPets = petsRef.current;
                setPets((prev) =>
                    prev.map((pet) =>
                        pet.id === petId
                            ? {
                                  ...pet,
                                  photos: pet.photos.map((photo) =>
                                      photo.id === photoId
                                          ? { ...photo, ...data }
                                          : photo
                                  ),
                              }
                            : pet
                    )
                );

                try {
                    const updateData: Record<string, unknown> = {};
                    if (data.caption !== undefined) updateData.caption = data.caption;
                    if (data.date !== undefined) updateData.date = data.date;
                    if (data.cropPosition !== undefined)
                        updateData.crop_position = data.cropPosition;

                    const { error } = await supabase
                        .from("pet_media")
                        .update(updateData)
                        .eq("id", photoId);
                    if (error) throw error;
                } catch {
                    // Supabase 업데이트 실패 - 로컬 상태 롤백
                    setPets(previousPets);
                    toast.error("사진 정보 수정에 실패했어요. 다시 시도해주세요.");
                }
            } else {
                setPets((prev) =>
                    prev.map((pet) =>
                        pet.id === petId
                            ? {
                                  ...pet,
                                  photos: pet.photos.map((photo) =>
                                      photo.id === photoId
                                          ? { ...photo, ...data }
                                          : photo
                                  ),
                              }
                            : pet
                    )
                );
            }
        },
        [user]
    );

    const deletePhoto = useCallback(
        async (petId: string, photoId: string) => {
            const pet = petsRef.current.find((p) => p.id === petId);
            const photo = pet?.photos.find((p) => p.id === photoId);

            if (user) {
                try {
                    if (photo?.storagePath) {
                        // Storage에서 파일 삭제
                        await deleteMedia(photo.storagePath);
                    }
                    // DB에서 레코드 삭제
                    const { error } = await supabase.from("pet_media").delete().eq("id", photoId);
                    if (error) throw error;
                } catch {
                    toast.error("사진 삭제에 실패했어요. 다시 시도해주세요.");
                    return;
                }
            }

            setPets((prev) =>
                prev.map((pet) =>
                    pet.id === petId
                        ? {
                              ...pet,
                              photos: pet.photos.filter(
                                  (photo) => photo.id !== photoId
                              ),
                          }
                        : pet
                )
            );
        },
        [user]
    );

    const deletePhotos = useCallback(
        async (petId: string, photoIds: string[]) => {
            const pet = petsRef.current.find((p) => p.id === petId);

            if (user && pet) {
                try {
                    // Storage에서 파일들 삭제
                    for (const photoId of photoIds) {
                        const photo = pet.photos.find((p) => p.id === photoId);
                        if (photo?.storagePath) {
                            await deleteMedia(photo.storagePath);
                        }
                    }
                    // DB에서 레코드들 삭제
                    const { error } = await supabase.from("pet_media").delete().in("id", photoIds);
                    if (error) throw error;
                } catch {
                    toast.error("사진 삭제에 실패했어요. 다시 시도해주세요.");
                    return;
                }
            }

            setPets((prev) =>
                prev.map((pet) =>
                    pet.id === petId
                        ? {
                              ...pet,
                              photos: pet.photos.filter(
                                  (photo) => !photoIds.includes(photo.id)
                              ),
                          }
                        : pet
                )
            );
        },
        [user]
    );

    // ===== Timeline CRUD =====
    // fetchTimeline 호출 추적: 같은 petId에 대해 이미 로드된 데이터가 있으면 skip
    const lastFetchedPetIdRef = useRef<string | null>(null);

    const fetchTimelineData = useCallback(
        async (petId: string) => {
            if (!user) {
                setTimeline([]);
                return;
            }

            const { data, error } = await supabase
                .from("timeline_entries")
                .select("*")
                .eq("pet_id", petId)
                .order("date", { ascending: false });

            if (!error && data) {
                const newTimeline = data.map((entry) => ({
                    id: entry.id,
                    petId: entry.pet_id,
                    date: entry.date,
                    title: entry.title,
                    content: entry.content || "",
                    mood: entry.mood,
                    mediaIds: entry.media_ids,
                    createdAt: entry.created_at,
                }));

                // 구조적 비교: ID 목록이 동일하면 setTimeline 호출 skip
                // (새 배열 레퍼런스 생성 → context value 재생성 → 모든 consumer 재렌더 방지)
                const currentIds = timelineRef.current.map(e => e.id).join(",");
                const newIds = newTimeline.map(e => e.id).join(",");
                if (currentIds !== newIds) {
                    setTimeline(newTimeline);
                }
                lastFetchedPetIdRef.current = petId;
            }
        },
        [user]
    );

    const addTimelineEntry = useCallback(
        async (
            petId: string,
            entry: Omit<TimelineEntry, "id" | "petId" | "createdAt">
        ): Promise<TimelineEntry | null> => {
            if (!user) {
                return null;
            }

            try {
                const { data, error } = await supabase
                    .from("timeline_entries")
                    .insert([
                        {
                            pet_id: petId,
                            user_id: user.id,
                            date: entry.date,
                            title: entry.title,
                            content: entry.content || null,
                            mood: entry.mood || null,
                            media_ids: entry.mediaIds || null,
                        },
                    ])
                    .select()
                    .single();

                if (error || !data) {
                    toast.error("일기 저장에 실패했어요. 다시 시도해주세요.");
                    return null;
                }

                const newEntry: TimelineEntry = {
                    id: data.id,
                    petId: data.pet_id,
                    date: data.date,
                    title: data.title,
                    content: data.content || "",
                    mood: data.mood,
                    mediaIds: data.media_ids,
                    createdAt: data.created_at,
                };

                setTimeline((prev) => [newEntry, ...prev]);

                // 포인트 적립: 타임라인 기록 (+5P)
                requestPointAward("timeline_entry", { entryId: data.id });

                return newEntry;
            } catch {
                toast.error("일기 저장에 실패했어요. 다시 시도해주세요.");
                return null;
            }
        },
        [user]
    );

    const updateTimelineEntry = useCallback(
        async (entryId: string, data: Partial<TimelineEntry>) => {
            if (!user) return;

            // 낙관적 업데이트: 먼저 로컬 상태 반영
            const previousTimeline = timelineRef.current;
            setTimeline((prev) =>
                prev.map((entry) =>
                    entry.id === entryId ? { ...entry, ...data } : entry
                )
            );

            try {
                const updateData: Record<string, unknown> = {};
                if (data.date !== undefined) updateData.date = data.date;
                if (data.title !== undefined) updateData.title = data.title;
                if (data.content !== undefined)
                    updateData.content = data.content || null;
                if (data.mood !== undefined) updateData.mood = data.mood || null;
                if (data.mediaIds !== undefined)
                    updateData.media_ids = data.mediaIds || null;

                const { error } = await supabase
                    .from("timeline_entries")
                    .update(updateData)
                    .eq("id", entryId);
                if (error) throw error;
            } catch {
                // Supabase 업데이트 실패 - 로컬 상태 롤백
                setTimeline(previousTimeline);
                toast.error("일기 수정에 실패했어요. 다시 시도해주세요.");
            }
        },
        [user]
    );

    const deleteTimelineEntry = useCallback(
        async (entryId: string) => {
            if (!user) return;

            try {
                const { error } = await supabase.from("timeline_entries").delete().eq("id", entryId);
                if (error) throw error;
            } catch {
                toast.error("일기 삭제에 실패했어요. 다시 시도해주세요.");
                return;
            }

            setTimeline((prev) => prev.filter((entry) => entry.id !== entryId));
        },
        [user]
    );

    // 유틸리티 - ref 기반으로 구현하여 contextValue deps에서 제외
    // getPetById는 pets가 바뀔 때마다 새 함수 참조가 생성되어
    // contextValue useMemo를 무효화시키는 주범이었음
    // petsRef는 이미 위에서 선언됨 (line ~127)
    const getPetById = useCallback(
        (id: string) => {
            return petsRef.current.find((p) => p.id === id);
        },
        [] // deps 없음 - petsRef.current는 항상 최신 값
    );

    // ========================================================================
    // Memorial Mode Context value (별도 분리)
    // selectedPet의 status가 "memorial"인지만 추적
    // Layout/BottomNav는 이것만 구독하면 됨 (usePets() 구독 불필요)
    // ========================================================================
    const isMemorialMode = selectedPet?.status === "memorial";
    const memorialModeContextValue = useMemo(
        () => ({ isMemorialMode: !!isMemorialMode }),
        [isMemorialMode]
    );

    // ========================================================================
    // Timeline Context value (별도 분리)
    // timeline 변경은 이 context의 consumer만 리렌더 (RecordPage TimelineSection, AIChatPage)
    // Layout, HomePage 등은 영향 없음
    // ========================================================================
    const timelineContextValue = useMemo(
        () => ({
            timeline,
            fetchTimeline: fetchTimelineData,
            addTimelineEntry,
            updateTimelineEntry,
            deleteTimelineEntry,
        }),
        [timeline, fetchTimelineData, addTimelineEntry, updateTimelineEntry, deleteTimelineEntry]
    );

    // ========================================================================
    // Pet Context value (timeline 제외)
    // pets/selectedPet 변경만 이 context를 통해 전파됨
    // Layout(selectedPet용)은 timeline 변경에 영향받지 않음
    // ========================================================================
    const contextValue = useMemo(
        () => ({
            pets,
            selectedPetId,
            selectedPet,
            // 하위호환: timeline은 ref로 제공 (실시간 반응 필요 시 useTimeline() 사용)
            timeline: timelineRef.current,
            addPet,
            updatePet,
            deletePet,
            selectPet,
            addMedia,
            updatePhoto,
            deletePhoto,
            deletePhotos,
            // 하위호환: timeline 함수들도 ref로 제공
            addTimelineEntry,
            updateTimelineEntry,
            deleteTimelineEntry,
            fetchTimeline: fetchTimelineData,
            getPetById,
            isLoading,
            isSyncing,
            loadError,
        }),
        [
            pets,
            selectedPetId,
            selectedPet,
            // 주의: timeline은 deps에서 제외! (TimelineContext로 분리됨)
            addPet,
            updatePet,
            deletePet,
            selectPet,
            addMedia,
            updatePhoto,
            deletePhoto,
            deletePhotos,
            addTimelineEntry,
            updateTimelineEntry,
            deleteTimelineEntry,
            fetchTimelineData,
            getPetById,
            isLoading,
            isSyncing,
            loadError,
        ]
    );

    return (
        <MemorialModeContext.Provider value={memorialModeContextValue}>
            <PetContext.Provider value={contextValue}>
                <TimelineContext.Provider value={timelineContextValue}>
                    {children}
                </TimelineContext.Provider>
            </PetContext.Provider>
        </MemorialModeContext.Provider>
    );
}

/** Pet 데이터 hook (timeline 제외) - Layout 등에서 사용 */
export function usePets() {
    const context = useContext(PetContext);
    if (context === undefined) {
        throw new Error("usePets must be used within a PetProvider");
    }
    return context;
}

/** Timeline 전용 hook - timeline 변경 시 이 hook의 consumer만 리렌더 */
export function useTimeline() {
    const context = useContext(TimelineContext);
    if (context === undefined) {
        throw new Error("useTimeline must be used within a PetProvider");
    }
    return context;
}

/** Memorial Mode hook - isMemorialMode만 구독 (Layout/BottomNav용)
 * selectedPet.status가 "memorial"↔"active"로 바뀔 때만 리렌더
 * pets 배열, selectedPetId, timeline 등 변경에는 반응하지 않음 */
export function useMemorialMode() {
    return useContext(MemorialModeContext);
}
