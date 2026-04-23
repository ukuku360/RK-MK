from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image


SOURCE = Path(
    "/Users/nmduk/PROJECTS/RK_Events_demo_version/ROOMINGKOS BRANDING/Logo/PNG/Copy of RK_Brandmark_RED_CMYK.png"
)
OUTPUT_DIR = Path(
    "/Users/nmduk/PROJECTS/RK_Events_demo_version/src/assets/roomingkos-wordmark-slices"
)
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"


def find_components(image: Image.Image) -> tuple[tuple[int, int, int, int], list[dict[str, int]]]:
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()

    xs: list[int] = []
    ys: list[int] = []
    for y in range(height):
        for x in range(width):
            if pixels[x, y] > 0:
                xs.append(x)
                ys.append(y)

    if not xs:
        raise RuntimeError("No visible pixels found in source asset.")

    overall = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)

    visited = bytearray(width * height)
    components: list[dict[str, int]] = []

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            if visited[idx] or pixels[x, y] == 0:
                continue

            queue = deque([(x, y)])
            visited[idx] = 1
            min_x = max_x = x
            min_y = max_y = y
            area = 0

            while queue:
                current_x, current_y = queue.popleft()
                area += 1
                min_x = min(min_x, current_x)
                max_x = max(max_x, current_x)
                min_y = min(min_y, current_y)
                max_y = max(max_y, current_y)

                for next_y in range(max(0, current_y - 1), min(height, current_y + 2)):
                    row_offset = next_y * width
                    for next_x in range(max(0, current_x - 1), min(width, current_x + 2)):
                        next_idx = row_offset + next_x
                        if visited[next_idx] or pixels[next_x, next_y] == 0:
                            continue

                        visited[next_idx] = 1
                        queue.append((next_x, next_y))

            components.append(
                {
                    "area": area,
                    "x": min_x,
                    "y": min_y,
                    "width": max_x - min_x + 1,
                    "height": max_y - min_y + 1,
                }
            )

    components.sort(key=lambda component: (component["x"], component["y"]))
    return overall, components


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    overall, components = find_components(image)
    origin_x, origin_y, end_x, end_y = overall
    total_width = end_x - origin_x
    total_height = end_y - origin_y

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest = {
        "source": str(SOURCE),
        "bounds": {
            "x": origin_x,
            "y": origin_y,
            "width": total_width,
            "height": total_height,
        },
        "components": [],
    }

    for index, component in enumerate(components, start=1):
        x = component["x"]
        y = component["y"]
        width = component["width"]
        height = component["height"]
        filename = f"slice-{index:02d}.png"
        crop = image.crop((x, y, x + width, y + height))
        crop.save(OUTPUT_DIR / filename)

        manifest["components"].append(
            {
                "id": f"slice-{index:02d}",
                "file": filename,
                "order": index,
                "x": x - origin_x,
                "y": y - origin_y,
                "width": width,
                "height": height,
            }
        )

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(components)} slices to {OUTPUT_DIR}")
    print(f"Wrote manifest to {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
