#!/usr/bin/env python3
"""결제 경로 안내 PDF 생성 스크립트"""

from fpdf import FPDF

FONT_PATH = "/Library/Fonts/Arial Unicode.ttf"
OUTPUT_PATH = "/Users/admin/.claude-worktrees/memento1/affectionate-ramanujan/docs/메멘토애니_결제경로안내.pdf"


class PaymentFlowPDF(FPDF):
    def header(self):
        self.set_font("Korean", "B", 10)
        self.set_text_color(150, 150, 150)
        self.cell(0, 8, "메멘토애니 - 결제 경로 안내", align="R")
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font("Korean", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"{self.page_no()}", align="C")

    def title_section(self, text):
        self.set_font("Korean", "B", 20)
        self.set_text_color(5, 178, 220)  # memento sky blue
        self.cell(0, 15, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def subtitle(self, text):
        self.set_font("Korean", "B", 14)
        self.set_text_color(40, 40, 40)
        self.cell(0, 10, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def sub_subtitle(self, text):
        self.set_font("Korean", "B", 12)
        self.set_text_color(60, 60, 60)
        self.cell(0, 9, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font("Korean", "", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font("Korean", "", 10)
        self.set_text_color(50, 50, 50)
        self.cell(8)  # indent
        self.multi_cell(0, 6, f"- {text}")
        self.ln(1)

    def step(self, number, text):
        self.set_font("Korean", "B", 10)
        self.set_text_color(5, 178, 220)
        self.cell(8)
        self.cell(8, 6, f"{number}.")
        self.set_font("Korean", "", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 6, text)
        self.ln(1)

    def info_box(self, label, value):
        self.set_font("Korean", "B", 10)
        self.set_text_color(80, 80, 80)
        self.cell(40, 7, label)
        self.set_font("Korean", "", 10)
        self.set_text_color(50, 50, 50)
        self.cell(0, 7, value, new_x="LMARGIN", new_y="NEXT")

    def table_header(self, cols, widths):
        self.set_font("Korean", "B", 9)
        self.set_fill_color(5, 178, 220)
        self.set_text_color(255, 255, 255)
        for i, col in enumerate(cols):
            self.cell(widths[i], 8, col, border=1, fill=True, align="C")
        self.ln()

    def table_row(self, cols, widths, fill=False):
        self.set_font("Korean", "", 9)
        self.set_text_color(50, 50, 50)
        if fill:
            self.set_fill_color(240, 248, 255)
        for i, col in enumerate(cols):
            self.cell(widths[i], 7, col, border=1, fill=fill, align="C")
        self.ln()

    def divider(self):
        self.ln(3)
        self.set_draw_color(220, 220, 220)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(5)


def main():
    pdf = PaymentFlowPDF()
    pdf.add_font("Korean", "", FONT_PATH, uni=False)
    pdf.add_font("Korean", "B", FONT_PATH, uni=False)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # === 제목 ===
    pdf.title_section("메멘토애니 결제 경로 안내")
    pdf.body_text(
        "메멘토애니는 반려동물과의 추억을 기록하고 관리하는 메모리얼 커뮤니티 플랫폼입니다.\n"
        "무료 / 베이직 / 프리미엄 3단계 구독 모델로 운영됩니다."
    )

    pdf.divider()

    # === 테스트 계정 ===
    pdf.subtitle("1. 테스트 계정 정보")
    pdf.ln(2)
    pdf.info_box("접속 URL :", "https://www.mementoani.com/test-login")
    pdf.info_box("이메일 :", "testmementoani@gmail.com")
    pdf.info_box("비밀번호 :", "Testmemento")
    pdf.ln(4)
    pdf.body_text(
        "* 위 URL로 접속하여 이메일/비밀번호를 입력하면 로그인됩니다.\n"
        "* 로그인 후 서비스 내 모든 기능을 테스트할 수 있습니다."
    )

    pdf.divider()

    # === 구독 플랜 ===
    pdf.subtitle("2. 구독 플랜 비교")
    pdf.ln(2)

    widths = [35, 35, 45, 50]
    pdf.table_header(["구분", "무료", "베이직 (7,900원/월)", "프리미엄 (14,900원/월)"], widths)
    pdf.table_row(["AI 펫톡", "하루 10회", "하루 50회", "무제한"], widths, fill=True)
    pdf.table_row(["반려동물 등록", "1마리", "3마리", "10마리"], widths)
    pdf.table_row(["사진 저장", "펫당 50장", "펫당 200장", "펫당 1,000장"], widths, fill=True)
    pdf.table_row(["AI 영상", "평생 1회", "월 3회", "월 6회"], widths)
    pdf.table_row(["영상 단품 구매", "3,500원/건", "3,500원/건", "3,500원/건"], widths, fill=True)

    pdf.divider()

    # === 결제 경로 ===
    pdf.subtitle("3. 결제 경로")
    pdf.ln(2)

    # 경로 1
    pdf.sub_subtitle("경로 1: AI 펫톡 대화 제한 도달")
    pdf.step(1, "로그인 후 하단 메뉴에서 [AI펫톡] 탭을 클릭합니다.")
    pdf.step(2, "AI와 대화를 진행합니다.")
    pdf.step(3, "무료 대화 횟수(하루 10회)가 소진되면 프리미엄 구독 모달이 자동으로 표시됩니다.")
    pdf.step(4, "베이직 또는 프리미엄 플랜을 선택합니다.")
    pdf.step(5, "결제 버튼을 클릭하면 포트원 결제창이 열립니다.")
    pdf.step(6, "카드 정보를 입력하여 결제를 완료합니다.")
    pdf.ln(2)
    pdf.body_text("* 남은 대화 횟수가 3회 이하일 때도 '프리미엄으로 무제한' 안내 배너가 표시됩니다.")

    pdf.ln(2)

    # 경로 2
    pdf.sub_subtitle("경로 2: 반려동물 등록 제한 도달")
    pdf.step(1, "로그인 후 하단 메뉴에서 [내 기록] 탭을 클릭합니다.")
    pdf.step(2, "[새 반려동물 추가] 버튼을 클릭합니다.")
    pdf.step(3, "무료 제한(1마리)에 도달하면 프리미엄 구독 모달이 표시됩니다.")
    pdf.step(4, "베이직 또는 프리미엄 플랜을 선택합니다.")
    pdf.step(5, "결제 버튼을 클릭하면 포트원 결제창이 열립니다.")
    pdf.step(6, "카드 정보를 입력하여 결제를 완료합니다.")

    pdf.ln(2)

    # 경로 3
    pdf.sub_subtitle("경로 3: AI 영상 생성 (단품 결제)")
    pdf.step(1, "로그인 후 하단 메뉴에서 [내 기록] 탭을 클릭합니다.")
    pdf.step(2, "반려동물 프로필 하단의 [AI 영상 만들기] 버튼을 클릭합니다.")
    pdf.step(3, "영상 템플릿을 선택하고 생성을 요청합니다.")
    pdf.step(4, "무료 쿼터(평생 1회) 소진 시 단품 구매(3,500원/건)로 추가 생성이 가능합니다.")
    pdf.step(5, "결제 버튼을 클릭하면 포트원 결제창이 열립니다.")
    pdf.step(6, "카드 정보를 입력하여 결제를 완료합니다.")
    pdf.ln(2)
    pdf.body_text(
        "* 무료 회원: 평생 1회 / 베이직: 월 3회 / 프리미엄: 월 6회 기본 제공\n"
        "* 쿼터 소진 후 건당 3,500원으로 추가 구매 가능"
    )


    pdf.divider()

    # === 결제 처리 흐름 ===
    pdf.subtitle("4. 결제 처리 흐름")
    pdf.ln(2)
    pdf.step(1, "사용자가 플랜 선택 후 결제 버튼을 클릭합니다.")
    pdf.step(2, "서버에 결제 준비 요청을 보냅니다. (결제 금액은 서버에서 결정하여 위변조를 방지합니다)")
    pdf.step(3, "포트원(PortOne) V2 결제창이 호출됩니다.")
    pdf.body_text(
        "    - PG사: KG이니시스\n"
        "    - 결제수단: 신용/체크카드\n"
        "    - PC: 팝업 방식 / 모바일: 리다이렉트 방식"
    )
    pdf.step(4, "결제 완료 후 서버에서 포트원 API를 통해 결제 상태 및 금액을 검증합니다.")
    pdf.step(5, "검증 통과 시 프리미엄이 즉시 활성화됩니다.")

    pdf.divider()

    # === 결제 모달 상세 ===
    pdf.subtitle("5. 결제 모달 화면 구성")
    pdf.ln(2)
    pdf.sub_subtitle("베이직 플랜 (월 7,900원)")
    pdf.bullet("AI 펫톡 하루 50회")
    pdf.bullet("반려동물 3마리 등록")
    pdf.bullet("사진 펫당 200장 저장")
    pdf.bullet("AI 영상 월 3회")
    pdf.bullet("결제 버튼: '베이직 7,900원/월 시작'")
    pdf.ln(2)

    pdf.sub_subtitle("프리미엄 플랜 (월 14,900원)")
    pdf.bullet("AI 펫톡 무제한")
    pdf.bullet("반려동물 10마리 등록")
    pdf.bullet("사진 펫당 1,000장 저장")
    pdf.bullet("AI 영상 월 6회")
    pdf.bullet("우선 고객지원")
    pdf.bullet("결제 버튼: '프리미엄 14,900원/월 시작'")

    pdf.ln(2)

    pdf.sub_subtitle("AI 영상 단품 구매 (건당 3,500원)")
    pdf.bullet("쿼터 소진 후 건당 3,500원으로 추가 구매")
    pdf.bullet("반려동물 사진을 기반으로 AI 추억 영상 생성")
    pdf.bullet("결제 버튼: 영상 생성 모달 내 '단품 구매' 버튼")

    pdf.divider()

    # === 구독 및 환불 정책 ===
    pdf.subtitle("6. 구독 및 환불 정책")
    pdf.ln(2)

    pdf.sub_subtitle("구독 기간 및 자동 갱신")
    pdf.bullet("구독 기간: 결제일로부터 30일")
    pdf.bullet("자동 갱신: 만료일에 동일 플랜/요금으로 자동 결제")
    pdf.bullet("갱신 안내: 갱신일 7일 전 이메일/알림으로 사전 안내")
    pdf.bullet("해지: 언제든 해지 가능, 남은 기간까지 이용 가능")
    pdf.ln(2)

    pdf.sub_subtitle("환불 정책")
    pdf.bullet("결제 후 7일 이내 미이용 시: 전액 환불")
    pdf.bullet("이용 개시 후: 남은 일수 비례 환불 (환불 금액 = 결제 금액 x 남은 일수 / 30)")
    pdf.bullet("AI 영상 단품: 생성 시작 전 전액 환불 가능, 생성 개시 후 환불 불가")
    pdf.bullet("환불 처리: 요청 후 3영업일 이내 원래 결제 수단으로 환불")
    pdf.ln(2)

    pdf.sub_subtitle("AI 영상 보관")
    pdf.bullet("생성된 영상: 서비스 내 영구 보관, 열람/다운로드 가능")
    pdf.bullet("구독 해지 시: 이미 생성된 영상은 삭제되지 않음")
    pdf.bullet("회원 탈퇴 시: 영상 포함 모든 데이터 영구 삭제 (복구 불가)")

    pdf.divider()

    # === 참고사항 ===
    pdf.subtitle("7. 참고사항")
    pdf.ln(2)
    pdf.bullet("결제 연동: 포트원(PortOne) V2 + KG이니시스")
    pdf.bullet("결제 약관 전문: https://www.mementoani.com/payment-terms")
    pdf.bullet("이용약관: https://www.mementoani.com/terms")
    pdf.bullet("개인정보처리방침: https://www.mementoani.com/privacy")
    pdf.bullet("고객 문의: sharkwind1@gmail.com")

    # 저장
    pdf.output(OUTPUT_PATH)
    print(f"PDF 생성 완료: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
