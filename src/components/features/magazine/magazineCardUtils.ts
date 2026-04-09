/**
 * magazineCardUtils - 매거진 카드 타입 및 순수 유틸리티 함수
 * MagazineReader에서 분리된 카드 데이터 생성 로직
 */

import type { MagazineArticle } from "@/data/magazineArticles";

// ──────────────────────────────────────────────
//  카드 타입 & 데이터
// ──────────────────────────────────────────────

export type CardType = "cover" | "summary" | "text" | "image" | "quote" | "end";

export interface CardData {
    type: CardType;
    /** 텍스트 카드: HTML 본문 */
    html?: string;
    /** 이미지 카드: 이미지 URL */
    imageSrc?: string;
    /** 이미지 카드: 캡션 */
    caption?: string;
    /** 인용 카드: 인용문 텍스트 */
    quoteText?: string;
}

/** 텍스트 카드 1장에 들어갈 최대 블록 수 */
export const MAX_BLOCKS_PER_CARD = 3;

// ──────────────────────────────────────────────
//  HTML 콘텐츠를 카드 단위로 분할
// ──────────────────────────────────────────────

/** plain text를 HTML로 변환 (기존 콘텐츠 호환) */
export function toHtml(content: string): string {
    if (/<[a-z][\s\S]*>/i.test(content)) return content;
    return content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => `<p>${line}</p>`)
        .join("");
}

/**
 * HTML 콘텐츠를 카드 단위로 분할
 *
 * 분할 규칙:
 * 1. <hr> → 명시적 카드 경계
 * 2. <h2> → 새 카드 시작
 * 3. <img> → 독립 이미지 카드 (다음 <p>가 짧으면 캡션으로 병합)
 * 4. <blockquote> → 독립 인용 카드
 * 5. 연속 블록 → MAX_BLOCKS_PER_CARD개씩 텍스트 카드
 */
export function splitContentIntoCards(html: string, respectBoundaries = false): CardData[] {
    // 1단계: <hr> 기준 분할
    const hrParts = html.split(/<hr\s*\/?>/i).filter((p) => p.trim());
    const cards: CardData[] = [];

    for (const hrPart of hrParts) {
        // 블록 요소 단위로 분리
        const blockPattern = /(?=<(?:p|ul|ol|h2|h3|blockquote|img|figure)[\s>])/i;
        const blocks = hrPart.split(blockPattern).filter((b) => b.trim());

        let textBuffer: string[] = [];

        const flushTextBuffer = () => {
            if (textBuffer.length === 0) return;
            cards.push({ type: "text", html: textBuffer.join("") });
            textBuffer = [];
        };

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i].trim();

            // <img> → 이미지 카드
            const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
            if (imgMatch) {
                flushTextBuffer();
                // 다음 블록이 짧은 <p>면 캡션으로 사용
                let caption: string | undefined;
                const nextBlock = blocks[i + 1]?.trim();
                if (nextBlock) {
                    const pMatch = nextBlock.match(/^<p[^>]*>([\s\S]*?)<\/p>$/i);
                    const pText = pMatch ? pMatch[1].replace(/<[^>]*>/g, "").trim() : "";
                    if (pMatch && pText.length < 80) {
                        caption = pText;
                        i++; // 캡션으로 소비
                    }
                }
                cards.push({ type: "image", imageSrc: imgMatch[1], caption });
                continue;
            }

            // <blockquote> → 인용 카드
            if (/^<blockquote/i.test(block)) {
                flushTextBuffer();
                const quoteText = block
                    .replace(/<\/?blockquote[^>]*>/gi, "")
                    .replace(/<\/?p[^>]*>/gi, "")
                    .replace(/<[^>]*>/g, "")
                    .trim();
                cards.push({ type: "quote", quoteText });
                continue;
            }

            // <h2> → 새 카드 시작 (명시적 경계 모드에서는 <hr>만 카드 경계이므로 flush 안 함)
            if (/^<h2/i.test(block)) {
                if (!respectBoundaries) {
                    flushTextBuffer();
                }
                textBuffer.push(block);
                continue;
            }

            // 일반 블록 → 텍스트 버퍼에 추가
            textBuffer.push(block);

            // MAX_BLOCKS_PER_CARD 도달 시 flush (작성자가 경계를 지정한 경우 건너뜀)
            if (!respectBoundaries && textBuffer.length >= MAX_BLOCKS_PER_CARD) {
                flushTextBuffer();
            }
        }

        flushTextBuffer();
    }

    return cards;
}

/** 기사를 카드 배열로 변환 */
export function buildCards(article: MagazineArticle): CardData[] {
    const cards: CardData[] = [];

    // 1. 커버 카드
    cards.push({ type: "cover" });

    // 2. 요약 카드
    cards.push({ type: "summary" });

    // 3~N. 본문 카드
    if (article.content) {
        const html = toHtml(article.content);
        // <hr>가 있으면 작성자가 카드 경계를 직접 지정한 것이므로 자동 분할 비활성화
        const hasExplicitDelimiters = /<hr\s*\/?>/i.test(html);
        const contentCards = splitContentIntoCards(html, hasExplicitDelimiters);
        cards.push(...contentCards);
    }

    // N+1. 엔딩 카드
    cards.push({ type: "end" });

    return cards;
}
