#!/usr/bin/env python3
"""
split_golem_sheet_v2.py

Tách Golem production layer sheet 4 cột × 4 hàng thành 14 PNG layer.
Ô 15 và 16 bắt buộc EMPTY và không được xuất thành layer.

Contract Golem:

Row 1:
    01 shadow
    02 rear-arm
    03 rear-leg
    04 torso

Row 2:
    05 core
    06 front-leg
    07 front-arm
    08 head

Row 3:
    09 eyes-open
    10 eyes-closed
    11 rock-fragments
    12 attack-cast

Row 4:
    13 ground-wave
    14 impact
    15 EMPTY
    16 EMPTY

Triết lý v2:
- Không crop cứng chỉ theo cell như v1.
- Dùng alpha cao làm CORE, sau đó gán toàn bộ pixel alpha/glow/fringe
  về CORE gần nhất.
- Nhờ vậy nếu một layer bị "lọt" chút pixel sang cell khác, pixel đó vẫn
  có thể được trả về đúng layer thay vì layer đang đứng trong cell đó.
- Ô 15–16 bị loại khỏi detection và không tạo output.
- Không xuất layers.json.

Cài:
    pip install pillow numpy scipy

Chạy:
    python split_golem_sheet_v2.py golem-light-lv2.png \
        --output golem-light-lv2 \
        --zip golem-light-lv2.zip

Nếu layer bị dính:
    tăng --core-alpha, ví dụ 100 hoặc 120

Nếu một layer quá mờ / không nhận diện được:
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


EXPECTED_SIZE = (1536, 1536)
GRID_COLS = 4
GRID_ROWS = 4
CELL_SIZE = 384

SLOT_NAMES = [
    "shadow.png",
    "rear-arm.png",
    "rear-leg.png",
    "torso.png",

    "core.png",
    "front-leg.png",
    "front-arm.png",
    "head.png",

    "eyes-open.png",
    "eyes-closed.png",
    "rock-fragments.png",
    "attack-cast.png",

    "ground-wave.png",
    "impact.png",
]

# Slot 15 = row 4 col 3, slot 16 = row 4 col 4
EMPTY_SLOT_INDEXES = (14, 15)  # 0-based in full 16-cell grid.

DEFAULT_CORE_ALPHA = 80
DEFAULT_CORE_MIN_AREA = 30
DEFAULT_OUTPUT_PADDING = 18
DEFAULT_FALLBACK_ALPHA = 2


def build_all_grid_anchors() -> list[tuple[float, float]]:
    """
    Trả về 16 tâm cell theo thứ tự row-major.
    Với grid 4×4:
        x = 1/8, 3/8, 5/8, 7/8
        y = 1/8, 3/8, 5/8, 7/8
    """
    anchors: list[tuple[float, float]] = []

    for row in range(GRID_ROWS):
        ay = (row + 0.5) / GRID_ROWS

        for col in range(GRID_COLS):
            ax = (col + 0.5) / GRID_COLS
            anchors.append((ax, ay))

    return anchors


def build_layer_anchors() -> list[tuple[float, float]]:
    """
    Chỉ lấy 14 anchor có artwork.
    Bỏ anchor thứ 15 và 16 vì contract bắt buộc EMPTY.
    """
    all_anchors = build_all_grid_anchors()
    return [
        anchor
        for idx, anchor in enumerate(all_anchors)
        if idx not in EMPTY_SLOT_INDEXES
    ]


def slot_bounds(slot_index: int, width: int, height: int) -> tuple[int, int, int, int]:
    """
    Bounds của 1 cell trong grid 4×4.
    right/bottom exclusive.
    """
    row = slot_index // GRID_COLS
    col = slot_index % GRID_COLS

    x0 = col * width // GRID_COLS
    x1 = (col + 1) * width // GRID_COLS
    y0 = row * height // GRID_ROWS
    y1 = (row + 1) * height // GRID_ROWS

    return x0, y0, x1, y1


def clear_empty_slot_alpha(alpha: np.ndarray) -> tuple[np.ndarray, dict[int, int]]:
    """
    Loại toàn bộ alpha trong slot 15 và 16 khỏi quá trình nhận diện.
    Trả về alpha copy + số pixel alpha > 0 từng tồn tại trong từng EMPTY slot.
    """
    h, w = alpha.shape
    cleaned = alpha.copy()
    contaminated: dict[int, int] = {}

    for empty_idx in EMPTY_SLOT_INDEXES:
        x0, y0, x1, y1 = slot_bounds(empty_idx, w, h)
        region = cleaned[y0:y1, x0:x1]
        contaminated_pixels = int(np.count_nonzero(region > 0))
        contaminated[empty_idx] = contaminated_pixels
        cleaned[y0:y1, x0:x1] = 0

    return cleaned, contaminated


def assign_core_components(
    alpha: np.ndarray,
    core_alpha: int,
    core_min_area: int,
) -> list[np.ndarray]:
    """
    Tìm các component alpha mạnh, rồi gán mỗi component về anchor Golem gần nhất.
    Chỉ có 14 seed vì slot 15–16 EMPTY.
    """
    h, w = alpha.shape
    core_mask = alpha >= core_alpha
    structure = np.ones((3, 3), dtype=np.uint8)

    labels, _ = ndi.label(core_mask, structure=structure)
    objects = ndi.find_objects(labels)
    anchors = build_layer_anchors()

    seeds = [np.zeros((h, w), dtype=bool) for _ in range(len(SLOT_NAMES))]

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

        distances = [
            (cx - ax) ** 2 + (cy - ay) ** 2
            for ax, ay in anchors
        ]

        slot_id = int(np.argmin(distances))

        view = seeds[slot_id][sl]
        view[local_component] = True
        seeds[slot_id][sl] = view

    return seeds


def fallback_missing_seeds(
    alpha: np.ndarray,
    seeds: list[np.ndarray],
    fallback_alpha: int = DEFAULT_FALLBACK_ALPHA,
) -> list[np.ndarray]:
    """
    Nếu một slot chưa có CORE mạnh, tìm component alpha yếu gần anchor của slot đó.
    """
    h, w = alpha.shape
    weak_mask = alpha > fallback_alpha
    structure = np.ones((3, 3), dtype=np.uint8)

    labels, _ = ndi.label(weak_mask, structure=structure)
    objects = ndi.find_objects(labels)
    anchors = build_layer_anchors()

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

        candidates.append(
            (component_id, sl, local, area, cx, cy)
        )

    for slot_id in range(len(SLOT_NAMES)):
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


def build_owner_map(
    alpha: np.ndarray,
    seeds: list[np.ndarray],
) -> np.ndarray:
    """
    Mỗi pixel alpha > 0 được gán cho CORE gần nhất.
    Nhờ vậy glow/fringe/particle rời gần layer vẫn được giữ.
    """
    owner = np.full(alpha.shape, -1, dtype=np.int16)
    best_distance = np.full(alpha.shape, np.inf, dtype=np.float32)

    valid_slots = [
        i for i, seed in enumerate(seeds)
        if seed.any()
    ]

    if not valid_slots:
        raise RuntimeError("Không tìm thấy core nào trong Golem sheet.")

    for slot_id in valid_slots:
        seed = seeds[slot_id]
        distance = ndi.distance_transform_edt(~seed).astype(np.float32)

        update = distance < best_distance
        best_distance[update] = distance[update]
        owner[update] = slot_id

    # Bảo đảm chính core luôn thuộc đúng slot.
    for slot_id in valid_slots:
        owner[seeds[slot_id]] = slot_id

    owner[alpha == 0] = -1
    return owner


def save_debug_anchors(
    image: Image.Image,
    output_path: Path,
) -> None:
    """
    Debug duy nhất; không ảnh hưởng các layer output.
    Vẽ 14 anchor + đánh dấu slot 15–16 EMPTY.
    """
    dbg = image.copy().convert("RGBA")
    draw = ImageDraw.Draw(dbg)

    w, h = dbg.size
    all_anchors = build_all_grid_anchors()

    for slot_id, (ax, ay) in enumerate(all_anchors):
        x = round(ax * w)
        y = round(ay * h)
        r = 9

        if slot_id in EMPTY_SLOT_INDEXES:
            outline = (0, 255, 255, 255)
            label = f"{slot_id + 1:02d} EMPTY"
        else:
            outline = (255, 0, 0, 255)
            label = f"{slot_id + 1:02d} {SLOT_NAMES[slot_id]}"

        draw.ellipse(
            [(x - r, y - r), (x + r, y + r)],
            outline=outline,
            width=3,
        )

        draw.text(
            (x + 12, y - 7),
            label,
            fill=(255, 255, 0, 255),
        )

    for empty_idx in EMPTY_SLOT_INDEXES:
        x0, y0, x1, y1 = slot_bounds(empty_idx, w, h)
        draw.rectangle(
            [(x0, y0), (x1 - 1, y1 - 1)],
            outline=(0, 255, 255, 255),
            width=3,
        )

    dbg.save(output_path)


def validate_image(image: Image.Image, strict_size: bool) -> None:
    if image.size != EXPECTED_SIZE:
        message = (
            f"Golem production sheet nên là {EXPECTED_SIZE[0]}×{EXPECTED_SIZE[1]} px, "
            f"nhưng ảnh hiện tại là {image.width}×{image.height} px."
        )

        if strict_size:
            raise RuntimeError(message)

        print(f"WARNING: {message}")
        print("Script vẫn tiếp tục, nhưng anchor theo grid 4×4 có thể kém chính xác hơn.")

    arr = np.array(image, dtype=np.uint8)
    original_alpha = arr[:, :, 3]

    if original_alpha.min() == 255:
        raise RuntimeError(
            "Ảnh nguồn không có transparency/alpha gốc.\n"
            "Golem splitter không tự tạo alpha từ RGB."
        )


def split_sheet(
    input_path: Path,
    output_dir: Path,
    zip_path: Path | None,
    *,
    core_alpha: int = DEFAULT_CORE_ALPHA,
    core_min_area: int = DEFAULT_CORE_MIN_AREA,
    output_padding: int = DEFAULT_OUTPUT_PADDING,
    debug: bool = False,
    strict_size: bool = False,
) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {input_path}")

    image = Image.open(input_path).convert("RGBA")
    validate_image(image, strict_size=strict_size)

    arr = np.array(image, dtype=np.uint8)
    original_alpha = arr[:, :, 3]

    # Slot 15–16 phải EMPTY:
    # bỏ mọi alpha trong các ô này khỏi detection + ownership.
    alpha, contaminated = clear_empty_slot_alpha(original_alpha)

    for empty_idx in EMPTY_SLOT_INDEXES:
        contaminated_pixels = contaminated.get(empty_idx, 0)

        if contaminated_pixels > 0:
            print(
                f"WARNING: slot {empty_idx + 1:02d} EMPTY có "
                f"{contaminated_pixels} pixel alpha > 0. "
                "Các pixel này sẽ bị bỏ qua và không xuất vào layer nào."
            )

    seeds = assign_core_components(
        alpha=alpha,
        core_alpha=core_alpha,
        core_min_area=core_min_area,
    )

    seeds = fallback_missing_seeds(
        alpha=alpha,
        seeds=seeds,
        fallback_alpha=DEFAULT_FALLBACK_ALPHA,
    )

    missing = [
        SLOT_NAMES[i]
        for i, seed in enumerate(seeds)
        if not seed.any()
    ]

    if missing:
        raise RuntimeError(
            "Không nhận diện được các slot:\n- "
            + "\n- ".join(missing)
            + "\n\nThử giảm --core-alpha, ví dụ 60."
        )

    owner = build_owner_map(
        alpha=alpha,
        seeds=seeds,
    )

    if output_dir.exists():
        shutil.rmtree(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    if debug:
        save_debug_anchors(
            image=image,
            output_path=output_dir / "_debug-anchors.png",
        )

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

        # Xóa mọi pixel không thuộc layer này.
        crop[~local_mask] = (0, 0, 0, 0)

        pad = max(0, int(output_padding))

        canvas = np.zeros(
            (
                crop.shape[0] + pad * 2,
                crop.shape[1] + pad * 2,
                4,
            ),
            dtype=np.uint8,
        )

        canvas[
            pad:pad + crop.shape[0],
            pad:pad + crop.shape[1],
        ] = crop

        output_path = output_dir / filename
        Image.fromarray(canvas, "RGBA").save(output_path)

        print(
            f"{slot_id + 1:02d}. "
            f"{filename:<20} "
            f"size={canvas.shape[1]}x{canvas.shape[0]}"
        )

    if zip_path is not None:
        zip_path.parent.mkdir(parents=True, exist_ok=True)

        if zip_path.exists():
            zip_path.unlink()

        with zipfile.ZipFile(
            zip_path,
            "w",
            compression=zipfile.ZIP_DEFLATED,
        ) as zf:
            for filename in SLOT_NAMES:
                p = output_dir / filename
                zf.write(
                    p,
                    arcname=f"{output_dir.name}/{filename}",
                )

            if debug:
                dbg = output_dir / "_debug-anchors.png"

                if dbg.exists():
                    zf.write(
                        dbg,
                        arcname=f"{output_dir.name}/_debug-anchors.png",
                    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Split Golem 4x4 production sheet into 14 PNG layers "
            "using high-alpha cores + nearest-core ownership. "
            "Slots 15 and 16 are mandatory EMPTY."
        )
    )

    parser.add_argument(
        "input",
        type=Path,
        help="PNG Golem sheet nguồn 1536x1536",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("golem-layer-sheet"),
        help="Thư mục output",
    )

    parser.add_argument(
        "--zip",
        dest="zip_path",
        type=Path,
        default=None,
        help="ZIP output",
    )

    parser.add_argument(
        "--core-alpha",
        type=int,
        default=DEFAULT_CORE_ALPHA,
        help=(
            "Ngưỡng alpha tạo core. "
            "Tăng nếu layer bị dính; giảm nếu layer quá mờ. "
            "(default: 80)"
        ),
    )

    parser.add_argument(
        "--core-min-area",
        type=int,
        default=DEFAULT_CORE_MIN_AREA,
        help="Bỏ core component quá nhỏ (default: 30)",
    )

    parser.add_argument(
        "--padding",
        type=int,
        default=DEFAULT_OUTPUT_PADDING,
        help="Transparent padding output (default: 18)",
    )

    parser.add_argument(
        "--debug",
        action="store_true",
        help="Xuất _debug-anchors.png",
    )

    parser.add_argument(
        "--strict-size",
        action="store_true",
        help="Bắt buộc đúng 1536×1536",
    )

    args = parser.parse_args()

    split_sheet(
        input_path=args.input,
        output_dir=args.output,
        zip_path=args.zip_path,
        core_alpha=args.core_alpha,
        core_min_area=args.core_min_area,
        output_padding=args.padding,
        debug=args.debug,
        strict_size=args.strict_size,
    )

    print()
    print(f"Done: {args.output}")

    if args.zip_path is not None:
        print(f"ZIP: {args.zip_path}")


if __name__ == "__main__":
    main()

