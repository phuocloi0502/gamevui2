#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi


# Ảnh Serpent hiện tại của bạn: 1086×1448 => mỗi cell 362×362.
EXPECTED_SIZE = (1086, 1448)

GRID_COLS = 3
GRID_ROWS = 4

SLOT_NAMES = [
    "shadow.png",
    "tail.png",
    "body-lower.png",

    "body-upper.png",
    "head.png",
    "eyes-open.png",

    "eyes-closed.png",
    "jaw.png",
    "crest.png",

    "attack-cast.png",
    "beam.png",
    "impact.png",
]

DEFAULT_CORE_ALPHA = 100
DEFAULT_CORE_MIN_AREA = 30
DEFAULT_FALLBACK_ALPHA = 2
DEFAULT_OWNERSHIP_MARGIN = 54
DEFAULT_OUTPUT_PADDING = 18


def normalize_path(value: str) -> Path:
    return Path(value).expanduser().resolve()


def slot_bounds(
    slot_id: int,
    width: int,
    height: int,
    margin: int = 0,
) -> tuple[int, int, int, int]:
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


def pixel_slot_ids(
    xs: np.ndarray,
    ys: np.ndarray,
    width: int,
    height: int,
) -> np.ndarray:
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
) -> list[np.ndarray]:
    """
    Tìm connected-components alpha mạnh rồi gán mỗi component
    vào logical slot mà phần lớn pixel của component đang nằm trong.

    Cách này tốt hơn nearest-anchor khi artwork lệch tâm hoặc có hình dài
    như tail/body-upper/beam.
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
        for _ in SLOT_NAMES
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

        slot_id = int(np.argmax(counts))

        view = seeds[slot_id][sl]
        view[local_component] = True
        seeds[slot_id][sl] = view

    return seeds


def fallback_missing_seeds(
    alpha: np.ndarray,
    seeds: list[np.ndarray],
    fallback_alpha: int,
) -> list[np.ndarray]:
    """
    Nếu một slot không có core mạnh, tìm component alpha yếu lớn nhất
    có phần lớn pixel nằm trong slot đó.
    """
    h, w = alpha.shape

    weak_mask = alpha > fallback_alpha
    structure = np.ones((3, 3), dtype=np.uint8)

    labels, _ = ndi.label(
        weak_mask,
        structure=structure,
    )
    objects = ndi.find_objects(labels)

    candidates_by_slot: dict[int, list] = {
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

        slot_id = int(np.argmax(counts))

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
) -> np.ndarray:
    """
    Gán toàn bộ alpha/glow/fringe/particle vào seed gần nhất,
    nhưng chỉ cho phép mỗi slot nhận pixel trong cell của nó
    cộng thêm ownership_margin.

    Nhờ vậy:
    - viền sáng không bị cắt cụt;
    - hạt nhỏ gần layer vẫn được giữ;
    - tail/beam dài không bị nearest-anchor gán nhầm;
    - pixel ở xa không bị hút sang layer khác.
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
            "Không tìm thấy core nào trong Serpent sheet."
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

    # Core luôn thuộc chính layer đó.
    for slot_id in valid_slots:
        owner[seeds[slot_id]] = slot_id

    owner[alpha == 0] = -1

    return owner


def validate_image(
    image: Image.Image,
    strict_size: bool,
) -> None:
    w, h = image.size

    if strict_size and image.size != EXPECTED_SIZE:
        raise RuntimeError(
            f"--strict-size yêu cầu "
            f"{EXPECTED_SIZE[0]}×{EXPECTED_SIZE[1]}, "
            f"nhưng ảnh hiện tại là {w}×{h}."
        )

    if w % GRID_COLS != 0 or h % GRID_ROWS != 0:
        raise RuntimeError(
            f"Kích thước {w}×{h} không chia đều cho grid 3×4."
        )

    cell_w = w // GRID_COLS
    cell_h = h // GRID_ROWS

    if cell_w != cell_h:
        print(
            f"WARNING: cell không vuông: {cell_w}×{cell_h}. "
            "Script vẫn chạy."
        )

    if image.size != EXPECTED_SIZE:
        print(
            f"INFO: ảnh hiện tại {w}×{h}; "
            f"cell={cell_w}×{cell_h}. "
            f"Ảnh tham chiếu hiện tại là "
            f"{EXPECTED_SIZE[0]}×{EXPECTED_SIZE[1]}."
        )

    arr = np.array(
        image,
        dtype=np.uint8,
    )
    alpha = arr[:, :, 3]

    if alpha.min() == 255:
        raise RuntimeError(
            "Ảnh nguồn không có alpha trong suốt.\n"
            "Script không tự xóa background RGB."
        )


def save_debug_grid(
    image: Image.Image,
    output_path: Path,
    ownership_margin: int,
) -> None:
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

    for slot_id, filename in enumerate(SLOT_NAMES):
        row = slot_id // GRID_COLS
        col = slot_id % GRID_COLS

        x0 = col * w // GRID_COLS
        y0 = row * h // GRID_ROWS

        draw.text(
            (x0 + 6, y0 + 6),
            f"{slot_id + 1:02d} {filename}",
            fill=(255, 255, 0, 255),
        )

    draw.text(
        (10, h - 30),
        f"ownership-margin={ownership_margin}",
        fill=(255, 255, 0, 255),
    )

    dbg.save(output_path)


def export_layer(
    arr: np.ndarray,
    alpha: np.ndarray,
    owner: np.ndarray,
    slot_id: int,
    output_path: Path,
    output_padding: int,
) -> None:
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

    # Xóa pixel không thuộc layer này.
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
) -> None:
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
    alpha = arr[:, :, 3]

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
            + "\n\nThử giảm --core-alpha "
            "hoặc --core-min-area."
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
                        arcname=f"{output_dir.name}/_debug-grid.png",
                    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Split Fire Serpent 3x4 production sheet "
            "into 12 PNG layers using overlap-based "
            "core assignment + ownership margin."
        )
    )

    parser.add_argument(
        "input",
        type=str,
    )

    parser.add_argument(
        "--output",
        type=str,
        default="serpent-layer-sheet",
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

