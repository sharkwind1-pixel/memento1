/**
 * ArchivedPetsSection.tsx
 * 구독 해지 후 보관 중인 반려동물 카드 섹션
 *
 * 새 설계 (2026-04-11):
 * - archived 상태 유저가 볼 수 있는 "보관함" 섹션
 * - 잠금 카드로 표시, 재구독 유도 CTA
 * - data_reset_at 이후 영구 삭제되는 데이터
 */

"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Lock, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useSubscriptionPhase } from "@/hooks/useSubscriptionPhase";

interface ArchivedPet {
    id: string;
    name: string;
    type: string | null;
    breed: string | null;
    profile_image: string | null;
    status: string | null;
    archived_at: string;
}

export default function ArchivedPetsSection() {
    const { user } = useAuth();
    const phaseInfo = useSubscriptionPhase();
    const [archivedPets, setArchivedPets] = useState<ArchivedPet[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        (async () => {
            const { data } = await supabase
                .from("pets")
                .select("id, name, type, breed, profile_image, status, archived_at")
                .eq("user_id", user.id)
                .not("archived_at", "is", null)
                .order("archived_at", { ascending: false });

            if (!cancelled) {
                setArchivedPets(data || []);
                setLoaded(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, phaseInfo.phase]);

    // 잠금 카드가 필요한 경우만 렌더
    if (!loaded || archivedPets.length === 0) return null;

    const daysLeft = phaseInfo.daysUntilPurge ?? null;

    return (
        <section className="mt-8 p-5 rounded-2xl bg-memento-50 dark:bg-memento-900/20 border border-memento-200 dark:border-memento-800">
            <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 p-2 rounded-lg bg-memento-100 dark:bg-memento-900/40">
                    <Lock className="w-5 h-5 text-memento-600 dark:text-memento-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-memento-700 dark:text-memento-300">
                        보관 중인 아이들 ({archivedPets.length}마리)
                    </h3>
                    <p className="text-xs text-memento-600/80 dark:text-memento-400/80 mt-0.5">
                        {daysLeft !== null && daysLeft > 0
                            ? `${daysLeft}일 후 영구 삭제됩니다. 재구독하면 모두 복구돼요.`
                            : "재구독하면 언제든 다시 만날 수 있어요."}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {archivedPets.map((pet) => (
                    <LockedPetCard key={pet.id} pet={pet} />
                ))}
            </div>
        </section>
    );
}

function LockedPetCard({ pet }: { pet: ArchivedPet }) {
    const isMemorial = pet.status === "memorial";
    return (
        <div className="relative rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* 잠금 오버레이 */}
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-black/60 flex items-end justify-center pb-3 pointer-events-none">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 text-memento-700 text-[10px] font-medium shadow-sm">
                    <Lock className="w-3 h-3" />
                    보관 중
                </div>
            </div>

            {/* 프로필 이미지 (grayscale) */}
            <div className="aspect-square relative bg-gray-100 dark:bg-gray-700 grayscale opacity-75">
                {pet.profile_image ? (
                    <Image
                        src={pet.profile_image}
                        alt={pet.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Heart className="w-8 h-8 text-gray-400" />
                    </div>
                )}
            </div>

            {/* 이름 */}
            <div className="p-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {pet.name}
                </p>
                {pet.breed && (
                    <p className="text-[10px] text-gray-400 truncate">
                        {pet.breed}
                    </p>
                )}
                {isMemorial && (
                    <p className="text-[10px] text-memorial-500 mt-0.5">
                        무지개다리
                    </p>
                )}
            </div>
        </div>
    );
}
