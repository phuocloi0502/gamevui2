"""Extract the baked checkerboard from the one-off generated leg edit.

The generated RGB source is preserved in assets/inbox/leg-angle-fix. This script
creates a normalized RGBA sibling without overwriting that source.
"""

from pathlib import Path
from collections import deque

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/inbox/leg-angle-fix/leg-angle-3q-generated.png"
OUTPUT = ROOT / "assets/inbox/leg-angle-fix/leg-angle-3q-rgba.png"
TARGET_SIZE = (946, 1662)


def smoothstep(value: float, low: float, high: float) -> float:
    value = max(0.0, min(1.0, (value - low) / (high - low)))
    return value * value * (3.0 - 2.0 * value)


def largest_component(mask: Image.Image, threshold: int = 24) -> Image.Image:
    """Keep the connected leg while rejecting detached checkerboard artifacts."""
    width, height = mask.size
    pixels = mask.load()
    visited = bytearray(width * height)
    largest: list[int] = []

    for y in range(height):
        for x in range(width):
            start = y * width + x
            if visited[start] or pixels[x, y] < threshold:
                continue
            visited[start] = 1
            queue = deque([start])
            component: list[int] = []
            while queue:
                index = queue.popleft()
                component.append(index)
                px = index % width
                py = index // width
                for nx, ny in (
                    (px - 1, py),
                    (px + 1, py),
                    (px, py - 1),
                    (px, py + 1),
                ):
                    if nx < 0 or nx >= width or ny < 0 or ny >= height:
                        continue
                    neighbor = ny * width + nx
                    if not visited[neighbor] and pixels[nx, ny] >= threshold:
                        visited[neighbor] = 1
                        queue.append(neighbor)
            if len(component) > len(largest):
                largest = component

    keep = Image.new("L", mask.size)
    keep_pixels = keep.load()
    for index in largest:
        keep_pixels[index % width, index // width] = 255
    return keep.filter(ImageFilter.MaxFilter(9))


image = Image.open(SOURCE).convert("RGB")
alpha = Image.new("L", image.size)
alpha_pixels: list[int] = []

for red, green, blue in image.get_flattened_data():
    brightest = max(red, green, blue)
    darkest = min(red, green, blue)
    chroma = brightest - darkest

    # The baked checkerboard is bright and nearly neutral. The subject is either
    # dark indigo or visibly violet, so combine darkness and chroma evidence.
    color_confidence = smoothstep(chroma, 8.0, 28.0)
    dark_confidence = smoothstep(190.0 - brightest, 0.0, 75.0)
    opacity = max(color_confidence, dark_confidence)
    alpha_pixels.append(round(opacity * 255))

alpha.putdata(alpha_pixels)
alpha = alpha.filter(ImageFilter.MedianFilter(3)).filter(
    ImageFilter.GaussianBlur(0.45)
)
component = largest_component(alpha)
alpha = Image.composite(alpha, Image.new("L", alpha.size), component)

rgba = image.convert("RGBA")
rgba.putalpha(alpha)

# Match the original edit target's canvas without distorting the generated leg.
scale = TARGET_SIZE[0] / rgba.width
resized = rgba.resize(
    (TARGET_SIZE[0], round(rgba.height * scale)), Image.Resampling.LANCZOS
)
canvas = Image.new("RGBA", TARGET_SIZE)
canvas.alpha_composite(resized, (0, 0))
canvas.save(OUTPUT)

print(
    {
        "source": str(SOURCE.relative_to(ROOT)),
        "output": str(OUTPUT.relative_to(ROOT)),
        "size": canvas.size,
        "alpha_extrema": canvas.getchannel("A").getextrema(),
        "visible_bbox": canvas.getbbox(),
    }
)
