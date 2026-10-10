#!/usr/bin/env python3
"""Regenerate StarApp's QR assets from lib/share-config.json.

From a clean checkout, use Python 3.10+ and run these commands from the project
root (macOS/Linux). The virtual environment is kept in the ignored runtime folder:
    python3 -m venv .sites-runtime/qr-venv
    .sites-runtime/qr-venv/bin/python -m pip install qrcode==8.2 Pillow==12.3.0 zxing-cpp==3.1.1
    .sites-runtime/qr-venv/bin/python scripts/generate-qr.py

These are the versions used for the verified assets. They are local build tools,
not website dependencies. On Windows, replace bin/python with Scripts/python.exe.

To regenerate and decode-check the PNG at its original and 240px display sizes:
    .sites-runtime/qr-venv/bin/python scripts/generate-qr.py --verify

Optionally pass --svg-raster PATH to also decode an independently rasterized SVG.
Verification saves .sites-runtime/qa/qr-decode.json and prints only that report.
The code contains no embedded logo, uses Q error correction, and keeps a white
four-module quiet zone. Change the URL in the shared config before regenerating;
never edit the output images manually.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw
import qrcode


ROOT = Path(__file__).resolve().parents[1]
NAVY = "#001f6e"
PIXELS_PER_MODULE = 16
QUIET_ZONE = 4


def generate() -> tuple[str, Path, Path, int]:
    config = json.loads((ROOT / "lib/share-config.json").read_text())
    target = config["qrUrl"]
    if not isinstance(target, str) or not target.startswith("https://"):
        raise ValueError("qrUrl must be an absolute HTTPS URL")

    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_Q,
        border=QUIET_ZONE,
        box_size=PIXELS_PER_MODULE,
    )
    qr.add_data(target)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    modules = len(matrix)
    pixels = modules * PIXELS_PER_MODULE
    image = Image.new("RGB", (pixels, pixels), "white")
    drawing = ImageDraw.Draw(image)
    paths = []
    for y, row in enumerate(matrix):
        for x, dark in enumerate(row):
            if not dark:
                continue
            drawing.rectangle(
                (
                    x * PIXELS_PER_MODULE,
                    y * PIXELS_PER_MODULE,
                    (x + 1) * PIXELS_PER_MODULE - 1,
                    (y + 1) * PIXELS_PER_MODULE - 1,
                ),
                fill=NAVY,
            )
            paths.append(f"M{x} {y}h1v1h-1z")

    assets = ROOT / "public/assets"
    assets.mkdir(parents=True, exist_ok=True)
    png = assets / "starapp-early-access-qr.png"
    svg = assets / "starapp-early-access-qr.svg"
    image.save(png, optimize=False)
    svg.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {modules} {modules}" '
        f'width="{pixels}" height="{pixels}" shape-rendering="crispEdges" role="img" '
        'aria-labelledby="qr-title qr-description">\n'
        '<title id="qr-title">Scan to open StarApp early access</title>\n'
        f'<desc id="qr-description">{escape(target)}</desc>\n'
        f'<rect width="{modules}" height="{modules}" fill="#fff"/>\n'
        f'<path fill="{NAVY}" d="{"".join(paths)}"/>\n'
        '</svg>\n'
    )
    return target, png, svg, modules


def verify(target: str, png: Path, svg: Path, modules: int, raster: str | None) -> dict:
    import zxingcpp

    report = {
        "target": target,
        "errorCorrection": "Q",
        "quietZoneModules": QUIET_ZONE,
        "foreground": NAVY,
        "background": "#ffffff",
        "moduleCountIncludingQuietZone": modules,
        "checks": [],
        "sha256": {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (png, svg)
        },
    }
    original = Image.open(png).convert("RGB")
    images = [
        ("png-original", original),
        ("png-240px", original.resize((240, 240), Image.Resampling.LANCZOS)),
    ]
    if raster:
        images.append(("svg-raster-240px", Image.open(raster).convert("RGB")))
    for label, image in images:
        result = zxingcpp.read_barcode(image)
        decoded = result.text if result else None
        report["checks"].append(
            {"asset": label, "width": image.width, "height": image.height,
             "decoded": decoded, "passed": decoded == target}
        )
    report["passed"] = all(check["passed"] for check in report["checks"])
    qa = ROOT / ".sites-runtime/qa"
    qa.mkdir(parents=True, exist_ok=True)
    (qa / "qr-decode.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--svg-raster", help="Path to an independently rasterized SVG")
    args = parser.parse_args()
    target, png, svg, modules = generate()
    if args.verify:
        report = verify(target, png, svg, modules, args.svg_raster)
        print(json.dumps(report, indent=2))
        if not report["passed"]:
            raise SystemExit("QR verification failed")


if __name__ == "__main__":
    main()
