const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    HeadingLevel,
    LevelFormat,
    BorderStyle,
    WidthType,
    ShadingType,
    PageBreak,
} = require("docx");
const fs = require("fs");

// 테이블 스타일
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const headerCell = (text, width) =>
    new TableCell({
        borders,
        width: { size: width, type: WidthType.DXA },
        shading: { fill: "E8F4F8", type: ShadingType.CLEAR },
        margins: cellMargins,
        children: [
            new Paragraph({
                children: [new TextRun({ text, bold: true, size: 22 })],
            }),
        ],
    });

const cell = (text, width) =>
    new TableCell({
        borders,
        width: { size: width, type: WidthType.DXA },
        margins: cellMargins,
        children: [
            new Paragraph({
                children: [new TextRun({ text, size: 22 })],
            }),
        ],
    });

const doc = new Document({
    styles: {
        default: {
            document: {
                run: { font: "맑은 고딕", size: 22 },
            },
        },
        paragraphStyles: [
            {
                id: "Heading1",
                name: "Heading 1",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: { size: 36, bold: true, font: "맑은 고딕" },
                paragraph: { spacing: { before: 400, after: 200 } },
            },
            {
                id: "Heading2",
                name: "Heading 2",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: { size: 28, bold: true, font: "맑은 고딕" },
                paragraph: { spacing: { before: 300, after: 150 } },
            },
        ],
    },
    numbering: {
        config: [
            {
                reference: "bullets",
                levels: [
                    {
                        level: 0,
                        format: LevelFormat.BULLET,
                        text: "•",
                        alignment: AlignmentType.LEFT,
                        style: {
                            paragraph: { indent: { left: 720, hanging: 360 } },
                        },
                    },
                ],
            },
            {
                reference: "numbers",
                levels: [
                    {
                        level: 0,
                        format: LevelFormat.DECIMAL,
                        text: "%1.",
                        alignment: AlignmentType.LEFT,
                        style: {
                            paragraph: { indent: { left: 720, hanging: 360 } },
                        },
                    },
                ],
            },
        ],
    },
    sections: [
        {
            properties: {
                page: {
                    size: { width: 11906, height: 16838 },
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                },
            },
            children: [
                // =====================
                // AI 펫톡 이용 안내
                // =====================
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    children: [
                        new TextRun({
                            text: "AI 펫톡 서비스 이용 안내",
                            bold: true,
                            size: 40,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "1. AI 펫톡이란?", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "AI 펫톡은 인공지능(AI) 기술을 활용하여 사랑하는 반려동물의 목소리로 대화할 수 있는 서비스입니다. 보호자가 등록한 반려동물 정보를 바탕으로 AI가 반려동물의 성격과 특성을 반영하여 대화합니다.",
                            size: 22,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "2. 중요 안내사항", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "본 서비스의 모든 대화는 AI(인공지능)가 생성합니다.",
                            size: 22,
                            bold: true,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "AI의 응답은 실제 반려동물의 생각이나 의사가 아닙니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "수의학적 조언, 의료 상담, 법률 조언을 제공하지 않습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "정서적 위안을 위한 서비스이며, 전문적인 심리 상담을 대체하지 않습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "힘든 상황이 지속된다면 전문 상담을 받으시길 권장합니다.",
                            size: 22,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "3. 이용 한도", bold: true }),
                    ],
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [3000, 3000, 3000],
                    rows: [
                        new TableRow({
                            children: [
                                headerCell("구분", 3000),
                                headerCell("무료 회원", 3000),
                                headerCell("프리미엄 회원", 3000),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("일일 대화 횟수", 3000),
                                cell("10회", 3000),
                                cell("무제한", 3000),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("메시지 글자 수", 3000),
                                cell("200자", 3000),
                                cell("1,000자", 3000),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("대화 내역 저장", 3000),
                                cell("최근 50개", 3000),
                                cell("무제한", 3000),
                            ],
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300 },
                    children: [
                        new TextRun({ text: "4. 데이터 처리", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "대화 내용은 서비스 품질 향상을 위해 익명화되어 분석될 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "개인을 식별할 수 있는 정보는 분석에 사용되지 않습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "언제든지 대화 내역 삭제를 요청할 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 페이지 구분
                new Paragraph({ children: [new PageBreak()] }),

                // =====================
                // 환불 정책
                // =====================
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    children: [
                        new TextRun({
                            text: "프리미엄 구독 및 환불 정책",
                            bold: true,
                            size: 40,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "1. 프리미엄 구독 안내", bold: true }),
                    ],
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [3000, 3000, 3000],
                    rows: [
                        new TableRow({
                            children: [
                                headerCell("구독 유형", 3000),
                                headerCell("가격", 3000),
                                headerCell("비고", 3000),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("월간 구독", 3000),
                                cell("7,900원/월", 3000),
                                cell("매월 자동 결제", 3000),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("연간 구독", 3000),
                                cell("79,000원/년", 3000),
                                cell("2개월 무료 혜택", 3000),
                            ],
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300 },
                    children: [
                        new TextRun({ text: "2. 청약철회 (7일 이내)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "결제일로부터 7일 이내 청약철회 요청 시 전액 환불됩니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "단, 서비스를 이용한 경우 이용일수에 해당하는 금액을 제외하고 환불됩니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "환불 계산: 결제금액 - (결제금액 ÷ 구독일수 × 이용일수)",
                            size: 22,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "3. 구독 해지", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "구독 해지는 '계정 설정 > 구독 관리'에서 언제든지 가능합니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "해지 후에도 결제 주기 종료일까지 프리미엄 기능을 이용할 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "자동 갱신을 원하지 않으시면 갱신일 24시간 전까지 해지해 주세요.",
                            size: 22,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "4. 환불 처리 기간", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "카드 결제: 취소 후 3~5 영업일",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "계좌이체: 취소 후 5~7 영업일",
                            size: 22,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "5. 환불 불가 사유", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "약관 위반으로 인한 서비스 이용 제한",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "이벤트/프로모션 상품 (별도 고지된 경우)",
                            size: 22,
                        }),
                    ],
                }),

                // 페이지 구분
                new Paragraph({ children: [new PageBreak()] }),

                // =====================
                // 커뮤니티 가이드라인
                // =====================
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    children: [
                        new TextRun({
                            text: "커뮤니티 이용 가이드라인",
                            bold: true,
                            size: 40,
                        }),
                    ],
                }),

                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "메멘토애니는 반려동물을 사랑하는 모든 분들이 서로를 존중하며 따뜻한 마음을 나누는 공간입니다. 특히 반려동물을 떠나보낸 분들의 아픔을 이해하고 함께 위로하는 공간이므로, 다음 가이드라인을 지켜주세요.",
                            size: 22,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "1. 서로를 존중해주세요", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "다른 회원의 감정과 상황을 이해하고 배려해주세요.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "비방, 욕설, 혐오 표현은 금지됩니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "추모 공간에서는 특히 조심스럽게 댓글을 남겨주세요.",
                            size: 22,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "2. 적절한 콘텐츠를 공유해주세요", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "반려동물 학대, 폭력적인 이미지는 절대 금지입니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "타인의 반려동물 사진을 무단으로 사용하지 마세요.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "광고, 스팸, 사기 관련 게시물은 즉시 삭제됩니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "정치, 종교 등 민감한 주제의 게시물은 자제해주세요.",
                            size: 22,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "3. 추모 공간 이용 시", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "진심 어린 위로와 공감의 메시지를 남겨주세요.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: '"힘내세요", "잊으세요" 등의 조언보다는 함께 슬퍼해주세요.',
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "장례 서비스 등 상업적 홍보는 금지됩니다.",
                            size: 22,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "4. 분실동물 게시판 이용 시", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "허위 신고는 법적 처벌을 받을 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "찾은 경우 반드시 게시물을 업데이트해주세요.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "사례금 관련 분쟁은 당사자 간 해결해야 합니다.",
                            size: 22,
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "5. 위반 시 조치", bold: true }),
                    ],
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [3000, 6000],
                    rows: [
                        new TableRow({
                            children: [
                                headerCell("위반 정도", 3000),
                                headerCell("조치 내용", 6000),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("경고", 3000),
                                cell("해당 게시물 삭제 + 경고 1회", 6000),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("일시 정지", 3000),
                                cell("경고 3회 누적 시 7일 이용 정지", 6000),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("영구 정지", 3000),
                                cell("심각한 위반 또는 반복 위반 시 계정 영구 정지", 6000),
                            ],
                        }),
                    ],
                }),

                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300 },
                    children: [
                        new TextRun({ text: "6. 신고하기", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "부적절한 게시물이나 회원을 발견하시면 해당 콘텐츠의 '신고' 버튼을 눌러주세요. 신고 내용은 24시간 이내에 검토됩니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 연락처
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 100 },
                    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
                    children: [
                        new TextRun({
                            text: "문의: sharkwind1@gmail.com",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "본 정책은 2026년 __월 __일부터 시행됩니다.",
                            size: 20,
                            italics: true,
                        }),
                    ],
                }),
            ],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(
        "/sessions/adoring-sweet-cannon/mnt/memento1/docs/서비스정책모음.docx",
        buffer
    );
    console.log("서비스정책모음.docx 생성 완료!");
});
