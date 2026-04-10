# Design System: Memento Ani

**Product Type:** 반려동물 메모리얼 커뮤니티 플랫폼 (듀얼 모드: 일상 + 추모)

> OKLCH 기반 디자인 토큰 시스템.
> 모든 색상값은 OKLCH 표기. 사이즈는 px 기준.
> 이 파일은 Design Farmer v0.0.6 기반으로 생성됨.

## Config

```yaml
packageManager: npm
framework: next-app-router
isMonorepo: false
systemPath: .
designSystemPackage: memento1
componentScope: full
headlessLibrary: radix
themeStrategy: light-dark
themeLibrary: class-based
accessibilityLevel: apca
radiusTone: rounded
targetPlatforms: web
designMaturity: emerging
maturityScore: 5
```

---

## 1. Visual Theme & Atmosphere

메멘토애니는 반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직할 수 있는 메모리얼 커뮤니티 플랫폼이다. My Little Puppy 게임 감성의 밝고 따뜻한 파스텔톤을 기본으로 하며, 듀얼 모드 시스템이 핵심 특징이다.

**일상 모드**: 하늘색(Cyan-Blue) 계열. 밝고 활기찬 느낌. 반려동물과의 일상을 기록하는 따뜻한 공간.
**추모 모드**: 황금빛(Amber-Gold) 계열. 따뜻하지만 차분한 느낌. 무지개다리를 건넌 반려동물을 기억하는 공간.

**Key Characteristics:**
- 배경: 뭉게구름 화이트 그라데이션 — `oklch(0.98 0.01 80)` → `oklch(0.99 0.01 85)`
- 폰트: Pretendard (본문 400-600), Jalnan2 (디스플레이)
- 일상 브랜드 컬러: `oklch(0.67 0.13 225)` (#05B2DC) — APCA Lc 60+ on white
- 추모 브랜드 컬러: `oklch(0.70 0.16 85)` (#F59E0B) — 황금빛 amber
- 보더: 거의 보이지 않는 구조적 가이드, 장식이 아닌 구분 용도
- 톤: 어둡지 않고 따뜻하게. 죽음이 아니라 무지개다리. 끝이 아니라 기억.

---

## 2. Color Palette & Roles

### 2.1 Primitive Tokens — 일상 모드 (memento)

| Step | Hex | OKLCH | Role |
|------|-----|-------|------|
| 50 | `#FDF8F3` | `oklch(0.98 0.01 80)` | Page background start (warm cream) |
| 75 | `#FEFAF6` | `oklch(0.99 0.005 85)` | Page background mid |
| 100 | `#FFF3E8` | `oklch(0.97 0.03 80)` | Surface (card, hover, badge) |
| 200 | `#BAE6FD` | `oklch(0.90 0.07 220)` | Light surface |
| 300 | `#7DD3FC` | `oklch(0.82 0.10 220)` | Border accent |
| 400 | `#38BDF8` | `oklch(0.74 0.14 225)` | Primary light (gradient, dark text) |
| 500 | `#05B2DC` | `oklch(0.67 0.13 225)` | **Primary** (CTA bg, icon) |
| 600 | `#0891B2` | `oklch(0.58 0.12 210)` | Hover + text (AA 5.9:1) |
| 700 | `#0369A1` | `oklch(0.48 0.12 240)` | Dark text (AAA 7.1:1) |
| 800 | `#075985` | `oklch(0.42 0.10 235)` | Dark mode text |
| 900 | `#0C4A6E` | `oklch(0.36 0.09 235)` | Dark mode background |
| 950 | `#082F49` | `oklch(0.26 0.06 235)` | Darkest background |

### 2.2 Primitive Tokens — 추모 모드 (memorial)

| Step | Hex | OKLCH | Role |
|------|-----|-------|------|
| 50 | `#FFFBEB` | `oklch(0.99 0.03 95)` | Memorial bg (lightest gold) |
| 100 | `#FEF3C7` | `oklch(0.96 0.06 95)` | Memorial surface |
| 200 | `#FDE68A` | `oklch(0.92 0.12 95)` | Memorial light |
| 300 | `#FCD34D` | `oklch(0.87 0.16 90)` | Memorial accent |
| 400 | `#FBBF24` | `oklch(0.82 0.18 85)` | Memorial primary light |
| 500 | `#F59E0B` | `oklch(0.70 0.16 85)` | **Memorial primary** |
| 600 | `#D97706` | `oklch(0.62 0.15 75)` | Memorial hover |
| 700 | `#B45309` | `oklch(0.52 0.13 65)` | Memorial dark text |
| 800 | `#92400E` | `oklch(0.44 0.11 55)` | Memorial dark mode |
| 900 | `#78350F` | `oklch(0.38 0.09 55)` | Memorial dark bg |
| 950 | `#451A03` | `oklch(0.24 0.07 45)` | Memorial darkest |

### 2.3 Semantic Token Mapping

| Token | Light Mode | Dark Mode | Description |
|-------|-----------|-----------|-------------|
| `--brand-primary` | memento-500 | memento-400 | CTA, primary actions |
| `--brand-hover` | memento-600 | memento-300 | Hover states |
| `--brand-text` | memento-700 | memento-200 | Brand-colored text |
| `--brand-surface` | memento-100 | memento-900 | Tinted surfaces |
| `--brand-bg` | memento-50 | gray-900 | Page background |
| `--memorial-primary` | memorial-500 | memorial-400 | Memorial CTA |
| `--memorial-hover` | memorial-600 | memorial-300 | Memorial hover |
| `--memorial-text` | memorial-700 | memorial-200 | Memorial text |
| `--memorial-surface` | memorial-100 | memorial-900 | Memorial surfaces |

### 2.4 Status Colors (Tailwind defaults, not tokenized)

| Role | Color | Usage |
|------|-------|-------|
| Success | green-500 | 성공, 완료, 활성 |
| Warning | yellow-500 | 경고, 주의 |
| Error | red-500 | 에러, 삭제, 위험 |
| Info | memento-500 | 정보, 안내 (브랜드 블루 사용) |

---

## 3. Typography

| Role | Font | Weight | Size | Line Height |
|------|------|--------|------|-------------|
| Display / Hero | Jalnan2 | 700 | 24-32px | 1.3 |
| Heading 1 | Pretendard | 700 | 20-24px | 1.4 |
| Heading 2 | Pretendard | 600 | 16-18px | 1.4 |
| Body | Pretendard | 400 | 14-16px | 1.6 |
| Caption | Pretendard | 400 | 12px | 1.5 |
| Label | Pretendard | 500 | 12-14px | 1.4 |

**Font Stack:**
- `sans`: Pretendard, system-ui, -apple-system, sans-serif
- `display`: Jalnan2, Pretendard, system-ui, sans-serif

---

## 4. Spacing & Layout

Tailwind 기본 4px 스케일 사용. 커스텀 spacing 없음.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Inline gaps, icon padding |
| `space-2` | 8px | Tight card padding, label spacing |
| `space-3` | 12px | Default gap |
| `space-4` | 16px | Card padding, section gap |
| `space-6` | 24px | Section padding |
| `space-8` | 32px | Page margin |

---

## 5. Border Radius

```css
--radius: 0.5rem;  /* 8px — shadcn/ui base */
```

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Badges, small chips |
| `rounded-md` | 6px | Inputs, select |
| `rounded-lg` | 8px | Cards, panels |
| `rounded-xl` | 12px | Modals, large cards |
| `rounded-2xl` | 16px | Hero cards, CTA blocks |
| `rounded-3xl` | 24px | Modal headers |
| `rounded-full` | 9999px | Avatars, pills |

---

## 6. Elevation & Shadows

| Level | Shadow | Usage |
|-------|--------|-------|
| 0 | none | Flat elements |
| 1 | `shadow-sm` | Subtle card lift |
| 2 | `shadow-md` | Dropdown, popover |
| 3 | `shadow-lg` | Modal, dialog |
| 4 | `shadow-xl` | Floating action |

---

## 7. Component Token Reference

### 7.1 Button

| Part.State | Light | Dark |
|-----------|-------|------|
| `bg.default` | memento-500 | memento-600 |
| `bg.hover` | memento-600 | memento-500 |
| `text.default` | white | white |
| `border.focus` | memento-300 | memento-400 |
| `bg.memorial` | memorial-500 | memorial-600 |
| `bg.memorial.hover` | memorial-600 | memorial-500 |
| `bg.destructive` | red-500 | red-600 |

### 7.2 Card

| Part.State | Light | Dark |
|-----------|-------|------|
| `bg.default` | white | gray-800 |
| `bg.hover` | memento-100 | gray-700 |
| `border` | gray-200 | gray-700 |
| `bg.memorial` | memorial-50 | gray-800 |
| `bg.memorial.hover` | memorial-100 | gray-700 |

### 7.3 Badge

| Part.State | Light | Dark |
|-----------|-------|------|
| `bg.brand` | memento-200 | memento-900/30 |
| `text.brand` | memento-700 | memento-300 |
| `bg.memorial` | memorial-100 | memorial-900/30 |
| `text.memorial` | memorial-700 | memorial-300 |

### 7.4 Input

| Part.State | Light | Dark |
|-----------|-------|------|
| `bg` | white | gray-800 |
| `border` | gray-300 | gray-600 |
| `border.focus` | memento-500 | memento-400 |
| `ring.focus` | memento-500 | memento-400 |

---

## 8. Dark Mode Strategy

Tailwind `class` strategy (`darkMode: ["class"]`).

**Rules:**
1. 모든 `bg-*` 에 대응하는 `dark:bg-*` 존재해야 함
2. memento/memorial 팔레트는 dark mode에서 반전: 높은 번호(800-950) = 배경, 낮은 번호(200-400) = 텍스트/강조
3. 투명도 활용: `dark:bg-memento-900/30` 패턴으로 은은한 틴트

**Semantic Inversion:**

| Light | Dark | Role |
|-------|------|------|
| memento-200 (bg) | memento-900/30 | Tinted background |
| memento-500 (text/icon) | memento-400 | Primary accent |
| memento-600 (hover text) | memento-300 | Hover accent |
| memento-700 (heading) | memento-200 | Strong text |
| memorial-100 (bg) | memorial-900/30 | Memorial tinted bg |
| memorial-500 (icon) | memorial-400 | Memorial accent |
| memorial-700 (text) | memorial-200 | Memorial text |

---

## 9. Dual Mode System

메멘토애니의 핵심 UX: 반려동물 상태(`status`)에 따라 전체 테마 전환.

```typescript
if (selectedPet?.status === "memorial") {
  // 추모 모드: memorial-* 토큰, 차분한 UX
} else {
  // 일상 모드: memento-* 토큰, 활기찬 UX
}
```

**Token 사용 패턴:**

```tsx
// 모드별 조건부 클래스
className={isMemorial
  ? "bg-memorial-100 text-memorial-700 dark:bg-memorial-900/30 dark:text-memorial-300"
  : "bg-memento-200 text-memento-700 dark:bg-memento-900/30 dark:text-memento-300"
}
```

**금지 패턴:**
- `sky-*`, `blue-*` 직접 사용 (반드시 `memento-*` 사용)
- `amber-*` 직접 사용 (반드시 `memorial-*` 사용)
- 컴포넌트 내 하드코딩 hex 값 (`#05B2DC` 대신 `memento-500`)
- HSL을 primary format으로 사용 (OKLCH 권장)

---

## 10. Token File Locations

| File | Purpose | Authority |
|------|---------|-----------|
| `tailwind.config.ts` | Primitive tokens (memento, memorial palettes) | Source of truth |
| `src/config/colors.ts` | Runtime JS color constants (SVG, inline styles) | Sync with tailwind.config.ts |
| `src/app/globals.css` | CSS custom properties (shadcn/ui) | shadcn defaults |
| `DESIGN.md` | Design system documentation | This file |

---

## 11. Accessibility

- **APCA 기준**: body text Lc 60+, small text Lc 75+
- memento-500 on white: Lc ~60 (body text pass)
- memento-600 on white: AA 5.9:1 (WCAG 2.x pass)
- memento-700 on white: AAA 7.1:1 (WCAG 2.x AAA pass)
- 다크모드에서는 L 채널만 조정, Chroma는 유지
- focus ring: `ring-2 ring-memento-500` (visible keyboard indicator)

---

## 12. Animation & Motion

| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `wiggle` | 2s | ease-in-out | 미니미 터치 이펙트 |
| `fade-in` | 200ms | ease-out | 탭 전환 |
| `float-up` | 3-5s | linear | 추모 별/발자국 파티클 |
| `paw-drift` | 4s | ease-in-out | 발자국 버블 데코 |

---

*Generated by Design Farmer v0.0.6 — 2026-04-10*
*Last token audit: sky/blue → memento (97 files), amber → memorial (75 files)*
