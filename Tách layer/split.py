#!/usr/bin/env python3

from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


# =========================================================
# 12 SLOT CỐ ĐỊNH
# =========================================================

SLOT_NAMES = [
    "shadow.png",
    "rear-feet.png",
    "body.png",
    "shell.png",

    "front-feet.png",
    "head.png",
    "eyes-open.png",
    "eyes-closed.png",

    "shell-runes.png",
    "attack-cast.png",
    "cage.png",
    "impact.png",
]


# =========================================================
# CONFIG
# =========================================================

# Chỉ dùng để tìm các pixel tương đối chắc chắn thuộc artwork.
# Không dùng để cắt alpha output.
CORE_ALPHA_THRESHOLD = 80

# Dùng khi tìm gutter / fallback.
BBOX_ALPHA_THRESHOLD = 2

# Padding trong suốt của file PNG cuối.
OUTPUT_PADDING = 18

# Khu vực tìm đường phân cách quanh grid lý thuyết.
SEARCH_X_RATIO = 0.10
SEARCH_Y_RATIO = 0.10

SEPARATOR_BAND_WIDTH = 9


# =========================================================
# TÌM SEPARATOR
# =========================================================

def find_separator(
    alpha: np.ndarray,
    axis: int,
    expected_position: int,
    search_radius: int,
    band_width: int = 9,
) -> int:
    """
    Tìm vùng có ít artwork nhất gần đường grid dự kiến.

    axis = 0 -> đường dọc X
    axis = 1 -> đường ngang Y

    QUAN TRỌNG:
    separator chỉ dùng để xác định slot nào là slot nào.
    Nó KHÔNG phải biên crop cuối.
    """

    occupied = alpha > BBOX_ALPHA_THRESHOLD

    if axis == 0:
        score = occupied.sum(axis=0)
        length = alpha.shape[1]
    else:
        score = occupied.sum(axis=1)
        length = alpha.shape[0]

    start = max(
        0,
        expected_position - search_radius,
    )

    end = min(
        length,
        expected_position + search_radius,
    )

    half = max(
        1,
        band_width // 2,
    )

    best_position = expected_position
    best_score = float("inf")

    for pos in range(
        start + half,
        end - half,
    ):

        current_score = score[
            pos - half:
            pos + half + 1
        ].sum()

        if current_score < best_score:
            best_score = current_score
            best_position = pos

    return int(best_position)


def build_grid_edges(
    alpha: np.ndarray,
) -> tuple[list[int], list[int]]:
    """
    Tạo grid 4 cột × 3 hàng.

    Grid này CHỈ để nhận diện slot.
    Artwork được phép vượt qua grid.
    """

    h, w = alpha.shape

    expected_x = [
        int(w * 0.25),
        int(w * 0.50),
        int(w * 0.75),
    ]

    expected_y = [
        int(h / 3),
        int(h * 2 / 3),
    ]

    x_radius = int(
        w * SEARCH_X_RATIO
    )

    y_radius = int(
        h * SEARCH_Y_RATIO
    )

    x_separators = [
        find_separator(
            alpha=alpha,
            axis=0,
            expected_position=x,
            search_radius=x_radius,
            band_width=SEPARATOR_BAND_WIDTH,
        )
        for x in expected_x
    ]

    y_separators = [
        find_separator(
            alpha=alpha,
            axis=1,
            expected_position=y,
            search_radius=y_radius,
            band_width=SEPARATOR_BAND_WIDTH,
        )
        for y in expected_y
    ]

    x_edges = (
        [0]
        + sorted(x_separators)
        + [w]
    )

    y_edges = (
        [0]
        + sorted(y_separators)
        + [h]
    )

    return x_edges, y_edges


# =========================================================
# XÁC ĐỊNH SLOT CỦA PIXEL
# =========================================================

def get_slot_ids(
    xs: np.ndarray,
    ys: np.ndarray,
    x_edges: list[int],
    y_edges: list[int],
) -> np.ndarray:

    cols = np.searchsorted(
        np.asarray(
            x_edges[1:-1]
        ),
        xs,
        side="right",
    )

    rows = np.searchsorted(
        np.asarray(
            y_edges[1:-1]
        ),
        ys,
        side="right",
    )

    return (
        rows * 4
        + cols
    )


# =========================================================
# TẠO CORE CHO 12 SLOT
# =========================================================

def build_slot_seeds(
    alpha: np.ndarray,
    x_edges: list[int],
    y_edges: list[int],
) -> list[np.ndarray]:

    h, w = alpha.shape

    # Chỉ lấy alpha mạnh làm "core"
    core_mask = (
        alpha
        >= CORE_ALPHA_THRESHOLD
    )

    # 8-connectivity
    structure = np.ones(
        (3, 3),
        dtype=np.uint8,
    )

    labels, _ = ndi.label(
        core_mask,
        structure=structure,
    )

    objects = ndi.find_objects(
        labels
    )

    seeds = [
        np.zeros(
            (h, w),
            dtype=bool,
        )
        for _ in range(12)
    ]

    # =====================================================
    # GÁN NGUYÊN CONNECTED COMPONENT VÀO SLOT
    # =====================================================

    for component_id, sl in enumerate(
        objects,
        start=1,
    ):

        if sl is None:
            continue

        y_slice, x_slice = sl

        local_component = (
            labels[sl]
            == component_id
        )

        if not local_component.any():
            continue

        local_y, local_x = np.where(
            local_component
        )

        global_x = (
            local_x
            + x_slice.start
        )

        global_y = (
            local_y
            + y_slice.start
        )

        # Xem component này nằm nhiều nhất trong slot nào.
        pixel_slots = get_slot_ids(
            global_x,
            global_y,
            x_edges,
            y_edges,
        )

        counts = np.bincount(
            pixel_slots,
            minlength=12,
        )

        dominant_slot = int(
            np.argmax(counts)
        )

        # QUAN TRỌNG:
        # giữ NGUYÊN component,
        # kể cả khi nó vượt grid.
        view = seeds[
            dominant_slot
        ][sl]

        view[
            local_component
        ] = True

        seeds[
            dominant_slot
        ][sl] = view

    # =====================================================
    # FALLBACK CHO SLOT QUÁ MỜ
    # ví dụ shadow
    # =====================================================

    weak_mask = (
        alpha
        > BBOX_ALPHA_THRESHOLD
    )

    for slot_id in range(12):

        if seeds[
            slot_id
        ].any():

            continue

        row = slot_id // 4
        col = slot_id % 4

        x0 = x_edges[col]
        x1 = x_edges[col + 1]

        y0 = y_edges[row]
        y1 = y_edges[row + 1]

        cell = weak_mask[
            y0:y1,
            x0:x1
        ]

        if not cell.any():
            continue

        cell_labels, _ = ndi.label(
            cell,
            structure=structure,
        )

        cell_objects = ndi.find_objects(
            cell_labels
        )

        center_x = (
            x1 - x0
        ) / 2

        center_y = (
            y1 - y0
        ) / 2

        best_component = None
        best_score = float("inf")

        for cid, csl in enumerate(
            cell_objects,
            start=1,
        ):

            if csl is None:
                continue

            component = (
                cell_labels[csl]
                == cid
            )

            if not component.any():
                continue

            ys, xs = np.where(
                component
            )

            cx = (
                xs.mean()
                + csl[1].start
            )

            cy = (
                ys.mean()
                + csl[0].start
            )

            area = int(
                component.sum()
            )

            distance = (
                (cx - center_x) ** 2
                +
                (cy - center_y) ** 2
            )

            # component lớn được ưu tiên
            score = (
                distance
                / max(
                    np.sqrt(area),
                    1,
                )
            )

            if score < best_score:
                best_score = score
                best_component = cid

        if best_component is not None:

            local_seed = (
                cell_labels
                == best_component
            )

            seeds[
                slot_id
            ][
                y0:y1,
                x0:x1
            ] |= local_seed

    return seeds


# =========================================================
# GÁN TOÀN BỘ PIXEL ALPHA > 0 CHO SLOT GẦN NHẤT
# =========================================================

def build_owner_map(
    alpha: np.ndarray,
    seeds: list[np.ndarray],
) -> np.ndarray:

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

    for slot_id, seed in enumerate(
        seeds
    ):

        if not seed.any():
            continue

        # distance tới core của slot
        distance = (
            ndi.distance_transform_edt(
                ~seed
            )
        ).astype(
            np.float32
        )

        update = (
            distance
            < best_distance
        )

        best_distance[
            update
        ] = distance[
            update
        ]

        owner[
            update
        ] = slot_id

    # Core luôn giữ đúng slot
    for slot_id, seed in enumerate(
        seeds
    ):

        if seed.any():
            owner[
                seed
            ] = slot_id

    # Pixel transparent không thuộc slot
    owner[
        alpha == 0
    ] = -1

    return owner


# =========================================================
# SPLIT
# =========================================================

def split_sheet(
    input_path: Path,
    output_dir: Path,
    zip_path: Path | None,
) -> None:

    if not input_path.exists():

        raise FileNotFoundError(
            f"Không tìm thấy file: {input_path}"
        )

    image = Image.open(
        input_path
    ).convert(
        "RGBA"
    )

    arr = np.array(
        image,
        dtype=np.uint8,
    )

    h, w = arr.shape[:2]

    alpha = arr[
        :, :, 3
    ]

    # Nếu toàn ảnh opaque
    if alpha.min() == 255:

        raise RuntimeError(
            "Ảnh nguồn không có alpha/transparency."
        )

    # =====================================================
    # 1. GRID DYNAMIC
    # =====================================================

    x_edges, y_edges = (
        build_grid_edges(
            alpha
        )
    )

    print(
        "X edges:",
        x_edges,
    )

    print(
        "Y edges:",
        y_edges,
    )

    # =====================================================
    # 2. CORE SEEDS
    # =====================================================

    seeds = build_slot_seeds(
        alpha,
        x_edges,
        y_edges,
    )

    missing_slots = [
        SLOT_NAMES[i]
        for i in range(12)
        if not seeds[i].any()
    ]

    if missing_slots:

        raise RuntimeError(
            "Không tìm thấy layer:\n"
            + "\n".join(
                missing_slots
            )
        )

    # =====================================================
    # 3. OWNERSHIP MAP
    # =====================================================

    owner = build_owner_map(
        alpha,
        seeds,
    )

    # =====================================================
    # 4. OUTPUT DIR
    # =====================================================

    if output_dir.exists():

        shutil.rmtree(
            output_dir
        )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    # =====================================================
    # 5. EXPORT
    # =====================================================

    for slot_id, filename in enumerate(
        SLOT_NAMES
    ):

        slot_mask = (
            (owner == slot_id)
            &
            (alpha > 0)
        )

        ys, xs = np.where(
            slot_mask
        )

        if len(xs) == 0:

            raise RuntimeError(
                f"Slot rỗng: {filename}"
            )

        # ---------------------------------------------
        # BBOX lấy theo TOÀN BỘ layer
        # KHÔNG theo grid
        # ---------------------------------------------

        x0 = int(
            xs.min()
        )

        x1 = int(
            xs.max()
        ) + 1

        y0 = int(
            ys.min()
        )

        y1 = int(
            ys.max()
        ) + 1

        crop = arr[
            y0:y1,
            x0:x1
        ].copy()

        local_mask = slot_mask[
            y0:y1,
            x0:x1
        ]

        # Xóa layer khác
        crop[
            ~local_mask
        ] = (
            0,
            0,
            0,
            0,
        )

        # ---------------------------------------------
        # Padding
        # ---------------------------------------------

        pad = OUTPUT_PADDING

        canvas = np.zeros(
            (
                crop.shape[0]
                + pad * 2,

                crop.shape[1]
                + pad * 2,

                4,
            ),
            dtype=np.uint8,
        )

        canvas[
            pad:
            pad + crop.shape[0],

            pad:
            pad + crop.shape[1]
        ] = crop

        output_path = (
            output_dir
            / filename
        )

        Image.fromarray(
            canvas,
            "RGBA",
        ).save(
            output_path
        )

        print(
            f"Saved: {filename}"
        )

    # =====================================================
    # 6. ZIP
    # =====================================================

    if zip_path is not None:

        if zip_path.exists():

            zip_path.unlink()

        with zipfile.ZipFile(
            zip_path,
            "w",
            compression=zipfile.ZIP_DEFLATED,
        ) as zf:

            for filename in SLOT_NAMES:

                path = (
                    output_dir
                    / filename
                )

                zf.write(
                    path,
                    arcname=(
                        f"{output_dir.name}/"
                        f"{filename}"
                    ),
                )


# =========================================================
# CLI
# =========================================================

def main() -> None:

    parser = argparse.ArgumentParser(
        description=(
            "Split Turtle 3x4 sheet "
            "into 12 PNG layers."
        )
    )

    parser.add_argument(
        "input",
        type=Path,
        help="PNG sheet nguồn",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "turtle-layer-sheet"
        ),
        help="Thư mục output",
    )

    parser.add_argument(
        "--zip",
        dest="zip_path",
        type=Path,
        default=None,
        help="File ZIP output",
    )

    args = parser.parse_args()

    split_sheet(
        input_path=args.input,
        output_dir=args.output,
        zip_path=args.zip_path,
    )

    print()
    print(
        f"Done: {args.output}"
    )

    if args.zip_path:

        print(
            f"ZIP: {args.zip_path}"
        )


if __name__ == "__main__":
    main()