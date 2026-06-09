# 메멘토애니 AI 기능 로드맵 — "AI 집합체" 리서치

> 상태: **리서치 v0.1 (2026-06-09)** · 전세계 최신 API/모델 조사 후 메멘토 핵심(AI펫톡·AI영상·추모·펫홈)에 매핑.
> 원칙: 일반 "멋진 AI 툴 목록"이 아니라 **메멘토가 실제로 쓸 것**만, 영향 × 통합난이도 × 비용으로 우선순위.
> 결정적 사실: **메멘토는 이미 fal.ai를 사용** → fal 카탈로그(600+ 모델, 단일 API)로 대부분 *증분 통합* 가능.

---

## 🥇 Tier 1 — 정의적 기능(감정·차별화 최강, 통합 저렴: 이미 fal)

### 1. 말하는 펫 (Talking Pet) ★ 플래그십 "AI 집합체"
AI펫톡(LLM) + 목소리(TTS) + 입싱크 영상(fal)을 한 줄로 엮음 = 메멘토 두 핵심(펫톡+영상)의 융합.
- **파이프라인**: 펫톡 답변 텍스트 → TTS 음성 → fal `Kling Avatar v2`(사진+음성→말하는 동물) → 우리 아이가 말하는 클립.
- **fal 모델**(이미 통합된 API): `Kling Avatar v2 Pro` 동물·한국어 지원 $0.115/초 · `Kling LipSync` $0.014/초 · `MuseTalk`(저가) · `Sync Lipsync 2.0`.
- 왜: "우리 아이가 진짜 말한다" = 한 번 보면 가입·공유 폭발. 펫홈 공유 페이지의 후크로도 직결.

### 2. 추모 사진 복원 + 애니메이션 (Memorial Revive) ★ 추모 킬러
오래되거나 흐린·유일한 사진 → 복원·컬러화 → 부드러운 움직임. "다시 한 번 움직이는 우리 아이." (Deep Nostalgia가 대규모 수요 증명.)
- **복원/컬러화 API**: jpgHD(API 제공, scratch/colorize/animate), LetsEnhance(Old Photo + image-to-video), VanceAI.
- **애니메이션**: fal image-to-video(gentle motion) — 이미 통합. "은은한 미소/눈깜빡임" 같은 identity-safe 모션.
- 추모 모드 전용. 감정 축에서 가장 강함.

---

## 🥈 Tier 2 — 강력, 중간 작업량

### 3. 펫 보이스 (TTS in AI펫톡)
펫톡 답변을 음성으로. #1의 토대.
- **옵션**: ElevenLabs(품질 최고·한국어·보이스클로닝, 규모 시 $0.30/1K자, 지연 ~380ms) / OpenAI TTS($15/M자 = 저가, 클로닝 X) / MiniMax·Murf·Audixa(한국어 저가).
- **권장 시작**: 종/성격별 **컨셉 보이스 프리셋**(안전) → 추후 보이스 옵션 확장.
- ⚠️ 윤리: 추모에서 "실제 아이 목소리 클론"은 강렬하나 기대치·정서 리스크 큼 → 신중(프리셋부터).

### 4. 개인화 꼬미 (사진→내 아이 닮은 캐릭터)
유저 펫 사진 → 그 아이 닮은 꼬미 생성(이미지 생성, fal flux 등). 17종 프리셋 → "내 아이 닮은 꼬미"가 되면 펫홈 소유감 극대화.
- 통합: fal 이미지 모델 + 메멘토 파스텔 스타일 프롬프트.

---

## 🥉 Tier 3 — 인프라/비용 최적화 (안 보이지만 영리함)

### 5. LLM 품질↑/비용↓
현재 `gpt-4o-mini`. 2026 기준 더 나은 가성비:
- **Gemini 2.5 Flash** $0.15/$0.60(M토큰) — 최고 가성비 / **GPT-4.1-mini** $0.40/$1.60 / **Claude Haiku 4.5** $1/$5(near-frontier·빠름) / Kimi K2.5, DeepSeek V3(초저가).
- **라우터 패턴**: 저가 분류기로 단순질문 → $0.10/M 모델, 복잡한 것만 상위모델 → 청구 60~80%↓. (게스트 체험 3회도 최저가 모델로.)

### 6. 검색/RAG
케어 정보 현 Tavily 유지. 필요 시 비교만.

---

## 🤖 에이전트 관점 (사용자 언급)
메멘토의 "에이전트" 가치는 무거운 프레임워크 도입이 아니라 **선제적 동반자/케어 에이전트**:
- 이미 운영 중: cron 블로그·매거진·뉴스 자동게시 에이전트.
- 확장 후보: **AI 케어 에이전트**(건강 패턴·리마인더·선제 알림), **펫톡 장기메모리 강화**(이미 pet_memories 있음 → 요약·검색 고도화).
- 결론: 외부 agent 프레임워크보다, 위 미디어/보이스 API를 펫톡·영상·펫홈에 엮는 게 ROI 최고.

---

## 💰 비용·게이팅 현실 (솔로·비용민감)
- 이 기능들은 **실사용당 AI 비용**이 큼 → 반드시 프리미엄/쿼터 뒤로(이미 AI영상 쿼터 존재 → 같은 패턴).
- **전부 도입 금지.** 제품을 정의하는 1~2개만.
- **추천**: 플래그십 = **#1 말하는 펫**(펫홈+펫톡+영상 융합·fal 증분) + 추모 킬러 = **#2 추모 revive**. 둘 다 기존 fal 통합 위라 착수 빠름. #3 펫보이스는 #1의 토대로 같이.

---

## 다음 단계
- POC: fal `Kling Avatar v2`로 샘플 펫 사진+짧은 음성 → 말하는 클립 1개 뽑아 품질·비용 실측(L4).
- 게이팅: 말하는 펫·revive = 프리미엄/월 쿼터(AI영상 쿼터 패턴 재사용).
- 펫홈 Phase와 연결: 공개 펫홈에 "이 아이와 대화/말하는 클립" 후크.

---

## Sources
- [10 Best AI Video Generators 2026 (fal.ai)](https://fal.ai/learn/tools/ai-video-generators)
- [AI Video Generation API Pricing Apr 2026](https://www.buildmvpfast.com/api-costs/ai-video)
- [Kling Avatar v2 Developer Guide (fal)](https://fal.ai/learn/devs/kling-avatar-v2-developer-guide)
- [Kling LipSync audio-to-video (fal)](https://fal.ai/models/fal-ai/kling-video/lipsync/audio-to-video/api)
- [MuseTalk lip-sync (fal)](https://fal.ai/models/fal-ai/musetalk)
- [Sync Lipsync 2.0 (fal)](https://fal.ai/models/fal-ai/sync-lipsync/v2)
- [TTS API 2026 comparison (TokenMix)](https://tokenmix.ai/blog/tts-api-comparison)
- [AI Voice Cloning API Comparison 2026](https://crazyrouter.com/en/blog/ai-voice-cloning-api-comparison-2026)
- [ElevenLabs Korean TTS](https://elevenlabs.io/text-to-speech/korean)
- [jpgHD AI photo restoration](https://jpghd.com/)
- [LetsEnhance restore + animate](https://letsenhance.io/blog/all/restore-old-camera-photos/)
- [Talking Pet AI lip sync tools 2026](https://aitools.omeka.net/ai-animal-lip-sync)
- [Cross-Provider LLM Pricing Apr 2026](https://pecollective.com/blog/llm-pricing-comparison-2026/)
- [Cheapest LLM API 2026](https://pricepertoken.com/cheapest)
