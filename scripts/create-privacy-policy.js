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
    BorderStyle,
    WidthType,
    ShadingType,
    LevelFormat,
} = require("docx");
const fs = require("fs");

// 테이블 스타일
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// 헤더 셀 생성
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

// 일반 셀 생성
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
                reference: "article-numbers",
                levels: [
                    {
                        level: 0,
                        format: LevelFormat.DECIMAL,
                        text: "제%1조",
                        alignment: AlignmentType.LEFT,
                        style: {
                            paragraph: { indent: { left: 0, hanging: 0 } },
                            run: { bold: true },
                        },
                    },
                ],
            },
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
        ],
    },
    sections: [
        {
            properties: {
                page: {
                    size: { width: 11906, height: 16838 }, // A4
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
                            text: "개인정보처리방침",
                            bold: true,
                            size: 40,
                        }),
                    ],
                }),

                // 서문
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "메멘토애니(이하 '회사')는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.",
                            size: 22,
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

                // 제1조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제1조 (개인정보의 처리 목적)", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "서비스 제공: 반려동물 기록 저장, AI 펫톡 서비스, 추모 공간 제공, 커뮤니티 서비스, 분실동물 찾기 서비스",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "마케팅 및 광고: 이벤트 및 광고성 정보 제공, 서비스 이용 통계 분석",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "유료 서비스: 프리미엄 구독 결제 처리, 환불 처리",
                            size: 22,
                        }),
                    ],
                }),

                // 제2조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제2조 (수집하는 개인정보의 항목)", bold: true }),
                    ],
                }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [2000, 3500, 3500],
                    rows: [
                        new TableRow({
                            children: [
                                headerCell("구분", 2000),
                                headerCell("필수항목", 3500),
                                headerCell("선택항목", 3500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("회원가입", 2000),
                                cell("이메일, 비밀번호, 닉네임", 3500),
                                cell("프로필 이미지", 3500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("반려동물 등록", 2000),
                                cell("반려동물 이름, 종류", 3500),
                                cell("생년월일, 성별, 사진, 특징, 건강기록", 3500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("분실동물 신고", 2000),
                                cell("연락처, 실종 위치", 3500),
                                cell("보호자 연락 가능 시간", 3500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("유료 결제", 2000),
                                cell("결제정보(PG사 처리)", 3500),
                                cell("-", 3500),
                            ],
                        }),
                    ],
                }),

                new Paragraph({
                    spacing: { before: 200, after: 200 },
                    children: [
                        new TextRun({
                            text: "※ 서비스 이용 과정에서 IP주소, 쿠키, 서비스 이용기록, 기기정보가 자동으로 생성되어 수집될 수 있습니다.",
                            size: 20,
                            italics: true,
                        }),
                    ],
                }),

                // 제3조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제3조 (개인정보의 처리 및 보유 기간)", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.",
                            size: 22,
                        }),
                    ],
                }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [4500, 4500],
                    rows: [
                        new TableRow({
                            children: [
                                headerCell("구분", 4500),
                                headerCell("보유기간", 4500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("회원 정보", 4500),
                                cell("회원 탈퇴 시까지 (탈퇴 후 30일 내 파기)", 4500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("반려동물 기록/추모 데이터", 4500),
                                cell("회원 탈퇴 시까지 (요청 시 즉시 삭제)", 4500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("결제 정보", 4500),
                                cell("전자상거래법에 따라 5년", 4500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("서비스 이용 기록", 4500),
                                cell("통신비밀보호법에 따라 3개월", 4500),
                            ],
                        }),
                    ],
                }),

                // 제4조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300 },
                    children: [
                        new TextRun({ text: "제4조 (개인정보의 제3자 제공)", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "회사는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.",
                            size: 22,
                        }),
                    ],
                }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [2250, 2250, 2250, 2250],
                    rows: [
                        new TableRow({
                            children: [
                                headerCell("제공받는 자", 2250),
                                headerCell("제공 목적", 2250),
                                headerCell("제공 항목", 2250),
                                headerCell("보유 기간", 2250),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("결제대행사(PG)", 2250),
                                cell("결제 처리", 2250),
                                cell("결제정보", 2250),
                                cell("결제완료 후 5년", 2250),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("제휴 동물병원/장례업체 (동의 시)", 2250),
                                cell("서비스 연결", 2250),
                                cell("연락처, 반려동물 정보", 2250),
                                cell("서비스 완료 시", 2250),
                            ],
                        }),
                    ],
                }),

                // 제5조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300 },
                    children: [
                        new TextRun({ text: "제5조 (개인정보처리의 위탁)", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.",
                            size: 22,
                        }),
                    ],
                }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [4500, 4500],
                    rows: [
                        new TableRow({
                            children: [
                                headerCell("위탁받는 자", 4500),
                                headerCell("위탁 업무", 4500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("Supabase Inc.", 4500),
                                cell("데이터베이스 및 인증 서비스 운영", 4500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("OpenAI", 4500),
                                cell("AI 펫톡 서비스 제공 (대화 내용 처리)", 4500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("포트원(구 아임포트)", 4500),
                                cell("결제 처리", 4500),
                            ],
                        }),
                    ],
                }),

                // 제6조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300 },
                    children: [
                        new TextRun({ text: "제6조 (정보주체의 권리·의무 및 행사방법)", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "개인정보 열람 요구",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "오류 등이 있을 경우 정정 요구",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "삭제 요구 (단, 법령에서 보존을 의무화한 경우 제외)",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "처리정지 요구",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "개인정보 이동 요구 (내 데이터 내보내기)",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "위 권리 행사는 서비스 내 '계정 설정' 메뉴 또는 개인정보 보호책임자에게 이메일로 요청하실 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 제7조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제7조 (AI 서비스 이용 관련 안내)", bold: true }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "'AI 펫톡' 서비스는 인공지능(AI) 기술을 활용하여 제공됩니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "AI와의 대화 내용은 서비스 품질 향상을 위해 익명화된 형태로 분석될 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "AI의 응답은 참고용이며, 의료·법률 등 전문적 조언을 대체하지 않습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "사용자는 언제든지 AI 서비스 이용 내역 삭제를 요청할 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),

                // 제8조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제8조 (개인정보의 파기)", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "전자적 파일: 복구 불가능한 방법으로 영구 삭제",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "종이 문서: 분쇄기로 분쇄하거나 소각",
                            size: 22,
                        }),
                    ],
                }),

                // 제9조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({ text: "제9조 (개인정보의 안전성 확보조치)", bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "개인정보 암호화: 비밀번호 등 중요 정보는 암호화하여 저장·관리",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "해킹 등 대비: SSL/TLS 암호화 통신, 보안 프로그램 설치·갱신",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "접근 통제: 개인정보처리시스템에 대한 접근권한 관리",
                            size: 22,
                        }),
                    ],
                }),

                // 제10조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({
                            text: "제10조 (개인정보 보호책임자)",
                            bold: true,
                        }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.",
                            size: 22,
                        }),
                    ],
                }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [4500, 4500],
                    rows: [
                        new TableRow({
                            children: [
                                headerCell("구분", 4500),
                                headerCell("내용", 4500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("성명", 4500),
                                cell("안승빈", 4500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("직책", 4500),
                                cell("대표 / 개인정보 보호책임자", 4500),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell("연락처", 4500),
                                cell("이메일: sharkwind1@gmail.com", 4500),
                            ],
                        }),
                    ],
                }),

                // 제11조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300 },
                    children: [
                        new TextRun({
                            text: "제11조 (권익침해 구제방법)",
                            bold: true,
                        }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: "정보주체는 아래의 기관에 대해 개인정보 침해에 대한 피해구제, 상담 등을 문의하실 수 있습니다.",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "개인정보침해신고센터: (국번없이) 118 / privacy.kisa.or.kr",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "개인정보분쟁조정위원회: 1833-6972 / kopico.go.kr",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [
                        new TextRun({
                            text: "대검찰청 사이버수사과: (국번없이) 1301 / spo.go.kr",
                            size: 22,
                        }),
                    ],
                }),
                new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "경찰청 사이버안전국: (국번없이) 182 / cyberbureau.police.go.kr",
                            size: 22,
                        }),
                    ],
                }),

                // 제12조
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [
                        new TextRun({
                            text: "제12조 (개인정보 처리방침의 변경)",
                            bold: true,
                        }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 300 },
                    children: [
                        new TextRun({
                            text: "이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.",
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
                            text: "본 방침은 2026년 __월 __일부터 시행합니다.",
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
        "/sessions/adoring-sweet-cannon/mnt/memento1/docs/개인정보처리방침.docx",
        buffer
    );
    console.log("개인정보처리방침.docx 생성 완료!");
});
