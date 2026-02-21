/**
 * useLostPostActions.ts
 * 분실동물 게시글 상세 조회, 작성, 삭제, 해결 등 액션을 관리하는 커스텀 훅
 *
 * LostPage에서 추출한 모달 상태 및 CRUD 로직
 */

"use client";

import { useState, useRef, type Dispatch, type SetStateAction } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { toast } from "sonner";
import { uploadLostPetImage } from "@/lib/storage";
import type { User } from "@supabase/supabase-js";
import type { LostPetPost, PostFormData } from "@/components/features/lost/lostTypes";
import { REGIONS, INITIAL_FORM } from "@/components/features/lost/lostTypes";

interface UseLostPostActionsParams {
    user: User | null;
    fetchPosts: () => void;
    fetchStats: () => void;
    setPage: Dispatch<SetStateAction<number>>;
}

export function useLostPostActions({
    user,
    fetchPosts,
    fetchStats,
    setPage,
}: UseLostPostActionsParams) {
    // 모달 상태
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState<LostPetPost | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // 작성 폼 상태
    const [form, setForm] = useState<PostFormData>(INITIAL_FORM);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 폼 지역 구/군 목록
    const formDistricts = form.region ? REGIONS[form.region] || [] : [];

    // 게시글 상세 조회
    const openDetail = async (post: LostPetPost) => {
        setSelectedPost(post);
        setShowDetailModal(true);
        setDetailLoading(true);
        try {
            const res = await fetch(API.LOST_PET_DETAIL(post.id));
            if (res.ok) {
                const data = await res.json();
                setSelectedPost(data.post);
            }
        } catch {
            toast.error("상세 정보를 불러오지 못했습니다. 기본 정보로 표시합니다.");
        } finally {
            setDetailLoading(false);
        }
    };

    // 작성 모달 열기
    const openCreateModal = (type: "lost" | "found") => {
        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }
        setForm({ ...INITIAL_FORM, type });
        setImageFile(null);
        setImagePreview(null);
        setShowCreateModal(true);
    };

    // 이미지 선택
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error("이미지는 10MB 이하만 가능합니다.");
            return;
        }

        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // 이미지 제거
    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    // 게시글 작성
    const handleSubmit = async () => {
        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }
        if (!form.title.trim()) {
            toast.error("제목을 입력해주세요.");
            return;
        }
        if (!form.date) {
            toast.error("날짜를 입력해주세요.");
            return;
        }

        setSubmitting(true);
        try {
            let imageUrl: string | null = null;
            let imageStoragePath: string | null = null;

            // 이미지 업로드
            if (imageFile) {
                const uploadResult = await uploadLostPetImage(imageFile, user.id);
                if (uploadResult.success && uploadResult.url) {
                    imageUrl = uploadResult.url;
                    imageStoragePath = uploadResult.path || null;
                } else {
                    toast.error(uploadResult.error || "이미지 업로드 실패");
                    setSubmitting(false);
                    return;
                }
            }

            const res = await authFetch(API.LOST_PETS, {
                method: "POST",
                body: JSON.stringify({
                    type: form.type,
                    title: form.title.trim(),
                    petType: form.petType,
                    breed: form.breed.trim(),
                    color: form.color.trim(),
                    gender: form.gender,
                    age: form.age.trim(),
                    region: form.region,
                    district: form.district,
                    locationDetail: form.locationDetail.trim(),
                    date: form.date,
                    description: form.description.trim(),
                    contact: form.contact.trim(),
                    reward: form.reward.trim() || null,
                    imageUrl,
                    imageStoragePath,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "게시글 작성 실패");
            }

            toast.success(
                form.type === "lost"
                    ? "실종 신고가 등록되었습니다."
                    : "발견 신고가 등록되었습니다."
            );
            setShowCreateModal(false);
            setPage(1);
            // fetchPosts는 page 의존성으로 자동 재호출됨
            fetchStats();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "게시글 작성에 실패했습니다."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // 게시글 삭제
    const handleDelete = async (postId: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        try {
            const res = await authFetch(API.LOST_PET_DETAIL(postId), { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "삭제 실패");
            }
            toast.success("게시글이 삭제되었습니다.");
            setShowDetailModal(false);
            setSelectedPost(null);
            fetchPosts();
            fetchStats();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "삭제에 실패했습니다."
            );
        }
    };

    // 해결 표시
    const handleResolve = async (postId: string) => {
        if (!confirm("찾았어요! 해결 완료로 표시하시겠습니까?")) return;

        try {
            const res = await authFetch(API.LOST_PET_DETAIL(postId), {
                method: "PATCH",
                body: JSON.stringify({ status: "resolved" }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "상태 변경 실패");
            }
            toast.success("해결 완료로 표시되었습니다!");
            setShowDetailModal(false);
            setSelectedPost(null);
            fetchPosts();
            fetchStats();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "상태 변경에 실패했습니다."
            );
        }
    };

    return {
        // 모달 상태
        showCreateModal,
        setShowCreateModal,
        showDetailModal,
        setShowDetailModal,
        selectedPost,
        setSelectedPost,
        detailLoading,

        // 폼 상태
        form,
        setForm,
        imageFile,
        imagePreview,
        submitting,
        fileInputRef,
        formDistricts,

        // 액션
        openDetail,
        openCreateModal,
        handleImageSelect,
        handleSubmit,
        handleDelete,
        handleResolve,
        removeImage,
    };
}
