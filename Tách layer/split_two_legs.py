#!/usr/bin/env python3
"""
split_two_legs_v2.py

Tách một PNG chứa 2 chân rời thành:
- leg-left.png
- leg-right.png

Bản V2:
- Hỗ trợ input bằng đường dẫn tương đối hoặc tuyệt đối.
- Hỗ trợ ~ trong path.
- Resolve path rõ ràng trước khi xử lý.

Ví dụ:
    python3 split_two_legs_v2.py /home/loivp/legs.png --output /home/loivp/out
    python3 split_two_legs_v2.py "~/My Projects/Tách layer/legs.png" --output "~/My Projects/Tách layer/out"

Cài:
    pip install pillow numpy scipy
"""

from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


DEFAULT_CORE_ALPHA = 5
DEFAULT_MIN_AREA = 100
DEFAULT_PADDING = 18


def normalize_path(path_str: str) -> Path:
    """
    Nhận cả:
    - relative path
    - absolute path
    - path có ~
    """
    return Path(path_str).expanduser().resolve()


def find_two_leg_cores(
    alpha: np.ndarray,
    core_alpha: int,
    min_area: int,
) -> list[np.ndarray]:
    mask = alpha >= core_alpha

    labels, _ = ndi.label(
        mask,
        structure=np.ones((3, 3), dtype=np.uint8),
    )

    objects = ndi.find_objects(labels)

    comps = []

    for component_id, sl in enumerate(objects, start=1):
        if sl is None:
            continue

        local = labels[sl] == component_id
        area = int(local.sum())

        if area < min_area:
            continue

        y_slice, x_slice = sl

        yy, xx = np.where(local)
        gx = xx + x_slice.start
        gy = yy + y_slice.start

        cx = float(gx.mean())
        cy = float(gy.mean())

        comps.append({
            "id": component_id,
            "slice": sl,
            "local": local,
            "area": area,
            "cx": cx,
            "cy": cy,
        })

    if len(comps) < 2:
        raise RuntimeError(
            f"Chỉ tìm thấy {len(comps)} component đủ lớn. "
            f"Thử giảm --core-alpha hoặc --min-area."
        )

    comps = sorted(
        comps,
        key=lambda c: c["area"],
        reverse=True,
    )[:2]

    comps = sorted(
        comps,
        key=lambda c: c["cx"],
    )

    h, w = alpha.shape
    seeds = []

    for comp in comps:
        seed = np.zeros((h, w), dtype=bool)
        sl = comp["slice"]
        local = comp["local"]

        view = seed[sl]
        view[local] = True
        seed[sl] = view

        seeds.append(seed)

    return seeds


def build_owner_map(
    alpha: np.ndarray,
    seeds: list[np.ndarray],
) -> np.ndarray:
    owner = np.full(
        alpha.shape,
        -1,
        dtype=np.int8,
    )

    best_distance = np.full(
        alpha.shape,
        np.inf,
        dtype=np.float32,
    )

    for leg_id, seed in enumerate(seeds):
        distance = ndi.distance_transform_edt(
            ~seed
        ).astype(np.float32)

        update = distance < best_distance

        best_distance[update] = distance[update]
        owner[update] = leg_id

    for leg_id, seed in enumerate(seeds):
        owner[seed] = leg_id

    owner[alpha == 0] = -1
    return owner


def export_leg(
    arr: np.ndarray,
    alpha: np.ndarray,
    owner: np.ndarray,
    leg_id: int,
    output_path: Path,
    padding: int,
) -> None:
    mask = ((owner == leg_id) & (alpha > 0))

    ys, xs = np.where(mask)

    if len(xs) == 0:
        raise RuntimeError(f"Không có pixel cho leg_id={leg_id}")

    x0 = int(xs.min())
    x1 = int(xs.max()) + 1
    y0 = int(ys.min())
    y1 = int(ys.max()) + 1

    crop = arr[y0:y1, x0:x1].copy()
    local_mask = mask[y0:y1, x0:x1]
    crop[~local_mask] = (0, 0, 0, 0)

    pad = max(0, int(padding))

    canvas = np.zeros(
        (crop.shape[0] + pad * 2, crop.shape[1] + pad * 2, 4),
        dtype=np.uint8,
    )

    canvas[
        pad:pad + crop.shape[0],
        pad:pad + crop.shape[1],
    ] = crop

    output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(canvas, "RGBA").save(output_path)


def split_two_legs(
    input_path: Path,
    output_dir: Path,
    zip_path: Path | None,
    *,
    core_alpha: int,
    min_area: int,
    padding: int,
) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {input_path}")

    image = Image.open(input_path).convert("RGBA")
    arr = np.array(image, dtype=np.uint8)
    alpha = arr[:, :, 3]

    if alpha.min() == 255:
        raise RuntimeError("Ảnh nguồn không có alpha/transparency.")

    seeds = find_two_leg_cores(
        alpha=alpha,
        core_alpha=core_alpha,
        min_area=min_area,
    )

    owner = build_owner_map(alpha=alpha, seeds=seeds)

    if output_dir.exists():
        shutil.rmtree(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    outputs = [
        ("leg-left.png", 0),
        ("leg-right.png", 1),
    ]

    for filename, leg_id in outputs:
        export_leg(
            arr=arr,
            alpha=alpha,
            owner=owner,
            leg_id=leg_id,
            output_path=output_dir / filename,
            padding=padding,
        )
        print("Saved:", output_dir / filename)

    if zip_path is not None:
        zip_path.parent.mkdir(parents=True, exist_ok=True)

        if zip_path.exists():
            zip_path.unlink()

        with zipfile.ZipFile(
            zip_path,
            "w",
            compression=zipfile.ZIP_DEFLATED,
        ) as zf:
            for filename, _ in outputs:
                p = output_dir / filename
                zf.write(
                    p,
                    arcname=f"{output_dir.name}/{filename}",
                )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Split a transparent PNG containing 2 legs into 2 PNG files."
    )

    parser.add_argument(
        "input",
        type=str,
        help="PNG chứa 2 chân. Hỗ trợ relative path hoặc absolute path.",
    )

    parser.add_argument(
        "--output",
        type=str,
        default="legs-output",
        help="Thư mục output. Hỗ trợ relative path hoặc absolute path.",
    )

    parser.add_argument(
        "--zip",
        dest="zip_path",
        type=str,
        default=None,
        help="Tạo thêm ZIP. Hỗ trợ relative path hoặc absolute path.",
    )

    parser.add_argument(
        "--core-alpha",
        type=int,
        default=DEFAULT_CORE_ALPHA,
        help="Ngưỡng alpha tách 2 core (default: 5)",
    )

    parser.add_argument(
        "--min-area",
        type=int,
        default=DEFAULT_MIN_AREA,
        help="Diện tích core tối thiểu (default: 100)",
    )

    parser.add_argument(
        "--padding",
        type=int,
        default=DEFAULT_PADDING,
        help="Padding trong suốt output (default: 18)",
    )

    args = parser.parse_args()

    input_path = normalize_path(args.input)
    output_dir = normalize_path(args.output)
    zip_path = normalize_path(args.zip_path) if args.zip_path else None

    split_two_legs(
        input_path=input_path,
        output_dir=output_dir,
        zip_path=zip_path,
        core_alpha=args.core_alpha,
        min_area=args.min_area,
        padding=args.padding,
    )

    print()
    print("Done:", output_dir)

    if zip_path is not None:
        print("ZIP:", zip_path)


if __name__ == "__main__":
    main()

