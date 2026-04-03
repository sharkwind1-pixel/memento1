/**
 * 텔레그램 Webhook API
 * POST /api/telegram-webhook
 *
 * 텔레그램 봇에서 메시지를 받아 관리 명령어 실행:
 * /stats - 실시간 통계
 * /ban email - 유저 차단
 * /unban email - 유저 차단 해제
 * /hide postId - 게시글 숨김
 * /premium email days - 프리미엄 부여
 * /help - 명령어 목록
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

/** 텔레그램 응답 전송 */
async function reply(chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
}

/** 관리자 chat ID 검증 */
function isAdmin(chatId: number): boolean {
    return String(chatId) === ADMIN_CHAT_ID;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const message = body.message;
        if (!message?.text) return NextResponse.json({ ok: true });

        const chatId = message.chat.id;
        const text = message.text.trim();

        // 관리자 DM만 처리 (그룹 메시지 무시)
        if (!isAdmin(chatId)) {
            return NextResponse.json({ ok: true });
        }

        // 명령어 파싱
        const [command, ...args] = text.split(/\s+/);
        const supabase = createAdminSupabase();

        switch (command.toLowerCase()) {
            case "/help": {
                await reply(chatId, [
                    "<b>관리 명령어</b>",
                    "",
                    "/stats - 실시간 통계",
                    "/ban [이메일] - 유저 차단",
                    "/unban [이메일] - 차단 해제",
                    "/hide [게시글ID] - 게시글 숨김",
                    "/show [게시글ID] - 게시글 복원",
                    "/premium [이메일] [일수] - 프리미엄 부여",
                    "/user [이메일] - 유저 정보 조회",
                    "/reports - 미처리 신고 목록",
                ].join("\n"));
                break;
            }

            case "/stats": {
                const today = new Date().toISOString().split("T")[0];
                const [users, newUsers, chats, posts, reports] = await Promise.all([
                    supabase.from("profiles").select("id", { count: "estimated", head: true }),
                    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today),
                    supabase.from("chat_messages").select("id", { count: "exact", head: true }).gte("created_at", today),
                    supabase.from("community_posts").select("id", { count: "exact", head: true }).gte("created_at", today),
                    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
                ]);
                await reply(chatId, [
                    "<b>실시간 통계</b>",
                    `전체 회원: ${users.count ?? 0}명`,
                    `오늘 가입: ${newUsers.count ?? 0}명`,
                    `오늘 AI 대화: ${chats.count ?? 0}건`,
                    `오늘 게시글: ${posts.count ?? 0}건`,
                    `미처리 신고: ${reports.count ?? 0}건`,
                ].join("\n"));
                break;
            }

            case "/ban": {
                const email = args[0];
                if (!email) { await reply(chatId, "사용법: /ban [이메일]"); break; }
                const { data, error } = await supabase
                    .from("profiles")
                    .update({ is_banned: true })
                    .eq("email", email)
                    .select("id, nickname")
                    .maybeSingle();
                if (error || !data) {
                    await reply(chatId, `실패: ${error?.message || "유저를 찾을 수 없습니다"}`);
                } else {
                    await reply(chatId, `${data.nickname || email} 차단 완료`);
                }
                break;
            }

            case "/unban": {
                const email = args[0];
                if (!email) { await reply(chatId, "사용법: /unban [이메일]"); break; }
                const { data, error } = await supabase
                    .from("profiles")
                    .update({ is_banned: false })
                    .eq("email", email)
                    .select("id, nickname")
                    .maybeSingle();
                if (error || !data) {
                    await reply(chatId, `실패: ${error?.message || "유저를 찾을 수 없습니다"}`);
                } else {
                    await reply(chatId, `${data.nickname || email} 차단 해제 완료`);
                }
                break;
            }

            case "/hide": {
                const postId = args[0];
                if (!postId) { await reply(chatId, "사용법: /hide [게시글ID]"); break; }
                const { error } = await supabase
                    .from("community_posts")
                    .update({ is_hidden: true, moderation_status: "rejected", moderation_reason: "관리자 텔레그램 명령" })
                    .eq("id", postId);
                await reply(chatId, error ? `실패: ${error.message}` : "게시글 숨김 완료");
                break;
            }

            case "/show": {
                const postId = args[0];
                if (!postId) { await reply(chatId, "사용법: /show [게시글ID]"); break; }
                const { error } = await supabase
                    .from("community_posts")
                    .update({ is_hidden: false, moderation_status: "approved", moderation_reason: null })
                    .eq("id", postId);
                await reply(chatId, error ? `실패: ${error.message}` : "게시글 복원 완료");
                break;
            }

            case "/premium": {
                const email = args[0];
                const days = parseInt(args[1]) || 30;
                if (!email) { await reply(chatId, "사용법: /premium [이메일] [일수]"); break; }
                const { error } = await supabase.rpc("grant_premium", {
                    p_user_id: null,
                    p_plan: "premium",
                    p_duration_days: days,
                    p_granted_by: null,
                    p_reason: `텔레그램 관리 명령 (${days}일)`,
                });
                // RPC가 user_id 필요하므로 이메일로 먼저 조회
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("email", email)
                    .single();
                if (!profile) {
                    await reply(chatId, "유저를 찾을 수 없습니다");
                    break;
                }
                const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
                const { error: updateError } = await supabase
                    .from("profiles")
                    .update({ is_premium: true, premium_plan: "premium", premium_expires_at: expiresAt })
                    .eq("id", profile.id);
                await reply(chatId, updateError
                    ? `실패: ${updateError.message}`
                    : `${email} 프리미엄 ${days}일 부여 완료 (만료: ${expiresAt.split("T")[0]})`
                );
                break;
            }

            case "/user": {
                const email = args[0];
                if (!email) { await reply(chatId, "사용법: /user [이메일]"); break; }
                const { data } = await supabase
                    .from("profiles")
                    .select("id, nickname, email, points, is_premium, premium_plan, premium_expires_at, is_banned, created_at")
                    .eq("email", email)
                    .single();
                if (!data) {
                    await reply(chatId, "유저를 찾을 수 없습니다");
                } else {
                    await reply(chatId, [
                        `<b>${data.nickname || "이름없음"}</b>`,
                        `이메일: ${data.email || email}`,
                        `포인트: ${data.points || 0}`,
                        `프리미엄: ${data.is_premium ? `${data.premium_plan} (${data.premium_expires_at?.split("T")[0]})` : "무료"}`,
                        `차단: ${data.is_banned ? "차단됨" : "정상"}`,
                        `가입일: ${data.created_at?.split("T")[0]}`,
                    ].join("\n"));
                }
                break;
            }

            case "/reports": {
                const { data } = await supabase
                    .from("reports")
                    .select("id, target_type, target_id, reason, created_at")
                    .eq("status", "pending")
                    .order("created_at", { ascending: false })
                    .limit(5);
                if (!data || data.length === 0) {
                    await reply(chatId, "미처리 신고가 없습니다");
                } else {
                    const lines = ["<b>미처리 신고 (최근 5건)</b>", ""];
                    for (const r of data) {
                        lines.push(`${r.target_type} | ${r.reason} | ${r.created_at?.split("T")[0]}`);
                        lines.push(`  ID: ${r.target_id}`);
                    }
                    await reply(chatId, lines.join("\n"));
                }
                break;
            }

            default: {
                if (text.startsWith("/")) {
                    await reply(chatId, "알 수 없는 명령어입니다. /help로 명령어 목록을 확인하세요.");
                }
                break;
            }
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true });
    }
}
