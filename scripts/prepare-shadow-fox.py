"""Normalize the Shadow Fox inbox package and export a two-tail Phaser puppet."""
from pathlib import Path
from PIL import Image, ImageChops
import json

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "assets/inbox/shadow-fox"
OUT = ROOT / "public/assets/pets/shadow-fox"
OUT.mkdir(parents=True, exist_ok=True)

# Every output has a small transparent gutter so filtering cannot clip soft fur.
TARGETS = {
    "body": ("layers", (308, 225), (4, 4, 304, 221)),
    "head": ("layers", (302, 318), (4, 4, 298, 314)),
    "head-closed": ("layers", (302, 318), (4, 4, 298, 314)),
    "leg": ("layers", (70, 123), (4, 4, 66, 119)),
    "shadow": ("layers", (320, 64), (10, 10, 310, 54)),
    "tail": ("layers", (310, 300), (4, 4, 306, 296)),
    "tail2": ("layers", (300, 420), (4, 4, 296, 416)),
    "elemental-effect": ("effects", (101, 163), (5, 0, 95, 163)),
}

HEAD_SOURCE_NAMES = {"head", "head-closed"}
head_boxes = [
    Image.open(INBOX / "layers" / f"{name}.png").convert("RGBA").getchannel("A").getbbox()
    for name in HEAD_SOURCE_NAMES
]
HEAD_SHARED_BBOX = (
    min(box[0] for box in head_boxes if box),
    min(box[1] for box in head_boxes if box),
    max(box[2] for box in head_boxes if box),
    max(box[3] for box in head_boxes if box),
)


def normalize(name: str) -> None:
    folder, canvas_size, target_box = TARGETS[name]
    image = Image.open(INBOX / folder / f"{name}.png").convert("RGBA")
    bbox = HEAD_SHARED_BBOX if name in HEAD_SOURCE_NAMES else image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError(f"{name}: no visible alpha content")
    image = image.crop(bbox).resize(
        (target_box[2] - target_box[0], target_box[3] - target_box[1]),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", canvas_size)
    canvas.alpha_composite(image, target_box[:2])
    destination = OUT / folder / f"{name}.png"
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination)


def render_master() -> None:
    manifest = json.loads((ROOT / "assets/pets/shadow-fox/asset.json").read_text())
    canvas = Image.new("RGBA", (600, 600))
    positions: dict[str, tuple[float, float, float]] = {}
    for layer in sorted(manifest["layers"], key=lambda item: item["z"]):
        px, py, parent_scale = positions.get(layer.get("parent"), (300, 510, 1))
        x = px + layer["x"] * parent_scale
        y = py + layer["y"] * parent_scale
        scale = parent_scale * layer.get("scale", 1)
        positions[layer["id"]] = (x, y, scale)
        path = ROOT / "public" / layer["src"].lstrip("/")
        image = Image.open(path).convert("RGBA")
        if layer.get("tint") is not None:
            tint = layer["tint"]
            alpha = image.getchannel("A")
            color = Image.new(
                "RGBA",
                image.size,
                ((tint >> 16) & 255, (tint >> 8) & 255, tint & 255, 255),
            )
            image = ImageChops.multiply(image, color)
            image.putalpha(alpha)
        image = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        )
        canvas.alpha_composite(
            image,
            (
                round(x - image.width * layer["originX"]),
                round(y - image.height * layer["originY"]),
            ),
        )
    canvas.save(OUT / "master.png")
    canvas.save(OUT / "preview.png")


for asset_name in TARGETS:
    normalize(asset_name)
render_master()
print("Normalized Shadow Fox runtime assets in", OUT)
