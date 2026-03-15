/**
 * 전체 계정 감사 스크립트
 * 모든 유저의 프로필, 펫, 사진, 채팅, 포인트 정합성 검증
 */
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.");
  process.exit(1);
}
const supabase = createClient(url, key);

async function audit() {
  const issues = [];

  // ── 1. 전체 데이터 로드 ─────────────────────────
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, email, nickname, is_premium, is_admin, is_banned, points, total_points_earned, premium_plan, premium_started_at, premium_expires_at, user_type, onboarding_completed_at, tutorial_completed_at, created_at, last_seen_at, equipped_minimi_id")
    .order("created_at", { ascending: true });

  if (profErr) { console.error("DB 조회 실패:", profErr); return; }

  const { data: pets } = await supabase.from("pets").select("id, user_id, name, status, created_at");
  const { data: media } = await supabase.from("pet_media").select("pet_id, id");
  const { data: authUsers } = await supabase.auth.admin.listUsers();

  const profileIds = new Set(profiles.map(p => p.id));

  console.log("========================================");
  console.log("  메멘토애니 전체 계정 감사 보고서");
  console.log("  실행 시각:", new Date().toLocaleString("ko-KR"));
  console.log("========================================\n");

  // ── 2. 기본 통계 ────────────────────────────────
  console.log("[ 기본 통계 ]");
  console.log("  Auth 유저:", authUsers.users.length, "명");
  console.log("  프로필:", profiles.length, "개");
  console.log("  반려동물:", (pets || []).length, "마리");
  console.log("  사진:", (media || []).length, "장");
  console.log("");

  // ── 3. 프로필 없는 auth 유저 ────────────────────
  const orphanUsers = authUsers.users.filter(u => {
    return !profileIds.has(u.id);
  });
  if (orphanUsers.length > 0) {
    console.log("[ 경고: 프로필 없는 유저", orphanUsers.length, "명 ]");
    for (const u of orphanUsers) {
      console.log("  -", u.email || "(이메일 없음)", "| Provider:", u.app_metadata?.provider, "| ID:", u.id.substring(0, 8));
      issues.push({ type: "ORPHAN_AUTH", userId: u.id, email: u.email, detail: "auth.users에 존재하나 profiles 테이블에 없음" });
    }
    console.log("");
  }

  // ── 4. 계정별 상세 체크 ─────────────────────────
  console.log("[ 전체 계정 현황 ]");
  for (const p of profiles) {
    const tags = [];
    if (p.is_admin) tags.push("ADMIN");
    if (p.is_premium) tags.push("PREMIUM(" + (p.premium_plan || "?") + ")");
    if (p.is_banned) tags.push("BANNED");
    if (tags.length === 0) tags.push("FREE");

    const userPets = (pets || []).filter(pet => pet.user_id === p.id);
    const petLimit = p.is_premium ? 10 : 1;

    console.log("  " + (p.nickname || "(닉네임없음)").padEnd(12) +
      " | " + (p.email || "").padEnd(28) +
      " | pts:" + String(p.points).padEnd(7) +
      " | " + tags.join(",").padEnd(20) +
      " | 펫:" + userPets.length + "/" + petLimit);

    // 문제 체크
    if (!p.nickname) {
      issues.push({ type: "NO_NICKNAME", userId: p.id, email: p.email, detail: "닉네임 없음" });
    }
    if (p.is_premium && p.premium_expires_at && new Date(p.premium_expires_at) < new Date()) {
      issues.push({ type: "EXPIRED_PREMIUM", userId: p.id, email: p.email, detail: "프리미엄 만료: " + p.premium_expires_at });
    }
    if (p.is_premium && !p.premium_plan) {
      issues.push({ type: "NO_PLAN", userId: p.id, email: p.email, detail: "프리미엄인데 plan 없음" });
    }
    if (p.points < 0) {
      issues.push({ type: "NEGATIVE_POINTS", userId: p.id, email: p.email, detail: "포인트 음수: " + p.points });
    }
    if (userPets.length > petLimit) {
      issues.push({ type: "PET_LIMIT", userId: p.id, email: p.email, detail: "펫 " + userPets.length + "마리 (제한 " + petLimit + ")" });
    }
  }
  console.log("");

  // ── 5. 사진 제한 체크 ───────────────────────────
  const mediaByPet = {};
  (media || []).forEach(m => { mediaByPet[m.pet_id] = (mediaByPet[m.pet_id] || 0) + 1; });

  console.log("[ 펫별 사진 현황 ]");
  for (const [petId, count] of Object.entries(mediaByPet)) {
    const pet = (pets || []).find(p => p.id === petId);
    const owner = pet ? profiles.find(p => p.id === pet.user_id) : null;
    const limit = (owner && owner.is_premium) ? 1000 : 50;
    const warn = count > limit ? " << 제한 초과" : "";
    console.log("  " + (pet ? pet.name : "알수없음").padEnd(10) + ": " + count + "장 (제한 " + limit + ")" + warn);
    if (count > limit) {
      issues.push({ type: "PHOTO_LIMIT", userId: owner?.id, email: owner?.email, detail: pet.name + " 사진 " + count + "장 (제한 " + limit + ")" });
    }
  }
  console.log("");

  // ── 6. 고아 펫 (유저 없는 펫) ───────────────────
  const orphanPets = (pets || []).filter(pet => {
    return !profileIds.has(pet.user_id);
  });
  if (orphanPets.length > 0) {
    console.log("[ 경고: 유저 없는 고아 펫", orphanPets.length, "마리 ]");
    orphanPets.forEach(p => {
      console.log("  -", p.name, "| user_id:", p.user_id.substring(0, 8));
      issues.push({ type: "ORPHAN_PET", detail: p.name + " (user: " + p.user_id.substring(0, 8) + ")" });
    });
    console.log("");
  }

  // ── 7. 오늘 채팅 횟수 ──────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const { data: chats } = await supabase
    .from("chat_messages")
    .select("user_id, id")
    .eq("role", "user")
    .gte("created_at", today + "T00:00:00+09:00");

  if (chats && chats.length > 0) {
    console.log("[ 오늘 채팅 횟수 ]");
    const chatsByUser = {};
    chats.forEach(c => { chatsByUser[c.user_id] = (chatsByUser[c.user_id] || 0) + 1; });
    for (const [userId, count] of Object.entries(chatsByUser)) {
      const p = profiles.find(pr => pr.id === userId);
      const limit = (p && p.is_premium) ? "무제한" : 10;
      const warn = (typeof limit === "number" && count > limit) ? " << 제한 초과" : "";
      console.log("  " + ((p ? p.nickname : null) || userId.substring(0, 8)) + ": " + count + "회 (제한 " + limit + ")" + warn);
    }
    console.log("");
  }

  // ── 8. 문제 요약 ───────────────────────────────
  console.log("========================================");
  if (issues.length === 0) {
    console.log("  모든 계정 정상 - 문제 없음");
  } else {
    console.log("  발견된 문제:", issues.length, "건");
    console.log("----------------------------------------");
    issues.forEach((issue, i) => {
      console.log("  " + (i + 1) + ". [" + issue.type + "] " + (issue.email || "") + " - " + issue.detail);
    });
  }
  console.log("========================================\n");

  return issues;
}

audit().catch(console.error);
