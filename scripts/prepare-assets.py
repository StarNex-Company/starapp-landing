#!/usr/bin/env python3
"""Encode supplied StarApp assets, preserving all source images and composition.

Run with Pillow and NumPy. No external service, generative retouch, or destructive
source edits are involved. The vector mark traces the supplied brand silhouette.
"""
from collections import defaultdict
from hashlib import sha256
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Users/apple/Downloads')
DEST = ROOT / 'public' / 'assets'
DEST.mkdir(parents=True, exist_ok=True)
(ROOT / 'docs').mkdir(exist_ok=True)

ASSETS = [
    ('Cover_01.png', 'cover-tomorrow', (700, 1400), 'width'),
    ('Cover_02.png', 'cover-world-stage', (700, 1400), 'width'),
    ('Create_a_realistic_premium-style_onboarding_2K_20261009171758.jpg', 'creator-growth', (700, 1400), 'width'),
    ('Creator_interacting_with_smartph..._2K_20261009171854.jpg', 'creator-insights', (700, 1400), 'width'),
    ('Creator_using_smartphone_opportu..._2K_20261009171823.jpg', 'creator-opportunity', (700, 1400), 'width'),
    ('Creator_using_smartphone_social_app_2K_20261009171353.jpg', 'creator-community', (700, 1400), 'width'),
    ('Flyer_01.png', 'flyer-global-stage', (1000,), 'longest'),
    ('Flyer_02.png', 'flyer-every-talent', (1000,), 'longest'),
    ('Flyer_03.png', 'flyer-talents-shine', (1000,), 'longest'),
    ('Flyer_04.png', 'flyer-new-week', (1000,), 'longest'),
    ('Flyer_05.png', 'flyer-friday', (1000,), 'longest'),
    ('Flyer_07.png', 'flyer-coming-soon', (1000,), 'longest'),
    ('Profile_00.png', 'brand-cobalt', (1000,), 'longest'),
    ('Profile_01.png', 'brand-silver', (1000,), 'longest'),
    ('Profile_02.png', 'brand-sculpture', (1000,), 'longest'),
]

manifest = {'description': 'User-supplied StarApp brand assets. WebP derivatives preserve the full source composition.', 'images': []}
for filename, slug, sizes, sizing in ASSETS:
    source_path = SOURCE / filename
    with Image.open(source_path) as source:
        source = ImageOps.exif_transpose(source).convert('RGB')
        item = {'source': str(source_path), 'sourceSha256': sha256(source_path.read_bytes()).hexdigest(), 'sourceWidth': source.width, 'sourceHeight': source.height, 'name': slug, 'variants': []}
        for target in sizes:
            ratio = min(1, target / (source.width if sizing == 'width' else max(source.size)))
            size = tuple(round(n * ratio) for n in source.size)
            resized = source.resize(size, Image.Resampling.LANCZOS)
            outname = f'{slug}-{target}.webp' if len(sizes) > 1 else f'{slug}.webp'
            path = DEST / outname
            resized.save(path, 'WEBP', quality=87 if sizing == 'width' else 85, method=6)
            item['variants'].append({'file': f'/assets/{outname}', 'width': size[0], 'height': size[1], 'bytes': path.stat().st_size})
        manifest['images'].append(item)


def simplify(points, epsilon=1.5):
    """Ramer–Douglas–Peucker simplification for the optional polygon export."""
    if len(points) < 3:
        return points
    start, end = points[0], points[-1]
    chord = end - start
    norm = np.linalg.norm(chord)
    if norm < 1e-9:
        distances = np.linalg.norm(points - start, axis=1)
    else:
        delta = points - start
        distances = np.abs(chord[0] * delta[:, 1] - chord[1] * delta[:, 0]) / norm
    index = int(np.argmax(distances))
    if distances[index] > epsilon:
        return np.vstack((simplify(points[:index + 1], epsilon)[:-1], simplify(points[index:], epsilon)))
    return np.array([start, end])


def unit(v):
    return v / max(np.linalg.norm(v), 1e-12)


def bezier_at(curve, t):
    t = np.asarray(t)[:, None]
    return (1 - t) ** 3 * curve[0] + 3 * (1 - t) ** 2 * t * curve[1] + 3 * (1 - t) * t ** 2 * curve[2] + t ** 3 * curve[3]


def fit_curve(points, left, right, error=1.1):
    """Least-squares cubic fitting of a pixel contour with bounded source error."""
    if len(points) == 2:
        distance = np.linalg.norm(points[-1] - points[0]) / 3
        return [np.array([points[0], points[0] + left * distance, points[-1] + right * distance, points[-1]])]
    distances = np.r_[0, np.cumsum(np.linalg.norm(np.diff(points, axis=0), axis=1))]
    t = distances / max(distances[-1], 1e-12)
    a = 3 * (1 - t) ** 2 * t
    b = 3 * (1 - t) * t ** 2
    A = np.stack((a[:, None] * left, b[:, None] * right), axis=2)
    base = ((1 - t) ** 3 + a)[:, None] * points[0] + (b + t ** 3)[:, None] * points[-1]
    alpha, *_ = np.linalg.lstsq(A.reshape(-1, 2), (points - base).reshape(-1), rcond=None)
    chord = np.linalg.norm(points[-1] - points[0])
    if min(alpha) < chord * 1e-6:
        alpha = [chord / 3, chord / 3]
    curve = np.array([points[0], points[0] + left * alpha[0], points[-1] + right * alpha[1], points[-1]])
    deviations = np.linalg.norm(bezier_at(curve, t) - points, axis=1)
    split = int(np.argmax(deviations))
    if deviations[split] < error:
        return [curve]
    split = max(1, min(len(points) - 2, split))
    tangent = unit(points[max(0, split - 2)] - points[min(len(points) - 1, split + 2)])
    return fit_curve(points[:split + 1], left, tangent, error) + fit_curve(points[split:], -tangent, right, error)


# Trace the large cobalt mark, excluding the caption and decorative background.
# The main component is the brand itself; tiny antialias islands are discarded.
image = np.asarray(Image.open(SOURCE / 'Profile_00.png').convert('RGB')).astype(int)
r, g, b = image[:, :, 0], image[:, :, 1], image[:, :, 2]
y, x = np.indices(r.shape)
mask = (r < 140) & (b - r > 60) & (b > g * 1.2) & (x > 270) & (x < 1000) & (y > 265) & (y < 880)
pending = set(map(tuple, np.argwhere(mask)))
components = []
while pending:
    point = pending.pop()
    component, stack = {point}, [point]
    while stack:
        py, px = stack.pop()
        for adjacent in ((py + 1, px), (py - 1, px), (py, px + 1), (py, px - 1)):
            if adjacent in pending:
                pending.remove(adjacent)
                component.add(adjacent)
                stack.append(adjacent)
    components.append(component)
component = max(components, key=len)

# Clockwise outer edges, counterclockwise holes; SVGLoader can extrude directly.
edges = defaultdict(list)
for py, px in component:
    if (py - 1, px) not in component:
        edges[(px, py)].append((px + 1, py))
    if (py, px + 1) not in component:
        edges[(px + 1, py)].append((px + 1, py + 1))
    if (py + 1, px) not in component:
        edges[(px + 1, py + 1)].append((px, py + 1))
    if (py, px - 1) not in component:
        edges[(px, py + 1)].append((px, py))

loops = []
while edges:
    start = min(edges)
    loop, cursor = [start], start
    while True:
        endpoint = edges[cursor].pop()
        if not edges[cursor]:
            del edges[cursor]
        loop.append(endpoint)
        cursor = endpoint
        if cursor == start:
            break
    area = abs(sum(loop[i][0] * loop[i+1][1] - loop[i+1][0] * loop[i][1] for i in range(len(loop)-1))) / 2
    if area > 100:
        loops.append(np.asarray(loop, dtype=float))

min_y, min_x = np.min(np.asarray(list(component)), axis=0)
max_y, max_x = np.max(np.asarray(list(component)), axis=0)
width, height = int(max_x - min_x + 1), int(max_y - min_y + 1)
paths = []
polygons = []
curve_count = 0
for loop in sorted(loops, key=len, reverse=True):
    # Split the closed ring away from the identical first/last point before RDP.
    pivot = len(loop) // 2
    simplified = np.vstack((simplify(loop[:pivot + 1])[:-1], simplify(loop[pivot:])))
    simplified -= np.asarray([min_x, min_y])
    polygons.append(simplified.tolist())
    # Smooth raster quantization across a five-pixel window, then fit cubic curves.
    ring = loop[:-1]
    smoothed = sum(np.roll(ring, shift, axis=0) for shift in range(-2, 3)) / 5
    smoothed = np.vstack((smoothed, smoothed[0])) - np.asarray([min_x, min_y])
    pivot = len(smoothed) // 2
    curves = []
    for part in (smoothed[:pivot + 1], smoothed[pivot:]):
        curves.extend(fit_curve(part, unit(part[min(4, len(part)-1)]-part[0]), unit(part[max(0, len(part)-5)]-part[-1])))
    curve_count += len(curves)
    def fmt(point):
        return f'{point[0]:.2f},{point[1]:.2f}'
    paths.append('M' + fmt(curves[0][0]) + ' ' + ' '.join('C' + ' '.join(fmt(p) for p in c[1:]) for c in curves) + ' Z')
path_data = ' '.join(paths)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" fill="currentColor"><path d="{path_data}" fill-rule="nonzero"/></svg>\n'
(DEST / 'brand-mark.svg').write_text(svg)
(DEST / 'brand-mark-blue.svg').write_text(svg.replace('fill="currentColor"', 'fill="#1851f5"'))
(DEST / 'logo-shape.json').write_text(json.dumps({'viewBox': [0, 0, width, height], 'path': path_data, 'polygons': polygons, 'source': 'Profile_00.png', 'method': 'Dominant cobalt component contour; five-pixel boundary smoothing and least-squares cubic fit.'}, indent=2) + '\n')
manifest['brandMark'] = {'file': '/assets/brand-mark.svg', 'blueFile': '/assets/brand-mark-blue.svg', 'shapeFile': '/assets/logo-shape.json', 'viewBox': [0, 0, width, height], 'contours': len(paths), 'bezierSegments': curve_count, 'source': 'Profile_00.png'}
(ROOT / 'docs' / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'images': len(manifest['images']), 'totalWebpBytes': sum(v['bytes'] for i in manifest['images'] for v in i['variants']), 'brandMark': manifest['brandMark']}, indent=2))
