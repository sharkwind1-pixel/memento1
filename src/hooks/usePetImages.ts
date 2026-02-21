/**
 * usePetImages 훅
 * Dog/Cat API에서 반려동물 이미지를 가져오는 커스텀 훅
 *
 * 반환값:
 * - petImages: Record<string, string | null> - 추모용 (이름별 매핑)
 * - adoptionImages: string[] - 입양용 (배열)
 */

"use client";

import { useState, useEffect, useCallback } from "react";

// 반환 타입 명시
interface UsePetImagesReturn {
    petImages: Record<string, string | null>; // 추모용: { "초코": "url", "나비": "url" }
    adoptionImages: string[]; // 입양용: ["url1", "url2", ...]
    isLoading: boolean;
    error: string | null;
    fetchPetImage: (breed: string) => Promise<string | null>;
}

// 모듈 레벨 캐시 (앱 생명주기 동안 유지 - API 재호출 방지)
let cachedPetImages: Record<string, string | null> | null = null;
let cachedAdoptionImages: string[] | null = null;

export function usePetImages(): UsePetImagesReturn {
    const [petImages, setPetImages] = useState<Record<string, string | null>>(
        {}
    );
    const [adoptionImages, setAdoptionImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * 품종에 따라 적절한 API에서 이미지를 가져옵니다
     */
    const fetchPetImage = useCallback(
        async (breed: string): Promise<string | null> => {
            try {
                // 고양이 품종인 경우 Cat API 사용
                if (
                    breed.includes("페르시안") ||
                    breed.includes("러시안블루") ||
                    breed.includes("스코티시폴드") ||
                    breed.includes("고양이") ||
                    breed.includes("냥이")
                ) {
                    const response = await fetch(
                        "https://api.thecatapi.com/v1/images/search"
                    );
                    if (!response.ok) return null;
                    const data = await response.json();
                    return data[0]?.url || null;
                }

                // 기본적으로 강아지 이미지 반환
                const response = await fetch(
                    "https://dog.ceo/api/breeds/image/random"
                );
                if (!response.ok) return null;
                const data = await response.json();
                return data.message || null;
            } catch {
                return null;
            }
        },
        []
    );

    useEffect(() => {
        const loadImages = async () => {
            // 캐시가 있으면 API 호출 없이 즉시 반환
            if (cachedPetImages && cachedAdoptionImages) {
                setPetImages(cachedPetImages);
                setAdoptionImages(cachedAdoptionImages);
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                // 1. 입양용 강아지 이미지 6개 가져오기 (배열로 저장)
                const dogResponse = await fetch(
                    "https://dog.ceo/api/breeds/image/random/6"
                );
                if (!dogResponse.ok) throw new Error("이미지 API 응답 실패");
                const dogData = await dogResponse.json();

                if (
                    dogData.status === "success" &&
                    Array.isArray(dogData.message)
                ) {
                    setAdoptionImages(dogData.message);
                }

                // 2. 추모용 이미지 (이름별로 매핑) - 병렬 로딩
                const memorialNames = [
                    "초코",
                    "나비",
                    "뭉치",
                    "보리",
                    "콩이",
                    "달이",
                ];

                const results = await Promise.all(
                    memorialNames.map(async () => {
                        try {
                            const res = await fetch(
                                "https://dog.ceo/api/breeds/image/random"
                            );
                            if (!res.ok) return null;
                            const data = await res.json();
                            return data.status === "success" ? data.message : null;
                        } catch {
                            return null;
                        }
                    })
                );

                const memorialImages: Record<string, string | null> = {};
                memorialNames.forEach((name, i) => {
                    memorialImages[name] = results[i];
                });

                setPetImages(memorialImages);

                // 캐시에 저장 (다음 마운트 시 API 재호출 방지)
                cachedPetImages = memorialImages;
                cachedAdoptionImages = dogData.message;
            } catch {
                setError("이미지를 불러오는데 실패했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        loadImages();
    }, []);

    return { petImages, adoptionImages, isLoading, error, fetchPetImage };
}

export default usePetImages;
