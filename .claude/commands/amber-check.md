# 추모모드 amber 분기 체크

새 컴포넌트나 페이지에서 추모모드 amber 색상 분기가 누락된 곳을 찾아 수정합니다.

## 체크 방법

1. `src/components/pages/` 아래 모든 페이지에서 `memento-500`, `memento-400`, `memento-600`, `sky-`, `emerald-`, `teal-` 같은 하드코딩 색상 검색
2. 각 페이지가 `useMemorialMode()`를 import하고 사용하는지 확인
3. 누락된 곳에 `isMemorialMode` 분기 추가

## 색상 매핑

| 일상 모드 | 추모 모드 |
|-----------|-----------|
| memento-500 | amber-500 |
| memento-400 | orange-400 |
| memento-600 | amber-600 |
| memento-100 | amber-100 |
| emerald-500 | amber-500 |
| sky-100 | amber-50 |

## 예외 (수정하지 않음)
- LostPage: 분실동물 경고색 (orange/red)
- AdoptionPage: 입양정보 중립 색상 (sky/blue)
- AdminPage: 관리자 전용
- LandingPage: 비로그인 사용자용
