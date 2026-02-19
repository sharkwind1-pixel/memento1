/**
 * PetPhotoAlbum.tsx
 * 반려동물 사진/영상 앨범 컴포넌트
 * RecordPage에서 분리 - 그리드/리스트 뷰, 선택 모드, 삭제 기능
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Camera,
    Plus,
    Grid3X3,
    List,
    Trash2,
    X,
    Check,
    Play,
} from "lucide-react";
import type { Pet, PetPhoto } from "@/contexts/PetContext";

interface PetPhotoAlbumProps {
    selectedPet: Pet;
    onPhotoClick: (photo: PetPhoto) => void;
    onUploadClick: () => void;
    onDeletePhoto: (petId: string, photoId: string) => Promise<void>;
    onDeletePhotos: (petId: string, photoIds: string[]) => Promise<void>;
}

export default function PetPhotoAlbum({
    selectedPet,
    onPhotoClick,
    onUploadClick,
    onDeletePhoto,
    onDeletePhotos,
}: PetPhotoAlbumProps) {
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

    // 선택 모드 해제 시 선택 초기화
    useEffect(() => {
        if (!isSelectMode) setSelectedPhotos([]);
    }, [isSelectMode]);

    // 펫 변경 시 선택 모드 초기화
    useEffect(() => {
        setIsSelectMode(false);
        setSelectedPhotos([]);
    }, [selectedPet.id]);

    const handleSelectAll = () => {
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

    const handleDeleteSelected = async () => {
        if (selectedPhotos.length === 0) return;

        toast(`선택한 ${selectedPhotos.length}개의 항목을 삭제할까요?`, {
            action: {
                label: "삭제",
                onClick: async () => {
                    await onDeletePhotos(selectedPet.id, selectedPhotos);
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

    return (
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
                            variant={isSelectMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                setIsSelectMode(!isSelectMode);
                                setSelectedPhotos([]);
                            }}
                            className={isSelectMode ? "bg-gray-500 hover:bg-gray-600" : ""}
                        >
                            {isSelectMode ? "취소" : "선택"}
                        </Button>
                    )}
                    {isSelectMode && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                            >
                                {selectedPhotos.length === selectedPet.photos.length
                                    ? "전체 해제"
                                    : "전체 선택"}
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleDeleteSelected}
                                disabled={selectedPhotos.length === 0}
                                className="bg-red-500 hover:bg-red-600 text-white"
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                {selectedPhotos.length}장 삭제
                            </Button>
                        </>
                    )}
                    {!isSelectMode && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                                aria-label={viewMode === "grid" ? "리스트 보기" : "그리드 보기"}
                            >
                                {viewMode === "grid" ? (
                                    <List className="w-4 h-4" />
                                ) : (
                                    <Grid3X3 className="w-4 h-4" />
                                )}
                            </Button>
                            <Button
                                onClick={onUploadClick}
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
                            onClick={onUploadClick}
                            variant="outline"
                            className="border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            첫 사진 추가하기
                        </Button>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {selectedPet.photos.map((photo) => (
                            <div
                                key={photo.id}
                                onClick={() => {
                                    if (isSelectMode) {
                                        togglePhotoSelect(photo.id);
                                    } else {
                                        onPhotoClick(photo);
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
                                                        await onDeletePhoto(selectedPet.id, photo.id);
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
                                        aria-label="사진 삭제"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {selectedPet.photos.map((photo) => (
                            <div
                                key={photo.id}
                                onClick={() => {
                                    if (isSelectMode) togglePhotoSelect(photo.id);
                                    else onPhotoClick(photo);
                                }}
                                className={`flex gap-4 p-3 rounded-xl cursor-pointer transition-colors group ${isSelectMode && selectedPhotos.includes(photo.id) ? "bg-[#E0F7FF] ring-2 ring-[#05B2DC]" : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100"}`}
                            >
                                {isSelectMode && (
                                    <div
                                        className={`self-center w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPhotos.includes(photo.id) ? "bg-[#05B2DC] border-[#05B2DC]" : "bg-white border-gray-300"}`}
                                    >
                                        {selectedPhotos.includes(photo.id) && (
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
                                        {photo.caption || selectedPet.name}
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
                                                        await onDeletePhoto(selectedPet.id, photo.id);
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
                                        aria-label="사진 삭제"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
