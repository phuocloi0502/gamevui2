#!/usr/bin/env python3
from __future__ import annotations

import argparse
import zipfile
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


# Canonical sheet export. Without --strict-size, proportional 4×4 bounds also
# support square ImageGen outputs such as 1254×1254 without resizing artwork.
EXPECTED_SIZE = (1448, 1448)
GRID_COLS = 4
GRID_ROWS = 4

# Left to right, top to bottom. Slots 14-16 are reserved and must be empty.
SLOT_NAMES = [
    "rear-wing.png",
    "tail-fan.png",
    "leg-far.png",
    "body.png",
    "leg-near.png",
    "front-wing.png",
    "head.png",
    "eyes-open.png",
    "eyes-closed.png",
    "crest.png",
    "attack-trail.png",
    "vortex.png",
    "impact.png",
]

DEFAULT_OUTPUT_PADDING = 18
DEFAULT_ALPHA_THRESHOLD = 2
DEFAULT_MIN_CELL_PADDING = 2
DEFAULT_RESERVED_NOISE = 8


def normalize_path(value: str) -> Path:
    return Path(value).expanduser().resolve()


def slot_bounds(slot_id: int, width: int, height: int) -> tuple[int, int, int, int]:
    """Return proportional integer bounds, including non-divisible sizes."""
    row = slot_id // GRID_COLS
    col = slot_id % GRID_COLS
    return (
        col * width // GRID_COLS,
        row * height // GRID_ROWS,
        (col + 1) * width // GRID_COLS,
        (row + 1) * height // GRID_ROWS,
    )


def alpha_bbox(alpha: np.ndarray, threshold: int) -> tuple[int, int, int, int] | None:
    ys, xs = np.where(alpha > threshold)
    if len(xs) == 0:
        return None
    return (
        int(xs.min()),
        int(ys.min()),
        int(xs.max()) + 1,
        int(ys.max()) + 1,
    )


def build_slot_index_map(width: int, height: int) -> np.ndarray:
    """Map each pixel to its 0-based grid slot id."""
    slot_map = np.zeros((height, width), dtype=np.int16)
    for slot_id in range(GRID_COLS * GRID_ROWS):
        x0, y0, x1, y1 = slot_bounds(slot_id, width, height)
        slot_map[y0:y1, x0:x1] = slot_id
    return slot_map


def connected_components(mask: np.ndarray) -> list[tuple[np.ndarray, np.ndarray]]:
    """
    Return 8-connected components as (ys, xs) numpy arrays.

    Pure NumPy + Python implementation to keep the script dependency-light.
    Works well for production sheets where component count is modest.
    """
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    components: list[tuple[np.ndarray, np.ndarray]] = []

    starts = np.argwhere(mask)
    for sy, sx in starts:
        if visited[sy, sx]:
            continue

        stack = [(int(sy), int(sx))]
        visited[sy, sx] = True
        pts_y: list[int] = []
        pts_x: list[int] = []

        while stack:
            y, x = stack.pop()
            pts_y.append(y)
            pts_x.append(x)

            y0 = max(0, y - 1)
            y1 = min(height - 1, y + 1)
            x0 = max(0, x - 1)
            x1 = min(width - 1, x + 1)

            for ny in range(y0, y1 + 1):
                for nx in range(x0, x1 + 1):
                    if visited[ny, nx] or not mask[ny, nx]:
                        continue
                    visited[ny, nx] = True
                    stack.append((ny, nx))

        components.append(
            (
                np.asarray(pts_y, dtype=np.int32),
                np.asarray(pts_x, dtype=np.int32),
            )
        )

    return components


def assign_components_to_slots(
    image: Image.Image,
    *,
    alpha_threshold: int,
    reserved_noise_threshold: int,
) -> tuple[dict[int, list[tuple[np.ndarray, np.ndarray]]], list[tuple[int, int]]]:
    """
    Assign each connected alpha component to exactly one non-reserved slot.

    Rule:
    - Find the 8-connected component on the whole sheet.
    - Count how many pixels of that component lie in each grid slot.
    - Assign the whole component to the non-reserved slot (1-13) with the most pixels.

    This fixes both problems:
    - artwork crossing a cell boundary is no longer clipped;
    - foreign fragments that only intrude slightly into another cell stay owned by
      their real source component instead of polluting the neighbor export.
    """
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    alpha = rgba[:, :, 3]
    mask = alpha > alpha_threshold

    height, width = mask.shape
    slot_map = build_slot_index_map(width, height)
    components = connected_components(mask)

    assigned: dict[int, list[tuple[np.ndarray, np.ndarray]]] = defaultdict(list)
    reserved_errors: list[tuple[int, int]] = []

    for ys, xs in components:
        component_slots = slot_map[ys, xs]
        counts = np.bincount(component_slots, minlength=GRID_COLS * GRID_ROWS)

        non_reserved_counts = counts[: len(SLOT_NAMES)]
        best_non_reserved = int(non_reserved_counts.argmax())
        best_non_reserved_count = int(non_reserved_counts[best_non_reserved])

        if best_non_reserved_count <= 0:
            reserved_slot = int(counts.argmax()) + 1
            component_size = int(len(xs))
            if component_size <= reserved_noise_threshold:
                continue
            reserved_errors.append((reserved_slot, component_size))
            continue

        assigned[best_non_reserved].append((ys, xs))

    return assigned, reserved_errors


def build_owned_artwork(
    image: Image.Image,
    slot_id: int,
    *,
    alpha_threshold: int,
    component_assignments: dict[int, list[tuple[np.ndarray, np.ndarray]]],
) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    owned = np.zeros(rgba.shape[:2], dtype=bool)

    for ys, xs in component_assignments.get(slot_id, []):
        owned[ys, xs] = True

    if not owned.any():
        raise RuntimeError(f"Slot {slot_id + 1:02d} rỗng: {SLOT_NAMES[slot_id]}")

    rgba[~owned] = 0
    owned_alpha = rgba[:, :, 3]

    bbox = alpha_bbox(owned_alpha, alpha_threshold)
    if bbox is None:
        raise RuntimeError(f"Slot {slot_id + 1:02d} rỗng: {SLOT_NAMES[slot_id]}")

    return Image.fromarray(rgba, mode="RGBA").crop(bbox)


def validate_image(
    image: Image.Image,
    *,
    strict_size: bool,
    alpha_threshold: int,
    reserved_noise_threshold: int,
) -> dict[int, list[tuple[np.ndarray, np.ndarray]]]:
    width, height = image.size

    if strict_size and image.size != EXPECTED_SIZE:
        raise RuntimeError(
            f"--strict-size yêu cầu {EXPECTED_SIZE[0]}×{EXPECTED_SIZE[1]}, "
            f"nhưng ảnh hiện tại là {width}×{height}."
        )

    if width < GRID_COLS or height < GRID_ROWS:
        raise RuntimeError(f"Kích thước {width}×{height} quá nhỏ cho grid 4×4.")

    if width != height:
        print(
            f"WARNING: sheet không vuông ({width}×{height}); "
            "script vẫn chia theo biên tỉ lệ 4×4."
        )

    col_widths = [
        (col + 1) * width // GRID_COLS - col * width // GRID_COLS
        for col in range(GRID_COLS)
    ]
    row_heights = [
        (row + 1) * height // GRID_ROWS - row * height // GRID_ROWS
        for row in range(GRID_ROWS)
    ]

    if width % GRID_COLS or height % GRID_ROWS:
        print(
            f"INFO: {width}×{height} không chia hết cho 4; "
            f"cell widths={col_widths}, heights={row_heights}."
        )

    if image.size != EXPECTED_SIZE:
        print(
            f"INFO: canonical={EXPECTED_SIZE[0]}×{EXPECTED_SIZE[1]}; "
            f"input={width}×{height}. Không resize ảnh nguồn."
        )

    alpha = np.asarray(image.convert("RGBA"), dtype=np.uint8)[:, :, 3]
    if int(alpha.min()) == 255:
        raise RuntimeError(
            "Ảnh nguồn không có alpha trong suốt. "
            "Hawk splitter không tự xóa background RGB."
        )

    component_assignments, reserved_errors = assign_components_to_slots(
        image,
        alpha_threshold=alpha_threshold,
        reserved_noise_threshold=reserved_noise_threshold,
    )

    if reserved_errors:
        details = ", ".join(f"ô {slot_id}: {count} px" for slot_id, count in reserved_errors)
        raise RuntimeError(
            "Phát hiện component chỉ nằm trong các ô reserved 14-16; "
            f"không thể gán ownership an toàn: {details}. "
            f"Bạn có thể tăng --reserved-noise nếu đây chỉ là bụi alpha rất nhỏ (hiện tại: {reserved_noise_threshold}px)."
        )

    return component_assignments


def warn_cell_padding(
    alpha: np.ndarray,
    slot_id: int,
    filename: str,
    *,
    threshold: int,
    min_padding: int,
) -> None:
    bbox = alpha_bbox(alpha, threshold)
    if bbox is None:
        return

    left, top, right, bottom = bbox
    height, width = alpha.shape
    margins = (left, top, width - right, height - bottom)
    if min(margins) < min_padding:
        print(
            f"WARNING: slot {slot_id + 1:02d} {filename} "
            f"chạm/gần biên cell; margins={margins}. "
            "Script mới vẫn export theo connected component để tránh bị cắt."
        )


def export_cell(
    image: Image.Image,
    slot_id: int,
    output_path: Path,
    *,
    alpha_threshold: int,
    output_padding: int,
    min_cell_padding: int,
    component_assignments: dict[int, list[tuple[np.ndarray, np.ndarray]]],
) -> None:
    width, height = image.size
    x0, y0, x1, y1 = slot_bounds(slot_id, width, height)
    base_cell = image.crop((x0, y0, x1, y1)).convert("RGBA")
    base_alpha = np.asarray(base_cell, dtype=np.uint8)[:, :, 3]

    warn_cell_padding(
        base_alpha,
        slot_id,
        output_path.name,
        threshold=alpha_threshold,
        min_padding=min_cell_padding,
    )

    artwork = build_owned_artwork(
        image,
        slot_id,
        alpha_threshold=alpha_threshold,
        component_assignments=component_assignments,
    )

    padding = max(0, int(output_padding))
    output = Image.new(
        "RGBA",
        (artwork.width + padding * 2, artwork.height + padding * 2),
        (0, 0, 0, 0),
    )
    output.alpha_composite(artwork, (padding, padding))
    output.save(output_path)


def save_debug_grid(image: Image.Image, output_path: Path) -> None:
    debug = image.copy().convert("RGBA")
    draw = ImageDraw.Draw(debug)
    width, height = debug.size

    for col in range(1, GRID_COLS):
        x = col * width // GRID_COLS
        draw.line([(x, 0), (x, height)], fill=(255, 0, 0, 255), width=2)

    for row in range(1, GRID_ROWS):
        y = row * height // GRID_ROWS
        draw.line([(0, y), (width, y)], fill=(255, 0, 0, 255), width=2)

    for slot_id in range(GRID_COLS * GRID_ROWS):
        x0, y0, _, _ = slot_bounds(slot_id, width, height)
        if slot_id < len(SLOT_NAMES):
            label = SLOT_NAMES[slot_id]
            color = (255, 255, 0, 255)
        else:
            label = "EMPTY (required)"
            color = (255, 120, 120, 255)
        draw.text((x0 + 6, y0 + 6), f"{slot_id + 1:02d} {label}", fill=color)

    debug.save(output_path)


def clear_owned_outputs(output_dir: Path) -> None:
    """Remove only files produced by this script, never the whole directory."""
    for filename in [*SLOT_NAMES, "_debug-grid.png"]:
        path = output_dir / filename
        if path.exists():
            path.unlink()


def split_sheet(
    input_path: Path,
    output_dir: Path,
    zip_path: Path | None,
    *,
    alpha_threshold: int,
    output_padding: int,
    min_cell_padding: int,
    reserved_noise_threshold: int,
    debug: bool,
    strict_size: bool,
) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {input_path}")

    image = Image.open(input_path).convert("RGBA")
    component_assignments = validate_image(
        image,
        strict_size=strict_size,
        alpha_threshold=alpha_threshold,
        reserved_noise_threshold=reserved_noise_threshold,
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    clear_owned_outputs(output_dir)

    if debug:
        save_debug_grid(image, output_dir / "_debug-grid.png")

    for slot_id, filename in enumerate(SLOT_NAMES):
        output_path = output_dir / filename
        export_cell(
            image,
            slot_id,
            output_path,
            alpha_threshold=alpha_threshold,
            output_padding=output_padding,
            min_cell_padding=min_cell_padding,
            component_assignments=component_assignments,
        )
        with Image.open(output_path) as result:
            print(f"{slot_id + 1:02d}. Saved: {filename:<18} {result.width}x{result.height}")

    if zip_path is not None:
        zip_path.parent.mkdir(parents=True, exist_ok=True)
        if zip_path.exists():
            zip_path.unlink()
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for filename in SLOT_NAMES:
                path = output_dir / filename
                archive.write(path, arcname=f"{output_dir.name}/{filename}")
            debug_path = output_dir / "_debug-grid.png"
            if debug_path.exists():
                archive.write(debug_path, arcname=f"{output_dir.name}/_debug-grid.png")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Split Hawk 4x4 production sheet into 13 PNG assets: "
            "rear-wing, tail-fan, leg-far, body, leg-near, front-wing, "
            "head, eye states, crest and Cyclone Dive VFX."
        )
    )
    parser.add_argument("input", type=str)
    parser.add_argument("--output", type=str, default="hawk-layer-sheet")
    parser.add_argument("--zip", dest="zip_path", type=str, default=None)
    parser.add_argument(
        "--alpha-threshold",
        type=int,
        default=DEFAULT_ALPHA_THRESHOLD,
        help="Alpha threshold used for empty/reserved-cell validation (default: 2).",
    )
    parser.add_argument(
        "--padding",
        type=int,
        default=DEFAULT_OUTPUT_PADDING,
        help="Transparent padding added around each exported PNG (default: 18).",
    )
    parser.add_argument(
        "--min-cell-padding",
        type=int,
        default=DEFAULT_MIN_CELL_PADDING,
        help="Warn when artwork is closer than this many pixels to a cell edge.",
    )
    parser.add_argument(
        "--reserved-noise",
        type=int,
        default=DEFAULT_RESERVED_NOISE,
        help="Ignore tiny isolated components that exist only inside reserved slots 14-16 (default: 8 px).",
    )
    parser.add_argument("--debug", action="store_true")
    parser.add_argument("--strict-size", action="store_true")
    args = parser.parse_args()

    input_path = normalize_path(args.input)
    output_dir = normalize_path(args.output)
    zip_path = normalize_path(args.zip_path) if args.zip_path else None

    split_sheet(
        input_path=input_path,
        output_dir=output_dir,
        zip_path=zip_path,
        alpha_threshold=max(0, min(254, args.alpha_threshold)),
        output_padding=args.padding,
        min_cell_padding=max(0, args.min_cell_padding),
        reserved_noise_threshold=max(0, args.reserved_noise),
        debug=args.debug,
        strict_size=args.strict_size,
    )

    print()
    print(f"Done: {output_dir}")
    if zip_path is not None:
        print(f"ZIP: {zip_path}")


if __name__ == "__main__":
    main()

