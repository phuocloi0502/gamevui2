#!/usr/bin/env python3
from __future__ import annotations

import argparse
import zipfile
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
DEFAULT_RESERVED_OVERFLOW = 64


def normalize_path(value: str) -> Path:
    return Path(value).expanduser().resolve()


def slot_bounds(
    slot_id: int,
    width: int,
    height: int,
) -> tuple[int, int, int, int]:
    """Return proportional integer bounds, including non-divisible sizes."""
    row = slot_id // GRID_COLS
    col = slot_id % GRID_COLS
    return (
        col * width // GRID_COLS,
        row * height // GRID_ROWS,
        (col + 1) * width // GRID_COLS,
        (row + 1) * height // GRID_ROWS,
    )


def alpha_bbox(
    alpha: np.ndarray,
    threshold: int,
) -> tuple[int, int, int, int] | None:
    ys, xs = np.where(alpha > threshold)
    if len(xs) == 0:
        return None
    return (
        int(xs.min()),
        int(ys.min()),
        int(xs.max()) + 1,
        int(ys.max()) + 1,
    )


# Reserved cells can contain a small amount of spill from neighboring VFX.
# Mapping uses 0-based slot ids:
#   slot 14 may borrow to impact (left) or crest (top)
#   slot 15 may borrow to attack-trail (top)
#   slot 16 may borrow to vortex (top)
RESERVED_OVERFLOW_OWNERS: dict[int, tuple[tuple[int, str], ...]] = {
    13: ((12, "left"), (9, "top")),
    14: ((10, "top"),),
    15: ((11, "top"),),
}


def classify_reserved_overflow(
    alpha: np.ndarray,
    *,
    threshold: int,
    max_overflow: int,
) -> tuple[
    dict[int, tuple[np.ndarray, np.ndarray]],
    list[tuple[int, int]],
    list[tuple[int, int, int]],
]:
    """
    Classify alpha pixels found in reserved slots 14-16.

    Returns:
      assignments:
        owner_slot_id -> (global_ys, global_xs)
      unassigned:
        [(reserved_slot_number, pixel_count), ...]
      routed:
        [(reserved_slot_number, owner_slot_number, pixel_count), ...]

    A reserved pixel is recoverable only when it is close enough to a valid
    neighboring edge. This keeps real accidental artwork in reserved cells as
    an error, while allowing glow / anti-alias spill across a cell boundary.
    """
    height, width = alpha.shape
    owner_points: dict[int, list[tuple[int, int]]] = {}
    unassigned: list[tuple[int, int]] = []
    routed: list[tuple[int, int, int]] = []

    limit = max(0, int(max_overflow))

    for reserved_slot_id in range(len(SLOT_NAMES), GRID_COLS * GRID_ROWS):
        x0, y0, x1, y1 = slot_bounds(
            reserved_slot_id,
            width,
            height,
        )
        sub = alpha[y0:y1, x0:x1]
        ys, xs = np.where(sub > threshold)
        if len(xs) == 0:
            continue

        candidates = RESERVED_OVERFLOW_OWNERS.get(
            reserved_slot_id,
            (),
        )
        if not candidates:
            unassigned.append(
                (reserved_slot_id + 1, int(len(xs)))
            )
            continue

        best_owner = np.full(len(xs), -1, dtype=np.int32)
        best_distance = np.full(
            len(xs),
            np.iinfo(np.int32).max,
            dtype=np.int32,
        )

        for owner_slot_id, edge in candidates:
            if edge == "left":
                distances = xs
            elif edge == "top":
                distances = ys
            else:
                raise RuntimeError(
                    f"Unsupported overflow edge: {edge}"
                )

            eligible = distances <= limit
            better = eligible & (distances < best_distance)
            best_owner[better] = owner_slot_id
            best_distance[better] = distances[better]

        unresolved = best_owner < 0
        unresolved_count = int(unresolved.sum())
        if unresolved_count:
            unassigned.append(
                (reserved_slot_id + 1, unresolved_count)
            )

        for owner_slot_id, _edge in candidates:
            selected = best_owner == owner_slot_id
            count = int(selected.sum())
            if count == 0:
                continue

            global_ys = ys[selected] + y0
            global_xs = xs[selected] + x0

            owner_points.setdefault(owner_slot_id, []).extend(
                zip(
                    global_ys.tolist(),
                    global_xs.tolist(),
                )
            )
            routed.append(
                (
                    reserved_slot_id + 1,
                    owner_slot_id + 1,
                    count,
                )
            )

    assignments: dict[int, tuple[np.ndarray, np.ndarray]] = {}
    for owner_slot_id, points in owner_points.items():
        coords = np.asarray(points, dtype=np.int32)
        assignments[owner_slot_id] = (
            coords[:, 0],
            coords[:, 1],
        )

    return assignments, unassigned, routed


def build_owned_artwork(
    image: Image.Image,
    slot_id: int,
    *,
    alpha_threshold: int,
    reserved_overflow: int,
) -> Image.Image:
    """
    Return one layer containing its normal cell plus recoverable spill from
    reserved cells. Pixels owned by other slots are masked out.
    """
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    alpha = rgba[:, :, 3]
    height, width = alpha.shape

    owned = np.zeros((height, width), dtype=bool)
    x0, y0, x1, y1 = slot_bounds(
        slot_id,
        width,
        height,
    )
    owned[y0:y1, x0:x1] = True

    # Route only meaningful alpha into reserved cells. Very faint alpha noise
    # (<= alpha_threshold) is ignored so it cannot enlarge an exported layer.
    assignments, _unassigned, _routed = classify_reserved_overflow(
        alpha,
        threshold=alpha_threshold,
        max_overflow=reserved_overflow,
    )
    coords = assignments.get(slot_id)
    if coords is not None:
        ys, xs = coords
        owned[ys, xs] = True

    rgba[~owned] = 0
    owned_alpha = rgba[:, :, 3]

    bbox = alpha_bbox(
        owned_alpha,
        alpha_threshold,
    )
    if bbox is None:
        raise RuntimeError(
            f"Slot {slot_id + 1:02d} rỗng: "
            f"{SLOT_NAMES[slot_id]}"
        )

    # Once a meaningful bbox exists, include all non-zero alpha pixels already
    # assigned to this owner so soft glow edges are not clipped.
    nonzero = np.where(owned_alpha > 0)
    if len(nonzero[0]):
        ys, xs = nonzero
        bbox = (
            int(xs.min()),
            int(ys.min()),
            int(xs.max()) + 1,
            int(ys.max()) + 1,
        )

    return Image.fromarray(rgba, mode="RGBA").crop(bbox)


def validate_image(
    image: Image.Image,
    *,
    strict_size: bool,
    alpha_threshold: int,
    reserved_overflow: int,
) -> None:
    width, height = image.size

    if strict_size and image.size != EXPECTED_SIZE:
        raise RuntimeError(
            f"--strict-size yêu cầu {EXPECTED_SIZE[0]}×{EXPECTED_SIZE[1]}, "
            f"nhưng ảnh hiện tại là {width}×{height}."
        )

    if width < GRID_COLS or height < GRID_ROWS:
        raise RuntimeError(
            f"Kích thước {width}×{height} quá nhỏ cho grid 4×4."
        )

    if width != height:
        print(
            f"WARNING: sheet không vuông ({width}×{height}); "
            "script vẫn chia theo biên tỉ lệ 4×4."
        )

    col_widths = [
        (col + 1) * width // GRID_COLS
        - col * width // GRID_COLS
        for col in range(GRID_COLS)
    ]
    row_heights = [
        (row + 1) * height // GRID_ROWS
        - row * height // GRID_ROWS
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

    alpha = np.asarray(
        image.convert("RGBA"),
        dtype=np.uint8,
    )[:, :, 3]

    if int(alpha.min()) == 255:
        raise RuntimeError(
            "Ảnh nguồn không có alpha trong suốt. "
            "Hawk splitter không tự xóa background RGB."
        )

    assignments, unassigned, routed = classify_reserved_overflow(
        alpha,
        threshold=alpha_threshold,
        max_overflow=reserved_overflow,
    )

    if routed:
        details = ", ".join(
            (
                f"ô {reserved_slot} -> "
                f"slot {owner_slot:02d} "
                f"{SLOT_NAMES[owner_slot - 1]}: {count} px"
            )
            for reserved_slot, owner_slot, count in routed
        )
        print(
            "INFO: phát hiện VFX/glow tràn sang ô reserved; "
            f"script sẽ thu hồi về layer lân cận: {details}."
        )

    if unassigned:
        details = ", ".join(
            f"ô {slot_id}: {count} px"
            for slot_id, count in unassigned
        )
        raise RuntimeError(
            "Ô reserved 14-16 có nội dung nằm quá xa biên để "
            "xem là overflow hợp lệ; "
            f"phát hiện {details}. "
            f"Tăng --reserved-overflow nếu đây thực sự là glow/VFX "
            f"của slot lân cận (hiện tại: {reserved_overflow}px)."
        )


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
            "Nên tạo lại sheet với safe padding lớn hơn."
        )


def export_cell(
    image: Image.Image,
    slot_id: int,
    output_path: Path,
    *,
    alpha_threshold: int,
    output_padding: int,
    min_cell_padding: int,
    reserved_overflow: int,
) -> None:
    width, height = image.size
    x0, y0, x1, y1 = slot_bounds(
        slot_id,
        width,
        height,
    )
    base_cell = image.crop(
        (x0, y0, x1, y1)
    ).convert("RGBA")
    base_alpha = np.asarray(
        base_cell,
        dtype=np.uint8,
    )[:, :, 3]

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
        reserved_overflow=reserved_overflow,
    )

    padding = max(0, int(output_padding))
    output = Image.new(
        "RGBA",
        (
            artwork.width + padding * 2,
            artwork.height + padding * 2,
        ),
        (0, 0, 0, 0),
    )
    output.alpha_composite(
        artwork,
        (padding, padding),
    )
    output.save(output_path)


def save_debug_grid(
    image: Image.Image,
    output_path: Path,
) -> None:
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
        draw.text(
            (x0 + 6, y0 + 6),
            f"{slot_id + 1:02d} {label}",
            fill=color,
        )

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
    reserved_overflow: int,
    debug: bool,
    strict_size: bool,
) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {input_path}")

    image = Image.open(input_path).convert("RGBA")
    validate_image(
        image,
        strict_size=strict_size,
        alpha_threshold=alpha_threshold,
        reserved_overflow=reserved_overflow,
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
            reserved_overflow=reserved_overflow,
        )
        with Image.open(output_path) as result:
            print(
                f"{slot_id + 1:02d}. Saved: {filename:<18} "
                f"{result.width}x{result.height}"
            )

    if zip_path is not None:
        zip_path.parent.mkdir(parents=True, exist_ok=True)
        if zip_path.exists():
            zip_path.unlink()
        with zipfile.ZipFile(
            zip_path,
            "w",
            compression=zipfile.ZIP_DEFLATED,
        ) as archive:
            for filename in SLOT_NAMES:
                path = output_dir / filename
                archive.write(path, arcname=f"{output_dir.name}/{filename}")
            debug_path = output_dir / "_debug-grid.png"
            if debug_path.exists():
                archive.write(
                    debug_path,
                    arcname=f"{output_dir.name}/_debug-grid.png",
                )


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
        "--reserved-overflow",
        type=int,
        default=DEFAULT_RESERVED_OVERFLOW,
        help=(
            "Maximum px allowed for recoverable VFX/glow spill into "
            "reserved slots 14-16 (default: 64)."
        ),
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
        reserved_overflow=max(0, args.reserved_overflow),
        debug=args.debug,
        strict_size=args.strict_size,
    )

    print()
    print(f"Done: {output_dir}")
    if zip_path is not None:
        print(f"ZIP: {zip_path}")


if __name__ == "__main__":
    main()
