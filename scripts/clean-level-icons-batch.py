"""
레벨 아이콘 데코 일괄 제거 (자동 처리 가능 6장)

방식: 각 PNG에 대해 데코 위치 좌표 박스 inpaint.
알파 보호 (투명 외곽 보존).
출력: scripts/_previews/{file} (원본 안 건드림 — 사용자 OK 후 prod 교체)
"""
import cv2
import numpy as np
from pathlib import Path

BASE = Path("C:/Users/shark/memento1/mobile/assets/levels")
OUT = Path("C:/Users/shark/memento1/scripts/_previews")
OUT.mkdir(parents=True, exist_ok=True)

# 좌표 박스: x1, y1, x2, y2 (512x512 기준)
# 한 PNG에 여러 박스 가능 (별 + 다른 데코 동시)
TARGETS = [
    {"file": "dog_lv2.png", "boxes": [(345, 160, 440, 270)], "desc": "포메 + 별"},
    {"file": "dog_lv3.png", "boxes": [(370, 220, 460, 310)], "desc": "코기 + 하트"},
    {"file": "dog_lv5.png", "boxes": [(340, 280, 470, 420)], "desc": "골든 + 점"},
    {"file": "cat_lv2.png", "boxes": [(360, 160, 450, 260)], "desc": "스코티시폴드 + 별 (광채 배경 별도)"},
    {"file": "cat_lv3.png", "boxes": [(370, 220, 450, 310)], "desc": "러시안블루 + 하트"},
    {"file": "cat_lv5.png", "boxes": [(340, 320, 460, 440)], "desc": "페르시안 + 점"},
]

def clean(img_path: Path, boxes: list, out_path: Path):
    img = cv2.imread(str(img_path), cv2.IMREAD_UNCHANGED)
    if img.shape[2] != 4:
        print(f"  WARN: {img_path.name} alpha 없음")
        return
    bgr = img[:, :, :3].copy()
    alpha = img[:, :, 3].copy()
    h, w = bgr.shape[:2]

    # 1. 투명 영역 RGB를 가장자리 평균색으로 미리 채움 (inpaint 검은 줄 방지)
    ring = (alpha > 0) & (alpha < 255)
    if ring.sum() > 100:
        edge_color = bgr[ring].mean(axis=0).astype(np.uint8)
    else:
        edge_color = np.array([220, 235, 245], dtype=np.uint8)
    bgr_filled = bgr.copy()
    bgr_filled[alpha == 0] = edge_color

    # 2. 박스 마스크
    mask = np.zeros((h, w), dtype=np.uint8)
    for (x1, y1, x2, y2) in boxes:
        mask[y1:y2, x1:x2] = 255

    # 3. inpaint NS
    result = cv2.inpaint(bgr_filled, mask, 10, cv2.INPAINT_NS)

    # 4. 원본 alpha 복원
    out = np.dstack([result, alpha])
    cv2.imwrite(str(out_path), out)

for t in TARGETS:
    src = BASE / t["file"]
    dst = OUT / t["file"]
    print(f"{t['file']} -- {t['desc']}")
    clean(src, t["boxes"], dst)
    print(f"  -> {dst}")

print("\nALL DONE")
