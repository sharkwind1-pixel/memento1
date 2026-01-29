/**
 * PetContext.tsx
 * 반려동물 데이터 전역 상태 관리
 * localStorage로 데이터 영속성 보장
 */

"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";

// 타입 정의
export interface PetPhoto {
    id: string;
    url: string;
    caption: string;
    date: string;
    cropPosition?: {
        x: number;
        y: number;
        scale: number;
    };
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
}

interface PetContextType {
    pets: Pet[];
    selectedPetId: string | null;
    selectedPet: Pet | undefined;

    // Pet CRUD
    addPet: (pet: Omit<Pet, "id" | "createdAt" | "photos">) => string;
    updatePet: (id: string, data: Partial<Pet>) => void;
    deletePet: (id: string) => void;
    selectPet: (id: string) => void;

    // Photo CRUD
    addPhotos: (petId: string, photos: Omit<PetPhoto, "id">[]) => void;
    updatePhoto: (
        petId: string,
        photoId: string,
        data: Partial<PetPhoto>,
    ) => void;
    deletePhoto: (petId: string, photoId: string) => void;

    // 유틸리티
    getPetById: (id: string) => Pet | undefined;
    isLoading: boolean;
}

const PetContext = createContext<PetContextType | undefined>(undefined);

const STORAGE_KEY = "memento-ani-pets";
const SELECTED_PET_KEY = "memento-ani-selected-pet";

export function PetProvider({ children }: { children: React.ReactNode }) {
    const [pets, setPets] = useState<Pet[]>([]);
    const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // localStorage에서 데이터 로드
    useEffect(() => {
        try {
            const savedPets = localStorage.getItem(STORAGE_KEY);
            const savedSelectedId = localStorage.getItem(SELECTED_PET_KEY);

            if (savedPets) {
                const parsed = JSON.parse(savedPets);
                setPets(parsed);

                // 저장된 선택 ID가 있고, 해당 펫이 존재하면 선택
                if (
                    savedSelectedId &&
                    parsed.some((p: Pet) => p.id === savedSelectedId)
                ) {
                    setSelectedPetId(savedSelectedId);
                } else if (parsed.length > 0) {
                    // 없으면 첫 번째 펫 선택
                    setSelectedPetId(parsed[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to load pets from localStorage:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // pets 변경시 localStorage에 저장
    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
            } catch (error) {
                console.error("Failed to save pets to localStorage:", error);
            }
        }
    }, [pets, isLoading]);

    // selectedPetId 변경시 localStorage에 저장
    useEffect(() => {
        if (!isLoading && selectedPetId) {
            try {
                localStorage.setItem(SELECTED_PET_KEY, selectedPetId);
            } catch (error) {
                console.error(
                    "Failed to save selected pet to localStorage:",
                    error,
                );
            }
        }
    }, [selectedPetId, isLoading]);

    const selectedPet = pets.find((p) => p.id === selectedPetId);

    // Pet CRUD
    const addPet = useCallback(
        (petData: Omit<Pet, "id" | "createdAt" | "photos">): string => {
            const newId = `pet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newPet: Pet = {
                ...petData,
                id: newId,
                photos: [],
                createdAt: new Date().toISOString(),
                isPrimary: pets.length === 0, // 첫 번째 펫이면 대표로 설정
            };

            setPets((prev) => [...prev, newPet]);
            setSelectedPetId(newId);
            return newId;
        },
        [pets.length],
    );

    const updatePet = useCallback((id: string, data: Partial<Pet>) => {
        setPets((prev) =>
            prev.map((pet) => (pet.id === id ? { ...pet, ...data } : pet)),
        );
    }, []);

    const deletePet = useCallback(
        (id: string) => {
            setPets((prev) => {
                const filtered = prev.filter((pet) => pet.id !== id);

                // 삭제된 펫이 선택된 펫이었다면 다른 펫 선택
                if (selectedPetId === id) {
                    const newSelected =
                        filtered.length > 0 ? filtered[0].id : null;
                    setSelectedPetId(newSelected);
                }

                // 삭제된 펫이 대표 펫이었다면 첫 번째 펫을 대표로 설정
                if (filtered.length > 0 && !filtered.some((p) => p.isPrimary)) {
                    filtered[0].isPrimary = true;
                }

                return filtered;
            });
        },
        [selectedPetId],
    );

    const selectPet = useCallback((id: string) => {
        setSelectedPetId(id);
    }, []);

    // Photo CRUD
    const addPhotos = useCallback(
        (petId: string, photos: Omit<PetPhoto, "id">[]) => {
            const newPhotos: PetPhoto[] = photos.map((photo, index) => ({
                ...photo,
                id: `photo-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            }));

            setPets((prev) =>
                prev.map((pet) =>
                    pet.id === petId
                        ? { ...pet, photos: [...newPhotos, ...pet.photos] }
                        : pet,
                ),
            );
        },
        [],
    );

    const updatePhoto = useCallback(
        (petId: string, photoId: string, data: Partial<PetPhoto>) => {
            setPets((prev) =>
                prev.map((pet) =>
                    pet.id === petId
                        ? {
                              ...pet,
                              photos: pet.photos.map((photo) =>
                                  photo.id === photoId
                                      ? { ...photo, ...data }
                                      : photo,
                              ),
                          }
                        : pet,
                ),
            );
        },
        [],
    );

    const deletePhoto = useCallback((petId: string, photoId: string) => {
        setPets((prev) =>
            prev.map((pet) =>
                pet.id === petId
                    ? {
                          ...pet,
                          photos: pet.photos.filter(
                              (photo) => photo.id !== photoId,
                          ),
                      }
                    : pet,
            ),
        );
    }, []);

    // 유틸리티
    const getPetById = useCallback(
        (id: string) => {
            return pets.find((p) => p.id === id);
        },
        [pets],
    );

    return (
        <PetContext.Provider
            value={{
                pets,
                selectedPetId,
                selectedPet,
                addPet,
                updatePet,
                deletePet,
                selectPet,
                addPhotos,
                updatePhoto,
                deletePhoto,
                getPetById,
                isLoading,
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
