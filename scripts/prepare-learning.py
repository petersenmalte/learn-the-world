#!/usr/bin/env python3
"""Rebuild frozen learning assets without changing the reviewed catalogue.

Normal builds need no downloads. A missing source is downloaded at its pinned
revision and must match the reviewed SHA-256. Updating facts is an editorial
operation: update data/learning/catalogue.json, reference evidence and manifest,
then regenerate and run pnpm test. No country outlines are drawn or simplified. The documented zero-area Egypt topology repair is applied from its frozen GEOS result.
"""
import gzip
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / 'data/learning/manifest.json').read_text())
catalogue = json.loads((ROOT / 'data/learning/catalogue.json').read_text())
source = ROOT / 'data/source/learning-countries-deu.geojson'
reference = manifest['sources'][1]
if not source.exists():
    source.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(reference['url'], timeout=90) as response:
        raw = response.read()
    if hashlib.sha256(raw).hexdigest() != reference['sha256']:
        raise ValueError('Downloaded Natural Earth source does not match the reviewed checksum')
    source.write_bytes(raw)
raw = source.read_bytes()
assert hashlib.sha256(raw).hexdigest() == reference['sha256'], 'Natural Earth source changed'
by_geometry = {country['geometryId']: country['id'] for country in catalogue}
assert len(by_geometry) == manifest['countryCount'] == len(catalogue)
assert sum(len(c['capitals']) for c in catalogue) == manifest['capitalCount']
repairs = json.loads((ROOT / 'data/learning/geometry-repairs.json').read_text())
features = []
for feature in json.loads(raw)['features']:
    geometry_id = feature['properties']['ADM0_A3']
    ident = by_geometry.get(geometry_id, 'context-' + geometry_id)
    features.append({'type': 'Feature', 'id': ident,
                     'properties': {'id': ident, 'name': feature['properties']['NAME_DE'],
                                    'playable': geometry_id in by_geometry},
                     'geometry': repairs.get(geometry_id, {}).get('geometry', feature['geometry'])})
assert {f['id'] for f in features if f['properties']['playable']} == {c['id'] for c in catalogue}
output = ROOT / 'public/data/learning'
output.mkdir(parents=True, exist_ok=True)
(output / 'catalogue.json').write_text(json.dumps(catalogue, ensure_ascii=False, separators=(',', ':')))
geometry = json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')).encode()
(output / 'countries.geojson.gz').write_bytes(gzip.compress(geometry, mtime=0))
print(f"Prepared {len(catalogue)} countries and {manifest['capitalCount']} capital targets.")
