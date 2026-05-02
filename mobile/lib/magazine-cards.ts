/**
 * 매거진 카드 분할 유틸 — 웹 magazineCardUtils.ts의 RN 포팅
 *
 * HTML 본문을 카드 단위(text/image/quote/heading)로 분할.
 * <hr>, <h2>, <img>, <blockquote>를 인식해서 별도 카드로 만들고,
 * 일반 단락은 최대 3개씩 묶어 텍스트 카드로 만든다.
 *
 * 모바일은 RN이라 dangerouslySetInnerHTML이 없음 → HTML을 plain text + 인라인 마커로 변환.
 * 그래서 이 모듈은 HTML 태그를 제거한 깨끗한 텍스트만 전달.
 */

export type MagazineCardType = "cover" | "summary" | "text" | "image" | "quote" | "end";

export interface MagazineCard {
    type: MagazineCardType;
    text?: string;       // text/quote
    paragraphs?: string[]; // text 카드의 단락 분리
    imageSrc?: string;   // image
    caption?: string;    // image
    heading?: string;    // text 카드의 h2 헤딩
}

const MAX_BLOCKS_PER_CARD = 3;

/** plain text를 HTML로 변환 (기존 콘텐츠 호환) */
function toHtml(content: string): string {
    if (/<[a-z][\s\S]*>/i.test(content)) return content;
    return content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => `<p>${line}</p>`)
        .join("");
}

/** HTML 태그 제거 + 엔티티 디코딩 (간단) */
function stripTags(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * HTML을 카드 배열로 분할.
 * - <hr> 만나면 카드 경계
 * - <img>는 단독 이미지 카드 (다음 <p>가 짧으면 캡션)
 * - <blockquote>는 단독 인용 카드
 * - <h2>는 다음 텍스트 카드의 heading으로
 * - 일반 단락은 MAX_BLOCKS_PER_CARD씩 묶음
 */
export function splitContent(html: string, respectBoundaries = false): MagazineCard[] {
    const hrParts = html.split(/<hr\s*\/?>/i).filter((p) => p.trim());
    const cards: MagazineCard[] = [];

    for (const hrPart of hrParts) {
        const blockPattern = /(?=<(?:p|ul|ol|h2|h3|blockquote|img|figure)[\s>])/i;
        const blocks = hrPart.split(blockPattern).filter((b) => b.trim());

        let textBuffer: string[] = [];
        let pendingHeading: string | undefined;

        const flushText = () => {
            if (textBuffer.length === 0 && !pendingHeading) return;
            const paragraphs = textBuffer
                .map((b) => stripTags(b))
                .filter((p) => p.length > 0);
            cards.push({
                type: "text",
                heading: pendingHeading,
                paragraphs,
            });
            textBuffer = [];
            pendingHeading = undefined;
        };

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i].trim();

            // <img> → 이미지 카드
            const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
            if (imgMatch) {
                flushText();
                let caption: string | undefined;
                const nextBlock = blocks[i + 1]?.trim();
                if (nextBlock) {
                    const pMatch = nextBlock.match(/^<p[^>]*>([\s\S]*?)<\/p>$/i);
                    const pText = pMatch ? stripTags(pMatch[1]) : "";
                    if (pMatch && pText.length < 80) {
                        caption = pText;
                        i++;
                    }
                }
                cards.push({ type: "image", imageSrc: imgMatch[1], caption });
                continue;
            }

            // <blockquote> → 인용 카드
            if (/^<blockquote/i.test(block)) {
                flushText();
                cards.push({ type: "quote", text: stripTags(block) });
                continue;
            }

            // <h2> → 다음 텍스트 카드의 헤딩
            if (/^<h2/i.test(block)) {
                if (!respectBoundaries) flushText();
                pendingHeading = stripTags(block);
                continue;
            }

            textBuffer.push(block);
            if (!respectBoundaries && textBuffer.length >= MAX_BLOCKS_PER_CARD) {
                flushText();
            }
        }
        flushText();
    }

    return cards;
}

export function buildMagazineCards(article: {
    content: string;
    summary?: string;
}): MagazineCard[] {
    const cards: MagazineCard[] = [];
    cards.push({ type: "cover" });
    if (article.summary) cards.push({ type: "summary" });

    if (article.content) {
        const html = toHtml(article.content);
        const hasExplicitDelimiters = /<hr\s*\/?>/i.test(html);
        cards.push(...splitContent(html, hasExplicitDelimiters));
    }

    cards.push({ type: "end" });
    return cards;
}
