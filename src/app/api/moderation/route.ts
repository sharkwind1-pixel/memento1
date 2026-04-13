/**
 * 이미지 모더레이션 API
 * POST /api/moderation
 *
 * body: { imageUrl: string } — Supabase Storage URL로 업로드 후 검증
 * 또는 FormData로 파일 직접 전송
 *
 * 반려동물 관련 이미지가 아니면 { allowed: false, reason: "..." } 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase-server";
import { moderateImage, moderateImageBuffer } from "@/lib/image-moderation";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    try {
        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("multipart/form-data")) {
            // FormData로 파일 직접 전송
            const formData = await request.formData();
            const file = formData.get("file") as File | null;
            if (!file) {
                return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
            }
            const buffer = Buffer.from(await file.arrayBuffer());
            const result = await moderateImageBuffer(buffer, file.type);
            return NextResponse.json(result);
        } else {
            // JSON으로 URL 전송
            const body = await request.json();
            const { imageUrl } = body;
            if (!imageUrl || typeof imageUrl !== "string") {
                return NextResponse.json({ error: "imageUrl이 필요합니다" }, { status: 400 });
            }
            const result = await moderateImage(imageUrl);
            return NextResponse.json(result);
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : "서버 오류";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
