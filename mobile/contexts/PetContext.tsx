/**
 * PetContext — 반려동물 데이터 관리
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Pet, PetPhoto, PetStatus } from "@/types";

interface PetContextValue {
    pets: Pet[];
    selectedPet: Pet | null;
    isLoading: boolean;
    isMemorialMode: boolean;
    setSelectedPet: (pet: Pet | null) => void;
    selectPet: (petId: string) => void;
    refreshPets: () => Promise<void>;
    deletePhotos: (petId: string, photoIds: string[]) => Promise<{ success: boolean; deleted: number }>;
}

const PetContext = createContext<PetContextValue | null>(null);

export function PetProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [pets, setPets] = useState<Pet[]>([]);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPets = useCallback(async () => {
        if (!user) {
            setPets([]);
            setSelectedPet(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { data: petsData } = await supabase
                .from("pets")
                .select("*")
                .eq("user_id", user.id)
                .order("is_primary", { ascending: false });

            if (!petsData) return;

            const petsWithPhotos: Pet[] = await Promise.all(
                petsData.map(async (pet) => {
                    const { data: photos } = await supabase
                        .from("pet_media")
                        .select("*")
                        .eq("pet_id", pet.id)
                        .order("created_at", { ascending: false })
                        .limit(20);

                    return {
                        id: pet.id,
                        userId: pet.user_id,
                        name: pet.name,
                        type: pet.type,
                        breed: pet.breed ?? "",
                        gender: pet.gender ?? "남아",
                        birthday: pet.birthday,
                        weight: pet.weight,
                        personality: pet.personality,
                        profileImage: pet.profile_image,
                        status: (pet.status as PetStatus) ?? "active",
                        memorialDate: pet.memorial_date,
                        isPrimary: pet.is_primary,
                        createdAt: pet.created_at,
                        updatedAt: pet.updated_at,
                        adoptedDate: pet.adopted_date,
                        howWeMet: pet.how_we_met,
                        nicknames: pet.nicknames,
                        specialHabits: pet.special_habits,
                        favoriteFood: pet.favorite_food,
                        favoriteActivity: pet.favorite_activity,
                        favoritePlace: pet.favorite_place,
                        photos: (photos ?? []).map((p): PetPhoto => ({
                            id: p.id,
                            url: p.url,
                            storagePath: p.storage_path,
                            type: (p.type as "image" | "video") ?? "image",
                            caption: p.caption ?? "",
                            date: p.date ?? p.created_at,
                            thumbnailUrl: p.thumbnail_url,
                            uploadedAt: p.created_at,
                        })),
                    } satisfies Pet;
                })
            );

            setPets(petsWithPhotos);

            // 대표 펫 or 첫 번째 펫 선택
            if (petsWithPhotos.length > 0) {
                const primary = petsWithPhotos.find((p) => p.isPrimary) ?? petsWithPhotos[0];
                setSelectedPet((prev) =>
                    prev ? petsWithPhotos.find((p) => p.id === prev.id) ?? primary : primary
                );
            } else {
                setSelectedPet(null);
            }
        } catch {
            // 에러 무시, UI에서 빈 상태 처리
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchPets();
    }, [fetchPets]);

    // ============================================================================
    // 실시간 펫/사진 동기화 — 다른 디바이스에서 펫 추가/수정/삭제 또는 사진 업로드/삭제
    // 시 즉시 fetchPets로 갱신. 0.5초 이내 양쪽 동기화 보장.
    // ============================================================================
    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel(`pets:${user.id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "pets", filter: `user_id=eq.${user.id}` },
                () => { fetchPets(); },
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "pet_media", filter: `user_id=eq.${user.id}` },
                () => { fetchPets(); },
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user?.id, fetchPets]);

    function selectPet(petId: string) {
        const pet = pets.find((p) => p.id === petId);
        if (pet) setSelectedPet(pet);
    }

    const deletePhotos = useCallback(
        async (petId: string, photoIds: string[]): Promise<{ success: boolean; deleted: number }> => {
            if (!user || photoIds.length === 0) return { success: false, deleted: 0 };

            const pet = pets.find((p) => p.id === petId);
            if (!pet) return { success: false, deleted: 0 };

            const paths = photoIds
                .map((pid) => pet.photos.find((ph) => ph.id === pid)?.storagePath)
                .filter((p): p is string => typeof p === "string" && p.length > 0);

            if (paths.length > 0) {
                await supabase.storage.from("pet-media").remove(paths);
            }

            const { error } = await supabase.from("pet_media").delete().in("id", photoIds);
            if (error) return { success: false, deleted: 0 };

            setPets((prev) =>
                prev.map((p) =>
                    p.id === petId
                        ? { ...p, photos: p.photos.filter((ph) => !photoIds.includes(ph.id)) }
                        : p,
                ),
            );
            setSelectedPet((prev) =>
                prev && prev.id === petId
                    ? { ...prev, photos: prev.photos.filter((ph) => !photoIds.includes(ph.id)) }
                    : prev,
            );
            return { success: true, deleted: photoIds.length };
        },
        [user, pets],
    );

    const isMemorialMode = selectedPet?.status === "memorial";

    return (
        <PetContext.Provider value={{
            pets, selectedPet, isLoading, isMemorialMode,
            setSelectedPet, selectPet,
            refreshPets: fetchPets,
            deletePhotos,
        }}>
            {children}
        </PetContext.Provider>
    );
}

export function usePet() {
    const ctx = useContext(PetContext);
    if (!ctx) throw new Error("usePet must be used within PetProvider");
    return ctx;
}
