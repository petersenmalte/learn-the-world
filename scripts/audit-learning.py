#!/usr/bin/env python3
"""Optional independent spatial audit. Requires shapely==2.1.2.
Run with a Python environment containing Shapely; no runtime app dependency.
"""
import gzip
import json
from pathlib import Path
from shapely.geometry import Point, shape
from shapely.strtree import STRtree
from shapely.validation import explain_validity

root = Path(__file__).resolve().parent.parent
features = json.loads(gzip.decompress((root / 'public/data/learning/countries.geojson.gz').read_bytes()))['features']
catalogue = json.loads((root / 'data/learning/catalogue.json').read_text())
ids = [f['properties']['id'] for f in features]
geometries = [shape(f['geometry']) for f in features]
invalid = {ids[i]: explain_validity(g) for i, g in enumerate(geometries) if not g.is_valid}
assert not invalid, invalid
index = STRtree(geometries)
overlaps = []
for i, geometry in enumerate(geometries):
    for j in index.query(geometry):
        if j > i and geometry.intersection(geometries[j]).area > 1e-10:
            overlaps.append([ids[i], ids[j]])
assert not overlaps, overlaps
by_id = dict(zip(ids, geometries))
offsets = []
for country in catalogue:
    anchor = Point(country['anchor'])
    owners = [ids[i] for i in index.query(anchor) if geometries[i].contains(anchor)]
    assert owners == [country['id']], (country['id'], owners)
    for capital in country['capitals']:
        distance = by_id[country['id']].distance(Point(capital['coordinates'])) * 111.32
        if distance:
            offsets.append({'country': country['id'], 'capital': capital['name'], 'approxOffsetKm': round(distance, 3)})
reviewed = json.loads((root / 'data/learning/geometry-audit.json').read_text())
assert offsets == reviewed['capitalOffsets'], 'Capital/outline offsets changed: review the new evidence'
print(f'{len(features)} valid, non-overlapping map units; all 196 anchors uniquely contained; 13 documented capital offsets unchanged.')
