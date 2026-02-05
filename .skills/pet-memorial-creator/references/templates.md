# 추모 콘텐츠 템플릿 상세

## 목차
1. [아기 시절](#아기-시절)
2. [천국에서](#천국에서)
3. [휴양지](#휴양지)
4. [꽃밭](#꽃밭)
5. [무지개다리](#무지개다리)

---

## 아기 시절

**컨셉**: 노견/노묘의 사진을 입력받아 어릴 때 모습을 AI가 예측, 주인에게 애교 부리는 모습

**감정 키워드**: 그리움, 따뜻함, 추억

**이미지 프롬프트 (영문)**:
```
A cute baby [dog breed/cat breed] puppy/kitten, same markings and colors as reference photo,
big innocent eyes looking at camera with affection, soft warm lighting,
fluffy fur, playful pose, studio photography style, heartwarming atmosphere
--ar 9:16 --style raw
```

**영상 프롬프트**:
```
Baby [breed] puppy/kitten looking up at camera with loving eyes,
wagging tail/purring, trying to reach toward camera as if greeting owner,
soft focus background, warm golden hour lighting, 5 seconds
```

**기술 노트**:
- 원본 사진에서 털 색상/패턴 추출 필요
- 얼굴 특징 유지하면서 어린 버전 생성
- img2img + 프롬프트 조합 권장

---

## 천국에서

**컨셉**: 반려동물이 천국에서 행복하게 주인을 맞이하는 모습 (링 + 후광)

**감정 키워드**: 위로, 평화, 안도

**이미지 프롬프트 (영문)**:
```
A [dog breed/cat breed] in heaven, golden halo floating above head,
soft divine light rays from behind, fluffy white clouds,
peaceful happy expression, looking directly at viewer with love,
ethereal dreamy atmosphere, pastel colors, celestial setting
--ar 9:16 --style raw
```

**영상 프롬프트**:
```
[Breed] standing on fluffy clouds in heaven, golden halo glowing above head,
soft light rays behind, gentle breeze moving fur,
looking at camera and wagging tail/meowing happily,
welcoming gesture, peaceful heavenly atmosphere, 5 seconds
```

**기술 노트**:
- 후광/링은 후처리로 추가하는 게 더 안정적
- 구름 배경은 일관성 유지 쉬움
- 메멘토애니 컬러(하늘색, 연보라, 황금) 반영

---

## 휴양지

**컨셉**: 해변 선베드에서 선글라스 끼고 칵테일 마시며 손 흔드는 모습

**감정 키워드**: 유쾌함, 안심, 위트

**이미지 프롬프트 (영문)**:
```
A [dog breed/cat breed] wearing sunglasses, lying on beach sunbed,
holding tropical cocktail with paw, waving at camera,
sunny beach background with palm trees, relaxed vacation vibe,
anthropomorphic but still cute, humorous heartwarming scene
--ar 9:16 --style raw
```

**영상 프롬프트**:
```
[Breed] on beach sunbed wearing cool sunglasses,
sipping cocktail then looking at camera and waving paw,
ocean waves in background, palm trees swaying,
sunny vacation atmosphere, playful and relaxed, 5 seconds
```

**기술 노트**:
- 의인화 수준 조절 필요 (너무 사람같으면 uncanny)
- 선글라스/칵테일은 템플릿 에셋으로 합성 가능
- 밝고 유쾌한 톤 유지

---

## 꽃밭

**컨셉**: 아름다운 꽃밭에서 자유롭게 뛰노는 모습

**감정 키워드**: 자유, 행복, 평화

**이미지 프롬프트 (영문)**:
```
A happy [dog breed/cat breed] running through beautiful flower field,
colorful wildflowers (lavender, daisies, sunflowers),
joyful expression, ears flopping, tongue out (for dogs),
golden hour sunlight, dreamy bokeh background, freedom and happiness
--ar 9:16 --style raw
```

**영상 프롬프트**:
```
[Breed] running joyfully through endless flower field,
flowers swaying in gentle breeze, butterfly nearby,
happy expression, free movement, sunlight filtering through,
peaceful paradise feeling, slow motion effect, 5 seconds
```

**기술 노트**:
- 움직임이 많아 영상 생성 난이도 높음
- 슬로모션 효과로 감동 배가
- 꽃 종류로 계절감 조절 가능

---

## 무지개다리

**컨셉**: 무지개다리를 건너며 뒤돌아 주인을 바라보는 모습

**감정 키워드**: 이별, 희망, 재회의 약속

**이미지 프롬프트 (영문)**:
```
A [dog breed/cat breed] walking on rainbow bridge in the sky,
looking back over shoulder at viewer with gentle loving eyes,
soft pastel rainbow colors, fluffy clouds below,
bittersweet but hopeful atmosphere, "see you again" feeling,
cinematic composition, emotional lighting
--ar 9:16 --style raw
```

**영상 프롬프트**:
```
[Breed] walking slowly across rainbow bridge among clouds,
pausing to look back at camera with loving gentle eyes,
soft smile, slight tail wag, then continuing forward,
rainbow colors glowing softly, emotional farewell scene, 5 seconds
```

**기술 노트**:
- 가장 감동적이지만 슬픔 유발 가능
- "다시 만나자" 메시지와 함께 제공
- 뒤돌아보는 순간이 핵심 (타이밍 중요)

---

## 프롬프트 커스터마이징 가이드

### 견종/묘종 입력
사용자가 업로드한 사진에서 품종 감지 후 프롬프트에 삽입:
- `[dog breed]` → "golden retriever", "shiba inu", "maltese" 등
- `[cat breed]` → "persian cat", "scottish fold", "russian blue" 등
- 믹스견/묘: "mixed breed dog with [특징 설명]"

### 털 색상/패턴
- "brown and white spotted"
- "black with tan markings"
- "orange tabby pattern"
- "solid white fluffy coat"

### 특징 유지
원본 사진의 특징을 프롬프트에 추가:
- 귀 모양: "floppy ears", "pointed ears"
- 눈 색상: "brown eyes", "blue eyes"
- 특이사항: "one blue one brown eye", "black nose"
