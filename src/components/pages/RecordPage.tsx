/**
 * RecordPage.tsx
 * 우리의 기록 - 마이페이지
 * 사진 1:1 비율, 스텝 형식 등록, CRUD 완성
 * - Dynamic import로 모달 컴포넌트 lazy loading
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { usePets, Pet, PetPhoto } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Camera,
    Plus,
    Heart,
    Calendar,
    Grid3X3,
    List,
    Star,
    MoreHorizontal,
    Pencil,
    Trash2,
    Crown,
    LogIn,
    PawPrint,
    X,
    Check,
    Upload,
    Image as ImageIcon,
    Play,
    BookOpen,
    Smile,
    Frown,
    Meh,
    Thermometer,
    Clock,
    User,
    Settings,
    Mail,
    LogOut,
    Bell,
} from "lucide-react";
import { FullPageLoading } from "@/components/ui/PawLoading";

import { TabType } from "@/types";
import { FREE_LIMITS } from "@/config/constants";

// 즉각적인 반응을 위해 일반 import 사용 (Dynamic import 제거)
import MemorialSwitchModal from "@/components/modals/MemorialSwitchModal";
import RemindersSection from "@/components/features/reminders/RemindersSection";
import MediaUploadModal from "@/components/features/record/MediaUploadModal";
import PetFormModal from "@/components/features/record/PetFormModal";
import DeleteConfirmModal from "@/components/features/record/DeleteConfirmModal";
import PremiumModal from "@/components/modals/PremiumModal";
import PhotoViewer from "@/components/features/record/PhotoViewer";

interface RecordPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

// 나이 계산
function calculateAge(birthday: string): string {
    if (!birthday) return "";
    const birth = new Date(birthday);
    const now = new Date();
    const totalMonths =
        (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth());
    if (totalMonths < 12) return `${totalMonths}개월`;
    const remainingMonths = totalMonths % 12;
    return remainingMonths > 0
        ? `${Math.floor(totalMonths / 12)}살 ${remainingMonths}개월`
        : `${Math.floor(totalMonths / 12)}살`;
}

// 기분 아이콘 매핑
const moodIcons = {
    happy: { icon: Smile, color: "text-green-500", bg: "bg-green-100", label: "좋음" },
    normal: { icon: Meh, color: "text-blue-500", bg: "bg-blue-100", label: "보통" },
    sad: { icon: Frown, color: "text-amber-500", bg: "bg-amber-100", label: "우울" },
    sick: { icon: Thermometer, color: "text-red-500", bg: "bg-red-100", label: "아픔" },
};

// 타임라인 섹션 컴포넌트
function TimelineSection({ petId, petName }: { petId: string; petName: string }) {
    const { timeline, fetchTimeline, addTimelineEntry, updateTimelineEntry, deleteTimelineEntry } = usePets();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        title: "",
        content: "",
        mood: "normal" as "happy" | "normal" | "sad" | "sick",
    });

    // 펫 변경 시 타임라인 로드
    useEffect(() => {
        if (petId) {
            fetchTimeline(petId);
        }
    }, [petId, fetchTimeline]);

    // 새 일기 작성 모달 열기
    const openAddModal = () => {
        setEditingEntryId(null);
        setFormData({
            date: new Date().toISOString().split("T")[0],
            title: "",
            content: "",
            mood: "normal",
        });
        setIsModalOpen(true);
    };

    // 수정 모달 열기
    const openEditModal = (entry: typeof timeline[0]) => {
        setEditingEntryId(entry.id);
        setFormData({
            date: entry.date,
            title: entry.title,
            content: entry.content || "",
            mood: entry.mood || "normal",
        });
        setIsModalOpen(true);
    };

    // 저장 (추가 또는 수정)
    const handleSave = async () => {
        if (!formData.title.trim()) {
            toast.error("제목을 입력해주세요");
            return;
        }

        if (editingEntryId) {
            // 수정 모드
            await updateTimelineEntry(editingEntryId, {
                date: formData.date,
                title: formData.title,
                content: formData.content,
                mood: formData.mood,
            });
            toast.success("일기가 수정되었습니다");
        } else {
            // 추가 모드
            const result = await addTimelineEntry(petId, {
                date: formData.date,
                title: formData.title,
                content: formData.content,
                mood: formData.mood,
            });

            if (!result) {
                toast.error("일기 저장에 실패했습니다. 다시 시도해주세요.");
                return;
            }
            toast.success("일기가 저장되었습니다");
        }

        setIsModalOpen(false);
        setEditingEntryId(null);
    };

    const handleDelete = async (entryId: string) => {
        toast("이 일기를 삭제할까요?", {
            action: {
                label: "삭제",
                onClick: async () => {
                    await deleteTimelineEntry(entryId);
                    toast.success("일기가 삭제되었습니다");
                },
            },
            cancel: {
                label: "취소",
                onClick: () => {},
            },
        });
    };

    // 비로그인 시 안내
    if (!user) {
        return (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-6">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#05B2DC]" />
                        타임라인 일기
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">
                        <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p>로그인하시면 매일의 일상을 기록할 수 있어요</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-6">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#05B2DC]" />
                        타임라인 일기
                        <span className="text-sm font-normal text-gray-500">
                            {timeline.length}개
                        </span>
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={openAddModal}
                        className="bg-[#05B2DC] hover:bg-[#0891B2]"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        일기 쓰기
                    </Button>
                </CardHeader>
                <CardContent>
                    {timeline.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 rounded-full bg-[#E0F7FF] flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="w-8 h-8 text-[#05B2DC]" />
                            </div>
                            <h3 className="font-medium text-gray-700 mb-2">
                                아직 기록된 일기가 없어요
                            </h3>
                            <p className="text-sm text-gray-400 mb-4">
                                오늘 하루를 기록해보세요
                            </p>
                            <Button
                                onClick={openAddModal}
                                variant="outline"
                                className="border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF]"
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                첫 일기 쓰기
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {timeline.map((entry) => {
                                const moodInfo = moodIcons[entry.mood || "normal"];
                                const MoodIcon = moodInfo.icon;

                                return (
                                    <div
                                        key={entry.id}
                                        className="relative pl-6 pb-4 border-l-2 border-[#05B2DC]/30 last:pb-0"
                                    >
                                        {/* 타임라인 dot */}
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#05B2DC] border-2 border-white" />

                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 group">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500">
                                                        {entry.date}
                                                    </span>
                                                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${moodInfo.bg} ${moodInfo.color}`}>
                                                        <MoodIcon className="w-3 h-3" />
                                                        {moodInfo.label}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEditModal(entry)}
                                                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-[#05B2DC] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    >
                                                        <Pencil className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(entry.id)}
                                                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <h4 className="font-medium text-gray-800 dark:text-white mb-1">
                                                {entry.title}
                                            </h4>
                                            {entry.content && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                                    {entry.content}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 일기 작성/수정 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-[#05B2DC]" />
                                {editingEntryId ? "일기 수정" : `${petName}의 일기`}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsModalOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>날짜</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, date: e.target.value }))
                                    }
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>오늘의 기분</Label>
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                    {(Object.entries(moodIcons) as [keyof typeof moodIcons, typeof moodIcons[keyof typeof moodIcons]][]).map(
                                        ([mood, info]) => {
                                            const Icon = info.icon;
                                            return (
                                                <button
                                                    key={mood}
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData((prev) => ({ ...prev, mood }))
                                                    }
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                                                        formData.mood === mood
                                                            ? `${info.bg} ring-2 ring-offset-2 ring-[#05B2DC]`
                                                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700"
                                                    }`}
                                                >
                                                    <Icon className={`w-6 h-6 ${info.color}`} />
                                                    <span className="text-xs">{info.label}</span>
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label>제목 *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                                    }
                                    placeholder="오늘의 한 줄"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>내용</Label>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, content: e.target.value }))
                                    }
                                    placeholder="오늘 있었던 일을 기록해보세요..."
                                    rows={4}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1"
                            >
                                <X className="w-4 h-4 mr-2" />
                                취소
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                {editingEntryId ? "수정" : "저장"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// 메인
export default function RecordPage({ setSelectedTab }: RecordPageProps) {
    const { user, loading: authLoading, signOut, updateProfile } = useAuth();
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

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [isPetModalOpen, setIsPetModalOpen] = useState(false);
    const [editingPet, setEditingPet] = useState<Pet | null>(null);
    const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState<PetPhoto | null>(null);
    const [petToDelete, setPetToDelete] = useState<Pet | null>(null);

    // 마이페이지 상태
    const [activeTab, setActiveTab] = useState<"pets" | "profile">("pets");
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nickname, setNickname] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // 프리미엄 모달 상태
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const [premiumFeature, setPremiumFeature] = useState<"pet-limit" | "photo-limit">("pet-limit");

    // 무료/프리미엄 회원 제한
    const isPremium = false; // TODO: 실제 프리미엄 여부 확인 로직 추가

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
            toast.error("닉네임 변경에 실패했습니다");
        } else {
            toast.success("닉네임이 변경되었습니다");
            setIsEditingNickname(false);
        }
    };

    // 로그아웃
    const handleSignOut = async () => {
        toast("로그아웃 하시겠습니까?", {
            action: {
                label: "로그아웃",
                onClick: async () => {
                    await signOut();
                    toast.success("로그아웃 되었습니다");
                },
            },
            cancel: {
                label: "취소",
                onClick: () => {},
            },
        });
    };
    const [showPetMenu, setShowPetMenu] = useState<string | null>(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
    const [isMemorialModalOpen, setIsMemorialModalOpen] = useState(false);

    // 리마인더 섹션 ref (스크롤용)
    const remindersSectionRef = useRef<HTMLDivElement>(null);

    const scrollToReminders = () => {
        remindersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // 분기점 전환 처리
    const handleMemorialSwitch = (memorialDate: string) => {
        if (!selectedPet) return;
        updatePet(selectedPet.id, {
            status: "memorial",
            memorialDate: memorialDate,
        });
    };

    const handleSelectAll = () => {
        if (!selectedPet) return;
        setSelectedPhotos(
            selectedPhotos.length === selectedPet.photos.length
                ? []
                : selectedPet.photos.map((p) => p.id),
        );
    };

    const togglePhotoSelect = (photoId: string) => {
        setSelectedPhotos((prev) =>
            prev.includes(photoId)
                ? prev.filter((id) => id !== photoId)
                : [...prev, photoId],
        );
    };

    // 새 반려동물 추가 (무료 회원 제한 체크)
    const handleAddNewPet = () => {
        // 무료 회원이고, 이미 제한에 도달했으면 프리미엄 모달
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
                toast.success(`${petData.name} 정보가 수정되었습니다`);
            } else {
                await addPet(petData);
                toast.success(`${petData.name}이(가) 등록되었습니다`);
            }
            setEditingPet(null);
            setIsPetModalOpen(false);
        } catch {
            toast.error("저장 중 오류가 발생했습니다");
        }
    };

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    const handleMediaUpload = async (
        files: File[],
        captions: string[],
        cropPositions: { x: number; y: number; scale: number }[],
    ) => {
        if (!selectedPet) return;

        setIsUploading(true);
        try {
            await addMedia(
                selectedPet.id,
                files,
                captions,
                files.map(() => new Date().toISOString().split("T")[0]),
                (current, total) => setUploadProgress({ current, total }),
            );
            toast.success("사진이 업로드되었습니다");
        } catch {
            toast.error("업로드 중 오류가 발생했습니다");
        } finally {
            setIsUploading(false);
            setUploadProgress({ current: 0, total: 0 });
        }
    };

    // 기존 호환용 (deprecated)
    const handlePhotoUpload = (
        photos: {
            url: string;
            caption: string;
            cropPosition: { x: number; y: number; scale: number };
        }[],
    ) => {
        // 이 함수는 더 이상 사용되지 않음 - MediaUploadModal이 handleMediaUpload 사용
    };

    // 선택 삭제 핸들러
    const handleDeleteSelected = async () => {
        if (!selectedPet || selectedPhotos.length === 0) return;

        toast(`선택한 ${selectedPhotos.length}개의 항목을 삭제할까요?`, {
            action: {
                label: "삭제",
                onClick: async () => {
                    await deletePhotos(selectedPet.id, selectedPhotos);
                    setSelectedPhotos([]);
                    setIsSelectMode(false);
                    toast.success("선택한 항목이 삭제되었습니다");
                },
            },
            cancel: {
                label: "취소",
                onClick: () => {},
            },
        });
    };

    useEffect(() => {
        if (!isSelectMode) setSelectedPhotos([]);
    }, [isSelectMode]);
    useEffect(() => {
        setIsSelectMode(false);
        setSelectedPhotos([]);
    }, [selectedPetId]);

    // 로딩 화면 완전 제거 - 떨림 방지
    // 대신 데이터가 없으면 빈 상태로 표시

    if (!user) {
        return (
            <div className="min-h-screen relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4 max-w-md mx-auto">
                    {/* 아이콘 */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-amber-100 flex items-center justify-center mb-6 shadow-lg">
                        <Camera className="w-12 h-12 text-violet-500" />
                    </div>

                    {/* 타이틀 */}
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                        소중한 순간을 기록해보세요
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                        사진, 일상, 건강 기록을
                        <br />
                        한 곳에서 관리할 수 있어요
                    </p>

                    {/* 기능 미리보기 */}
                    <div className="w-full bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 mb-6 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                                <Camera className="w-4 h-4 text-violet-500" />
                            </div>
                            <span>사진 갤러리로 추억 모아보기</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-sky-500" />
                            </div>
                            <span>타임라인으로 일상 기록하기</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Bell className="w-4 h-4 text-amber-500" />
                            </div>
                            <span>예방접종, 미용 리마인더</span>
                        </div>
                    </div>

                    {/* 무료 안내 */}
                    <p className="text-sm text-gray-400 mb-4">
                        무료로 시작할 수 있어요
                    </p>

                    {/* CTA 버튼 */}
                    <div className="flex flex-col gap-3 w-full">
                        <Button
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent("openAuthModal"),
                                )
                            }
                            className="w-full bg-gradient-to-r from-violet-500 to-sky-500 hover:from-violet-600 hover:to-sky-600 text-white py-6 rounded-xl font-bold"
                        >
                            무료로 시작하기
                        </Button>
                        <button
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent("openAuthModal"),
                                )
                            }
                            className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
                        >
                            이미 계정이 있어요
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen relative overflow-hidden pb-24"
            style={{ contain: 'layout style', transform: 'translateZ(0)' }}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
            <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
                {/* 페이지 헤더 */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        우리의 기록
                    </h1>
                </div>

                {/* 탭 네비게이션 - 한 줄로 통합 */}
                <div className="flex items-center gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab("pets")}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all text-sm sm:text-base ${
                            activeTab === "pets"
                                ? "bg-[#05B2DC] text-white shadow-lg"
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
                                ? "bg-[#05B2DC] text-white shadow-lg"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">내 정보</span>
                        <span className="sm:hidden">정보</span>
                    </button>
                    <div className="flex-1" />
                    <Button
                        onClick={handleAddNewPet}
                        size="sm"
                        className="bg-[#05B2DC] hover:bg-[#0891B2] text-sm"
                        data-tutorial-id="add-pet-button"
                    >
                        <Plus className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">새 반려동물</span>
                    </Button>
                </div>

                {/* 내 정보 탭 */}
                {activeTab === "profile" && (
                    <div className="space-y-4">
                        {/* 프로필 카드 */}
                        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="w-5 h-5 text-[#05B2DC]" />
                                    프로필 정보
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* 닉네임 */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#05B2DC] to-[#38BDF8] flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">
                                                {nickname?.charAt(0)?.toUpperCase() || "?"}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">닉네임</p>
                                            {isEditingNickname ? (
                                                <Input
                                                    value={nickname}
                                                    onChange={(e) => setNickname(e.target.value)}
                                                    className="mt-1 h-8"
                                                    placeholder="닉네임 입력"
                                                    autoFocus
                                                />
                                            ) : (
                                                <p className="font-medium text-gray-800 dark:text-white">
                                                    {nickname || "닉네임 없음"}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {isEditingNickname ? (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsEditingNickname(false);
                                                    setNickname(user?.user_metadata?.nickname || user?.email?.split("@")[0] || "");
                                                }}
                                            >
                                                취소
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleSaveNickname}
                                                disabled={isSavingProfile}
                                                className="bg-[#05B2DC] hover:bg-[#0891B2]"
                                            >
                                                {isSavingProfile ? "저장 중..." : "저장"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setIsEditingNickname(true)}
                                        >
                                            <Pencil className="w-4 h-4 mr-1" />
                                            수정
                                        </Button>
                                    )}
                                </div>

                                {/* 이메일 */}
                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">이메일</p>
                                        <p className="font-medium text-gray-800 dark:text-white">
                                            {user?.email || "이메일 없음"}
                                        </p>
                                    </div>
                                </div>

                                {/* 가입일 */}
                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">가입일</p>
                                        <p className="font-medium text-gray-800 dark:text-white">
                                            {user?.created_at
                                                ? new Date(user.created_at).toLocaleDateString("ko-KR", {
                                                      year: "numeric",
                                                      month: "long",
                                                      day: "numeric",
                                                  })
                                                : "정보 없음"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 통계 카드 */}
                        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-pink-500" />
                                    나의 기록
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] rounded-xl">
                                        <p className="text-2xl font-bold text-[#05B2DC]">{pets.length}</p>
                                        <p className="text-sm text-gray-600">반려동물</p>
                                    </div>
                                    <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl">
                                        <p className="text-2xl font-bold text-pink-500">
                                            {pets.reduce((acc, pet) => acc + pet.photos.length, 0)}
                                        </p>
                                        <p className="text-sm text-gray-600">사진/영상</p>
                                    </div>
                                    <div className="text-center p-4 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl">
                                        <p className="text-2xl font-bold text-violet-500">
                                            {pets.filter((p) => p.status === "memorial").length}
                                        </p>
                                        <p className="text-sm text-gray-600">추억 속에</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 계정 관리 */}
                        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-gray-500" />
                                    계정 관리
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>로그아웃</span>
                                </button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 반려동물 탭 */}
                {activeTab === "pets" && (
                    <>
                        {pets.length === 0 ? (
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center mb-4">
                                <PawPrint className="w-10 h-10 text-[#05B2DC]" />
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
                                className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8]"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                반려동물 등록하기
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* 펫 카드 그리드 - 1:1 비율 */}
                        <div className="mb-6" data-tutorial-id="pet-card-area">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {pets.map((pet) => (
                                    <div
                                        key={pet.id}
                                        className="relative"
                                    >
                                        <button
                                            onClick={() => selectPet(pet.id)}
                                            className={`relative w-full aspect-square rounded-2xl overflow-hidden transition-all ${
                                                selectedPetId === pet.id
                                                    ? "ring-4 ring-[#05B2DC] shadow-lg scale-[1.02]"
                                                    : "ring-2 ring-transparent hover:ring-gray-200 dark:hover:ring-gray-600"
                                            }`}
                                        >
                                            {/* 프로필 이미지 */}
                                            {pet.profileImage ? (
                                                <img
                                                    src={pet.profileImage}
                                                    alt={pet.name}
                                                    className="w-full h-full object-cover"
                                                    style={{
                                                        objectPosition:
                                                            pet.profileCropPosition
                                                                ? `${pet.profileCropPosition.x}% ${pet.profileCropPosition.y}%`
                                                                : "center",
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center">
                                                    <PawPrint className="w-10 h-10 text-[#05B2DC]" />
                                                </div>
                                            )}

                                            {/* 하단 정보 오버레이 */}
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2 pt-6">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="font-semibold text-white text-sm truncate">
                                                        {pet.name}
                                                    </span>
                                                    {pet.isPrimary && (
                                                        <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                                    )}
                                                    {pet.status === "memorial" && (
                                                        <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-white/80 text-sm text-center truncate">
                                                    {pet.breed}
                                                </p>
                                            </div>

                                            {/* 선택됨 표시 */}
                                            {selectedPetId === pet.id && (
                                                <div className="absolute top-2 left-2 w-5 h-5 bg-[#05B2DC] rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </button>

                                        {/* 더보기 메뉴 버튼 */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowPetMenu(
                                                    showPetMenu === pet.id
                                                        ? null
                                                        : pet.id,
                                                );
                                            }}
                                            className="absolute top-1 right-1 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>

                                        {/* 드롭다운 메뉴 */}
                                        {showPetMenu === pet.id && (
                                            <div className="absolute top-10 right-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[140px] animate-in fade-in-0 zoom-in-95">
                                                <button
                                                    onClick={() => {
                                                        setEditingPet(pet);
                                                        setIsPetModalOpen(true);
                                                        setShowPetMenu(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4 text-gray-500" />
                                                    <span>정보 수정</span>
                                                </button>
                                                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1 mx-2" />
                                                <button
                                                    onClick={() => {
                                                        setPetToDelete(pet);
                                                        setShowPetMenu(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    <span>삭제하기</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {/* 새 펫 추가 버튼 - 1:1 비율 */}
                                <button
                                    onClick={handleAddNewPet}
                                    className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center hover:border-[#05B2DC] hover:bg-[#05B2DC]/5 active:scale-95 transition-all min-h-[80px]"
                                >
                                    <Plus className="w-8 h-8 text-gray-400 mb-1" />
                                    <span className="text-xs text-gray-400">추가</span>
                                </button>
                            </div>
                        </div>

                        {selectedPet && (
                            <>
                                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mb-6">
                                    <CardContent className="p-4 sm:p-6">
                                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                                            <div className="relative">
                                                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg">
                                                    {selectedPet.profileImage ? (
                                                        <img
                                                            src={
                                                                selectedPet.profileImage
                                                            }
                                                            alt={
                                                                selectedPet.name
                                                            }
                                                            className="w-full h-full object-cover"
                                                            style={{
                                                                objectPosition:
                                                                    selectedPet.profileCropPosition
                                                                        ? `${selectedPet.profileCropPosition.x}% ${selectedPet.profileCropPosition.y}%`
                                                                        : "center",
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center">
                                                            <PawPrint className="w-10 h-10 text-[#05B2DC]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                                        {selectedPet.name}
                                                    </h2>
                                                    {selectedPet.isPrimary && (
                                                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                            <Crown className="w-3 h-3 mr-1" />
                                                            대표
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        className={`text-xs ${selectedPet.status === "memorial" ? "bg-violet-100 text-violet-700" : "bg-green-100 text-green-700"}`}
                                                    >
                                                        {selectedPet.status ===
                                                        "memorial" ? (
                                                            <>
                                                                <Star className="w-3 h-3 mr-1" />
                                                                추억 속에
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Heart className="w-3 h-3 mr-1" />
                                                                함께하는 중
                                                            </>
                                                        )}
                                                    </Badge>
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                                                    {selectedPet.type} ·{" "}
                                                    {selectedPet.breed} ·{" "}
                                                    {selectedPet.gender}
                                                </p>
                                                <div className="flex flex-wrap gap-2 text-sm">
                                                    {selectedPet.birthday && (
                                                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                                            <Calendar className="w-4 h-4" />
                                                            {calculateAge(
                                                                selectedPet.birthday,
                                                            )}
                                                        </span>
                                                    )}
                                                    {selectedPet.weight && (
                                                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                                            <Star className="w-4 h-4" />
                                                            {selectedPet.weight}
                                                        </span>
                                                    )}
                                                </div>
                                                {selectedPet.personality && (
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                                        {
                                                            selectedPet.personality
                                                        }
                                                    </p>
                                                )}

                                                {/* 분기점 전환/리마인더 버튼 - active 상태일 때만 표시 */}
                                                {selectedPet.status === "active" && (
                                                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                                                        <Button
                                                            onClick={scrollToReminders}
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF] hover:text-[#0891B2]"
                                                        >
                                                            <Bell className="w-4 h-4 mr-2" />
                                                            케어 알림
                                                        </Button>
                                                        <Button
                                                            onClick={() => setIsMemorialModalOpen(true)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30"
                                                        >
                                                            <Star className="w-4 h-4 mr-2" />
                                                            분기점 전환
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* 추모 모드일 때 - 일상 모드 복구 옵션 */}
                                                {selectedPet.status === "memorial" && (
                                                    <div className="mt-4 space-y-2">
                                                        <p className="text-xs text-amber-600 dark:text-amber-400">
                                                            {selectedPet.memorialDate &&
                                                                `무지개다리를 건넌 날: ${selectedPet.memorialDate}`
                                                            }
                                                        </p>
                                                        <Button
                                                            onClick={() => {
                                                                toast("일상 모드로 되돌리시겠습니까?", {
                                                                    action: {
                                                                        label: "복구",
                                                                        onClick: async () => {
                                                                            await updatePet(selectedPet.id, {
                                                                                status: "active",
                                                                                memorialDate: undefined,
                                                                            });
                                                                            toast.success("일상 모드로 복구되었습니다");
                                                                        },
                                                                    },
                                                                    cancel: {
                                                                        label: "취소",
                                                                        onClick: () => {},
                                                                    },
                                                                });
                                                            }}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-gray-500 hover:text-gray-700 text-xs"
                                                        >
                                                            <Heart className="w-3 h-3 mr-1" />
                                                            일상 모드로 복구
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm" data-tutorial-id="photo-album-section">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-lg">
                                            사진/영상 앨범
                                            <span className="text-sm font-normal text-gray-500 ml-2">
                                                {selectedPet.photos.length}개
                                            </span>
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            {selectedPet.photos.length > 0 && (
                                                <Button
                                                    variant={
                                                        isSelectMode
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsSelectMode(
                                                            !isSelectMode,
                                                        );
                                                        setSelectedPhotos([]);
                                                    }}
                                                    className={
                                                        isSelectMode
                                                            ? "bg-gray-500 hover:bg-gray-600"
                                                            : ""
                                                    }
                                                >
                                                    {isSelectMode
                                                        ? "취소"
                                                        : "선택"}
                                                </Button>
                                            )}
                                            {isSelectMode && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={
                                                            handleSelectAll
                                                        }
                                                    >
                                                        {selectedPhotos.length ===
                                                        selectedPet.photos
                                                            .length
                                                            ? "전체 해제"
                                                            : "전체 선택"}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={
                                                            handleDeleteSelected
                                                        }
                                                        disabled={
                                                            selectedPhotos.length ===
                                                            0
                                                        }
                                                        className="bg-red-500 hover:bg-red-600 text-white"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        {selectedPhotos.length}
                                                        장 삭제
                                                    </Button>
                                                </>
                                            )}
                                            {!isSelectMode && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            setViewMode(
                                                                viewMode ===
                                                                    "grid"
                                                                    ? "list"
                                                                    : "grid",
                                                            )
                                                        }
                                                    >
                                                        {viewMode === "grid" ? (
                                                            <List className="w-4 h-4" />
                                                        ) : (
                                                            <Grid3X3 className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        onClick={() =>
                                                            setIsPhotoUploadOpen(
                                                                true,
                                                            )
                                                        }
                                                        size="sm"
                                                        className="bg-[#05B2DC] hover:bg-[#0891B2]"
                                                        data-tutorial-id="add-photo-button"
                                                    >
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        사진 추가
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedPet.photos.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 rounded-full bg-[#E0F7FF] dark:bg-[#05B2DC]/20 flex items-center justify-center mx-auto mb-4">
                                                    <Camera className="w-8 h-8 text-[#05B2DC]" />
                                                </div>
                                                <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-2">
                                                    아직 등록된 사진이 없어요
                                                </h3>
                                                <p className="text-sm text-gray-400 mb-4">
                                                    소중한 순간을 담아보세요
                                                </p>
                                                <Button
                                                    onClick={() =>
                                                        setIsPhotoUploadOpen(
                                                            true,
                                                        )
                                                    }
                                                    variant="outline"
                                                    className="border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF]"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    첫 사진 추가하기
                                                </Button>
                                            </div>
                                        ) : viewMode === "grid" ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                {selectedPet.photos.map(
                                                    (photo) => (
                                                        <div
                                                            key={photo.id}
                                                            onClick={() => {
                                                                if (isSelectMode) {
                                                                    togglePhotoSelect(photo.id);
                                                                } else {
                                                                    setViewingPhoto(photo);
                                                                }
                                                            }}
                                                            className={`aspect-square rounded-xl overflow-hidden cursor-pointer transition-all relative group ${isSelectMode && selectedPhotos.includes(photo.id) ? "ring-4 ring-[#05B2DC]" : "hover:opacity-90"}`}
                                                        >
                                                            {photo.type === "video" ? (
                                                                <>
                                                                    <img
                                                                        src={photo.thumbnailUrl || photo.url}
                                                                        alt={photo.caption}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                                                            <Play className="w-6 h-6 text-gray-800 fill-gray-800 ml-1" />
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <img
                                                                    src={photo.url}
                                                                    alt={photo.caption}
                                                                    className="w-full h-full object-cover"
                                                                    style={{
                                                                        objectPosition: photo.cropPosition
                                                                            ? `${photo.cropPosition.x}% ${photo.cropPosition.y}%`
                                                                            : "center",
                                                                    }}
                                                                />
                                                            )}
                                                            {isSelectMode && (
                                                                <div
                                                                    className={`absolute top-2 left-2 w-7 h-7 rounded-full border-2 flex items-center justify-center ${selectedPhotos.includes(photo.id) ? "bg-[#05B2DC] border-[#05B2DC]" : "bg-white/80 border-gray-300"}`}
                                                                >
                                                                    {selectedPhotos.includes(photo.id) && (
                                                                        <Check className="w-4 h-4 text-white" />
                                                                    )}
                                                                </div>
                                                            )}
                                                            {!isSelectMode && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toast("이 사진을 삭제할까요?", {
                                                                            action: {
                                                                                label: "삭제",
                                                                                onClick: async () => {
                                                                                    await deletePhoto(selectedPet.id, photo.id);
                                                                                    toast.success("사진이 삭제되었습니다");
                                                                                },
                                                                            },
                                                                            cancel: {
                                                                                label: "취소",
                                                                                onClick: () => {},
                                                                            },
                                                                        });
                                                                    }}
                                                                    className="absolute top-1 right-1 p-1.5 bg-black/50 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-95"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedPet.photos.map(
                                                    (photo) => (
                                                        <div
                                                            key={photo.id}
                                                            onClick={() => {
                                                                if (
                                                                    isSelectMode
                                                                )
                                                                    togglePhotoSelect(
                                                                        photo.id,
                                                                    );
                                                                else
                                                                    setViewingPhoto(
                                                                        photo,
                                                                    );
                                                            }}
                                                            className={`flex gap-4 p-3 rounded-xl cursor-pointer transition-colors group ${isSelectMode && selectedPhotos.includes(photo.id) ? "bg-[#E0F7FF] ring-2 ring-[#05B2DC]" : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100"}`}
                                                        >
                                                            {isSelectMode && (
                                                                <div
                                                                    className={`self-center w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPhotos.includes(photo.id) ? "bg-[#05B2DC] border-[#05B2DC]" : "bg-white border-gray-300"}`}
                                                                >
                                                                    {selectedPhotos.includes(
                                                                        photo.id,
                                                                    ) && (
                                                                        <Check className="w-4 h-4 text-white" />
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                                {photo.type === "video" ? (
                                                                    <>
                                                                        <img
                                                                            src={photo.thumbnailUrl || photo.url}
                                                                            alt={photo.caption}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                                            <Play className="w-5 h-5 text-white fill-white" />
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <img
                                                                        src={photo.url}
                                                                        alt={photo.caption}
                                                                        className="w-full h-full object-cover"
                                                                        style={{
                                                                            objectPosition: photo.cropPosition
                                                                                ? `${photo.cropPosition.x}% ${photo.cropPosition.y}%`
                                                                                : "center",
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-800 dark:text-white">
                                                                    {photo.caption ||
                                                                        selectedPet.name}
                                                                </p>
                                                                <p className="text-sm text-gray-500">
                                                                    {photo.date}
                                                                </p>
                                                            </div>
                                                            {!isSelectMode && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toast("이 사진을 삭제할까요?", {
                                                                            action: {
                                                                                label: "삭제",
                                                                                onClick: async () => {
                                                                                    await deletePhoto(selectedPet.id, photo.id);
                                                                                    toast.success("사진이 삭제되었습니다");
                                                                                },
                                                                            },
                                                                            cancel: {
                                                                                label: "취소",
                                                                                onClick: () => {},
                                                                            },
                                                                        });
                                                                    }}
                                                                    className="self-center p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* 타임라인 일기 섹션 */}
                                <div data-tutorial-id="timeline-section">
                                    <TimelineSection
                                        petId={selectedPet.id}
                                        petName={selectedPet.name}
                                    />
                                </div>

                                {/* 케어 리마인더 섹션 - 임시 비활성화 (401 에러로 인한 깜빡임 방지) */}
                                {/* TODO: reminders API 인증 문제 해결 후 다시 활성화 */}
                                {/* {selectedPet.status !== "memorial" && (
                                    <div ref={remindersSectionRef} data-tutorial-id="care-reminder-section">
                                        <RemindersSection
                                            petId={selectedPet.id}
                                            petName={selectedPet.name}
                                        />
                                    </div>
                                )} */}
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

            {/* 분기점 전환 모달 */}
            {selectedPet && (
                <MemorialSwitchModal
                    pet={selectedPet}
                    isOpen={isMemorialModalOpen}
                    onClose={() => setIsMemorialModalOpen(false)}
                    onConfirm={handleMemorialSwitch}
                />
            )}

            {/* 프리미엄 유도 모달 */}
            <PremiumModal
                isOpen={isPremiumModalOpen}
                onClose={() => setIsPremiumModalOpen(false)}
                feature={premiumFeature}
            />

            {showPetMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowPetMenu(null)}
                />
            )}
        </div>
    );
}
