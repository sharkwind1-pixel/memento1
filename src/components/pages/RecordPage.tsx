/**
 * RecordPage.tsx
 * 우리의 기록 - 마이페이지
 * 사진 1:1 비율, 스텝 형식 등록, CRUD 완성
 * - 서브컴포넌트 분리: PetProfileCard, PetPhotoAlbum, TimelineSection,
 *   ProfileTab, PetCardGrid, RecordPageGuest
 */

"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { usePets, Pet, PetPhoto } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Plus,
    PawPrint,
    Home,
    User,
} from "lucide-react";
import MiniHomepyTab from "@/components/features/minihompy/MiniHomepyTab";

import { TabType } from "@/types";
import { FREE_LIMITS } from "@/config/constants";

import MemorialSwitchModal from "@/components/modals/MemorialSwitchModal";
import MediaUploadModal from "@/components/features/record/MediaUploadModal";
import PetFormModal from "@/components/features/record/PetFormModal";
import DeleteConfirmModal from "@/components/features/record/DeleteConfirmModal";
import PremiumModal from "@/components/modals/PremiumModal";
import PhotoViewer from "@/components/features/record/PhotoViewer";
import PetProfileCard from "@/components/features/record/PetProfileCard";
import PetPhotoAlbum from "@/components/features/record/PetPhotoAlbum";
import RemindersSection from "@/components/features/reminders/RemindersSection";
import MemoryAlbumsSection from "@/components/features/record/MemoryAlbumsSection";
import HealingJourneySection from "@/components/features/record/HealingJourneySection";
import TimelineSection from "@/components/features/record/TimelineSection";
import ProfileTab from "@/components/features/record/ProfileTab";
import PetCardGrid from "@/components/features/record/PetCardGrid";
import RecordPageGuest from "@/components/features/record/RecordPageGuest";
import VideoGenerationSection from "@/components/features/video/VideoGenerationSection";

interface RecordPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

function RecordPage({ setSelectedTab }: RecordPageProps) {
    const { user, signOut, updateProfile, isPremiumUser, isAdminUser, points, userPetType } = useAuth();
    const {
        pets,
        selectedPetId,
        selectedPet,
        addPet,
        updatePet,
        deletePet,
        selectPet,
        addMedia,
        deletePhoto,
        deletePhotos,
        isLoading: petsLoading,
    } = usePets();

    const [isPetModalOpen, setIsPetModalOpen] = useState(false);
    const [editingPet, setEditingPet] = useState<Pet | null>(null);
    const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState<PetPhoto | null>(null);
    const [petToDelete, setPetToDelete] = useState<Pet | null>(null);

    // 마이페이지 상태 — localStorage로 새로고침 시 복원
    const [activeTab, setActiveTab] = useState<"pets" | "profile" | "minihompy">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("memento-record-tab");
            if (saved === "profile" || saved === "minihompy") return saved;
        }
        return "pets";
    });
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nickname, setNickname] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // 프리미엄 모달 상태
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const [premiumFeature, setPremiumFeature] = useState<"pet-limit" | "photo-limit">("pet-limit");

    // activeTab 변경 시 localStorage에 저장
    useEffect(() => {
        localStorage.setItem("memento-record-tab", activeTab);
    }, [activeTab]);

    // 추모 전환 모달
    const [isMemorialModalOpen, setIsMemorialModalOpen] = useState(false);

    // 추억 앨범 딥링크 (푸시 알림에서 album 파라미터)
    const [initialAlbumId, setInitialAlbumId] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const albumId = params.get("album");
        if (albumId) {
            setInitialAlbumId(albumId);
        }
    }, []);

    const isPremium = isPremiumUser;

    // 사용자 닉네임 초기화
    useEffect(() => {
        if (user?.user_metadata?.nickname) {
            setNickname(user.user_metadata.nickname);
        } else if (user?.email) {
            setNickname(user.email.split("@")[0]);
        }
    }, [user]);

    // 닉네임 저장
    const handleSaveNickname = async () => {
        if (!nickname.trim()) {
            toast.error("닉네임을 입력해주세요");
            return;
        }
        setIsSavingProfile(true);
        const { error } = await updateProfile({ nickname: nickname.trim() });
        setIsSavingProfile(false);
        if (error) {
            toast.error("닉네임을 바꾸지 못했어요");
        } else {
            toast.success("닉네임이 바뀌었어요!");
            setIsEditingNickname(false);
        }
    };

    // 로그아웃
    const handleSignOut = async () => {
        toast("정말 로그아웃할까요?", {
            action: {
                label: "로그아웃",
                onClick: async () => {
                    await signOut();
                    toast.success("로그아웃했어요");
                },
            },
            cancel: {
                label: "취소",
                onClick: () => {},
            },
        });
    };

    // 추억 전환 처리
    const handleMemorialSwitch = async (memorialDate: string, farewellMessage?: string) => {
        if (!selectedPet) return;
        try {
            await updatePet(selectedPet.id, {
                status: "memorial",
                memorialDate: memorialDate,
            });

            if (farewellMessage && user) {
                await supabase.from("timeline_entries").insert({
                    pet_id: selectedPet.id,
                    user_id: user.id,
                    date: memorialDate,
                    title: "작별 인사",
                    content: farewellMessage,
                    mood: "sad",
                });
            }

            toast.success("무지개다리를 건넜어요. 소중한 기억을 간직합니다.");
        } catch {
            toast.error("상태 전환에 실패했어요. 다시 시도해주세요.");
        }
    };

    // 일상 모드 복구
    const handleRecoverToActive = async (petId: string) => {
        await updatePet(petId, {
            status: "active",
            memorialDate: undefined,
        });
    };

    // 새 반려동물 추가 (무료 회원 제한 체크)
    const handleAddNewPet = () => {
        if (!isPremium && pets.length >= FREE_LIMITS.PETS) {
            setPremiumFeature("pet-limit");
            setIsPremiumModalOpen(true);
            return;
        }
        setEditingPet(null);
        setIsPetModalOpen(true);
    };

    const handleSavePet = async (
        petData: Omit<Pet, "id" | "createdAt" | "photos">,
    ) => {
        try {
            if (editingPet) {
                await updatePet(editingPet.id, petData);
                toast.success(`${petData.name} 정보를 바꿨어요`);
            } else {
                await addPet(petData);
                toast.success(`${petData.name}을(를) 등록했어요!`);
            }
            setEditingPet(null);
            setIsPetModalOpen(false);
        } catch {
            toast.error("저장하지 못했어요");
        }
    };

    const handleMediaUpload = async (
        files: File[],
        captions: string[],
        _cropPositions: { x: number; y: number; scale: number }[],
    ) => {
        if (!selectedPet) return;
        try {
            await addMedia(
                selectedPet.id,
                files,
                captions,
                files.map(() => new Date().toISOString().split("T")[0]),
            );
            toast.success("사진을 올렸어요!");
        } catch {
            toast.error("사진을 올리지 못했어요");
        }
    };

    // 비로그인
    if (!user) {
        return <RecordPageGuest />;
    }

    return (
        <div
            className="min-h-screen relative overflow-hidden pb-24"
            style={{ contain: 'layout style', transform: 'translateZ(0)' }}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-memento-50 via-memento-75 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
            <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
                {/* 페이지 헤더 */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">
                        우리의 기록
                    </h1>
                </div>

                {/* 탭 네비게이션 */}
                <div className="flex items-center gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab("pets")}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all text-sm sm:text-base ${
                            activeTab === "pets"
                                ? "bg-memento-500 text-white shadow-lg"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                        <PawPrint className="w-4 h-4" />
                        <span className="hidden sm:inline">반려동물</span>
                        <span className="sm:hidden">반려</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all text-sm sm:text-base ${
                            activeTab === "profile"
                                ? "bg-memento-500 text-white shadow-lg"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">내 정보</span>
                        <span className="sm:hidden">정보</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("minihompy")}
                        data-tutorial-id="minihompy-tab"
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all text-sm sm:text-base ${
                            activeTab === "minihompy"
                                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                        <Home className="w-4 h-4" />
                        <span className="hidden sm:inline">미니홈피</span>
                        <span className="sm:hidden">홈피</span>
                    </button>
                    <div className="flex-1" />
                    {activeTab === "pets" && (
                        <Button
                            onClick={handleAddNewPet}
                            size="sm"
                            className="bg-memento-500 hover:bg-memento-600 text-sm"
                            data-tutorial-id="add-pet-button"
                        >
                            <Plus className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">새 반려동물</span>
                        </Button>
                    )}
                </div>

                {/* 내 정보 탭 */}
                {activeTab === "profile" && (
                    <ProfileTab
                        user={user}
                        pets={pets}
                        points={points}
                        userPetType={userPetType}
                        isAdminUser={isAdminUser}
                        nickname={nickname}
                        isEditingNickname={isEditingNickname}
                        isSavingProfile={isSavingProfile}
                        onNicknameChange={setNickname}
                        onStartEditNickname={() => setIsEditingNickname(true)}
                        onCancelEditNickname={() => {
                            setIsEditingNickname(false);
                            setNickname(user?.user_metadata?.nickname || user?.email?.split("@")[0] || "");
                        }}
                        onSaveNickname={handleSaveNickname}
                        onSignOut={handleSignOut}
                    />
                )}

                {/* 미니홈피 탭 */}
                {activeTab === "minihompy" && (
                    <MiniHomepyTab />
                )}

                {/* 반려동물 탭 */}
                {activeTab === "pets" && (
                    <>
                        {petsLoading ? (
                            <div className="space-y-6 animate-pulse">
                                <div className="mb-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {Array.from({ length: 2 }).map((_, i) => (
                                            <div
                                                key={`skeleton-pet-${i}`}
                                                className="aspect-square rounded-2xl bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 overflow-hidden relative"
                                            >
                                                <div className="absolute inset-x-0 bottom-0 p-2 pt-6">
                                                    <div className="h-4 bg-gray-300/60 dark:bg-gray-500/60 rounded w-2/3 mx-auto mb-1" />
                                                    <div className="h-3 bg-gray-300/40 dark:bg-gray-500/40 rounded w-1/2 mx-auto" />
                                                </div>
                                            </div>
                                        ))}
                                        <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700" />
                                    </div>
                                </div>
                                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                                    <CardContent className="py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                                                <div className="h-4 bg-gray-100 dark:bg-gray-700/70 rounded w-48" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : pets.length === 0 ? (
                            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-memento-100 to-memento-200 flex items-center justify-center mb-4">
                                        <PawPrint className="w-10 h-10 text-memento-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                                        아직 등록된 반려동물이 없어요
                                    </h3>
                                    <p className="text-gray-500 text-center mb-6">
                                        소중한 반려동물을 등록하고
                                        <br />
                                        함께한 추억을 기록해보세요
                                    </p>
                                    <Button
                                        onClick={handleAddNewPet}
                                        className="bg-gradient-to-r from-memento-500 to-memento-400"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        반려동물 등록하기
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <PetCardGrid
                                    pets={pets}
                                    selectedPetId={selectedPetId}
                                    onSelectPet={selectPet}
                                    onEditPet={(pet) => {
                                        setEditingPet(pet);
                                        setIsPetModalOpen(true);
                                    }}
                                    onDeletePet={setPetToDelete}
                                    onAddNewPet={handleAddNewPet}
                                />

                                {selectedPet && (
                                    <>
                                        <PetProfileCard
                                            pet={selectedPet}
                                            onMemorialClick={() => setIsMemorialModalOpen(true)}
                                            onRecoverToActive={handleRecoverToActive}
                                        />

                                        {selectedPet.status === "memorial" && (
                                            <>
                                                <div className="mt-6">
                                                    <MemoryAlbumsSection
                                                        petId={selectedPet.id}
                                                        petName={selectedPet.name}
                                                        initialAlbumId={initialAlbumId}
                                                    />
                                                </div>
                                                <div className="mt-6">
                                                    <HealingJourneySection
                                                        petId={selectedPet.id}
                                                        petName={selectedPet.name}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <PetPhotoAlbum
                                            selectedPet={selectedPet}
                                            onPhotoClick={(photo) => setViewingPhoto(photo)}
                                            onUploadClick={() => setIsPhotoUploadOpen(true)}
                                            onDeletePhoto={deletePhoto}
                                            onDeletePhotos={deletePhotos}
                                        />

                                        {selectedPet.photos.length > 0 && (
                                            <div className="mt-6">
                                                <VideoGenerationSection
                                                    pet={selectedPet}
                                                    isPremium={isPremiumUser}
                                                />
                                            </div>
                                        )}

                                        {selectedPet.status !== "memorial" && (
                                            <div className="mt-6">
                                                <RemindersSection
                                                    petId={selectedPet.id}
                                                    petName={selectedPet.name}
                                                />
                                            </div>
                                        )}

                                        <div data-tutorial-id="timeline-section">
                                            <TimelineSection
                                                petId={selectedPet.id}
                                                petName={selectedPet.name}
                                            />
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            <PetFormModal
                isOpen={isPetModalOpen}
                onClose={() => {
                    setIsPetModalOpen(false);
                    setEditingPet(null);
                }}
                pet={editingPet}
                onSave={handleSavePet}
            />
            <MediaUploadModal
                isOpen={isPhotoUploadOpen}
                onClose={() => setIsPhotoUploadOpen(false)}
                onUpload={handleMediaUpload}
            />
            {viewingPhoto && selectedPet && (
                <PhotoViewer
                    photo={viewingPhoto}
                    petName={selectedPet.name}
                    onClose={() => setViewingPhoto(null)}
                    onDelete={async () => {
                        await deletePhoto(selectedPet.id, viewingPhoto.id);
                        setViewingPhoto(null);
                    }}
                />
            )}
            <DeleteConfirmModal
                isOpen={!!petToDelete}
                onClose={() => setPetToDelete(null)}
                onConfirm={async () => {
                    if (petToDelete) {
                        await deletePet(petToDelete.id);
                        setPetToDelete(null);
                    }
                }}
                title="반려동물 삭제"
                message={`"${petToDelete?.name}"의 모든 기록이 삭제됩니다.`}
            />

            {selectedPet && (
                <MemorialSwitchModal
                    pet={selectedPet}
                    isOpen={isMemorialModalOpen}
                    onClose={() => setIsMemorialModalOpen(false)}
                    onConfirm={handleMemorialSwitch}
                />
            )}

            <PremiumModal
                isOpen={isPremiumModalOpen}
                onClose={() => setIsPremiumModalOpen(false)}
                feature={premiumFeature}
            />
        </div>
    );
}

export default React.memo(RecordPage);
