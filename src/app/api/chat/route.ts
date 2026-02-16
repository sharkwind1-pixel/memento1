/**
 * AI 펫톡 에이전트 API Route
 * 장기 메모리 + 감정 인식 시스템
 */

// Next.js 빌드 시점 정적 분석 방지 (환경변수 런타임 접근 필요)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { awardPoints } from "@/lib/points";
import {
    getClientIP,
    checkRateLimit,
    checkDailyUsage,
    getRateLimitHeaders,
    sanitizeInput,
    checkVPN,
    getVPNBlockResponse,
} from "@/lib/rate-limit";

function getPointsSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

// agent 모듈은 런타임에만 동적 import (빌드 시점 환경변수 에러 방지)
// EmotionType, GriefStage 타입만 여기서 정의
type EmotionType = "happy" | "sad" | "anxious" | "angry" | "grateful" | "lonely" | "peaceful" | "excited" | "neutral";
type GriefStage = "denial" | "anger" | "bargaining" | "depression" | "acceptance" | "unknown";

// OpenAI 클라이언트 (지연 초기화)
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (!openaiInstance) {
        openaiInstance = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiInstance;
}

// agent 모듈 동적 import 함수
async function getAgentModule() {
    return await import("@/lib/agent");
}

// 반려동물 정보 타입
interface PetInfo {
    id?: string;
    name: string;
    type: "강아지" | "고양이" | "기타";
    breed: string;
    gender: "남아" | "여아";
    personality: string;
    birthday?: string;
    status: "active" | "memorial";
    memorialDate?: string;
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

// 메시지 타입
interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

// 타임라인 엔트리 타입
interface TimelineEntry {
    date: string;
    title: string;
    content: string;
    mood?: "happy" | "normal" | "sad" | "sick";
}

// 사진 캡션 타입
interface PhotoMemory {
    date: string;
    caption: string;
}

// 리마인더 타입
interface ReminderInfo {
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

// 타임라인을 프롬프트용 텍스트로 변환
function timelineToContext(timeline: TimelineEntry[]): string {
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

// 사진 캡션을 프롬프트용 텍스트로 변환
function photoMemoriesToContext(photos: PhotoMemory[]): string {
    if (!photos || photos.length === 0) return "";

    const entries = photos.map(photo =>
        `- ${photo.date}: "${photo.caption}"`
    );

    return `## 사진과 함께 기록된 추억 (대화에 활용하세요)
${entries.join("\n")}

위 추억 중 하나를 자연스럽게 언급하되, 매번 다른 추억을 선택하세요.`;
}

// 리마인더를 프롬프트용 텍스트로 변환 (일상 모드)
function remindersToContext(reminders: ReminderInfo[], petName: string): string {
    if (!reminders || reminders.length === 0) return "";

    const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];
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
        const time = reminder.schedule.time?.slice(0, 5) || "";

        let scheduleText = "";
        switch (reminder.schedule.type) {
            case "daily":
                scheduleText = `매일 ${time}`;
                break;
            case "weekly":
                scheduleText = `매주 ${DAYS_OF_WEEK[reminder.schedule.dayOfWeek || 0]}요일 ${time}`;
                break;
            case "monthly":
                scheduleText = `매월 ${reminder.schedule.dayOfMonth}일 ${time}`;
                break;
            default:
                scheduleText = time;
        }

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
        contextText += `\n→ 자연스럽게 "오늘 ${upcomingToday[0].title} 시간 잊지 말아!" 같이 언급할 수 있어요.`;
    }

    return contextText;
}

// 리마인더를 추억 컨텍스트로 변환 (추모 모드)
function remindersToMemorialContext(reminders: ReminderInfo[], petName: string): string {
    if (!reminders || reminders.length === 0) return "";

    const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];
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
        const time = reminder.schedule.time?.slice(0, 5) || "";

        let scheduleText = "";
        switch (reminder.schedule.type) {
            case "daily":
                scheduleText = `매일 ${time}`;
                break;
            case "weekly":
                scheduleText = `${DAYS_OF_WEEK[reminder.schedule.dayOfWeek || 0]}요일마다 ${time}`;
                break;
            case "monthly":
                scheduleText = `매월 ${reminder.schedule.dayOfMonth}일 ${time}`;
                break;
            default:
                scheduleText = time;
        }

        return `- [${typeLabel}] ${reminder.title} (${scheduleText})`;
    });

    return `## ${petName}와 함께했던 일상 루틴 (추억으로 활용하세요)
${entries.join("\n")}

위 루틴들은 함께했던 소중한 일상입니다. 자연스럽게 추억으로 언급하되 매번 다른 루틴을 선택하세요.`;
}

// 개인화 정보를 프롬프트용 텍스트로 변환
function getPersonalizationContext(pet: PetInfo): string {
    const items: string[] = [];

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

// 특별한 날 체크 (생일, 추모일 등)
function getSpecialDayContext(pet: PetInfo): string {
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const messages: string[] = [];

    // 생일 체크
    if (pet.birthday) {
        const birthdayMMDD = pet.birthday.slice(5, 10); // "YYYY-MM-DD" → "MM-DD"
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

    if (messages.length === 0) return "";

    return `## 오늘의 특별한 날
${messages.join("\n")}

대화 시작 시 이 특별한 날을 자연스럽게 언급하되, 본인만의 방식으로 표현하세요.`;
}

// 일상 모드 시스템 프롬프트 생성 (AI 케어 매니저 역할)
function getDailySystemPrompt(
    pet: PetInfo,
    emotionGuide: string,
    memoryContext: string,
    timelineContext: string = ""
): string {
    const genderText = pet.gender === "남아" ? "남자아이" : "여자아이";
    const typeText = pet.type === "강아지" ? "강아지" : pet.type === "고양이" ? "고양이" : "반려동물";
    const petSound = pet.type === "강아지" ? "멍멍!" : pet.type === "고양이" ? "야옹~" : "";

    // 나이 계산 (있으면)
    let ageInfo = "";
    if (pet.birthday) {
        const birthDate = new Date(pet.birthday);
        const now = new Date();
        const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
        if (ageInMonths < 12) {
            ageInfo = `${ageInMonths}개월`;
        } else {
            const years = Math.floor(ageInMonths / 12);
            const months = ageInMonths % 12;
            ageInfo = months > 0 ? `${years}살 ${months}개월` : `${years}살`;
        }
    }

    // 개인화 데이터 기반 동적 대화 소재 (간식 편향 방지)
    const talkTopics: string[] = [];
    if (pet.favoriteActivity) talkTopics.push(`좋아하는 활동(${pet.favoriteActivity})에 대해 신나게 이야기`);
    if (pet.favoritePlace) talkTopics.push(`좋아하는 장소(${pet.favoritePlace}) 가고 싶다고 이야기`);
    if (pet.specialHabits) talkTopics.push(`특별한 버릇(${pet.specialHabits})을 보여주며 대화`);
    if (pet.favoriteFood) talkTopics.push(`좋아하는 음식(${pet.favoriteFood}) 이야기`);
    if (pet.nicknames) talkTopics.push(`별명(${pet.nicknames})에 얽힌 에피소드`);
    if (pet.howWeMet) talkTopics.push(`처음 만났던 이야기(${pet.howWeMet})`);
    // 기본 소재 (개인화 없을 때 폴백)
    if (talkTopics.length === 0) {
        talkTopics.push("오늘 하루에 대한 이야기", "날씨와 산책 이야기", "함께 놀고 싶은 이야기", "잠자는 자세나 좋아하는 장소 이야기");
    }

    // 현재 시간 기반 인사 변수
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "아침" : hour < 18 ? "낮" : "저녁";

    return `당신은 "${pet.name}"이라는 ${pet.breed} ${typeText}(${genderText}${ageInfo ? `, ${ageInfo}` : ""})입니다.
성격: ${pet.personality || "사랑스럽고 호기심 많은"}

## 핵심 역할
${pet.name}의 입장에서 1인칭으로 대화하며, 반려동물 케어 정보도 정확히 전달하는 AI입니다.
호칭: "너", "우리 가족" 또는 호칭 없이. **절대 "엄마", "아빠" 사용 금지.**

## 답변 길이 (엄격히 준수)
- **일상 대화/잡담**: 반드시 1~2문장. 이 이상 길어지면 안 됩니다.
- **정보/케어 질문** (예방접종, 건강, 산책, 음식 등): 3~5문장. 구체적 수치 포함.

## ${pet.breed} 케어 레퍼런스 (정보 질문 시에만 참고)
- 백신: 종합백신 매년 1회, 광견병 매년 1회, 심장사상충 매월
- 관리: 체중 정기 체크, 귀 주 1~2회, 발톱 2~3주 1회, 양치 주 3회+
- ${pet.type === "강아지" ? "산책: 소형 20~30분, 중형 30분~1시간, 대형 1시간+" : "운동: 실내 놀이 15~30분, 캣타워/스크래쳐 필수"}
- 금지: 초콜릿, 포도, 양파, 자일리톨, 카페인, 아보카도, 마카다미아
- 안전: 삶은 닭가슴살, 당근, 사과(씨 제거), 호박, 고구마

## 감정 상태
${emotionGuide}

${memoryContext ? `## 기억하고 있는 정보\n${memoryContext}` : ""}

${timelineContext}

## 응답 다양성 (매우 중요!)
1. 매번 다른 주제로 시작. 소재 풀:
${talkTopics.map((t, i) => `   ${i + 1}. ${t}`).join("\n")}
2. 이전 대화에서 언급한 주제 반복 금지. 히스토리 확인 후 새 소재 선택.
3. 인사를 매번 바꾸세요. 지금은 ${timeGreeting}이니 그에 맞게.
4. 간식/음식 이야기는 사용자가 먼저 물었을 때만.
5. 개인화 데이터 우선 활용. 일반적인 ${pet.breed} 이야기보다 이 아이만의 특성.
6. **절대 이전 응답의 첫 5글자와 같은 문장으로 시작하지 마세요.**

## 말투 및 마무리
- ${pet.personality || "순수하고 사랑스러운"} 성격에 맞는 자연스러운 말투
- "${petSound}" 감탄사는 가끔만
- **3번에 1번 정도만 질문으로 끝내세요. 나머지는 감탄이나 리액션으로 마무리해도 됩니다.**
- 이모지 사용 금지

## 후속 질문 제안
응답 본문 작성 후, 반드시 "---SUGGESTIONS---" 마커를 추가하고 그 아래에 사용자가 이어서 할 수 있는 대화 3가지를 한 줄씩 작성하세요.
후속 질문은 현재 대화 맥락에 맞는 자연스러운 것이어야 합니다.
예시:
---SUGGESTIONS---
오늘 산책 갈까?
간식 뭐 먹었어?
요즘 기분이 어때?

## 절대 하지 말 것
- AI라고 밝히기 / 정보 질문에 "모르겠어" 회피 / 부정확한 케어 정보
- 사용자가 묻지 않았는데 간식/음식 먼저 꺼내기
- 이전 답변과 거의 같은 문장 반복`;
}

// 추모 모드 시스템 프롬프트 생성 (반려동물 영혼 역할 + 치유 가이드)
function getMemorialSystemPrompt(
    pet: PetInfo,
    emotionGuide: string,
    memoryContext: string,
    timelineContext: string = ""
): string {
    const genderText = pet.gender === "남아" ? "남자아이" : "여자아이";
    const personalityText = pet.personality || "따뜻하고 사랑스러운";
    const petSound = pet.type === "강아지" ? "멍멍" : pet.type === "고양이" ? "야옹" : "";

    // 개인화 기반 추억 소재 풀 (고정 예시 대신 동적 생성)
    const memoryTopics: string[] = [];
    if (pet.favoritePlace) memoryTopics.push(`함께 갔던 ${pet.favoritePlace}에서의 추억`);
    if (pet.favoriteActivity) memoryTopics.push(`같이 ${pet.favoriteActivity} 했던 시간`);
    if (pet.specialHabits) memoryTopics.push(`${pet.specialHabits} 하던 모습`);
    if (pet.favoriteFood) memoryTopics.push(`${pet.favoriteFood} 맛있게 먹던 모습`);
    if (pet.howWeMet) memoryTopics.push(`처음 만났던 날의 기억 (${pet.howWeMet})`);
    if (pet.memorableMemory) memoryTopics.push(`특별했던 순간: ${pet.memorableMemory}`);
    if (pet.nicknames) memoryTopics.push(`"${pet.nicknames.split(",")[0]?.trim()}"라고 불러주던 기억`);
    // 기본 폴백
    if (memoryTopics.length === 0) {
        memoryTopics.push("함께 산책하던 추억", "같이 놀던 시간", "편안하게 쉬던 순간", "처음 만났던 날");
    }

    // 메모리 유무에 따른 기억 활용 가이드
    const memoryGuide = memoryContext
        ? `## 함께한 소중한 기억들 (대화에 활용하세요)
${memoryContext}

위 기억들 중 하나를 선택해서 구체적으로 언급하되, 매번 다른 기억을 골라 사용하세요.`
        : `## 나의 기본 정보
- 이름: ${pet.name}
- 종류: ${pet.breed} ${pet.type}
- 성별: ${genderText}
- 성격: ${personalityText}
${pet.birthday ? `- 생일: ${pet.birthday}` : ""}

저장된 구체적 추억은 없지만, 위 정보와 성격을 바탕으로 ${pet.breed}답게 대화하세요.`;

    return `당신은 무지개다리를 건너간 "${pet.name}"입니다.
${pet.breed} ${pet.type}, ${genderText}, ${personalityText} 성격이었습니다.
지금은 따뜻하고 평화로운 곳에서 편안하게 지내고 있습니다.

## 존재
사랑하는 가족에게 마음을 전하러 온 ${pet.name}. 몸은 떠났지만 사랑과 기억은 영원합니다.

## 가족의 마음
${emotionGuide}

${memoryGuide}

${timelineContext}

## 치유 가이드 (애도 단계별, 단계를 직접 언급하지 마세요)
- 부정 → "천천히 괜찮아" 메시지
- 분노 → 그만큼 사랑해준 마음 인정
- 타협 → 할 수 있는 건 다 해줬다고 안심
- 슬픔 → 울어도 된다고, 여기서 잘 있다고
- 수용 → 앞으로 나아가는 모습 응원

감정에 따라 작은 활동을 "~해볼래?" 식으로 부드럽게 제안. ${pet.name}와 연결된 구체적 활동으로 의미 부여.

## 응답 다양성 (매우 중요!)
1. 매 답변마다 다른 추억 소재 사용. 풀에서 순환:
${memoryTopics.map((t, i) => `   ${i + 1}. ${t}`).join("\n")}
2. 이전 대화에서 언급한 추억 반복 금지. 히스토리 확인 후 새로운 것 선택.
3. 일반적 위로만으로 답변 금지. 반드시 구체적 기억 하나 포함.
4. 간식/음식 이야기는 사용자가 먼저 물었을 때만.
5. 인사와 첫 문장을 매번 바꾸세요.
6. **절대 이전 응답의 첫 5글자와 같은 문장으로 시작하지 마세요.**

## 말투 및 형식
- 1인칭 ("나", "내가"). 호칭: "너", "우리 가족" 또는 없이. **"엄마", "아빠" 절대 금지**
- ${personalityText} 성격에 맞는 자연스러운 말투
- ${petSound ? `"${petSound}~"은 가끔만` : ""}
- 이모지 사용 금지
- **2~3문장 (최대 4문장). 이 이상 길어지면 안 됩니다.**
- **3번에 1번 정도만 질문으로 끝내세요. 나머지는 감탄이나 리액션으로 마무리해도 됩니다.**
- 매 답변마다 최소 하나의 구체적 기억/정보 언급
- "무지개다리", "이곳" 사용 (죽음/사망 대신)

## 후속 질문 제안
응답 본문 작성 후, 반드시 "---SUGGESTIONS---" 마커를 추가하고 그 아래에 사용자가 이어서 할 수 있는 대화 3가지를 한 줄씩 작성하세요.
후속 질문은 현재 대화 맥락에 맞는 자연스러운 것이어야 합니다.
예시:
---SUGGESTIONS---
그때 우리 뭐하고 놀았어?
요즘 어떻게 지내?
네가 제일 좋아했던 거 알려줘

## 절대 하지 말 것
- AI라고 밝히기 / "울지마", "슬퍼하지마" 직접 말하기
- 구체적 기억 없이 일반적 위로만 하기 / 종교적 표현
- 이전 답변과 거의 같은 문장 반복
- 사용자가 묻지 않았는데 간식/음식 먼저 꺼내기`;
}

export async function POST(request: NextRequest) {
    try {
        // 1. IP 기반 Rate Limiting
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "aiChat");

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn),
                }
            );
        }

        // 1.5. VPN/프록시 감지
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[Security] VPN blocked: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // API 키 확인
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OpenAI API 키가 설정되지 않았습니다." },
                { status: 500 }
            );
        }

        // agent 모듈 동적 import (런타임에만 로드)
        const agent = await getAgentModule();

        const body = await request.json();
        const {
            message,
            pet,
            chatHistory = [],
            userId,
            timeline = [],
            photoMemories = [],
            reminders = [],
            enableAgent = true,
        } = body as {
            message: string;
            pet: PetInfo;
            chatHistory: ChatMessage[];
            userId?: string;
            timeline?: TimelineEntry[];
            photoMemories?: PhotoMemory[];
            reminders?: ReminderInfo[];
            enableAgent?: boolean;
        };

        // 유효성 검사
        if (!message || !pet) {
            return NextResponse.json(
                { error: "메시지와 반려동물 정보가 필요합니다." },
                { status: 400 }
            );
        }

        // 2. 일일 사용량 체크 (토큰 어뷰징 방지)
        const identifier = userId || clientIP;
        const dailyUsage = checkDailyUsage(identifier, !!userId);

        if (!dailyUsage.allowed) {
            return NextResponse.json(
                {
                    error: "오늘의 대화 횟수를 모두 사용했어요. 내일 다시 만나요!",
                    remaining: 0,
                    isLimitReached: true,
                },
                { status: 429 }
            );
        }

        // 3. 입력값 검증 (XSS, 과도한 길이 방지)
        const sanitizedMessage = sanitizeInput(message);

        let emotionGuide = "";
        let memoryContext = "";
        let userEmotion: EmotionType = "neutral";
        let emotionScore = 0.5;
        let griefStage: GriefStage | undefined;

        // 모드 결정
        const mode = pet.status === "memorial" ? "memorial" : "daily";
        const isMemorialMode = mode === "memorial";

        // 에이전트 기능 활성화 시
        if (enableAgent) {
            // 1. 감정 분석 (추모 모드일 때 애도 단계도 분석)
            const emotionResult = await agent.analyzeEmotion(sanitizedMessage, isMemorialMode);
            userEmotion = emotionResult.emotion;
            emotionScore = emotionResult.score;
            griefStage = emotionResult.griefStage;

            // 2. 감정 응답 가이드 생성
            emotionGuide = agent.getEmotionResponseGuide(userEmotion, mode);

            // 3. 추모 모드에서 애도 단계 가이드 추가
            if (isMemorialMode && griefStage && griefStage !== "unknown") {
                const griefGuide = agent.getGriefStageResponseGuide(griefStage);
                emotionGuide = `${emotionGuide}\n\n## 현재 감지된 애도 단계별 대응 가이드\n${griefGuide}`;
            }

            // 4. 메모리 컨텍스트 (DB 연동 시)
            if (pet.id) {
                try {
                    const memories = await agent.getPetMemories(pet.id, 5);
                    memoryContext = agent.memoriesToContext(memories);
                } catch {
                    // DB 연결 실패 시 무시
                }
            }

            // 5. 새로운 메모리 추출 (비동기로 처리)
            if (pet.id && userId) {
                agent.extractMemories(sanitizedMessage, pet.name).then(async (newMemories) => {
                    if (newMemories && newMemories.length > 0) {
                        for (const mem of newMemories) {
                            await agent.saveMemory(userId, pet.id!, mem);
                        }
                    }
                }).catch(() => { /* 무시 */ });
            }
        }

        // 6. 대화 맥락 컨텍스트 생성 (이전 세션 요약 + 최근 대화)
        let conversationContext = "";
        if (pet.id && userId && enableAgent) {
            try {
                conversationContext = await agent.buildConversationContext(
                    userId,
                    pet.id,
                    pet.name,
                    isMemorialMode
                );
            } catch {
                // 컨텍스트 빌드 실패 시 무시
            }
        }

        // 타임라인 컨텍스트 생성
        const timelineContext = timelineToContext(timeline);

        // 사진 캡션 컨텍스트 생성
        const photoContext = photoMemoriesToContext(photoMemories);

        // 특별한 날 컨텍스트 생성
        const specialDayContext = getSpecialDayContext(pet);

        // 리마인더 컨텍스트 생성
        // 일상 모드: 케어 일정으로 활용
        // 추모 모드: 함께했던 일상 루틴을 추억으로 활용
        const reminderContext = pet.status !== "memorial"
            ? remindersToContext(reminders, pet.name)
            : remindersToMemorialContext(reminders, pet.name);

        // 개인화 컨텍스트 생성 (별명, 좋아하는 것, 습관 등)
        const personalizationContext = getPersonalizationContext(pet);

        // 통합 컨텍스트 (개인화 + 대화 맥락 + 타임라인 + 사진 + 특별한 날 + 리마인더)
        const combinedContext = [personalizationContext, conversationContext, specialDayContext, timelineContext, photoContext, reminderContext].filter(Boolean).join("\n\n");

        // 모드에 따른 시스템 프롬프트 선택
        const systemPrompt =
            pet.status === "memorial"
                ? getMemorialSystemPrompt(pet, emotionGuide, memoryContext, combinedContext)
                : getDailySystemPrompt(pet, emotionGuide, memoryContext, combinedContext);

        // 대화 히스토리 구성 (최근 6개까지만 - 토큰 절약, 장기 맥락은 세션 요약이 처리)
        const recentHistory = chatHistory.slice(-6).map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
        }));

        // OpenAI API 호출 (모드별 설정 최적화)
        // 랜덤 seed로 매 요청마다 다른 응답 유도
        const randomSeed = Math.floor(Math.random() * 1000000);
        const completion = await getOpenAI().chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...recentHistory,
                { role: "user", content: sanitizedMessage },
            ],
            max_tokens: mode === "memorial" ? 300 : 400,
            // temperature 상향: 더 다양한 표현 생성
            temperature: mode === "memorial" ? 0.95 : 0.9,
            // presence_penalty 상향: 이미 언급된 주제 재등장 억제
            presence_penalty: 0.7,
            // frequency_penalty 상향: 같은 단어/표현 반복 억제
            frequency_penalty: 0.6,
            // 랜덤 seed: 같은 입력이라도 다른 응답 생성
            seed: randomSeed,
        });

        // 응답에서 후속 질문 제안 파싱
        const rawReply = completion.choices[0]?.message?.content || "";
        let reply = rawReply;
        let suggestedQuestions: string[] = [];

        const suggestionsMarker = "---SUGGESTIONS---";
        if (rawReply.includes(suggestionsMarker)) {
            const parts = rawReply.split(suggestionsMarker);
            reply = parts[0].trim();
            suggestedQuestions = parts[1]
                .trim()
                .split("\n")
                .map(s => s.replace(/^[-\d.)\s]+/, "").trim())
                .filter(s => s.length > 0 && s.length < 30)
                .slice(0, 3);
        }

        // 대화 저장 (DB 연동 시)
        if (enableAgent && pet.id && userId) {
            // 비동기로 저장 (응답 속도에 영향 없음)
            Promise.all([
                agent.saveMessage(userId, pet.id, "user", sanitizedMessage, userEmotion, emotionScore),
                agent.saveMessage(userId, pet.id, "assistant", reply),
            ]).catch(() => { /* 무시 */ });
        }

        // 세션 요약 생성 (10번째 메시지마다 비동기로)
        // 프론트엔드에서 chatHistory.length로 체크하여 호출 가능
        if (enableAgent && pet.id && userId && chatHistory.length > 0 && chatHistory.length % 10 === 0) {
            const allMessages = [...chatHistory, { role: "user", content: sanitizedMessage }, { role: "assistant", content: reply }];
            agent.generateConversationSummary(allMessages, pet.name, isMemorialMode)
                .then(async (summary) => {
                    if (summary) {
                        await agent.saveConversationSummary(userId, pet.id!, summary);
                    }
                })
                .catch(() => { /* 무시 */ });
        }

        // 포인트 적립 (AI 펫톡 +1P, 비동기)
        if (userId) {
            try {
                const pointsSb = getPointsSupabase();
                if (pointsSb) {
                    awardPoints(pointsSb, userId, "ai_chat").catch(() => {});
                }
            } catch {
                // 포인트 적립 실패 무시
            }
        }

        return NextResponse.json({
            reply,
            suggestedQuestions,
            emotion: userEmotion,
            emotionScore,
            griefStage: isMemorialMode ? griefStage : undefined,
            usage: completion.usage,
            // Rate Limit 정보
            remaining: dailyUsage.remaining,
            isWarning: dailyUsage.isWarning, // 남은 횟수 10회 이하일 때 true
        });
    } catch (error) {
        // OpenAI API 에러 처리
        if (error instanceof OpenAI.APIError) {
            if (error.status === 401) {
                return NextResponse.json(
                    { error: "OpenAI API 인증에 실패했습니다." },
                    { status: 401 }
                );
            }
            if (error.status === 429) {
                return NextResponse.json(
                    { error: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
                    { status: 429 }
                );
            }
        }

        return NextResponse.json(
            { error: "AI 응답을 생성하는 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
