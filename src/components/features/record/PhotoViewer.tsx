"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { PetPhoto } from "@/contexts/PetContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Trash2, Video } from "lucide-react";
import DeleteConfirmModal from "./DeleteConfirmModal";

interface PhotoViewerProps {
    photo: PetPhoto;
    petName: string;
    onClose: () => void;
    onDelete: () => void;
}

export default function PhotoViewer({
    photo,
    petName,
    onClose,
    onDelete,
}: PhotoViewerProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isVideo = photo.type === "video";

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/90 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className="relative max-w-md w-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-white hover:bg-red-500/20 rounded-full"
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-white hover:bg-white/20 rounded-full"
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    {isVideo ? (
                        <div className="rounded-2xl overflow-hidden bg-black">
                            <video
                                src={photo.url}
                                controls
                                autoPlay
                                className="w-full max-h-[70vh] object-contain"
                                poster={photo.thumbnailUrl}
                            >
                                브라우저가 비디오를 지원하지 않습니다.
                            </video>
                        </div>
                    ) : (
                        <div className="aspect-square rounded-2xl overflow-hidden">
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
                        </div>
                    )}

                    <div className="text-center mt-4 text-white">
                        <div className="flex items-center justify-center gap-2">
                            {isVideo && (
                                <Badge className="bg-purple-600 text-white text-xs">
                                    <Video className="w-3 h-3 mr-1" />
                                    영상
                                </Badge>
                            )}
                            <p className="font-medium">{photo.caption || petName}</p>
                        </div>
                        <p className="text-sm text-gray-400">{photo.date}</p>
                    </div>
                </div>
            </div>
            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={onDelete}
                title={isVideo ? "영상 삭제" : "사진 삭제"}
                message={
                    isVideo ? "이 영상을 삭제하시겠습니까?" : "이 사진을 삭제하시겠습니까?"
                }
            />
        </>
    );
}
