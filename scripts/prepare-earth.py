"""Reproject NASA Blue Marble into self-hosted Web Mercator XYZ tiles.

Usage: python3 scripts/prepare-earth.py /path/to/world.topo.bathy.200412.3x5400x2700.jpg
Requires Pillow. Source, license and checksum: data/EARTH.md.
"""
import hashlib
import math
import sys
from pathlib import Path
from PIL import Image

source = Path(sys.argv[1])
image = Image.open(source).convert('RGB')
if image.size != (5400, 2700):
    raise ValueError('Expected the documented 5400 × 2700 NASA source')
root = Path(__file__).resolve().parents[1] / 'public' / 'earth'
tile_size = 512
for zoom in range(4):
    count = 2 ** zoom
    size = tile_size * count
    # Inverse Mercator: map each output scanline to latitude in the source.
    # Transform the whole level before cutting it to keep tile edges continuous.
    mesh = []
    for row in range(size):
        def source_y(y):
            latitude = math.atan(math.sinh(math.pi * (1 - 2 * y / size)))
            return (0.5 - latitude / math.pi) * image.height
        top, bottom = source_y(row), source_y(row + 1)
        mesh.append(((0, row, size, row + 1), (0, top, 0, bottom, image.width, bottom, image.width, top)))
    level = image.transform((size, size), Image.Transform.MESH, mesh, Image.Resampling.BICUBIC)
    for x in range(count):
        directory = root / str(zoom) / str(x)
        directory.mkdir(parents=True, exist_ok=True)
        for y in range(count):
            level.crop((x * tile_size, y * tile_size, (x + 1) * tile_size, (y + 1) * tile_size)).save(directory / f'{y}.webp', quality=85, method=6)
print('Source SHA256:', hashlib.sha256(source.read_bytes()).hexdigest())
tiles = list(root.rglob('*.webp'))
print(f'{len(tiles)} tiles, {sum(tile.stat().st_size for tile in tiles):,} bytes')
