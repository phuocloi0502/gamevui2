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


def validate_image(
    image: Image.Image,
    *,
    strict_size: bool,
    alpha_threshold: int,
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

    alpha = np.asarray(image, dtype=np.uint8)[:, :, 3]
    if int(alpha.min()) == 255:
        raise RuntimeError(
            "Ảnh nguồn không có alpha trong suốt. "
            "Hawk splitter không tự xóa background RGB."
        )

    reserved_content = []
    for slot_id in range(len(SLOT_NAMES), GRID_COLS * GRID_ROWS):
        x0, y0, x1, y1 = slot_bounds(slot_id, width, height)
        count = int((alpha[y0:y1, x0:x1] > alpha_threshold).sum())
        if count:
            reserved_content.append((slot_id + 1, count))

    if reserved_content:
        details = ", ".join(
            f"ô {slot_id}: {count} px"
            for slot_id, count in reserved_content
        )
        raise RuntimeError(
            "Ba ô reserved 14-16 phải trong suốt hoàn toàn; "
            f"phát hiện nội dung tại {details}."
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
) -> None:
    width, height = image.size
    x0, y0, x1, y1 = slot_bounds(slot_id, width, height)
    cell = image.crop((x0, y0, x1, y1)).convert("RGBA")
    alpha = np.asarray(cell, dtype=np.uint8)[:, :, 3]

    warn_cell_padding(
        alpha,
        slot_id,
        output_path.name,
        threshold=alpha_threshold,
        min_padding=min_cell_padding,
    )

    bbox = alpha_bbox(alpha, alpha_threshold)
    if bbox is None:
        raise RuntimeError(
            f"Slot {slot_id + 1:02d} rỗng: {output_path.name}"
        )

    # Expand to every non-zero alpha pixel in the cell. Direct cell ownership
    # is deterministic and never mixes leg-far with leg-near.
    full_bbox = cell.getchannel("A").getbbox()
    if full_bbox is not None:
        bbox = full_bbox

    artwork = cell.crop(bbox)
    padding = max(0, int(output_padding))
    output = Image.new(
        "RGBA",
        (artwork.width + padding * 2, artwork.height + padding * 2),
        (0, 0, 0, 0),
    )
    output.alpha_composite(artwork, (padding, padding))
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
        debug=args.debug,
        strict_size=args.strict_size,
    )

    print()
    print(f"Done: {output_dir}")
    if zip_path is not None:
        print(f"ZIP: {zip_path}")


if __name__ == "__main__":
    main()
