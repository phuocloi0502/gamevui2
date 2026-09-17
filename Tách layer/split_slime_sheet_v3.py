#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi


EXPECTED_SIZE = (1536, 1152)
GRID_COLS = 4
GRID_ROWS = 3

SLOT_NAMES = [
    "blob.png",
    "inner-core.png",
    "face.png",
    "eyes-open.png",
    "eyes-closed.png",
    "front-gloss.png",
    "top-effect.png",
    "attack-cast.png",
    "pulse.png",
    "impact.png",
]

# Slot 11 + 12 are mandatory EMPTY.
EMPTY_SLOT_INDEXES = (10, 11)

DEFAULT_CORE_ALPHA = 100
DEFAULT_CORE_MIN_AREA = 30
DEFAULT_FALLBACK_ALPHA = 2
DEFAULT_OWNERSHIP_MARGIN = 64
DEFAULT_OUTPUT_PADDING = 18


def normalize_path(value: str) -> Path:
    return Path(value).expanduser().resolve()


def slot_bounds(
    slot_id: int,
    width: int,
    height: int,
    margin: int = 0,
):
    row = slot_id // GRID_COLS
    col = slot_id % GRID_COLS

    x0 = col * width // GRID_COLS
    x1 = (col + 1) * width // GRID_COLS
    y0 = row * height // GRID_ROWS
    y1 = (row + 1) * height // GRID_ROWS

    return (
        max(0, x0 - margin),
        max(0, y0 - margin),
        min(width, x1 + margin),
        min(height, y1 + margin),
    )


def clear_empty_slots_alpha(alpha: np.ndarray):
    h, w = alpha.shape
    cleaned = alpha.copy()
    contaminated: dict[int, int] = {}

    for empty_idx in EMPTY_SLOT_INDEXES:
        x0, y0, x1, y1 = slot_bounds(
            empty_idx,
            w,
            h,
            margin=0,
        )

        contaminated[empty_idx] = int(
            np.count_nonzero(cleaned[y0:y1, x0:x1] > 0)
        )

        cleaned[y0:y1, x0:x1] = 0

    return cleaned, contaminated


def pixel_slot_ids(
    xs: np.ndarray,
    ys: np.ndarray,
    width: int,
    height: int,
):
    cols = np.minimum(
        xs * GRID_COLS // width,
        GRID_COLS - 1,
    )
    rows = np.minimum(
        ys * GRID_ROWS // height,
        GRID_ROWS - 1,
    )

    return rows * GRID_COLS + cols


def assign_core_components(
    alpha: np.ndarray,
    core_alpha: int,
    core_min_area: int,
):
    """
    Tìm connected-components alpha mạnh.

    Khác kiểu nearest-anchor:
    component được gán về slot mà phần lớn pixel của component đang nằm trong.
    Cách này ổn hơn khi glow/artwork hơi lệch khỏi tâm cell.
    """
    h, w = alpha.shape

    core_mask = alpha >= core_alpha
    structure = np.ones((3, 3), dtype=np.uint8)

    labels, _ = ndi.label(
        core_mask,
        structure=structure,
    )
    objects = ndi.find_objects(labels)

    seeds = [
        np.zeros((h, w), dtype=bool)
        for _ in range(len(SLOT_NAMES))
    ]

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

        logical_slots = pixel_slot_ids(
            gx,
            gy,
            w,
            h,
        )

        counts = np.bincount(
            logical_slots,
            minlength=GRID_COLS * GRID_ROWS,
        )

        for empty_idx in EMPTY_SLOT_INDEXES:
            counts[empty_idx] = 0

        slot_id = int(np.argmax(counts))

        if slot_id >= len(SLOT_NAMES):
            continue

        view = seeds[slot_id][sl]
        view[local_component] = True
        seeds[slot_id][sl] = view

    return seeds


def fallback_missing_seeds(
    alpha: np.ndarray,
    seeds: list[np.ndarray],
    fallback_alpha: int,
):
    """
    Nếu một slot không có core mạnh, lấy component alpha yếu lớn nhất
    thực sự nằm trong logical slot đó.
    """
    h, w = alpha.shape

    weak_mask = alpha > fallback_alpha
    structure = np.ones((3, 3), dtype=np.uint8)

    labels, _ = ndi.label(
        weak_mask,
        structure=structure,
    )
    objects = ndi.find_objects(labels)

    candidates_by_slot = {
        i: []
        for i in range(len(SLOT_NAMES))
    }

    for component_id, sl in enumerate(objects, start=1):
        if sl is None:
            continue

        local_component = labels[sl] == component_id
        area = int(local_component.sum())

        if area < 8:
            continue

        y_slice, x_slice = sl
        yy, xx = np.where(local_component)

        gx = xx + x_slice.start
        gy = yy + y_slice.start

        logical_slots = pixel_slot_ids(
            gx,
            gy,
            w,
            h,
        )

        counts = np.bincount(
            logical_slots,
            minlength=GRID_COLS * GRID_ROWS,
        )

        for empty_idx in EMPTY_SLOT_INDEXES:
            counts[empty_idx] = 0

        slot_id = int(np.argmax(counts))

        if slot_id >= len(SLOT_NAMES):
            continue

        candidates_by_slot[slot_id].append(
            (area, sl, local_component)
        )

    for slot_id in range(len(SLOT_NAMES)):
        if seeds[slot_id].any():
            continue

        candidates = candidates_by_slot[slot_id]

        if not candidates:
            continue

        _, sl, local_component = max(
            candidates,
            key=lambda item: item[0],
        )

        view = seeds[slot_id][sl]
        view[local_component] = True
        seeds[slot_id][sl] = view

    return seeds


def build_owner_map(
    alpha: np.ndarray,
    seeds: list[np.ndarray],
    ownership_margin: int,
):
    """
    Gán pixel alpha/glow/fringe về seed gần nhất,
    nhưng chỉ trong vùng cell của slot + ownership-margin.

    Đây là điểm quan trọng:
    - không crop cứng ở boundary;
    - cho phép glow/particle lấn nhẹ qua cell;
    - hạn chế pixel bị hút nhầm sang layer ở xa.
    """
    h, w = alpha.shape

    owner = np.full(
        (h, w),
        -1,
        dtype=np.int16,
    )

    best_distance = np.full(
        (h, w),
        np.inf,
        dtype=np.float32,
    )

    valid_slots = [
        i
        for i, seed in enumerate(seeds)
        if seed.any()
    ]

    if not valid_slots:
        raise RuntimeError(
            "Không tìm thấy core nào trong Slime sheet."
        )

    for slot_id in valid_slots:
        seed = seeds[slot_id]

        distance = ndi.distance_transform_edt(
            ~seed
        ).astype(np.float32)

        x0, y0, x1, y1 = slot_bounds(
            slot_id,
            w,
            h,
            margin=ownership_margin,
        )

        allowed = np.zeros(
            (h, w),
            dtype=bool,
        )
        allowed[y0:y1, x0:x1] = True

        update = (
            allowed
            & (alpha > 0)
            & (distance < best_distance)
        )

        best_distance[update] = distance[update]
        owner[update] = slot_id

    # Core luôn thuộc chính slot của nó.
    for slot_id in valid_slots:
        owner[seeds[slot_id]] = slot_id

    owner[alpha == 0] = -1

    # Hai EMPTY slot tuyệt đối không được xuất vào layer nào.
    for empty_idx in EMPTY_SLOT_INDEXES:
        x0, y0, x1, y1 = slot_bounds(
            empty_idx,
            w,
            h,
            margin=0,
        )
        owner[y0:y1, x0:x1] = -1

    return owner


def save_debug_grid(
    image: Image.Image,
    output_path: Path,
    ownership_margin: int,
):
    dbg = image.copy().convert("RGBA")
    draw = ImageDraw.Draw(dbg)

    w, h = dbg.size

    for col in range(1, GRID_COLS):
        x = col * w // GRID_COLS
        draw.line(
            [(x, 0), (x, h)],
            fill=(255, 0, 0, 255),
            width=2,
        )

    for row in range(1, GRID_ROWS):
        y = row * h // GRID_ROWS
        draw.line(
            [(0, y), (w, y)],
            fill=(255, 0, 0, 255),
            width=2,
        )

    all_names = SLOT_NAMES + [
        "EMPTY",
        "EMPTY",
    ]

    for slot_id in range(GRID_COLS * GRID_ROWS):
        row = slot_id // GRID_COLS
        col = slot_id % GRID_COLS

        x0 = col * w // GRID_COLS
        y0 = row * h // GRID_ROWS

        if slot_id in EMPTY_SLOT_INDEXES:
            label = f"{slot_id + 1:02d} EMPTY"
            color = (0, 255, 255, 255)
        else:
            label = (
                f"{slot_id + 1:02d} "
                f"{all_names[slot_id]}"
            )
            color = (255, 255, 0, 255)

        draw.text(
            (x0 + 6, y0 + 6),
            label,
            fill=color,
        )

    for empty_idx in EMPTY_SLOT_INDEXES:
        x0, y0, x1, y1 = slot_bounds(
            empty_idx,
            w,
            h,
            margin=0,
        )

        draw.rectangle(
            [(x0, y0), (x1 - 1, y1 - 1)],
            outline=(0, 255, 255, 255),
            width=3,
        )

    draw.text(
        (10, h - 30),
        f"ownership-margin={ownership_margin}",
        fill=(255, 255, 0, 255),
    )

    dbg.save(output_path)


def validate_image(
    image: Image.Image,
    strict_size: bool,
):
    if strict_size and image.size != EXPECTED_SIZE:
        raise RuntimeError(
            f"Slime production sheet phải là "
            f"{EXPECTED_SIZE[0]}×{EXPECTED_SIZE[1]} px, "
            f"nhưng ảnh hiện tại là "
            f"{image.width}×{image.height} px."
        )

    # Chỉ cảnh báo, không chặn.
    expected_ratio = GRID_COLS / GRID_ROWS
    actual_ratio = image.width / image.height

    if abs(actual_ratio - expected_ratio) > 0.03:
        print(
            "WARNING: canvas không gần tỷ lệ 4:3. "
            f"Hiện tại={image.width}×{image.height}. "
            "Nếu đây là sheet 3×3 cũ thì kết quả sẽ sai."
        )


def export_layer(
    arr: np.ndarray,
    alpha: np.ndarray,
    owner: np.ndarray,
    slot_id: int,
    output_path: Path,
    output_padding: int,
):
    slot_mask = (
        (owner == slot_id)
        & (alpha > 0)
    )

    ys, xs = np.where(slot_mask)

    if len(xs) == 0:
        raise RuntimeError(
            f"Slot rỗng: {output_path.name}"
        )

    x0 = int(xs.min())
    x1 = int(xs.max()) + 1
    y0 = int(ys.min())
    y1 = int(ys.max()) + 1

    crop = arr[y0:y1, x0:x1].copy()
    local_mask = slot_mask[y0:y1, x0:x1]

    # Xóa mọi pixel không thuộc layer.
    crop[~local_mask] = (0, 0, 0, 0)

    pad = max(
        0,
        int(output_padding),
    )

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

    Image.fromarray(
        canvas,
        "RGBA",
    ).save(output_path)


def split_sheet(
    input_path: Path,
    output_dir: Path,
    zip_path: Path | None,
    *,
    core_alpha: int,
    core_min_area: int,
    fallback_alpha: int,
    ownership_margin: int,
    output_padding: int,
    debug: bool,
    strict_size: bool,
):
    if not input_path.exists():
        raise FileNotFoundError(
            f"Không tìm thấy file: {input_path}"
        )

    image = Image.open(
        input_path
    ).convert("RGBA")

    validate_image(
        image,
        strict_size,
    )

    arr = np.array(
        image,
        dtype=np.uint8,
    )

    original_alpha = arr[:, :, 3]

    if original_alpha.min() == 255:
        raise RuntimeError(
            "Ảnh nguồn không có transparency/alpha gốc.\n"
            "Slime splitter không tự tạo alpha từ RGB."
        )

    alpha, contaminated = clear_empty_slots_alpha(
        original_alpha
    )

    for empty_idx in EMPTY_SLOT_INDEXES:
        contaminated_pixels = contaminated.get(
            empty_idx,
            0,
        )

        if contaminated_pixels > 0:
            print(
                f"WARNING: slot {empty_idx + 1:02d} EMPTY có "
                f"{contaminated_pixels} pixel alpha > 0. "
                "Các pixel này sẽ bị bỏ."
            )

    seeds = assign_core_components(
        alpha=alpha,
        core_alpha=core_alpha,
        core_min_area=core_min_area,
    )

    seeds = fallback_missing_seeds(
        alpha=alpha,
        seeds=seeds,
        fallback_alpha=fallback_alpha,
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
            + "\n\n"
            "Thử giảm --core-alpha hoặc "
            "--core-min-area."
        )

    owner = build_owner_map(
        alpha=alpha,
        seeds=seeds,
        ownership_margin=ownership_margin,
    )

    if output_dir.exists():
        shutil.rmtree(output_dir)

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    if debug:
        save_debug_grid(
            image=image,
            output_path=output_dir / "_debug-grid.png",
            ownership_margin=ownership_margin,
        )

    for slot_id, filename in enumerate(SLOT_NAMES):
        output_path = output_dir / filename

        export_layer(
            arr=arr,
            alpha=alpha,
            owner=owner,
            slot_id=slot_id,
            output_path=output_path,
            output_padding=output_padding,
        )

        with Image.open(output_path) as result:
            print(
                f"{slot_id + 1:02d}. "
                f"Saved: {filename:<18} "
                f"{result.width}x{result.height}"
            )

    if zip_path is not None:
        zip_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

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
                dbg = output_dir / "_debug-grid.png"

                if dbg.exists():
                    zf.write(
                        dbg,
                        arcname=(
                            f"{output_dir.name}/"
                            "_debug-grid.png"
                        ),
                    )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Split Slime 4x3 production sheet into 10 PNG layers. "
            "Slots 11 and 12 are mandatory EMPTY. "
            "Uses overlap-based core assignment + ownership margin."
        )
    )

    parser.add_argument(
        "input",
        type=str,
    )

    parser.add_argument(
        "--output",
        type=str,
        default="slime-layer-sheet",
    )

    parser.add_argument(
        "--zip",
        dest="zip_path",
        type=str,
        default=None,
    )

    parser.add_argument(
        "--core-alpha",
        type=int,
        default=DEFAULT_CORE_ALPHA,
    )

    parser.add_argument(
        "--core-min-area",
        type=int,
        default=DEFAULT_CORE_MIN_AREA,
    )

    parser.add_argument(
        "--fallback-alpha",
        type=int,
        default=DEFAULT_FALLBACK_ALPHA,
    )

    parser.add_argument(
        "--ownership-margin",
        type=int,
        default=DEFAULT_OWNERSHIP_MARGIN,
    )

    parser.add_argument(
        "--padding",
        type=int,
        default=DEFAULT_OUTPUT_PADDING,
    )

    parser.add_argument(
        "--debug",
        action="store_true",
    )

    parser.add_argument(
        "--strict-size",
        action="store_true",
    )

    args = parser.parse_args()

    input_path = normalize_path(
        args.input
    )
    output_dir = normalize_path(
        args.output
    )
    zip_path = (
        normalize_path(args.zip_path)
        if args.zip_path
        else None
    )

    split_sheet(
        input_path=input_path,
        output_dir=output_dir,
        zip_path=zip_path,
        core_alpha=args.core_alpha,
        core_min_area=args.core_min_area,
        fallback_alpha=args.fallback_alpha,
        ownership_margin=args.ownership_margin,
        output_padding=args.padding,
        debug=args.debug,
        strict_size=args.strict_size,
    )

    print()
    print(f"Done: {output_dir}")

    if zip_path is not None:
        print(f"ZIP: {zip_path}")


if __name__ == "__main__":
    main()

