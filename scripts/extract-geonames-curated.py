"""Freeze the small, well-known subset of the worldwide GeoNames catalogue.

The full catalogue (2.09 million records, commit 8f94e2e) was replaced by a curated atlas. GeoNames
records only contribute where Natural Earth has no equivalent: volcanoes, glaciers, deserts, seas and
the best-known peak of countries without a Natural Earth peak. Prominence is the stored `rank`
(2 = most alternate-language names, 8 = fewest), the only importance signal in that extract.

Usage (Python 3 stdlib): check out 8f94e2e, then
  python3 scripts/extract-geonames-curated.py /path/to/old/public/data
"""
import collections, gzip, json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'public/data'
# Highest (worst) rank kept per category. Peaks are only a fallback, so the bar is strict.
MAX_RANK = {'volcanoes': 5, 'glaciers': 5, 'deserts': 4, 'seas': 3, 'mountains': 3}
catalogue = json.loads((SRC / 'catalogue.json').read_text())
country_names = catalogue['countries']  # ISO2 -> English name
iso_by_name = {name: iso for iso, name in country_names.items()}
out = []
for p in json.loads((SRC / 'places.json').read_text()):
    if p['source'] == 'GeoNames' and p['category'] in MAX_RANK and p['rank'] <= MAX_RANK[p['category']]:
        out.append({'id': p['id'], 'name': p['name'], 'category': p['category'], 'coordinates': p['coordinates'], 'aliases': p['aliases'],
                    'region': p['region'], 'cc': iso_by_name.get(p['region'], ''), 'rank': p['rank'], 'sourceId': p['sourceId'], 'featureCode': p['featureCode']})
for shard in sorted((SRC / 'catalogue/map').glob('mountains-*.ndjson.gz')):
    with gzip.open(shard, 'rt', encoding='utf8') as lines:
        for line in lines:
            gid, name, lng, lat, cc, code, rank, _ = json.loads(line)
            if rank <= MAX_RANK['mountains']:
                out.append({'id': f'mountains-gn-{gid}', 'name': name, 'category': 'mountains', 'coordinates': [lng, lat], 'aliases': [], 'region': country_names.get(cc, ''),
                            'cc': cc, 'rank': rank, 'sourceId': str(gid), 'featureCode': code})
out.sort(key=lambda r: (r['category'], r['rank'], r['name'], r['id']))
(ROOT / 'data/geonames-curated.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
print(dict(collections.Counter(r['category'] for r in out)), 'records')
