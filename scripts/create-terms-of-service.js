const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    HeadingLevel,
    LevelFormat,
} = require("docx");
const fs = require("fs");

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
                run: { size: 32, bold: true, font: "맑은 고딕" },
                paragraph: { spacing: { before: 400, after: 200 } },
            },
            {
                id: "Heading2",
                name: "Heading 2",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: { size: 26, bold: true, font: "맑은 고딕" },
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
                // 제목
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    children: [
                        new TextRun({
                            text: "메멘토애니 서비스 이용약관",
                            bold: true,
                            size: 40,
                        }),
                    ],
                }),

                new Paragraph({
                    spacing: { after: 300 },
                    children: [
                        new TextRun({
                            text: "시행일자: 2026년 __월 __일",
                            size: 22,
                            italics: true,
                        }),
                    ],
                }),

                // 제1장 총칙
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: [new TextRun({ text: "제1장 총칙", bold: true })],
                }),

                // 제1조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [new TextRun({ text: "제1조 (목적)", bold: true })],
                }),
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: '이 약관은 메멘토애니(이하 "회사")가 제공하는 반려동물 기록 및 추모 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.',
                            size: 22,
                        }),
                    ],
                }),

                // 제2조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [new TextRun({ text: "제2조 (정의)", bold: true })],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: '"서비스"란 회사가 제공하는 반려동물 기록, AI 펫톡, 추모 공간, 커뮤니티, 분실동물 찾기 등 관련 제반 서비스를 의미합니다.',
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: '"회원"이란 회사와 서비스 이용계약을 체결하고 회원 아이디(ID)를 부여받은 자를 말합니다.',
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: '"AI 펫톡"이란 인공지능 기술을 활용하여 반려동물의 목소리로 대화하는 서비스를 말합니다.',
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: '"추모 모드"란 무지개다리를 건넌 반려동물을 위한 특별한 서비스 모드를 말합니다.',
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: '"프리미엄 서비스"란 유료 결제를 통해 이용할 수 있는 추가 기능을 말합니다.',
                            size: 22,
                        }),
                    ],
                }),

                // 제3조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제3조 (약관의 효력 및 변경)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경된 약관은 적용일자 7일 전부터 공지합니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "회원이 변경된 약관에 동의하지 않는 경우, 서비스 이용을 중단하고 탈퇴할 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 제2장 서비스 이용
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: [new TextRun({ text: "제2장 서비스 이용", bold: true })],
                }),

                // 제4조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제4조 (회원가입)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "회원가입은 이용자가 약관의 내용에 대하여 동의를 한 다음 회원가입 신청을 하고, 회사가 이를 승낙함으로써 체결됩니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "만 14세 미만의 아동이 회원가입을 하는 경우, 법정대리인의 동의가 필요합니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 제5조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제5조 (서비스의 제공)", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "회사는 회원에게 다음과 같은 서비스를 제공합니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "반려동물 정보 등록 및 기록 관리",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "사진/동영상 타임라인 저장",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "AI 펫톡 (인공지능 대화 서비스)",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "추모 공간 및 추억 기록",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "커뮤니티 서비스",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "분실동물 찾기 서비스",
                            size: 22,
                        }),
                    ],
                }),

                // 제6조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제6조 (AI 펫톡 서비스 특별 조항)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "AI 펫톡 서비스는 인공지능 기술을 활용하며, AI가 생성한 대화임을 회원에게 명확히 고지합니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "AI의 응답은 참고용이며, 수의학적, 법률적, 심리적 전문 조언을 대체하지 않습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "회사는 AI 응답의 정확성, 완전성을 보장하지 않으며, AI 응답으로 인한 손해에 대해 책임지지 않습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "무료 회원은 일일 대화 횟수 제한이 있으며, 프리미엄 회원은 무제한으로 이용 가능합니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 제7조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제7조 (프리미엄 서비스 및 결제)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "프리미엄 서비스는 월간 또는 연간 구독 방식으로 제공됩니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "구독은 자동 갱신되며, 갱신일 24시간 전까지 해지하지 않으면 자동으로 결제됩니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "구독 해지는 서비스 내 '계정 설정'에서 언제든지 가능합니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 제8조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제8조 (청약철회 및 환불)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "회원은 결제일로부터 7일 이내에 청약철회를 요청할 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "단, 서비스를 이용한 경우(AI 펫톡 대화 등) 이용분을 제외한 금액을 환불합니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "환불은 결제 수단에 따라 3~7 영업일 내에 처리됩니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 제3장 회원의 의무
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: [new TextRun({ text: "제3장 회원의 의무", bold: true })],
                }),

                // 제9조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제9조 (회원의 의무)", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "회원은 다음 행위를 하여서는 안 됩니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "타인의 정보를 도용하거나 허위 정보를 등록하는 행위",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "타인의 반려동물 사진/정보를 무단으로 사용하는 행위",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "서비스를 이용하여 영리 목적의 광고를 게시하는 행위",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "다른 회원을 비방하거나 모욕하는 행위",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "타인의 추모 공간에 부적절한 내용을 게시하는 행위",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "서비스의 운영을 방해하는 행위",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "기타 법령에 위반되는 행위",
                            size: 22,
                        }),
                    ],
                }),

                // 제10조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제10조 (게시물의 권리와 책임)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "회원이 서비스에 게시한 게시물의 저작권은 해당 회원에게 귀속됩니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "회사는 서비스 운영, 홍보 목적으로 회원의 게시물을 사용할 수 있으며, 이 경우 개인정보는 제외합니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "회원 탈퇴 시 게시물은 삭제되나, 공동 추모 공간 등 다른 회원과 공유된 게시물은 유지될 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 제4장 기타
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: [new TextRun({ text: "제4장 기타", bold: true })],
                }),

                // 제11조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제11조 (서비스 이용제한 및 탈퇴)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "회사는 회원이 이 약관을 위반하거나 서비스 운영을 방해한 경우, 서비스 이용을 제한하거나 회원 자격을 상실시킬 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "회원은 언제든지 서비스 내에서 탈퇴를 요청할 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "탈퇴 시 회원의 개인정보 및 게시물은 개인정보처리방침에 따라 처리됩니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 제12조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제12조 (면책조항)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "회사는 천재지변, 전쟁, 서비스 설비의 장애 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "회사는 회원 간 또는 회원과 제3자 간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없으며, 이로 인한 손해를 배상할 책임이 없습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "AI 펫톡 서비스의 응답 내용으로 인한 정서적, 심리적 영향에 대해 회사는 책임지지 않습니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 제13조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제13조 (분쟁해결 및 관할법원)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    children: [
                        new TextRun({
                            text: "서비스 이용과 관련하여 분쟁이 발생한 경우, 회사와 회원은 상호 협의하여 해결합니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "numbers", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "협의가 이루어지지 않을 경우, 대한민국 법률에 따르며 서울중앙지방법원을 관할법원으로 합니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 부칙
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400 },
                    children: [
                        new TextRun({
                            text: "부 칙",
                            bold: true,
                            size: 24,
                        }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "본 약관은 2026년 __월 __일부터 시행합니다.",
                            size: 22,
                        }),
                    ],
                }),
            ],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(
        "/sessions/adoring-sweet-cannon/mnt/memento1/docs/이용약관.docx",
        buffer
    );
    console.log("이용약관.docx 생성 완료!");
});
