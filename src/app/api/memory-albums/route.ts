/**
 * 추억 앨범 조회 API
 * GET /api/memory-albums?petId={petId}
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const petId = searchParams.get("petId");

        if (!petId) {
            return NextResponse.json({ error: "petId가 필요합니다." }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 앨범 목록 조회 (최신순)
        const { data: albums, error } = await supabase
            .from("memory_albums")
            .select("*")
            .eq("pet_id", petId)
            .eq("user_id", user.id)
            .order("created_date", { ascending: false })
            .limit(50);

        if (error) {
            console.error("[MemoryAlbums] 조회 오류:", error.message);
            return NextResponse.json({ error: "앨범 조회에 실패했습니다." }, { status: 500 });
        }

        if (!albums || albums.length === 0) {
            return NextResponse.json({ albums: [], unreadCount: 0 });
        }

        // 모든 앨범의 media_ids를 모아서 한 번에 pet_media 조회
        const allMediaIds = albums.flatMap((a) => a.media_ids || []);
        const uniqueMediaIds = Array.from(new Set(allMediaIds));

        let mediaMap: Record<string, {
            id: string;
            url: string;
            storage_path: string;
            type: string;
            caption: string;
            date: string;
            crop_position: { x: number; y: number; scale: number } | null;
            thumbnail_url: string | null;
        }> = {};

        if (uniqueMediaIds.length > 0) {
            const { data: mediaRows } = await supabase
                .from("pet_media")
                .select("id, url, storage_path, type, caption, date, crop_position, thumbnail_url")
                .in("id", uniqueMediaIds);

            if (mediaRows) {
                for (const m of mediaRows) {
                    mediaMap[m.id] = m;
                }
            }
        }

        // 앨범 데이터 변환 (camelCase + photos 조인)
        const result = albums.map((album) => {
            const photos = (album.media_ids || [])
                .map((mid: string) => {
                    const m = mediaMap[mid];
                    if (!m) return null;
                    return {
                        id: m.id,
                        url: m.url,
                        storagePath: m.storage_path,
                        type: m.type,
                        caption: m.caption || "",
                        date: m.date,
                        cropPosition: m.crop_position,
                        thumbnailUrl: m.thumbnail_url,
                    };
                })
                .filter(Boolean);

            return {
                id: album.id,
                petId: album.pet_id,
                userId: album.user_id,
                concept: album.concept,
                title: album.title,
                description: album.description,
                mediaIds: album.media_ids,
                isRead: album.is_read,
                createdDate: album.created_date,
                createdAt: album.created_at,
                photos,
            };
        });

        const unreadCount = result.filter((a) => !a.isRead).length;

        return NextResponse.json({ albums: result, unreadCount });
    } catch (err) {
        console.error("[MemoryAlbums] 오류:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
