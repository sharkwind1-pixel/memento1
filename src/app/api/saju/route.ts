/**
 * /api/saju — 입양자용 반려 사주.
 * 정통 만세력 엔진(lib/saju/manse)으로 사주팔자를 계산하고,
 * 그 결과(4기둥·오행·일간·띠)에 근거해 GPT-4o-mini가
 * "나와 잘 맞는 반려동물 유형 / 추천 이름 / 입양하기 좋은 시기"를 생성한다.
 *
 * 톤: 재미로 보는 가벼운 안내(점술 단정·의학 표현 금지), 이모지 금지(서비스 톤).
 * 인증 필수(OpenAI 비용 통제). 사용자 데이터 저장 없음(계산+생성만).
 */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase-server";
import { getOpenAI } from "@/lib/agent/shared";
import { checkRateLimitDB, checkDailyUsageDB, checkGlobalDailyLimit } from "@/lib/rate-limit";
import {
    computeSaju, pillarName, pillarHanja,
    STEM_ELEMENT, type SajuInput,
} from "@/lib/saju/manse";

export const dynamic = "force-dynamic";

interface Body {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    knownTime?: boolean;
    gender?: "남" | "여";
}

export async function POST(req: Request) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const body = (await req.json()) as Body;
        const year = Number(body.year);
        const month = Number(body.month);
        const day = Number(body.day);
        const knownTime = body.knownTime === true;

        // 입력 검증
        if (
            !Number.isInteger(year) || year < 1900 || year > 2100 ||
            !Number.isInteger(month) || month < 1 || month > 12 ||
            !Number.isInteger(day) || day < 1 || day > 31
        ) {
            return NextResponse.json({ error: "생년월일을 정확히 입력해주세요." }, { status: 400 });
        }
        let hour: number | undefined;
        let minute: number | undefined;
        if (knownTime) {
            hour = Number(body.hour);
            minute = Number(body.minute ?? 0);
            if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
                return NextResponse.json({ error: "태어난 시각을 정확히 입력해주세요." }, { status: 400 });
            }
        }

        // 존재하지 않는 날짜(2/31, 4/31 등) 차단 — UTC로 구성해 롤오버 검출
        const probe = new Date(Date.UTC(year, month - 1, day));
        if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
            return NextResponse.json({ error: "존재하지 않는 날짜예요." }, { status: 400 });
        }

        // 비용 통제 — 펫톡과 동일한 ai_chat 예산 공유(전체 상한 + 분당 + 일일).
        // 유효 입력 확인 후에만 카운트(일일 체크는 증가 부수효과). 한도 초과 시 429.
        const globalLimit = await checkGlobalDailyLimit();
        if (!globalLimit.allowed) {
            return NextResponse.json({ error: "오늘 AI 이용이 많아 잠시 쉬고 있어요. 잠시 후 다시 시도해주세요." }, { status: 429 });
        }
        const perMinute = await checkRateLimitDB(user.id, "aiChat");
        if (!perMinute.allowed) {
            return NextResponse.json({ error: "조금 천천히 시도해주세요." }, { status: 429 });
        }
        const daily = await checkDailyUsageDB(user.id, true);
        if (!daily.allowed || daily.remaining < 0) {
            return NextResponse.json({ error: "오늘 AI 이용 한도를 다 썼어요. 내일 다시 만나요." }, { status: 429 });
        }

        const input: SajuInput = { year, month, day, hour, minute, knownTime };
        const chart = computeSaju(input);

        // 오행 분포 → 부족/과다 (작명·매칭 근거)
        const elemEntries = Object.entries(chart.elements) as [string, number][];
        const lacking = elemEntries.filter(([, n]) => n === 0).map(([e]) => e);
        const strongest = elemEntries.slice().sort((a, b) => b[1] - a[1])[0][0];
        const dayMasterElem = STEM_ELEMENT[chart.dayMaster];

        const chartReadable = {
            year: { ko: pillarName(chart.year), hanja: pillarHanja(chart.year) },
            month: { ko: pillarName(chart.month), hanja: pillarHanja(chart.month) },
            day: { ko: pillarName(chart.day), hanja: pillarHanja(chart.day) },
            hour: chart.hour ? { ko: pillarName(chart.hour), hanja: pillarHanja(chart.hour) } : null,
            elements: chart.elements,
            dayMaster: pillarName(chart.day), // 일주 표기
            dayMasterElement: dayMasterElem,
            zodiac: chart.zodiac,
            knownTime: chart.knownTime,
        };

        // GPT 입력: 계산된 사주를 그대로 근거로 제공 (할루시네이션 방지 — 사주 자체는 엔진이 확정)
        const sajuFacts =
            `사주(만세력 계산 결과): ` +
            `년주 ${chartReadable.year.ko}(${chartReadable.year.hanja}), ` +
            `월주 ${chartReadable.month.ko}(${chartReadable.month.hanja}), ` +
            `일주 ${chartReadable.day.ko}(${chartReadable.day.hanja})` +
            (chart.hour ? `, 시주 ${chartReadable.hour!.ko}(${chartReadable.hour!.hanja})` : ` (출생시각 미상으로 시주 제외)`) +
            `. 일간(나)=${chartReadable.day.ko[0]}(${dayMasterElem} 기운). ` +
            `오행 분포: ${elemEntries.map(([e, n]) => `${e}${n}`).join(" ")}. ` +
            `${lacking.length ? `부족한 기운: ${lacking.join(",")}. ` : "오행이 비교적 고른 편. "}` +
            `가장 강한 기운: ${strongest}. 띠: ${chart.zodiac}.` +
            (body.gender === "남" || body.gender === "여" ? ` 의뢰인 성별: ${body.gender}.` : "");

        const system =
            "너는 메멘토애니의 '반려 사주' 도우미다. 반려동물과의 인연을 사주 오행으로 가볍고 따뜻하게 풀어준다. " +
            "규칙: (1) 재미로 보는 안내임을 전제로 단정·운명론·의학적 표현을 쓰지 않는다. " +
            "(2) 이모지를 절대 쓰지 않는다. (3) 제공된 사주 사실(오행·일간·띠)에만 근거하고 사주 글자를 새로 지어내지 않는다. " +
            "(4) 부드럽고 담백한 한국어. 과장·호들갑 금지. " +
            "(5) 반드시 JSON으로만 답한다.";

        const userPrompt =
            `${sajuFacts}\n\n` +
            `위 사주를 가진 사람이 반려동물 입양을 고려 중이다. 오행 균형(특히 부족한 기운을 보완하는 방향)을 근거로 아래를 JSON으로 생성하라.\n` +
            `{\n` +
            `  "summary": "이 사람의 기운을 2~3문장으로 따뜻하게 요약 (반려동물과의 인연 관점)",\n` +
            `  "matchPets": [{"type":"강아지/고양이/그 외(예: 햄스터·새 등)","reason":"오행 근거 한 문장"}] (2개),\n` +
            `  "naming": {"guide":"구체적인 이름을 정해주지 말고, 오행 보완 관점에서 '어떤 기운·의미·어감'의 이름을 지으면 좋은지 2~3문장으로 안내","themes":["그 기운을 담은 의미/테마 3~4개 (예: 물·비·이슬 같은 수(水) 기운, 숲·새싹 같은 목(木) 기운) — 완성된 이름이 아니라 방향 키워드"]},\n` +
            `  "timing": "입양·만남에 좋은 시기나 마음가짐을 한두 문장 (계절/달 정도, 단정 금지)"\n` +
            `}`;

        const openai = getOpenAI();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: system },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: 700,
            response_format: { type: "json_object" },
        });

        let reading: unknown = null;
        try {
            reading = JSON.parse(completion.choices[0]?.message?.content || "{}");
        } catch {
            reading = null;
        }

        return NextResponse.json({ chart: chartReadable, reading });
    } catch {
        return NextResponse.json(
            { error: "사주를 보는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
            { status: 500 },
        );
    }
}
