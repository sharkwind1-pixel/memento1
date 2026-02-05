/**
 * PetContext.tsx
 * 반려동물 데이터 전역 상태 관리
 * Supabase 연동 (로그인 시) + localStorage 폴백 (비로그인 시)
 */

"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";
import {
    uploadMedia,
    deleteMedia,
    getMediaType,
    generateVideoThumbnail,
} from "@/lib/storage";

// 타입 정의
export type MediaType = "image" | "video";

export interface PetPhoto {
    id: string;
    url: string;
    storagePath?: string; // Supabase Storage 경로
    type: MediaType;
    caption: string;
    date: string;
    cropPosition?: {
        x: number;
        y: number;
        scale: number;
    };
    thumbnailUrl?: string; // 영상 썸네일
}

export interface Pet {
    id: string;
    name: string;
    type: "강아지" | "고양이" | "기타";
    breed: string;
    birthday: string;
    gender: "남아" | "여아";
    weight: string;
    personality: string;
    profileImage: string;
    profileCropPosition?: {
        x: number;
        y: number;
        scale: number;
    };
    photos: PetPhoto[];
    status: "active" | "memorial";
    memorialDate?: string;
    isPrimary: boolean;
    createdAt: string;

    // AI 펫톡 개인화를 위한 추가 정보
    adoptedDate?: string;           // 처음 만난 날/입양한 날
    howWeMet?: "펫샵" | "분양" | "보호소" | "지인" | "길에서" | "기타";  // 어떻게 만났는지
    nicknames?: string;             // 부르는 별명들 (쉼표로 구분)
    specialHabits?: string;         // 특별한 버릇/습관
    favoriteFood?: string;          // 좋아하는 간식/음식
    favoriteActivity?: string;      // 좋아하는 놀이/활동
    favoritePlace?: string;         // 좋아하는 장소

    // 추모 관련 추가 정보
    togetherPeriod?: string;        // 함께한 기간
    memorableMemory?: string;       // 기억하고 싶은 순간
}

// 타임라인 일기 타입
export interface TimelineEntry {
    id: string;
    petId: string;
    date: string;
    title: string;
    content: string;
    mood?: "happy" | "normal" | "sad" | "sick";
    mediaIds?: string[];
    createdAt: string;
}

interface PetContextType {
    pets: Pet[];
    selectedPetId: string | null;
    selectedPet: Pet | undefined;
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

    // Timeline CRUD
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
}

const PetContext = createContext<PetContextType | undefined>(undefined);

const STORAGE_KEY = "memento-ani-pets";
const SELECTED_PET_KEY = "memento-ani-selected-pet";

export function PetProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [pets, setPets] = useState<Pet[]>([]);
    const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Supabase에서 데이터 로드
    const loadFromSupabase = useCallback(async (userId: string) => {
        try {
            setIsSyncing(true);

            // 반려동물 조회
            const { data: petsData, error: petsError } = await supabase
                .from("pets")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: true });

            if (petsError) throw petsError;

            // 각 반려동물의 미디어 조회
            const petsWithMedia: Pet[] = await Promise.all(
                (petsData || []).map(async (pet) => {
                    const { data: mediaData } = await supabase
                        .from("pet_media")
                        .select("*")
                        .eq("pet_id", pet.id)
                        .order("date", { ascending: false });

                    const photos: PetPhoto[] = (mediaData || []).map((m) => ({
                        id: m.id,
                        url: m.url,
                        storagePath: m.storage_path,
                        type: m.type as MediaType,
                        caption: m.caption || "",
                        date: m.date,
                        cropPosition: m.crop_position,
                        thumbnailUrl: m.thumbnail_url,
                    }));

                    return {
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
                        photos,
                        status: pet.status,
                        memorialDate: pet.memorial_date,
                        isPrimary: pet.is_primary,
                        createdAt: pet.created_at,
                        // AI 펫톡 개인화를 위한 추가 필드
                        adoptedDate: pet.adopted_date || undefined,
                        howWeMet: pet.how_we_met || undefined,
                        nicknames: pet.nicknames || undefined,
                        specialHabits: pet.special_habits || undefined,
                        favoriteFood: pet.favorite_food || undefined,
                        favoriteActivity: pet.favorite_activity || undefined,
                        favoritePlace: pet.favorite_place || undefined,
                        togetherPeriod: pet.together_period || undefined,
                        memorableMemory: pet.memorable_memory || undefined,
                    };
                })
            );

            setPets(petsWithMedia);

            // 선택된 펫 설정
            const savedSelectedId = localStorage.getItem(SELECTED_PET_KEY);
            if (
                savedSelectedId &&
                petsWithMedia.some((p) => p.id === savedSelectedId)
            ) {
                setSelectedPetId(savedSelectedId);
            } else if (petsWithMedia.length > 0) {
                setSelectedPetId(petsWithMedia[0].id);
            }
        } catch (error) {
            // Supabase 로드 실패 (무시 - 빈 상태로 초기화됨)
            // Supabase 로드 실패 시 빈 상태로 초기화
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
            localStorage.setItem(SELECTED_PET_KEY, selectedPetId);
        }
    }, [selectedPetId, isLoading]);

    const selectedPet = pets.find((p) => p.id === selectedPetId);

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
                            is_primary: pets.length === 0,
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
                    return "";
                }

                const newPet: Pet = {
                    id: data.id,
                    ...petData,
                    photos: [],
                    isPrimary: pets.length === 0,
                    createdAt: data.created_at,
                };

                setPets((prev) => [...prev, newPet]);
                setSelectedPetId(data.id);
                return data.id;
            } catch {
                return "";
            }
        },
        [user, pets.length]
    );

    const updatePet = useCallback(
        async (id: string, data: Partial<Pet>) => {
            // Supabase 업데이트 시도 (실패해도 로컬 상태는 업데이트)
            if (user) {
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

                    await supabase.from("pets").update(updateData).eq("id", id);
                } catch {
                    // Supabase 업데이트 실패 (무시 - 로컬 상태는 업데이트됨)
                }
            }

            setPets((prev) =>
                prev.map((pet) => (pet.id === id ? { ...pet, ...data } : pet))
            );
        },
        [user]
    );

    const deletePet = useCallback(
        async (id: string) => {
            if (user) {
                try {
                    // Storage에서 파일들 삭제 시도
                    const pet = pets.find((p) => p.id === id);
                    if (pet) {
                        for (const photo of pet.photos) {
                            if (photo.storagePath) {
                                await deleteMedia(photo.storagePath);
                            }
                        }
                    }

                    await supabase.from("pets").delete().eq("id", id);
                } catch {
                    // Supabase 삭제 실패 (무시)
                }
            }

            setPets((prev) => {
                const filtered = prev.filter((pet) => pet.id !== id);

                if (selectedPetId === id) {
                    const newSelected =
                        filtered.length > 0 ? filtered[0].id : null;
                    setSelectedPetId(newSelected);
                }

                if (filtered.length > 0 && !filtered.some((p) => p.isPrimary)) {
                    filtered[0].isPrimary = true;
                }

                return filtered;
            });
        },
        [user, pets, selectedPetId]
    );

    const selectPet = useCallback((id: string) => {
        setSelectedPetId(id);
    }, []);

    // ===== Media CRUD =====
    const addMedia = useCallback(
        async (
            petId: string,
            files: File[],
            captions: string[],
            dates: string[],
            onProgress?: (current: number, total: number) => void
        ): Promise<PetPhoto[]> => {
            // 비로그인 시 업로드 불가
            if (!user) {
                return [];
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
                    // 업로드 실패 (무시 - 다음 파일 계속)
                }
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
            }

            return newPhotos;
        },
        [user]
    );

    const updatePhoto = useCallback(
        async (petId: string, photoId: string, data: Partial<PetPhoto>) => {
            if (user) {
                const updateData: Record<string, unknown> = {};
                if (data.caption !== undefined) updateData.caption = data.caption;
                if (data.date !== undefined) updateData.date = data.date;
                if (data.cropPosition !== undefined)
                    updateData.crop_position = data.cropPosition;

                await supabase
                    .from("pet_media")
                    .update(updateData)
                    .eq("id", photoId);
            }

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
        },
        [user]
    );

    const deletePhoto = useCallback(
        async (petId: string, photoId: string) => {
            const pet = pets.find((p) => p.id === petId);
            const photo = pet?.photos.find((p) => p.id === photoId);

            if (user && photo?.storagePath) {
                // Storage에서 파일 삭제
                await deleteMedia(photo.storagePath);
                // DB에서 레코드 삭제
                await supabase.from("pet_media").delete().eq("id", photoId);
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
        [user, pets]
    );

    const deletePhotos = useCallback(
        async (petId: string, photoIds: string[]) => {
            const pet = pets.find((p) => p.id === petId);

            if (user && pet) {
                // Storage에서 파일들 삭제
                for (const photoId of photoIds) {
                    const photo = pet.photos.find((p) => p.id === photoId);
                    if (photo?.storagePath) {
                        await deleteMedia(photo.storagePath);
                    }
                }
                // DB에서 레코드들 삭제
                await supabase.from("pet_media").delete().in("id", photoIds);
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
        [user, pets]
    );

    // ===== Timeline CRUD =====
    const fetchTimelineData = useCallback(
        async (petId: string) => {
            if (!user) {
                // localStorage에서는 타임라인 미지원 (추후 추가 가능)
                setTimeline([]);
                return;
            }

            const { data, error } = await supabase
                .from("timeline_entries")
                .select("*")
                .eq("pet_id", petId)
                .order("date", { ascending: false });

            if (!error && data) {
                setTimeline(
                    data.map((entry) => ({
                        id: entry.id,
                        petId: entry.pet_id,
                        date: entry.date,
                        title: entry.title,
                        content: entry.content || "",
                        mood: entry.mood,
                        mediaIds: entry.media_ids,
                        createdAt: entry.created_at,
                    }))
                );
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
                return newEntry;
            } catch {
                return null;
            }
        },
        [user]
    );

    const updateTimelineEntry = useCallback(
        async (entryId: string, data: Partial<TimelineEntry>) => {
            if (!user) return;

            const updateData: Record<string, unknown> = {};
            if (data.date !== undefined) updateData.date = data.date;
            if (data.title !== undefined) updateData.title = data.title;
            if (data.content !== undefined)
                updateData.content = data.content || null;
            if (data.mood !== undefined) updateData.mood = data.mood || null;
            if (data.mediaIds !== undefined)
                updateData.media_ids = data.mediaIds || null;

            await supabase
                .from("timeline_entries")
                .update(updateData)
                .eq("id", entryId);

            setTimeline((prev) =>
                prev.map((entry) =>
                    entry.id === entryId ? { ...entry, ...data } : entry
                )
            );
        },
        [user]
    );

    const deleteTimelineEntry = useCallback(
        async (entryId: string) => {
            if (!user) return;

            await supabase.from("timeline_entries").delete().eq("id", entryId);

            setTimeline((prev) => prev.filter((entry) => entry.id !== entryId));
        },
        [user]
    );

    // 유틸리티
    const getPetById = useCallback(
        (id: string) => {
            return pets.find((p) => p.id === id);
        },
        [pets]
    );

    return (
        <PetContext.Provider
            value={{
                pets,
                selectedPetId,
                selectedPet,
                timeline,
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
                fetchTimeline: fetchTimelineData,
                getPetById,
                isLoading,
                isSyncing,
            }}
        >
            {children}
        </PetContext.Provider>
    );
}

export function usePets() {
    const context = useContext(PetContext);
    if (context === undefined) {
        throw new Error("usePets must be used within a PetProvider");
    }
    return context;
}
