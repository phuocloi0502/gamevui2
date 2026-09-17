#!/usr/bin/env python3
"""
split_owl_sheet_v1.py

Tách Owl / Cú Layer Sheet 3 cột × 4 hàng = 12 layer.

Dành cho sheet theo contract:

Row 1:
    01 back-wing
    02 tail-feathers
    03 body

Row 2:
    04 talons
    05 front-wing
    06 head

Row 3:
    07 eyes-open
    08 eyes-closed
    09 forehead-rune

Row 4:
    10 attack-cast
    11 projectile
    12 impact

Triết lý:
- KHÔNG crop cứng theo cell.
- KHÔNG dùng connected-component alpha thấp toàn ảnh để tránh dính layer.
- Dùng alpha cao làm CORE để nhận diện từng layer riêng.
- Sau đó gán toàn bộ pixel alpha > 0 / glow / fringe về CORE gần nhất.
- Một layer có thể vượt khỏi “biên logic” của grid mà vẫn được giữ đủ.
- Giữ nguyên RGBA / alpha gốc.

Cài:
    pip install pillow numpy scipy

Chạy:
    python split_owl_sheet_v1.py dragon.png --output out --zip out.zip

Nếu layer bị dính:
    tăng --core-alpha, ví dụ 100 hoặc 120

Nếu một layer quá mờ:
    giảm --core-alpha, ví dụ 60
"""

from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi


SLOT_NAMES = [
    "back-wing.png",
    "tail-feathers.png",
    "body.png",

    "talons.png",
    "front-wing.png",
    "head.png",

    "eyes-open.png",
    "eyes-closed.png",
    "forehead-rune.png",

    "attack-cast.png",
    "projectile.png",
    "impact.png",
]

ANCHOR_X = [
    1 / 6,
    1 / 2,
    5 / 6,
]

ANCHOR_Y = [
    1 / 8,
    3 / 8,
    5 / 8,
    7 / 8,
]

DEFAULT_CORE_ALPHA = 80
DEFAULT_CORE_MIN_AREA = 30
DEFAULT_OUTPUT_PADDING = 18
DEFAULT_FALLBACK_ALPHA = 2


def build_anchors() -> list[tuple[float, float]]:
    anchors = []
    for y in ANCHOR_Y:
        for x in ANCHOR_X:
            anchors.append((x, y))
    return anchors


def assign_core_components(alpha: np.ndarray, core_alpha: int, core_min_area: int) -> list[np.ndarray]:
    h, w = alpha.shape
    core_mask = alpha >= core_alpha
    structure = np.ones((3, 3), dtype=np.uint8)

    labels, _ = ndi.label(core_mask, structure=structure)
    objects = ndi.find_objects(labels)
    anchors = build_anchors()

    seeds = [np.zeros((h, w), dtype=bool) for _ in range(12)]

    for component_id, sl in enumerate(objects, start=1):
        if sl is None:
            continue

        local_component = labels[sl] == component_id
        area = int(local_component.sum())
        if area < core_min_area:
            continue

        y_slice, x_slice = sl
        yy, xx = np.where(local_component)
        gx = xx + x_slice.start
        gy = yy + y_slice.start

        cx = float(gx.mean() / w)
        cy = float(gy.mean() / h)

        distances = [(cx - ax) ** 2 + (cy - ay) ** 2 for ax, ay in anchors]
        slot_id = int(np.argmin(distances))

        view = seeds[slot_id][sl]
        view[local_component] = True
        seeds[slot_id][sl] = view

    return seeds


def fallback_missing_seeds(alpha: np.ndarray, seeds: list[np.ndarray], fallback_alpha: int = DEFAULT_FALLBACK_ALPHA) -> list[np.ndarray]:
    h, w = alpha.shape
    weak_mask = alpha > fallback_alpha
    structure = np.ones((3, 3), dtype=np.uint8)

    labels, _ = ndi.label(weak_mask, structure=structure)
    objects = ndi.find_objects(labels)
    anchors = build_anchors()

    candidates = []

    for component_id, sl in enumerate(objects, start=1):
        if sl is None:
            continue

        local = labels[sl] == component_id
        area = int(local.sum())
        if area < 10:
            continue

        y_slice, x_slice = sl
        yy, xx = np.where(local)
        gx = xx + x_slice.start
        gy = yy + y_slice.start

        cx = float(gx.mean() / w)
        cy = float(gy.mean() / h)

        candidates.append((component_id, sl, local, area, cx, cy))

    for slot_id in range(12):
        if seeds[slot_id].any():
            continue

        ax, ay = anchors[slot_id]
        best = None
        best_score = float("inf")

        for item in candidates:
            _, _, _, area, cx, cy = item
            distance = (cx - ax) ** 2 + (cy - ay) ** 2
            score = distance / max(np.sqrt(area), 1.0)

            if score < best_score:
                best_score = score
                best = item

        if best is None:
            continue

        _, sl, local, _, _, _ = best
        view = seeds[slot_id][sl]
        view[local] = True
        seeds[slot_id][sl] = view

    return seeds


def build_owner_map(alpha: np.ndarray, seeds: list[np.ndarray]) -> np.ndarray:
    owner = np.full(alpha.shape, -1, dtype=np.int16)
    best_distance = np.full(alpha.shape, np.inf, dtype=np.float32)

    valid_slots = [i for i, seed in enumerate(seeds) if seed.any()]
    if not valid_slots:
        raise RuntimeError("Không tìm thấy core nào trong sheet.")

    for slot_id in valid_slots:
        seed = seeds[slot_id]
        distance = ndi.distance_transform_edt(~seed).astype(np.float32)

        update = distance < best_distance
        best_distance[update] = distance[update]
        owner[update] = slot_id

    for slot_id in valid_slots:
        owner[seeds[slot_id]] = slot_id

    owner[alpha == 0] = -1
    return owner


def save_debug_anchors(image: Image.Image, output_path: Path) -> None:
    dbg = image.copy().convert("RGBA")
    draw = ImageDraw.Draw(dbg)

    w, h = dbg.size
    for slot_id, (ax, ay) in enumerate(build_anchors()):
        x = round(ax * w)
        y = round(ay * h)
        r = 9

        draw.ellipse(
            [(x - r, y - r), (x + r, y + r)],
            outline=(255, 0, 0, 255),
            width=3,
        )
        draw.text(
            (x + 12, y - 7),
            f"{slot_id + 1:02d} {SLOT_NAMES[slot_id]}",
            fill=(255, 255, 0, 255),
        )

    dbg.save(output_path)


def split_sheet(
    input_path: Path,
    output_dir: Path,
    zip_path: Path | None,
    *,
    core_alpha: int = DEFAULT_CORE_ALPHA,
    core_min_area: int = DEFAULT_CORE_MIN_AREA,
    output_padding: int = DEFAULT_OUTPUT_PADDING,
    debug: bool = False,
) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {input_path}")

    image = Image.open(input_path).convert("RGBA")
    arr = np.array(image, dtype=np.uint8)
    alpha = arr[:, :, 3]

    if alpha.min() == 255:
        raise RuntimeError(
            "Ảnh nguồn không có transparency/alpha gốc.\n"
            "Owl V1 không tự tạo alpha từ RGB."
        )

    seeds = assign_core_components(alpha=alpha, core_alpha=core_alpha, core_min_area=core_min_area)
    seeds = fallback_missing_seeds(alpha=alpha, seeds=seeds, fallback_alpha=DEFAULT_FALLBACK_ALPHA)

    missing = [SLOT_NAMES[i] for i, seed in enumerate(seeds) if not seed.any()]
    if missing:
        raise RuntimeError(
            "Không nhận diện được các slot:\n- "
            + "\n- ".join(missing)
            + "\n\nThử giảm --core-alpha, ví dụ 60."
        )

    owner = build_owner_map(alpha=alpha, seeds=seeds)

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if debug:
        save_debug_anchors(image=image, output_path=output_dir / "_debug-anchors.png")

    for slot_id, filename in enumerate(SLOT_NAMES):
        slot_mask = (owner == slot_id) & (alpha > 0)
        ys, xs = np.where(slot_mask)

        if len(xs) == 0:
            raise RuntimeError(f"Slot rỗng: {filename}")

        x0 = int(xs.min())
        x1 = int(xs.max()) + 1
        y0 = int(ys.min())
        y1 = int(ys.max()) + 1

        crop = arr[y0:y1, x0:x1].copy()
        local_mask = slot_mask[y0:y1, x0:x1]
        crop[~local_mask] = (0, 0, 0, 0)

        pad = max(0, int(output_padding))
        canvas = np.zeros((crop.shape[0] + pad * 2, crop.shape[1] + pad * 2, 4), dtype=np.uint8)
        canvas[pad:pad + crop.shape[0], pad:pad + crop.shape[1]] = crop

        Image.fromarray(canvas, "RGBA").save(output_dir / filename)

        print(f"{slot_id + 1:02d}. {filename:<18} size={canvas.shape[1]}x{canvas.shape[0]}")

    if zip_path is not None:
        zip_path.parent.mkdir(parents=True, exist_ok=True)

        if zip_path.exists():
            zip_path.unlink()

        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for filename in SLOT_NAMES:
                p = output_dir / filename
                zf.write(p, arcname=f"{output_dir.name}/{filename}")

            if debug:
                dbg = output_dir / "_debug-anchors.png"
                if dbg.exists():
                    zf.write(dbg, arcname=f"{output_dir.name}/_debug-anchors.png")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Split Owl 3x4 sheet into 12 layers using high-alpha cores + nearest-core ownership."
    )

    parser.add_argument("input", type=Path, help="PNG Owl sheet nguồn")
    parser.add_argument("--output", type=Path, default=Path("owl-layer-sheet"), help="Thư mục output")
    parser.add_argument("--zip", dest="zip_path", type=Path, default=None, help="ZIP output")
    parser.add_argument(
        "--core-alpha",
        type=int,
        default=DEFAULT_CORE_ALPHA,
        help="Ngưỡng alpha tạo core. Tăng nếu layer bị dính; giảm nếu layer quá mờ. (default: 80)",
    )
    parser.add_argument("--core-min-area", type=int, default=DEFAULT_CORE_MIN_AREA, help="Bỏ core component quá nhỏ (default: 30)")
    parser.add_argument("--padding", type=int, default=DEFAULT_OUTPUT_PADDING, help="Transparent padding output (default: 18)")
    parser.add_argument("--debug", action="store_true", help="Xuất _debug-anchors.png")

    args = parser.parse_args()

    split_sheet(
        input_path=args.input,
        output_dir=args.output,
        zip_path=args.zip_path,
        core_alpha=args.core_alpha,
        core_min_area=args.core_min_area,
        output_padding=args.padding,
        debug=args.debug,
    )

    print()
    print(f"Done: {args.output}")
    if args.zip_path is not None:
        print(f"ZIP: {args.zip_path}")


if __name__ == "__main__":
    main()

