/**
 * 한국어 조사 헬퍼 — 받침 유무에 따른 정확한 조사 선택.
 *
 * 받침 없는 이름(꼼지, 츄츄, 보리, 메리)에 "이"를 잘못 붙여서
 * "꼼지이야", "츄츄이가" 같은 어색한 표현이 발생하는 것을 방지.
 *
 * 사용:
 *   import { nameParticle, josa } from "@/lib/korean-particle";
 *
 *   `안녕! 나 ${name}${nameParticle(name).iya}!`
 *   // 받침 있음: "안녕! 나 곰돌이야!"
 *   // 받침 없음: "안녕! 나 츄츄야!"
 *
 *   `${name}${josa(name, "이/가")} 왔다!`
 *   // 받침 있음: "곰돌이 왔다!"
 *   // 받침 없음: "츄츄가 왔다!"
 */

/** 한글 음절의 받침(종성) 유무 */
export function hasJongseong(name: string): boolean {
    if (!name) return false;
    const lastChar = name.charCodeAt(name.length - 1);
    if (lastChar < 0xAC00 || lastChar > 0xD7A3) return false;
    return (lastChar - 0xAC00) % 28 !== 0;
}

/** 펫 이름 끝 글자의 받침 유무에 따른 조사 묶음 반환 */
export function nameParticle(name: string): {
    iya: string;   // 호격 (~야)
    iga: string;   // 주격 (~이/~가)
    eul: string;   // 목적격 (~을/~를)
    eun: string;   // 보조사 (~은/~는)
    a: string;     // 호격 (~아)
} {
    const hasBatchim = hasJongseong(name);
    return hasBatchim
        ? { iya: "이야", iga: "이", eul: "을", eun: "은", a: "아" }
        : { iya: "야",   iga: "가", eul: "를", eun: "는", a: "야" };
}

/**
 * "이/가", "은/는" 같은 페어 형태로 받침 유무에 따른 조사 선택.
 * 모바일 mobile/lib/chat-helpers.ts의 josa()와 동일한 인터페이스.
 *
 * 사용 예:
 *   `${name}${josa(name, "이/가")} 왔다!`
 *   `${name}${josa(name, "은/는")} 행복해.`
 */
export function josa(name: string, pair: string): string {
    const [withJong, withoutJong] = pair.split("/");
    if (!withJong || !withoutJong) return pair;
    return hasJongseong(name) ? withJong : withoutJong;
}

/**
 * AI 응답에서 "{name}이가" 같이 양쪽 조사 다 적힌 잘못된 표현을 정리.
 *
 * 한국어 학습 데이터에 "{이름}이가" 패턴이 자주 나타나서 GPT가 종종 양쪽
 * 조사를 모두 출력. 여기서 받침 유무에 맞는 하나만 남긴다.
 */
export function fixKoreanParticles(text: string, name: string): string {
    if (!name || !text) return text;
    if (!/[가-힣]$/.test(name)) return text; // 한글 음절 아니면 skip
    const jong = hasJongseong(name);
    const map: [string, string][] = [
        [`${name}이가`, jong ? `${name}이` : `${name}가`],
        [`${name}이를`, jong ? `${name}을` : `${name}를`],
        [`${name}이는`, jong ? `${name}은` : `${name}는`],
        [`${name}이와`, jong ? `${name}과` : `${name}와`],
        [`${name}이에게`, `${name}에게`],
    ];
    let out = text;
    for (const [from, to] of map) {
        out = out.replaceAll(from, to);
    }
    return out;
}
