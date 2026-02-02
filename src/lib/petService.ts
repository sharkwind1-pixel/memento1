/**
 * Pet Service - Supabase 데이터베이스 연동
 * 반려동물 정보와 미디어를 Supabase에 저장/조회
 */

import { supabase } from "./supabase";
import { uploadMedia, deleteMedia, getMediaType, MediaType } from "./storage";

// 미디어 인터페이스
export interface PetMedia {
    id: string;
    pet_id: string;
    user_id: string;
    url: string;
    storage_path: string;
    type: MediaType;
    caption: string;
    date: string;
    crop_position?: {
        x: number;
        y: number;
        scale: number;
    };
    thumbnail_url?: string; // 영상용 썸네일
    created_at: string;
}

// 반려동물 인터페이스
export interface PetData {
    id: string;
    user_id: string;
    name: string;
    type: "강아지" | "고양이" | "기타";
    breed: string;
    birthday: string;
    gender: "남아" | "여아";
    weight: string;
    personality: string;
    profile_image: string;
    profile_crop_position?: {
        x: number;
        y: number;
        scale: number;
    };
    status: "active" | "memorial";
    memorial_date?: string;
    is_primary: boolean;
    created_at: string;
}

// 타임라인 일기 인터페이스
export interface TimelineEntry {
    id: string;
    pet_id: string;
    user_id: string;
    date: string;
    title: string;
    content: string;
    mood?: "happy" | "normal" | "sad" | "sick";
    media_ids?: string[];
    created_at: string;
}

// ===== 반려동물 CRUD =====

// 사용자의 모든 반려동물 조회
export async function fetchPets(userId: string): Promise<PetData[]> {
    const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Fetch pets error:", error);
        return [];
    }

    return data || [];
}

// 반려동물 생성
export async function createPet(
    userId: string,
    pet: Omit<PetData, "id" | "user_id" | "created_at">
): Promise<PetData | null> {
    const { data, error } = await supabase
        .from("pets")
        .insert([{ ...pet, user_id: userId }])
        .select()
        .single();

    if (error) {
        console.error("Create pet error:", error);
        return null;
    }

    return data;
}

// 반려동물 수정
export async function updatePetData(
    petId: string,
    updates: Partial<PetData>
): Promise<boolean> {
    const { error } = await supabase
        .from("pets")
        .update(updates)
        .eq("id", petId);

    if (error) {
        console.error("Update pet error:", error);
        return false;
    }

    return true;
}

// 반려동물 삭제
export async function deletePetData(petId: string): Promise<boolean> {
    // 연관된 미디어도 함께 삭제
    const { data: media } = await supabase
        .from("pet_media")
        .select("storage_path")
        .eq("pet_id", petId);

    if (media) {
        for (const item of media) {
            await deleteMedia(item.storage_path);
        }
    }

    // 미디어 레코드 삭제
    await supabase.from("pet_media").delete().eq("pet_id", petId);

    // 타임라인 삭제
    await supabase.from("timeline_entries").delete().eq("pet_id", petId);

    // 반려동물 삭제
    const { error } = await supabase.from("pets").delete().eq("id", petId);

    if (error) {
        console.error("Delete pet error:", error);
        return false;
    }

    return true;
}

// ===== 미디어 CRUD =====

// 반려동물의 미디어 조회
export async function fetchPetMedia(petId: string): Promise<PetMedia[]> {
    const { data, error } = await supabase
        .from("pet_media")
        .select("*")
        .eq("pet_id", petId)
        .order("date", { ascending: false });

    if (error) {
        console.error("Fetch media error:", error);
        return [];
    }

    return data || [];
}

// 미디어 업로드 및 저장
export async function addPetMedia(
    userId: string,
    petId: string,
    file: File,
    caption: string,
    date: string,
    thumbnailUrl?: string
): Promise<PetMedia | null> {
    // Storage에 업로드
    const uploadResult = await uploadMedia(file, userId, petId);

    if (!uploadResult.success || !uploadResult.url || !uploadResult.path) {
        console.error("Media upload failed:", uploadResult.error);
        return null;
    }

    // 데이터베이스에 저장
    const mediaType = getMediaType(file.name);
    const { data, error } = await supabase
        .from("pet_media")
        .insert([
            {
                pet_id: petId,
                user_id: userId,
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

    if (error) {
        console.error("Save media record error:", error);
        // Storage에서도 삭제
        await deleteMedia(uploadResult.path);
        return null;
    }

    return data;
}

// 미디어 메타데이터 수정
export async function updateMediaData(
    mediaId: string,
    updates: Partial<Pick<PetMedia, "caption" | "date" | "crop_position">>
): Promise<boolean> {
    const { error } = await supabase
        .from("pet_media")
        .update(updates)
        .eq("id", mediaId);

    if (error) {
        console.error("Update media error:", error);
        return false;
    }

    return true;
}

// 미디어 삭제
export async function deletePetMedia(mediaId: string): Promise<boolean> {
    // 먼저 storage_path 조회
    const { data: media } = await supabase
        .from("pet_media")
        .select("storage_path")
        .eq("id", mediaId)
        .single();

    if (media) {
        // Storage에서 파일 삭제
        await deleteMedia(media.storage_path);
    }

    // 데이터베이스에서 삭제
    const { error } = await supabase
        .from("pet_media")
        .delete()
        .eq("id", mediaId);

    if (error) {
        console.error("Delete media error:", error);
        return false;
    }

    return true;
}

// 여러 미디어 삭제
export async function deleteMultipleMedia(mediaIds: string[]): Promise<boolean> {
    // storage_path들 조회
    const { data: media } = await supabase
        .from("pet_media")
        .select("storage_path")
        .in("id", mediaIds);

    if (media) {
        for (const item of media) {
            await deleteMedia(item.storage_path);
        }
    }

    const { error } = await supabase
        .from("pet_media")
        .delete()
        .in("id", mediaIds);

    if (error) {
        console.error("Delete multiple media error:", error);
        return false;
    }

    return true;
}

// ===== 타임라인 CRUD =====

// 반려동물의 타임라인 조회
export async function fetchTimeline(petId: string): Promise<TimelineEntry[]> {
    const { data, error } = await supabase
        .from("timeline_entries")
        .select("*")
        .eq("pet_id", petId)
        .order("date", { ascending: false });

    if (error) {
        console.error("Fetch timeline error:", error);
        return [];
    }

    return data || [];
}

// 타임라인 항목 생성
export async function createTimelineEntry(
    userId: string,
    petId: string,
    entry: Omit<TimelineEntry, "id" | "pet_id" | "user_id" | "created_at">
): Promise<TimelineEntry | null> {
    const { data, error } = await supabase
        .from("timeline_entries")
        .insert([
            {
                ...entry,
                pet_id: petId,
                user_id: userId,
            },
        ])
        .select()
        .single();

    if (error) {
        console.error("Create timeline entry error:", error);
        return null;
    }

    return data;
}

// 타임라인 항목 수정
export async function updateTimelineEntry(
    entryId: string,
    updates: Partial<TimelineEntry>
): Promise<boolean> {
    const { error } = await supabase
        .from("timeline_entries")
        .update(updates)
        .eq("id", entryId);

    if (error) {
        console.error("Update timeline entry error:", error);
        return false;
    }

    return true;
}

// 타임라인 항목 삭제
export async function deleteTimelineEntry(entryId: string): Promise<boolean> {
    const { error } = await supabase
        .from("timeline_entries")
        .delete()
        .eq("id", entryId);

    if (error) {
        console.error("Delete timeline entry error:", error);
        return false;
    }

    return true;
}
