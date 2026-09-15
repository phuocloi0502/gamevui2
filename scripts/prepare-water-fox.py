"""Normalize the Water Fox inbox package to the Fire Fox runtime contract."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter
import json

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "assets/inbox/water-fox/level-2"
SOURCE = INBOX / "water-fox" if (INBOX / "water-fox").is_dir() else INBOX
OUT = ROOT / "public/assets/pets/water-fox/level-2"
OUT.mkdir(parents=True, exist_ok=True)

# Fire Fox's final canvases and the actual non-transparent regions inside them.
TARGETS = {
    "body": ((308, 225), (4, 4, 304, 221)),
    "head": ((302, 318), (4, 4, 298, 314)),
    "eyes-open": ((302, 318), (4, 4, 298, 314)),
    "eyes-closed": ((302, 318), (4, 4, 298, 314)),
    "tail": ((228, 220), (4, 4, 224, 216)),
    "leg": ((70, 123), (4, 4, 66, 119)),
    "elemental-effect": ((101, 163), (4, 4, 97, 159)),
}


def source_path(name: str) -> Path:
    folder = "effects" if name == "elemental-effect" else "layers"
    return SOURCE / folder / f"{name}.png"


HEAD_SOURCE_NAMES = {"head", "eyes-open", "eyes-closed"}
head_boxes = [
    Image.open(source_path(name)).convert("RGBA").getchannel("A").getbbox()
    for name in HEAD_SOURCE_NAMES
]
HEAD_SHARED_BBOX = (
    min(box[0] for box in head_boxes if box),
    min(box[1] for box in head_boxes if box),
    max(box[2] for box in head_boxes if box),
    max(box[3] for box in head_boxes if box),
)


def normalize(name: str) -> None:
    canvas_size, target_box = TARGETS[name]
    image = Image.open(source_path(name)).convert("RGBA")
    bbox = HEAD_SHARED_BBOX if name in HEAD_SOURCE_NAMES else image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError(f"{name}: no visible alpha content")
    image = image.crop(bbox).resize(
        (target_box[2] - target_box[0], target_box[3] - target_box[1]),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", canvas_size)
    canvas.alpha_composite(image, target_box[:2])
    folder = "effects" if name == "elemental-effect" else "layers"
    destination = OUT / folder / f"{name}.png"
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination)


def create_shadow() -> None:
    shadow = Image.new("RGBA", (320, 64))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse((22, 18, 298, 48), fill=(25, 45, 70, 92))
    shadow = shadow.filter(ImageFilter.GaussianBlur(9))
    shadow.save(OUT / "layers/shadow.png")


def render_master() -> None:
    manifest = json.loads((ROOT / "assets/pets/water-fox/level-2/asset.json").read_text())
    canvas = Image.new("RGBA", (600, 600))
    positions: dict[str, tuple[float, float, float]] = {}
    for layer in sorted(manifest["layers"], key=lambda item: item["z"]):
        if layer.get("blink") == "closed":
            continue
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
            color = Image.new("RGBA", image.size, ((tint >> 16) & 255, (tint >> 8) & 255, tint & 255, 255))
            image = ImageChops.multiply(image, color)
            image.putalpha(alpha)
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
        canvas.alpha_composite(
            image,
            (round(x - image.width * layer["originX"]), round(y - image.height * layer["originY"])),
        )
    canvas.save(OUT / "master.png")
    canvas.save(OUT / "preview.png")


for name in TARGETS:
    normalize(name)
create_shadow()
render_master()
print("Normalized Water Fox runtime assets in", OUT)
