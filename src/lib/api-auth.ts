/**
 * api-auth.ts
 *
 * API 라우트 인증 보일러플레이트 래퍼.
 *
 * 거의 모든 보호 라우트가 아래 4줄을 반복한다:
 *   const user = await getAuthUser();
 *   if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
 * 이 래퍼로 묶으면 핸들러는 인증된 user를 주입받아 본문 로직에만 집중한다.
 * (점진 도입 — 새 라우트/리팩토링 시 우선 적용. 기존 라우트는 순차 이관.)
 *
 * 사용:
 *   // params 없는 라우트
 *   export const GET = withAuth(async ({ user }) => { ... });
 *
 *   // 동적 세그먼트(params) 라우트 — 제네릭으로 params 타입 지정
 *   export const POST = withAuth<{ id: string }>(async ({ user, params, request }) => {
 *       const { id } = params;
 *       ...
 *   });
 *
 * 주의:
 * - 401 메시지/상태가 라우트마다 다를 수 있어 options로 덮어쓸 수 있게 둠(기본 "로그인이 필요합니다.").
 * - 본문의 try/catch(500 처리)는 라우트마다 메시지가 달라 래퍼가 삼키지 않는다. 핸들러가 직접 유지.
 */
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getAuthUser } from "./supabase-server";

export interface AuthedContext<P> {
    /** 인증된 사용자 (null 아님이 보장됨) */
    user: User;
    request: NextRequest;
    /** 동적 세그먼트 파라미터 (없으면 빈 객체) */
    params: P;
}

export interface WithAuthOptions {
    /** 비로그인 시 응답 메시지 (기본: "로그인이 필요합니다.") */
    message?: string;
    /** 비로그인 시 상태코드 (기본: 401) */
    status?: number;
}

export function withAuth<P = Record<string, never>>(
    handler: (ctx: AuthedContext<P>) => Promise<Response> | Response,
    options?: WithAuthOptions,
) {
    return async (
        request: NextRequest,
        context?: { params: Promise<P> },
    ): Promise<Response> => {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: options?.message ?? "로그인이 필요합니다." },
                { status: options?.status ?? 401 },
            );
        }
        const params = (context ? await context.params : ({} as P)) as P;
        return handler({ user, request, params });
    };
}
