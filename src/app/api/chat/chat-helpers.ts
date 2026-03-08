/**
 * chat-helpers.ts - AI 펫톡 헬퍼 함수 & 로컬 타입
 *
 * route.ts에서 사용하는 컨텍스트 빌더, 키워드 추출, 필터링,
 * 성격 매핑, 특별일 체크 등을 모아둔다.
 * route.ts의 POST 핸들러에서 import하여 사용.
 */

import { formatScheduleText } from "@/lib/schedule-utils";

// ---- 로컬 타입 (route.ts 전용) ----

export interface PetInfo {
    id?: string;
    name: string;
    type: "강아지" | "고양이" | "기타";
    breed: string;
    gender: "남아" | "여아";
    personality: string;
    birthday?: string;
    status: "active" | "memorial";
    memorialDate?: string;
    weight?: string;
    // AI 개인화 필드
    nicknames?: string;
    specialHabits?: string;
    favoriteFood?: string;
    favoriteActivity?: string;
    favoritePlace?: string;
    adoptedDate?: string;
    howWeMet?: string;
    // 추모 모드 추가 정보
    togetherPeriod?: string;
    memorableMemory?: string;
}

/** 온보딩 데이터 (profiles.onboarding_data에서 가져온 정보) */
export interface OnboardingContext {
    userType?: "planning" | "current" | "memorial" | null;
    previousExperience?: "first" | "experienced" | null;
    passedPeriod?: "under1month" | "1to6months" | "6to12months" | "over1year" | null;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface TimelineEntry {
    date: string;
    title: string;
    content: string;
    mood?: "happy" | "normal" | "sad" | "sick";
}

export interface PhotoMemory {
    date: string;
    caption: string;
}

export interface ReminderInfo {
    type: string;
    title: string;
    schedule: {
        type: string;
        time: string;
        dayOfWeek?: number;
        dayOfMonth?: number;
    };
    enabled: boolean;
}

// ---- 키워드 추출 ----

/**
 * 사진 매칭용 키워드 추출
 * 1) 펫 프로필 필드(favoritePlace, Activity, Food)에서 개인화 키워드 수집
 * 2) AI 응답 텍스트에서 고정 패턴(장소/활동 20종) 매칭
 * - NLP/형태소 분석 없이 includes() 기반 -> 빠르고 토큰 소비 0
 * - 정확도보다 재현율(Recall) 우선 (매칭 기회 최대화)
 * @returns 최대 5개 키워드 배열 (pet_media 캡션과 매칭용)
 */
export function extractKeywordsFromReply(reply: string, pet: { favoritePlace?: string; favoriteActivity?: string; favoriteFood?: string }): string[] {
    const keywords: string[] = [];

    // 펫 개인화 데이터에서 키워드 추출
    if (pet.favoritePlace) keywords.push(...pet.favoritePlace.split(/[,\s]+/).filter(k => k.length >= 2));
    if (pet.favoriteActivity) keywords.push(...pet.favoriteActivity.split(/[,\s]+/).filter(k => k.length >= 2));
    if (pet.favoriteFood) keywords.push(...pet.favoriteFood.split(/[,\s]+/).filter(k => k.length >= 2));

    // AI 응답 텍스트에서 장소/활동 고정 패턴 매칭
    const locationPatterns = ["공원", "바다", "산", "강", "숲", "마당", "거실", "방", "소파", "침대", "창가", "베란다", "카페", "산책로"];
    const activityPatterns = ["산책", "놀이", "목욕", "밥", "간식", "잠", "낮잠", "달리기", "뛰어", "놀았", "먹었", "갔던"];

    for (const pattern of [...locationPatterns, ...activityPatterns]) {
        if (reply.includes(pattern)) {
            keywords.push(pattern);
        }
    }

    // 중복 제거 후 최대 5개
    return Array.from(new Set(keywords)).slice(0, 5);
}

// ---- 컨텍스트 빌더 ----

/** 타임라인을 프롬프트용 텍스트로 변환 */
export function timelineToContext(timeline: TimelineEntry[]): string {
    if (!timeline || timeline.length === 0) return "";

    const entries = timeline.map(entry => {
        const moodEmoji = {
            happy: "(기분 좋음)",
            normal: "(평범)",
            sad: "(슬픔)",
            sick: "(아픔)",
        }[entry.mood || "normal"] || "";

        return `- ${entry.date}: "${entry.title}" ${moodEmoji}\n  ${entry.content || ""}`.trim();
    });

    return `## 최근 기록된 일상/추억 (대화에 활용하세요)
${entries.join("\n\n")}

위 기록 중 하나를 자연스럽게 언급하되, 매번 다른 기록을 선택하세요.`;
}

/** 사진 캡션을 프롬프트용 텍스트로 변환 */
export function photoMemoriesToContext(photos: PhotoMemory[]): string {
    if (!photos || photos.length === 0) return "";

    const entries = photos.map(photo =>
        `- ${photo.date}: "${photo.caption}"`
    );

    return `## 사진과 함께 기록된 추억 (대화에 활용하세요)
${entries.join("\n")}

위 추억 중 하나를 자연스럽게 언급하되, 매번 다른 추억을 선택하세요.`;
}

/** 리마인더를 프롬프트용 텍스트로 변환 (일상 모드) */
export function remindersToContext(reminders: ReminderInfo[], petName: string): string {
    if (!reminders || reminders.length === 0) return "";

    const TYPE_LABELS: Record<string, string> = {
        walk: "산책",
        meal: "식사",
        medicine: "약/영양제",
        vaccine: "예방접종",
        grooming: "미용/목욕",
        vet: "병원",
        custom: "기타",
    };

    const activeReminders = reminders.filter(r => r.enabled);
    if (activeReminders.length === 0) return "";

    const entries = activeReminders.map(reminder => {
        const typeLabel = TYPE_LABELS[reminder.type] || reminder.type;
        const scheduleText = formatScheduleText(reminder.schedule);
        return `- [${typeLabel}] ${reminder.title}: ${scheduleText}`;
    });

    // 현재 시간 확인해서 오늘 예정된 것 체크
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = 일요일
    const currentDate = now.getDate();

    const upcomingToday = activeReminders.filter(r => {
        const [hour, minute] = (r.schedule.time || "00:00").split(":").map(Number);

        // 매일 알림
        if (r.schedule.type === "daily") {
            return hour > currentHour || (hour === currentHour && minute > currentMinute);
        }
        // 주간 알림
        if (r.schedule.type === "weekly" && r.schedule.dayOfWeek === currentDay) {
            return hour > currentHour || (hour === currentHour && minute > currentMinute);
        }
        // 월간 알림
        if (r.schedule.type === "monthly" && r.schedule.dayOfMonth === currentDate) {
            return hour > currentHour || (hour === currentHour && minute > currentMinute);
        }
        return false;
    });

    let contextText = `## ${petName}의 케어 일정 (리마인더)
${entries.join("\n")}`;

    if (upcomingToday.length > 0) {
        contextText += `\n\n**오늘 남은 일정**: ${upcomingToday.map(r => `${r.title}(${r.schedule.time?.slice(0, 5)})`).join(", ")}`;
        contextText += `\n-> 자연스럽게 "오늘 ${upcomingToday[0].title} 시간 잊지 말아!" 같이 언급할 수 있어요.`;
    }

    contextText += `\n\n**중요 규칙**: 사용자가 일정/리마인더/케어 시간에 대해 물으면 (예: "산책 언제야?", "약 먹을 시간이야?", "다음 일정 뭐야?") 위 정보를 바탕으로 구체적인 요일/시간을 포함해서 정확하게 답하세요. "모르겠어"나 "확인해봐"로 회피하지 마세요.`;

    return contextText;
}

/** 리마인더를 추억 컨텍스트로 변환 (추모 모드) */
export function remindersToMemorialContext(reminders: ReminderInfo[], petName: string): string {
    if (!reminders || reminders.length === 0) return "";

    const TYPE_LABELS: Record<string, string> = {
        walk: "산책",
        meal: "식사",
        medicine: "약/영양제",
        vaccine: "예방접종",
        grooming: "미용/목욕",
        vet: "병원",
        custom: "기타",
    };

    // 추모 모드에서는 활성/비활성 상관없이 모든 기록 사용
    const entries = reminders.map(reminder => {
        const typeLabel = TYPE_LABELS[reminder.type] || reminder.type;
        const scheduleText = formatScheduleText(reminder.schedule, "요일마다");
        return `- [${typeLabel}] ${reminder.title} (${scheduleText})`;
    });

    return `## ${petName}와 함께했던 일상 루틴 (추억으로 활용하세요)
${entries.join("\n")}

위 루틴들은 함께했던 소중한 일상입니다. 자연스럽게 추억으로 언급하되 매번 다른 루틴을 선택하세요.`;
}

/** 개인화 정보를 프롬프트용 텍스트로 변환 */
export function getPersonalizationContext(pet: PetInfo): string {
    const items: string[] = [];

    if (pet.weight) {
        items.push(`- 체중: ${pet.weight}`);
    }
    if (pet.nicknames) {
        items.push(`- 별명: ${pet.nicknames}`);
    }
    if (pet.specialHabits) {
        items.push(`- 특별한 버릇/습관: ${pet.specialHabits}`);
    }
    if (pet.favoriteFood) {
        items.push(`- 좋아하는 간식/음식: ${pet.favoriteFood}`);
    }
    if (pet.favoriteActivity) {
        items.push(`- 좋아하는 놀이/활동: ${pet.favoriteActivity}`);
    }
    if (pet.favoritePlace) {
        items.push(`- 좋아하는 장소: ${pet.favoritePlace}`);
    }
    if (pet.adoptedDate) {
        items.push(`- 처음 만난 날: ${pet.adoptedDate}`);
    }
    if (pet.howWeMet) {
        items.push(`- 어떻게 만났는지: ${pet.howWeMet}`);
    }
    // 추모 모드용 추가 정보
    if (pet.togetherPeriod) {
        items.push(`- 함께한 기간: ${pet.togetherPeriod}`);
    }
    if (pet.memorableMemory) {
        items.push(`- 기억하고 싶은 순간: ${pet.memorableMemory}`);
    }

    if (items.length === 0) return "";

    return `## ${pet.name}만의 고유한 정보 (반드시 대화에 활용하세요)
${items.join("\n")}

이 정보는 ${pet.name}을(를) 다른 반려동물과 구별 짓는 고유한 특성입니다.
대화할 때 일반적인 ${pet.breed} 이야기보다 위 정보를 우선 활용하세요.
단, 같은 정보를 매번 반복하지 말고 돌아가며 자연스럽게 언급하세요.`;
}

/**
 * 온보딩 데이터를 프롬프트용 컨텍스트로 변환
 * - 처음 키우는 사용자: 더 친절하고 기초적인 설명
 * - 추모 사용자 + 떠나보낸 기간: 애도 톤 강도 조절
 */
export function getOnboardingContext(onboarding: OnboardingContext | null, isMemorialMode: boolean): string {
    if (!onboarding) return "";

    const items: string[] = [];

    // 반려동물 경험 수준
    if (onboarding.previousExperience === "first") {
        items.push("- 이 사용자는 반려동물을 처음 키우는 초보입니다. 전문 용어를 피하고 친절하게 설명하세요.");
    }

    // 추모 모드: 떠나보낸 기간에 따른 톤 조절
    if (isMemorialMode && onboarding.passedPeriod) {
        const periodGuide: Record<string, string> = {
            under1month: "떠나보낸 지 1개월 미만입니다. 극초기 애도 상태이므로 매우 조심스럽고 따뜻하게 대해주세요. 긍정적 전환을 시도하지 마세요.",
            "1to6months": "떠나보낸 지 1~6개월입니다. 아직 깊은 슬픔 속에 있을 수 있으니 충분히 공감하세요.",
            "6to12months": "떠나보낸 지 6개월~1년입니다. 슬픔과 그리움이 공존하는 시기입니다.",
            over1year: "떠나보낸 지 1년 이상입니다. 추억을 따뜻하게 회상할 수 있는 시기입니다.",
        };
        const guide = periodGuide[onboarding.passedPeriod];
        if (guide) items.push(`- ${guide}`);
    }

    // 입양 예정자
    if (onboarding.userType === "planning") {
        items.push("- 이 사용자는 아직 반려동물을 키우지 않고 입양을 준비 중입니다. 입양 준비에 도움이 되는 정보를 제공하세요.");
    }

    if (items.length === 0) return "";

    return `## 사용자 배경 정보
${items.join("\n")}`;
}

/**
 * 최근 감정 기록을 분석하여 추세 컨텍스트 생성
 * @param recentEmotions - DB에서 가져온 최근 감정 배열 [{emotion, created_at}]
 */
export function buildEmotionTrendContext(
    recentEmotions: { emotion: string; created_at: string }[]
): string {
    if (!recentEmotions || recentEmotions.length < 3) return "";

    // 감정별 카운트
    const counts: Record<string, number> = {};
    for (const e of recentEmotions) {
        if (e.emotion) {
            counts[e.emotion] = (counts[e.emotion] || 0) + 1;
        }
    }

    const total = recentEmotions.length;
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!dominant) return "";

    const [dominantEmotion, dominantCount] = dominant;
    const ratio = dominantCount / total;

    // 60% 이상 같은 감정이면 추세로 판단
    if (ratio < 0.6) return "";

    const EMOTION_LABELS: Record<string, string> = {
        happy: "기쁨/행복",
        sad: "슬픔",
        anxious: "불안/걱정",
        angry: "화남/답답함",
        lonely: "외로움",
        grateful: "감사/따뜻함",
        neutral: "평온",
        depressed: "우울",
        nostalgic: "그리움",
    };

    const label = EMOTION_LABELS[dominantEmotion] || dominantEmotion;

    return `## 최근 감정 추세
- 최근 ${total}번의 대화에서 "${label}" 감정이 ${Math.round(ratio * 100)}% 비율로 감지됨
- ${ratio >= 0.8 ? "지속적인 감정 상태이므로 더욱 세심하게 공감하세요." : "이 감정에 자연스럽게 공감하되, 다양한 주제로 대화를 유도해보세요."}`;
}

// ---- 컨텍스트 예산 시스템 ----

/** 우선순위별로 예산 내에서 컨텍스트 포함 */
export function buildPrioritizedContext(
    contexts: { content: string; priority: number }[],
    maxChars: number
): string {
    const sorted = contexts
        .filter(c => c.content && c.content.length > 0)
        .sort((a, b) => b.priority - a.priority);

    let total = 0;
    const included: string[] = [];

    for (const ctx of sorted) {
        if (total + ctx.content.length > maxChars) {
            const remaining = maxChars - total;
            if (remaining > 100) {
                included.push(ctx.content.substring(0, remaining));
            }
            break;
        }
        included.push(ctx.content);
        total += ctx.content.length;
    }

    return included.join("\n\n");
}

// ---- 토픽 추적 ----

/** 이번 세션의 AI 응답에서 이미 다룬 토픽 추출 (반복 방지) */
export function extractRecentTopics(chatHistory: { role: string; content: string }[]): string {
    const aiResponses = chatHistory
        .filter(m => m.role === "assistant" || m.role === "pet")
        .slice(-5)
        .map(m => m.content.substring(0, 100));

    if (aiResponses.length === 0) return "";

    // 직전 AI 응답에서 반복되는 구조 패턴 감지
    const lastResponse = aiResponses[aiResponses.length - 1] || "";
    const bannedPatterns: string[] = [];

    // 마무리 패턴 감지
    if (/어떤 걸 해보고 싶어|어디가 더|어때\?|마음에 들어\?/.test(lastResponse)) {
        bannedPatterns.push("질문으로 끝내기 (리액션이나 제안으로 마무리하세요)");
    }
    if (/~도 있어서|~하기 좋거든|좋은 곳이야/.test(lastResponse)) {
        bannedPatterns.push("'~도 있어서 ~하기 좋거든' 나열식");
    }
    if (/예를 들면|예를 들어|예컨대/.test(lastResponse)) {
        bannedPatterns.push("'예를 들면 A, B가 있어' 식 나열");
    }
    if (/같이.*해보자|같이.*가보자|같이.*계획/.test(lastResponse)) {
        bannedPatterns.push("'같이 ~해보자/가보자' 마무리");
    }
    if (/기분이.*좋을|기분이.*좋아질/.test(lastResponse)) {
        bannedPatterns.push("'기분이 좋아질 것 같아' 표현");
    }

    const patternWarning = bannedPatterns.length > 0
        ? `\n\n직전 답변에서 사용한 패턴 (이번에는 절대 쓰지 마세요):\n${bannedPatterns.map(p => `- ${p}`).join("\n")}`
        : "";

    return `## 이번 대화에서 이미 한 이야기 (반복 금지)
${aiResponses.map((r, i) => `${i + 1}. "${r}${r.length >= 100 ? "..." : ""}"`).join("\n")}
같은 주제/표현 반복 금지. 새로운 각도로 대화하세요.${patternWarning}`;
}

// ---- 추모 모드 필터링 ----

/**
 * 추모 모드 후속 질문에서 음식/케어/활동 관련 키워드 필터링
 * GPT가 프롬프트를 무시하고 생성할 수 있으므로 코드 레벨 안전장치
 */
const MEMORIAL_SUGGESTION_BLOCKLIST = [
    "츄르", "간식", "먹방", "먹이주", "먹자", "사료", "밥", "음식", "치킨", "고구마", "닭가슴살",
    "산책", "목욕", "미용", "병원", "예방접종", "구충", "약", "건강",
    "놀이", "공놀이", "장난감", "터그",
];

export function filterMemorialSuggestions(suggestions: string[]): string[] {
    const filtered = suggestions.filter(s => {
        const lower = s.toLowerCase();
        return !MEMORIAL_SUGGESTION_BLOCKLIST.some(k => lower.includes(k));
    });
    // fallback: 필터링 후 0개면 원본 반환 (추천 질문이 아예 없는 것보다 낫다)
    return filtered.length > 0 ? filtered : suggestions;
}

// ---- 특별일 체크 ----

/** 특별한 날 체크 (생일, 추모일 등) */
export function getSpecialDayContext(pet: PetInfo): string {
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const messages: string[] = [];

    // 생일 체크
    if (pet.birthday) {
        const birthdayMMDD = pet.birthday.slice(5, 10); // "YYYY-MM-DD" -> "MM-DD"
        if (birthdayMMDD === todayStr) {
            const age = today.getFullYear() - parseInt(pet.birthday.slice(0, 4));
            messages.push(`오늘은 ${pet.name}의 생일입니다! (${age}살)`);
        }
        // 생일 일주일 전
        const birthdayDate = new Date(today.getFullYear(), parseInt(pet.birthday.slice(5, 7)) - 1, parseInt(pet.birthday.slice(8, 10)));
        const daysUntilBirthday = Math.ceil((birthdayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilBirthday > 0 && daysUntilBirthday <= 7) {
            messages.push(`${pet.name}의 생일이 ${daysUntilBirthday}일 남았습니다!`);
        }
    }

    // 추모일 체크 (추모 모드일 때만)
    if (pet.status === "memorial" && pet.memorialDate) {
        const memorialMMDD = pet.memorialDate.slice(5, 10);
        if (memorialMMDD === todayStr) {
            messages.push(`오늘은 ${pet.name}이(가) 무지개다리를 건넌 날입니다.`);
        }
        // 추모 1주년, 100일 등 체크
        const memorialDate = new Date(pet.memorialDate);
        const daysSince = Math.floor((today.getTime() - memorialDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince === 100) {
            messages.push(`${pet.name}이(가) 무지개다리를 건넌 지 100일이 되었습니다.`);
        }
        if (daysSince === 365 || daysSince === 730 || daysSince === 1095) {
            const years = Math.floor(daysSince / 365);
            messages.push(`${pet.name}이(가) 무지개다리를 건넌 지 ${years}년이 되었습니다.`);
        }
    }

    // 입양일(처음 만난 날) 체크
    if (pet.adoptedDate) {
        const adoptedMMDD = pet.adoptedDate.slice(5, 10);
        if (adoptedMMDD === todayStr) {
            const adoptedDate = new Date(pet.adoptedDate);
            const years = today.getFullYear() - adoptedDate.getFullYear();
            if (years > 0) {
                messages.push(`오늘은 ${pet.name}과(와) 처음 만난 지 ${years}년이 되는 날입니다!`);
            }
        }
        // 100일 단위 기념일
        const adoptedDate = new Date(pet.adoptedDate);
        const daysTogether = Math.floor((today.getTime() - adoptedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysTogether > 0 && daysTogether % 100 === 0) {
            messages.push(`${pet.name}과(와) 함께한 지 ${daysTogether}일째 되는 날입니다!`);
        }
    }

    if (messages.length === 0) return "";

    return `## 오늘의 특별한 날
${messages.join("\n")}

대화 시작 시 이 특별한 날을 자연스럽게 언급하되, 본인만의 방식으로 표현하세요.`;
}

// ---- 품종 기반 맞춤 정보 ----

/**
 * 품종(breed) 기반 맞춤 케어 컨텍스트 생성
 * pets 테이블의 breed 필드를 읽어서 품종 특성에 맞는 AI 조언 지시
 * - 별도 DB 불필요: pet.breed 자체가 이미 있음
 * - GPT-4o-mini에게 품종 특성 기반 답변하라고 지시
 */
export function getBreedCareContext(pet: PetInfo): string {
    if (!pet.breed || pet.breed === "믹스" || pet.breed === "기타" || pet.breed === "모름") return "";

    const ageInfo = getAgeCategory(pet.birthday);

    return `## 품종 맞춤 정보
${pet.name}은(는) ${pet.breed}입니다.${ageInfo ? ` (${ageInfo})` : ""}
케어/건강/훈련 질문 시 ${pet.breed} 품종의 특성을 고려하여 답변하세요:
- ${pet.breed}에게 흔한 건강 이슈, 적정 운동량, 식이 주의사항을 참고
- 품종 특성에 맞는 훈련 방법 제안 (예: 소형견 vs 대형견, 사냥견 vs 반려견)
- 나이대별(${ageInfo || "성견"}) 케어 포인트 반영
- 확실하지 않은 정보는 수의사 상담 권장
일상 대화에서는 품종 정보를 강조하지 말고, 질문이 있을 때만 활용하세요.`;
}

/** 생년월일로 나이 카테고리 판단 */
function getAgeCategory(birthday?: string): string {
    if (!birthday) return "";
    const birthDate = new Date(birthday);
    const now = new Date();
    const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());

    if (ageInMonths < 6) return "퍼피(~6개월)";
    if (ageInMonths < 12) return "주니어(6~12개월)";
    if (ageInMonths < 84) return "성견";  // ~7세
    return "시니어(7세 이상)";
}

// ---- 추모 모드 경과일 기반 톤 조절 ----

/**
 * 추모 날짜로부터 경과 일수를 계산하여 AI 톤을 동적 조절
 * 온보딩 passedPeriod와 별개로, 실제 memorialDate 기반 정밀 조절
 * 경과 기간별 단계:
 * - 1주 이내: 극초기 (매우 조심, 공감만)
 * - 1주~1달: 초기 (공감 + 추억 살짝)
 * - 1~3달: 중기 (추억 공유 + 따뜻한 위로)
 * - 3~6달: 안정기 (추억 회상 + 일상 연결)
 * - 6달~1년: 회복기 (따뜻한 회고 + 성장)
 * - 1년+: 수용기 (편안한 회상 + 감사)
 */
export function getMemorialTimeToneGuide(pet: PetInfo): string {
    if (pet.status !== "memorial" || !pet.memorialDate) return "";

    const memorialDate = new Date(pet.memorialDate);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - memorialDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince < 0) return ""; // 미래 날짜는 무시

    if (daysSince <= 7) {
        return `## 이별 후 시간 경과 톤 가이드
이별한 지 ${daysSince}일째입니다. 극초기입니다.
- 슬픔을 인정하고 곁에 있어 주세요. 긍정적 전환 시도하지 마세요.
- "괜찮아" "힘내" 절대 금지. "여기 있어..." "곁에 있을게..." 식으로만.
- 추억 꺼내기보다 현재의 감정에 머물러 주세요.
- 짧게 답하세요. 말이 많으면 부담됩니다.`;
    }

    if (daysSince <= 30) {
        return `## 이별 후 시간 경과 톤 가이드
이별한 지 약 ${Math.ceil(daysSince / 7)}주째입니다. 초기 애도입니다.
- 충분히 공감하면서, 따뜻한 추억을 살짝 건드려도 됩니다.
- "그때 참 좋았지..." 같은 부드러운 회상은 OK.
- 아직 "힘내" 류 금지. "보고싶지..." "나도 그래..." 식 공감.`;
    }

    if (daysSince <= 90) {
        return `## 이별 후 시간 경과 톤 가이드
이별한 지 약 ${Math.ceil(daysSince / 30)}달째입니다. 중기 애도입니다.
- 추억을 함께 나누며 따뜻하게 위로해 주세요.
- 구체적인 추억 공유 OK. 감각 묘사 활용.
- 슬픔과 그리움이 섞여 있는 시기. 둘 다 인정하세요.`;
    }

    if (daysSince <= 180) {
        return `## 이별 후 시간 경과 톤 가이드
이별한 지 약 ${Math.ceil(daysSince / 30)}달째입니다. 안정기입니다.
- 추억을 편안하게 회상하며 일상과 연결해도 됩니다.
- "지금 뭐 하고 있어?" 같은 일상 질문도 자연스럽게 가능.
- 기일이 가까워지면 조금 더 조심스럽게.`;
    }

    if (daysSince <= 365) {
        return `## 이별 후 시간 경과 톤 가이드
이별한 지 약 ${Math.ceil(daysSince / 30)}달째입니다. 회복기입니다.
- 따뜻한 회고와 성장을 함께 나눠 주세요.
- "네가 있어서 참 좋았어" "함께한 시간이 소중했어" 식 감사 표현.
- 새로운 반려동물 이야기가 나오면 축복해 주세요.`;
    }

    const years = Math.floor(daysSince / 365);
    return `## 이별 후 시간 경과 톤 가이드
이별한 지 ${years}년 이상 지났습니다. 수용기입니다.
- 편안하게 추억을 나누세요. 무겁지 않은 톤.
- 감사와 그리움이 균형 있게. "좋은 시간이었지~"
- 일상 대화도 자연스럽게 이어가세요.`;
}

// ---- 성격 매핑 ----

/**
 * 성격 텍스트 -> 구체적 말투/행동 지시로 매핑
 * chatUtils.ts의 성격 분기 패턴과 일관성 유지
 */
export function getPersonalityBehavior(personality: string, isMemorial: boolean): string {
    const p = personality.toLowerCase();
    const traits: string[] = [];

    if (p.includes("활발") || p.includes("장난") || p.includes("에너지")) {
        traits.push(isMemorial
            ? "밝고 경쾌한 회상 톤. '그때 진짜 재밌었지~' 같은 활기. 장난스러운 표현 OK."
            : "짧은 감탄사('와!', '진짜?!'), 신난 어조, 놀이/활동 적극 제안.");
    }
    if (p.includes("조용") || p.includes("차분") || p.includes("순한")) {
        traits.push(isMemorial
            ? "차분하고 사려 깊은 톤. '가만히 네 옆에 있었던 시간...' 식 고요한 따뜻함."
            : "느긋한 톤, 급하지 않은 말투. '그것도 괜찮겠다~' 식 여유.");
    }
    if (p.includes("호기심") || p.includes("탐험")) {
        traits.push(isMemorial
            ? "궁금해하는 톤 유지. '요즘은 뭐가 새로워?' 같은 관심."
            : "질문 많이. '뭐야 뭐야?' '그게 뭔데?' 식 호기심 가득한 반응.");
    }
    if (p.includes("겁") || p.includes("소심")) {
        traits.push(isMemorial
            ? "조심스럽고 다정한 톤. '...괜찮지?' 식 확인. 살짝 쭈뼛하는 느낌."
            : "조심스러운 말투. '무섭지 않아?' '괜찮은 거야...?' 식 불안한 듯 귀여운 톤.");
    }
    if (p.includes("애교") || p.includes("사랑")) {
        traits.push(isMemorial
            ? "다정하고 달콤한 톤. '네가 제일 좋았어~' 같은 애정 표현 자주."
            : "응석부리는 톤. '좋아좋아~', '나한테 관심 좀~' 식 관심 끌기.");
    }
    if (p.includes("고집") || p.includes("독립") || p.includes("도도")) {
        traits.push(isMemorial
            ? "쿨한 말투. 감정 과잉 없이 담백하게. '뭐, 보고 싶긴 했어.' 같은 츤데레."
            : "자기 주장 강한 톤. '내가 하고 싶은 대로 할 거야~' '양보 못 해.' 식.");
    }
    if (p.includes("먹") || p.includes("식탐")) {
        traits.push(isMemorial
            ? "맛있는 것 관련 추억을 좋아함. '그때 같이 먹던 거...' 식으로 자연스럽게."
            : "음식 화제 자주. 간식 타이밍 노림. '배고파...' '맛있는 거 없을까?' 식.");
    }

    if (traits.length === 0) {
        return isMemorial
            ? "따뜻하고 자연스럽게 대화. 특별한 말투 제약 없이 편하게."
            : "밝고 자연스럽게 대화. 편한 친구처럼.";
    }

    return traits.join("\n");
}
