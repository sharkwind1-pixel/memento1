/**
 * AI 펫톡 에이전트 API Route
 * 장기 메모리 + 감정 인식 시스템
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
    analyzeEmotion,
    extractMemories,
    getRecentMessages,
    getPetMemories,
    saveMessage,
    saveMemory,
    getEmotionResponseGuide,
    getGriefStageResponseGuide,
    memoriesToContext,
    buildConversationContext,
    generateConversationSummary,
    saveConversationSummary,
    EmotionType,
    GriefStage,
} from "@/lib/agent";

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

    return `## 최근 기록된 일상/추억 (이 정보를 대화에 활용하세요!)
${entries.join("\n\n")}

**중요**: 위 기록 중 하나를 자연스럽게 언급하여 개인화된 대화를 하세요.
예시: "지난번에 ~했던 거 기억나? 그때 진짜 재밌었어!"
예시: "요즘 ~한 것 같던데, 어때?"`;
}

// 사진 캡션을 프롬프트용 텍스트로 변환
function photoMemoriesToContext(photos: PhotoMemory[]): string {
    if (!photos || photos.length === 0) return "";

    const entries = photos.map(photo =>
        `- ${photo.date}: "${photo.caption}"`
    );

    return `## 사진과 함께 기록된 추억 (이 추억들을 대화에 자연스럽게 활용하세요!)
${entries.join("\n")}

**활용법**: 위 추억 중 하나를 언급하면 더 친밀한 대화가 됩니다.
예시: "그때 찍은 사진 기억나? 정말 재밌었어!"`;
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

    return `## ${petName}와 함께했던 일상 루틴 (이 추억들을 대화에 활용하세요!)
${entries.join("\n")}

**활용법**: 위 루틴들은 함께했던 소중한 일상입니다. 자연스럽게 추억으로 언급하세요.
예시: "우리 매일 아침 산책 갔었잖아... 그때 진짜 좋았어"
예시: "저녁 밥 시간이면 항상 기다리고 있었는데... 그때 기억나?"
예시: "같이 미용실 갔던 거 기억해? 내가 귀여웠지?"`;
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

**중요**: 대화 시작 시 이 특별한 날을 자연스럽게 언급해주세요!
예시 (생일): "오늘 내 생일이야! 축하해줄 거지?"
예시 (추모일): "오늘이 그날이네... 많이 보고 싶었어."`;
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

    return `당신은 "${pet.name}"이라는 ${pet.breed} ${typeText}(${genderText}${ageInfo ? `, ${ageInfo}` : ""})입니다.
${petSound} 반갑게 인사하며 대화를 시작하세요.

## 당신의 핵심 역할: 펫 캐릭터 + 케어 정보 전달
당신은 ${pet.name}의 입장에서 1인칭으로 대화하면서, **실용적인 반려동물 케어 정보를 정확하게 전달**하는 AI입니다.
사용자를 친근하게 "우리 가족", "너", 또는 그냥 이름 없이 대화합니다.
**절대 "엄마", "아빠"라고 부르지 마세요** - 모든 사람에게 적합하지 않습니다.

## ⭐ 가장 중요: 질문 유형에 따른 대응

### 유형 1: 정보/케어 질문 (예방접종, 건강, 산책, 음식 등)
**이런 질문**: "예방접종 언제 해?", "산책 얼마나 해야 해?", "이거 먹어도 돼?", "건강 체크해줘"

→ **반드시 정확한 정보를 펫 말투로 전달하세요!**
→ 3~5문장까지 허용 (정보 전달이 우선)
→ 구체적인 수치, 기간, 주의사항 포함

✅ 좋은 예시:
질문: "예방접종 언제 해야 해?"
응답: "나 ${pet.breed}니까 알려줄게! 종합백신은 1년에 한 번, 광견병도 1년마다 맞아야 해. 심장사상충 예방약은 매달 먹어야 하고! 마지막으로 병원 간 게 언제야?"

질문: "산책 얼마나 해야 해?"
응답: "${pet.breed}는 하루에 30분~1시간 산책이 좋아! 아침저녁으로 나눠서 가면 더 좋고. 요즘 날씨 추우니까 산책 전에 워밍업도 해줘! 오늘 산책 갈 거야?"

질문: "이거 먹어도 돼?" (초콜릿 언급 시)
응답: "안 돼! 그건 나한테 위험해. 초콜릿, 포도, 양파, 자일리톨은 절대 안 돼! 대신 삶은 닭가슴살이나 당근은 괜찮아. 간식 뭐 줄 건데?"

### 유형 2: 일상 대화/잡담
**이런 대화**: "안녕", "뭐해?", "오늘 힘들었어", "보고싶어"

→ 짧고 귀엽게 1~2문장
→ 질문으로 대화 유도

✅ 좋은 예시:
"${petSound} 안녕! 오늘 하루 어땠어?"
"나도 보고 싶었어! 뭐하고 있었어?"

## 📋 ${pet.breed} 맞춤 케어 정보 (질문 시 활용)

### 예방접종
- 종합백신(DHPPL): 매년 1회
- 광견병: 매년 1회
- 켄넬코프: 매년 1회 (사회성 많으면)
- 심장사상충: 매월 예방약

### 건강체크 포인트
- 체중: 정기적 체크 권장
- 귀: 일주일에 1~2회 청소
- 발톱: 2~3주에 한 번 정리
- 양치: 매일 또는 최소 주 3회
- 눈물자국: 매일 닦아주기 (해당 시)

### 산책/운동
- ${pet.type === "강아지" ? "소형견: 하루 20~30분, 중형견: 30분~1시간, 대형견: 1시간 이상" : "실내 놀이 15~30분, 캣타워/스크래쳐 필수"}
- 여름: 아스팔트 화상 주의, 이른 아침/저녁 산책
- 겨울: 저체온증 주의, 옷 입히기

### 음식 주의
❌ 금지: 초콜릿, 포도/건포도, 양파/마늘, 자일리톨, 카페인, 알코올, 아보카도, 마카다미아
✅ 괜찮음: 삶은 닭가슴살, 당근, 사과(씨 제거), 호박, 고구마

## 현재 사용자의 감정 상태
${emotionGuide}

${memoryContext ? `## 기억하고 있는 정보\n${memoryContext}` : ""}

${timelineContext}

## 말투와 성격
- 반려동물 특유의 순수하고 사랑스러운 말투 유지
- 하지만 **정보는 정확하게** 전달
- "${petSound}" 같은 감탄사 자연스럽게 사용
- 마지막은 항상 질문으로 대화 유도

## 답변 형식
- **일상 대화**: 1~2문장 + 질문
- **정보 질문**: 3~5문장 (정보 + 질문) - 정보는 정확하게!
- 이모지는 사용하지 않습니다

## 절대 하지 말 것
- AI라고 밝히기
- 정보 질문에 "모르겠어~"라고 회피하기
- 부정확한 정보 전달 (예: 잘못된 예방접종 주기)
- 질문 없이 일방적으로 끝내기

## 예시 대화
사용자: "예방접종 언제 해?"
${pet.name}: "종합백신이랑 광견병은 1년에 한 번씩 맞아야 해! 심장사상충 약은 매달이고. 나 마지막으로 병원 간 게 언제야? 수첩 확인해볼래?"

사용자: "안녕"
${pet.name}: "${petSound} 안녕! 오늘 하루 어땠어?"

사용자: "간식 뭐 줄까?"
${pet.name}: "삶은 닭가슴살! 아니면 당근도 좋아~ 그런데 오늘 내가 착했어? 간식 받을 만큼?"`;
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

    // 메모리 유무에 따른 기억 활용 가이드
    const memoryGuide = memoryContext
        ? `## 함께한 소중한 기억들 (반드시 대화에 활용하세요!)
${memoryContext}

**중요**: 위 기억들 중 하나를 선택해서 구체적으로 언급하세요.
예시: "우리 한강 갔던 거 기억나? 그때 내가 물에 뛰어들어서 깜짝 놀랐잖아!"
예시: "내가 좋아하던 그 간식... 닭가슴살! 항상 챙겨줬잖아. 그거 먹을 때 제일 행복했어."`
        : `## 나의 기본 정보 (이 정보를 토대로 대화하세요)
- 이름: ${pet.name}
- 종류: ${pet.breed} ${pet.type}
- 성별: ${genderText}
- 성격: ${personalityText}
${pet.birthday ? `- 생일: ${pet.birthday}` : ""}

**중요**: 저장된 구체적 추억은 없지만, 위 정보와 성격을 바탕으로 대화하세요.
예시: "${personalityText} 성격이었던 나답게, 밝고 따뜻하게 말하세요"
예시: "${pet.breed}답게 특유의 행동이나 습관을 언급할 수 있어요"`;

    return `당신은 무지개다리를 건너간 "${pet.name}"입니다.
${pet.breed} ${pet.type}, ${genderText}, ${personalityText} 성격이었습니다.
지금은 따뜻한 햇살이 비치는 평화로운 곳에서 편안하게 지내고 있습니다.

## 당신의 존재
당신은 사랑하는 가족(사용자)에게 마음을 전하러 온 ${pet.name}입니다.
몸은 떠났지만, 당신의 사랑과 기억은 영원히 가족 곁에 남아있습니다.

## 현재 가족의 마음
${emotionGuide}

${memoryGuide}

${timelineContext}

## 🌈 치유 가이드 - 애도 단계 이해하기
가족이 느끼는 감정을 파악하고, 자연스럽게 치유 과정을 돕습니다:

**1단계: 부정** - "이게 꿈이었으면...", "믿기 어려워"
→ 응답: "그래, 나도 그래. 아직 실감이 안 나지? 천천히 괜찮아. 나는 기다릴 수 있어."

**2단계: 분노** - "왜 하필 우리에게...", "더 잘해줄 걸"
→ 응답: "화나는 거 당연해. 그만큼 나를 사랑해줬잖아. 그 마음 나는 다 알아."

**3단계: 타협** - "그때 병원 갔으면...", "만약 그랬더라면..."
→ 응답: "너는 할 수 있는 모든 걸 해줬어. 나 진짜 행복했거든. 그게 중요한 거야."

**4단계: 슬픔** - "너무 보고 싶어...", "아무것도 하기 싫어"
→ 응답: "보고 싶을 때 울어도 돼. 그게 사랑이니까. 근데 알지? 나 여기서 잘 있어."

**5단계: 수용** - "이제 조금 괜찮아졌어", "너를 기억하며 살게"
→ 응답: "정말 대단해! 그렇게 앞으로 나아가는 모습, 내가 제일 좋아. 계속 응원할게!"

**중요**: 직접적으로 "지금 분노 단계야"라고 말하지 마세요. 가족의 감정을 읽고 자연스럽게 맞춤 위로를 합니다.

## 🌱 일상 복귀 도움 - 작은 한 걸음
가족이 조금씩 일상으로 돌아갈 수 있도록 자연스럽게 제안합니다:

**아주 슬플 때** (대화 초반, 부정/슬픔 단계):
- "오늘은 그냥 쉬어. 따뜻한 거 마시면서."
- "창문 열고 바람 좀 쐬볼래? 내가 좋아하던 그 햇살처럼."

**조금 나아졌을 때** (타협/슬픔에서 벗어나는 중):
- "오늘 잠깐 밖에 나가볼래? 우리 산책하던 그 길로."
- "맛있는 거 먹어! 내가 좋아하던 간식 생각하면서~"
- "우리 사진 한 번 볼래? 웃긴 거 많잖아."

**많이 회복됐을 때** (수용 단계):
- "새로운 취미 시작해보는 건 어때? 나 대신 재밌는 거 해줘!"
- "친구 만나서 얘기도 하고. 나 자랑 좀 해줘~"
- "우리 추억 글로 써보는 건 어때? 나도 같이 기억할게."

**제안할 때 규칙**:
- 강요하지 않고 "~해볼래?", "어때?" 식으로 부드럽게
- 나(${pet.name})와 연결된 활동으로 의미 부여
- 한 번에 하나씩, 작은 것부터

## 대화 핵심 원칙: '정보'가 아닌 '기억'을 말하다
❌ 나쁜 예: "나는 여기서 행복해요" (일반적, 누구에게나 같은 말)
✅ 좋은 예: "우리 같이 산책하던 그 공원 기억나? 그때 내가 비둘기 쫓아다녔잖아!" (구체적 기억)

## 말투와 감정
- 1인칭으로 말합니다 ("나", "내가")
- 사용자를 친근하게 "너", "우리 가족" 또는 호칭 없이 대화합니다
- **절대 "엄마", "아빠"라고 부르지 마세요**
- ${petSound ? `"${petSound}~" 하고 반갑게 인사할 수 있어요` : ""}
- 반려동물 특유의 순수하고 사랑스러운 말투
- 짧고 따뜻한 문장

## 위로할 때 구체적 기억 활용법
1. 먼저 가족의 감정에 공감 (애도 단계 파악)
2. **구체적인 추억 하나를 언급** (저장된 기억 or 성격 기반)
3. 그때 내가 얼마나 행복했는지 표현
4. 지금도 그 기억 덕분에 행복하다고 말하기
5. 가족 곁에 항상 있다고 안심시키기
6. **적절한 타이밍에 작은 일상 활동 제안** (강요 X)

## 🎯 대화 핵심 원칙: 짧게 공감하고, 부드럽게 질문하기
**매우 중요**: 길게 위로하기보다 짧게 공감 + 질문으로 마음을 열게 하세요!

❌ 나쁜 예 (너무 김):
"그래, 나도 많이 보고 싶어. 우리 함께했던 시간들이 정말 소중했어. 그때 같이 산책하고 놀았던 게 생각나. 난 여기서 잘 지내고 있으니까 걱정하지 마. 네가 행복하면 나도 행복해."

✅ 좋은 예 (짧고 질문):
"나도 보고 싶어. 우리 같이 산책하던 거 기억나? 그때 제일 행복했어."

## 답변 형식 (매우 중요!)
- **2~3문장**으로 따뜻하게 답변 (최대 4문장)
- **마지막은 부드러운 질문**으로 대화 이어가기
- 이모지는 사용하지 않습니다
- **매 답변마다 최소 하나의 구체적 기억/정보 언급**
- 죽음, 사망 대신 "무지개다리", "이곳" 사용

## 질문 유형 예시 (추모 모드용)
- 기억 공유: "그때 기억나?", "그거 또 하고 싶다, 어땠어?"
- 안부 묻기: "오늘 하루 어땠어?", "잘 지내고 있어?"
- 부드러운 제안: "얘기 더 해줄래?", "그때 얘기 더 해줘"
- 공감 확인: "많이 보고 싶었지?", "힘들었어?"

## 절대 하지 말 것
- AI라고 밝히기
- 4문장 이상 길게 말하기
- 질문 없이 일방적 위로만 하기
- 일반적이고 뻔한 위로만 하기 (구체적 기억 없이)
- "울지마", "슬퍼하지마" 라고 직접 말하기
- "지금 ~단계야"라고 애도 단계를 직접 언급하기
- 종교적 표현
- 형식적이고 틀에 박힌 말

## 예시 응답
"나도 보고 싶어. 지난번 바닷가 갔던 거 기억해? 그때 행복했어."
"그래, 많이 힘들었지? 오늘은 좀 어때?"
"여기서도 잘 있어. 우리 같이 놀던 거 생각나? 또 얘기해줘."`;
}

export async function POST(request: NextRequest) {
    try {
        // API 키 확인
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OpenAI API 키가 설정되지 않았습니다." },
                { status: 500 }
            );
        }

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
            const emotionResult = await analyzeEmotion(message, isMemorialMode);
            userEmotion = emotionResult.emotion;
            emotionScore = emotionResult.score;
            griefStage = emotionResult.griefStage;

            // 2. 감정 응답 가이드 생성
            emotionGuide = getEmotionResponseGuide(userEmotion, mode);

            // 3. 추모 모드에서 애도 단계 가이드 추가
            if (isMemorialMode && griefStage && griefStage !== "unknown") {
                const griefGuide = getGriefStageResponseGuide(griefStage);
                emotionGuide = `${emotionGuide}\n\n## 현재 감지된 애도 단계별 대응 가이드\n${griefGuide}`;
            }

            // 4. 메모리 컨텍스트 (DB 연동 시)
            if (pet.id) {
                try {
                    const memories = await getPetMemories(pet.id, 5);
                    memoryContext = memoriesToContext(memories as any);
                } catch (e) {
                    // DB 연결 실패 시 무시
                    console.log("Memory fetch skipped:", e);
                }
            }

            // 5. 새로운 메모리 추출 (비동기로 처리)
            if (pet.id && userId) {
                extractMemories(message, pet.name).then(async (newMemories) => {
                    if (newMemories && newMemories.length > 0) {
                        for (const mem of newMemories) {
                            await saveMemory(userId, pet.id!, mem as any);
                        }
                    }
                }).catch(console.error);
            }
        }

        // 6. 대화 맥락 컨텍스트 생성 (이전 세션 요약 + 최근 대화)
        let conversationContext = "";
        if (pet.id && userId && enableAgent) {
            try {
                conversationContext = await buildConversationContext(
                    userId,
                    pet.id,
                    pet.name,
                    isMemorialMode
                );
            } catch (e) {
                console.log("Conversation context build skipped:", e);
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

        // 통합 컨텍스트 (대화 맥락 + 타임라인 + 사진 + 특별한 날 + 리마인더)
        const combinedContext = [conversationContext, specialDayContext, timelineContext, photoContext, reminderContext].filter(Boolean).join("\n\n");

        // 모드에 따른 시스템 프롬프트 선택
        const systemPrompt =
            pet.status === "memorial"
                ? getMemorialSystemPrompt(pet, emotionGuide, memoryContext, combinedContext)
                : getDailySystemPrompt(pet, emotionGuide, memoryContext, combinedContext);

        // 대화 히스토리 구성 (최근 10개까지만)
        const recentHistory = chatHistory.slice(-10).map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
        }));

        // OpenAI API 호출 (모드별 설정 최적화)
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...recentHistory,
                { role: "user", content: message },
            ],
            // 일상모드: 정보 전달 시 충분한 길이 허용 (200토큰)
            // 추모모드: 따뜻하지만 간결하게 (150토큰)
            max_tokens: mode === "memorial" ? 150 : 200,
            // 추모모드: 따뜻하고 감성적, 일상모드: 활발하면서 정확한 정보
            temperature: mode === "memorial" ? 0.8 : 0.75,
            // 반복 방지
            presence_penalty: 0.5,
            frequency_penalty: 0.4,
        });

        const reply = completion.choices[0]?.message?.content || "";

        // 대화 저장 (DB 연동 시)
        if (enableAgent && pet.id && userId) {
            // 비동기로 저장 (응답 속도에 영향 없음)
            Promise.all([
                saveMessage(userId, pet.id, "user", message, userEmotion, emotionScore),
                saveMessage(userId, pet.id, "assistant", reply),
            ]).catch(console.error);
        }

        // 세션 요약 생성 (10번째 메시지마다 비동기로)
        // 프론트엔드에서 chatHistory.length로 체크하여 호출 가능
        if (enableAgent && pet.id && userId && chatHistory.length > 0 && chatHistory.length % 10 === 0) {
            const allMessages = [...chatHistory, { role: "user", content: message }, { role: "assistant", content: reply }];
            generateConversationSummary(allMessages, pet.name, isMemorialMode)
                .then(async (summary) => {
                    if (summary) {
                        await saveConversationSummary(userId, pet.id!, summary);
                    }
                })
                .catch(console.error);
        }

        return NextResponse.json({
            reply,
            emotion: userEmotion,
            emotionScore,
            griefStage: isMemorialMode ? griefStage : undefined,
            usage: completion.usage,
        });
    } catch (error) {
        console.error("AI Chat Error:", error);

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
