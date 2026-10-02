"""Rebuild the checked-in web data with Python 3 stdlib; no runtime data services.

The atlas shows what everyone should know, not every record on Earth:
 * Natural Earth (10m) supplies the globe, curated importance ranks, river lengths, lake areas and peak elevations.
 * Rivers, lakes and peaks: the few largest in each country plus the world-famous ones.
 * Mountain ranges, deserts, seas: Natural Earth's higher-ranked regions.
 * A frozen GeoNames subset (data/geonames-curated.json) adds volcanoes, glaciers and the best-known peak of
   countries without a Natural Earth peak; data/geonames-snapshot.json holds the capitals.
"""
import collections, gzip, hashlib, json, math, pathlib, unicodedata, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / 'data/source'; OUT = ROOT / 'public/data'; SRC.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
REV = 'ca96624a56bd078437bca8184e78163e5039ad19'
FILES = {'countries50': 'ne_50m_admin_0_countries', 'countries10': 'ne_10m_admin_0_countries',
         'elevations': 'ne_10m_geography_regions_elevation_points', 'physical-areas': 'ne_10m_geography_regions_polys',
         'rivers10': 'ne_10m_rivers_lake_centerlines', 'rivers-europe': 'ne_10m_rivers_europe', 'rivers-north-america': 'ne_10m_rivers_north_america',
         'lakes10': 'ne_10m_lakes', 'lakes-europe': 'ne_10m_lakes_europe', 'lakes-north-america': 'ne_10m_lakes_north_america',
         'marine10': 'ne_10m_geography_marine_polys', 'glaciated': 'ne_10m_glaciated_areas'}
# Selection rules. Natural Earth `scalerank`: 0/1 = most important.
PER_COUNTRY = 3                      # rivers, lakes and peaks kept per country (largest/longest/highest)
WORLD_RIVER_RANK, WORLD_LAKE_RANK, WORLD_PEAK_RANK = 3, 2, 4
MIN_RIVER_KM, MIN_RIVER_TOTAL_KM, MIN_LAKE_KM2, WORLD_RIVER_KM = 40, 150, 60, 800  # trivial candidates never fill a country's quota; "world" rivers must be long
RANGE_RANK, DESERT_RANK, SEA_RANK, GLACIER_RANK, VOLCANO_GN_RANK = 3, 3, 3, 1, 2
RIVER_CLASSES = {'River', 'Lake Centerline'}
LAKE_CLASSES = {'Lake', 'Alkaline Lake', 'Reservoir'}
# Editorial fixes for Natural Earth river names: common English names (merging duplicate entries), repaired names,
# and entries that are headwater reaches, delta arms or side channels of a better-known river.
RIVER_RENAME = {'Rhein': 'Rhine', 'Amazonas': 'Amazon', 'Maas': 'Meuse', 'Schelde': 'Scheldt', 'Ertis': 'Irtysh', 'Firat': 'Euphrates', 'Al Furat': 'Euphrates', 'Dicle': 'Tigris', 'Huang': 'Yellow',
                'Tajo': 'Tagus', 'Tejo': 'Tagus', 'Dnipro': 'Dnieper', 'Daugava': 'Western Dvina', 'Tevere': 'Tiber', 'Byarezina': 'Berezina', 'Ayeyarwady': 'Irrawaddy', 'Sûre': 'Sauer', 'Nu': 'Salween', 'Herlen': 'Kerulen',
                'Jinsha': 'Yangtze', 'Chang Jiang': 'Yangtze', 'Lancang': 'Mekong', 'Heilong Jiang': 'Amur', 'Bahr el Jebel': 'Nile', 'El Bahr el Abyad': 'Nile', 'El Bahr el Azraq': 'Blue Nile', 'Drau': 'Drava', 'Zapadnaya Dvina': 'Western Dvina', 'Glma': 'Glomma', 'Kiz?lirmak': 'Kızılırmak', 'Shabeelle': 'Shebelle', 'Shebele': 'Shebelle', 'Donau': 'Danube'}
RIVER_EXCLUDE = {'Tuotuo', 'Tongtian', 'Damqogkanbab', 'Za', 'Dihang', 'Madison', 'Ideriyn', 'Mountain Nile', 'Victoria Nile', 'Albert Nile', 'Sapt', 'Shatt al Hillah', 'Santa Mara', 'Chirrip del Atlntico', 'Ro Grande de Matagalpa'}
LAKE_RENAME = {'Bodensee': 'Lake Constance', 'Neuchâtel': 'Lake Neuchâtel', 'Vierwaldstättersee': 'Lake Lucerne', 'Lago di Garda': 'Lake Garda', 'Lago di Como': 'Lake Como', 'Lago Titicaca': 'Lake Titicaca', 'Biwa Ko': 'Lake Biwa',
               'Danau Toba': 'Lake Toba', 'Lago de Nicaragua': 'Lake Nicaragua', 'Lago de Managua': 'Lake Managua', 'Qinghai Hu': 'Qinghai Lake', 'Tai Hu': 'Lake Tai', 'Neusiedlersee': 'Lake Neusiedl', 'Vänern': 'Lake Vänern', 'Vättern': 'Lake Vättern', 'Mälaren': 'Lake Mälaren'}
LAKE_EXCLUDE = {'McLeod Bay', 'Yalpug and Kugurlui', 'Qadisiyah', 'Molochnyy Liman', 'Kenohan Jempang', 'Laguna Ragaguado'}
LAKE_RENAME.update({'Inarijrvi': 'Lake Inari', 'Hongze Hu': 'Lake Hongze', 'Uvs Nuur': 'Uvs Lake', 'Khövsgöl Nuur': 'Lake Khövsgöl', 'Har Us Nuur': 'Har-Us Lake', 'Banggong Co': 'Pangong Lake', 'Päijänne': 'Lake Päijänne'})
DESERT_EXCLUDE = {'punjab', 'sahah ye regi mazanpat', 'huysiyn govi', 'nomingiyn govi', 'sinai peninsula'}
GLACIER_KEEP = {'grosser aletschgletscher', 'pasterze'}  # famous glaciers GeoNames ranks lower than obscure Arctic ones
RIVER_NOISE = ('branch', 'protoka', 'bratul', 'delta', 'canal')
VOLCANO_NAMES = {'mauna kea', 'mauna loa', 'monte etna', 'fuji', 'mount erebus', 'pico del teide', 'klyuchevskaya sopka'}
manifest = []

def read(key):
    p = SRC / (key + '.geojson'); url = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{REV}/geojson/{FILES[key]}.geojson'
    if not p.exists(): urllib.request.urlretrieve(url, p)
    manifest.append({'file': key, 'url': url, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})
    return json.loads(p.read_text())['features']
def write(name, data): (OUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
def low(f): return {k.lower(): v for k, v in f['properties'].items()}
def rnd(v, nd):
    if isinstance(v, list): return [rnd(x, nd) for x in v]
    return round(v, nd) if isinstance(v, float) else v
def norm(s): return ' '.join(''.join(c if c.isalnum() else ' ' for c in ''.join(ch for ch in unicodedata.normalize('NFD', s) if not unicodedata.category(ch).startswith('M')).lower()).split())
def lines_of(g): return [g['coordinates']] if g['type'] == 'LineString' else g['coordinates'] if g['type'] == 'MultiLineString' else []
def polys_of(g): return [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates'] if g['type'] == 'MultiPolygon' else []
def km(a, b):
    p, q = math.radians(a[1]), math.radians(b[1]); h = math.sin((q - p) / 2) ** 2 + math.cos(p) * math.cos(q) * math.sin(math.radians(b[0] - a[0]) / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))
def ring_area(ring):  # km², local equirectangular projection; fine for ranking
    k = math.cos(math.radians(sum(p[1] for p in ring) / len(ring))) * 111.32
    return abs(sum(ring[i][0] * ring[(i + 1) % len(ring)][1] - ring[(i + 1) % len(ring)][0] * ring[i][1] for i in range(len(ring)))) / 2 * k * 110.57
def poly_area(poly): return ring_area(poly[0]) - sum(ring_area(h) for h in poly[1:])
def centroid(ring):
    a = cx = cy = 0
    for i in range(len(ring)):
        (x0, y0), (x1, y1) = ring[i], ring[(i + 1) % len(ring)]; c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    return [cx / (3 * a), cy / (3 * a)] if a else ring[0]
def bbox_center(coords):
    xs = [p[0] for p in coords]; ys = [p[1] for p in coords]
    if max(xs) - min(xs) > 180: xs = [x + 360 if x < 0 else x for x in xs]
    return [round(((min(xs) + max(xs)) / 2 + 180) % 360 - 180, 4), round((min(ys) + max(ys)) / 2, 4)]
def zoom(rank): return {0: 1.6, 1: 1.8, 2: 2.2, 3: 2.6, 4: 3.0, 5: 3.4, 6: 3.8}.get(int(rank), 4.2)
def tidy(name):
    name = ' '.join(name.split())
    if name.isupper(): name = name.title()
    for short, full in ((' Mts.', ' Mountains'), (' Ra.', ' Range'), (' Res.', ' Reservoir'), ('Cord. ', 'Cordillera '), ('Desierto De ', 'Desierto de ')): name = name.replace(short, full)
    return name
def names(p, english=True):
    name = tidy((p.get('name_en') if english else None) or p.get('name'))
    raw = [p.get('name') if english else None, p.get('name_en') if not english else None, p.get('name_alt'), p.get('namealt'), p.get('name_de'), p.get('name_fr'), p.get('name_es'), p.get('name_it'), p.get('name_pt'), p.get('name_nl')]
    return name, list(dict.fromkeys(a.strip() for r in raw if r for a in r.split(';') if a.strip() and a.strip() != name))[:8]

class Locator:
    """Country lookup for sampled points. Outer rings only, thinned: precision of a few km is enough for ranking."""
    def __init__(self, features):
        self.parts = []; self.grid = collections.defaultdict(list); self.info = {}
        for f in features:
            p = low(f); key = p['adm0_a3']; self.info[key] = (p['name_en'] or p['admin'], p['iso_a2_eh'])
            for poly in polys_of(f['geometry']):
                ring = poly[0][::max(1, len(poly[0]) // 1200)]
                xs = [q[0] for q in ring]; ys = [q[1] for q in ring]; part = (min(xs), min(ys), max(xs), max(ys), ring, key); self.parts.append(part)
                for gx in range(int(part[0] // 10), int(part[2] // 10) + 1):
                    for gy in range(int(part[1] // 10), int(part[3] // 10) + 1): self.grid[(gx, gy)].append(part)
    def find(self, x, y):
        for x0, y0, x1, y1, ring, key in self.grid.get((int(x // 10), int(y // 10)), ()):
            if x0 <= x <= x1 and y0 <= y <= y1:
                inside = False; j = len(ring) - 1
                for i in range(len(ring)):
                    xi, yi = ring[i]; xj, yj = ring[j]
                    if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: inside = not inside
                    j = i
                if inside: return key
        return None

def samples(points, n):
    step = max(1, len(points) // n); return points[::step]
def overlap(a, b, pad=1.5): return a[0] - pad <= b[2] and b[0] - pad <= a[2] and a[1] - pad <= b[3] and b[1] - pad <= a[3]
def cluster(items):
    """Merge same-named features whose boxes touch (a river's segments); distinct rivers sharing a name stay apart."""
    groups = collections.defaultdict(list)
    for it in items: groups[norm(it['name'])].append(it)
    out = []
    for members in groups.values():
        clusters = []
        for it in members:
            hit = [c for c in clusters if overlap(c['box'], it['box'])]
            merged = {'items': [it], 'box': list(it['box'])}
            for c in hit:
                clusters.remove(c); merged['items'] += c['items']; merged['box'] = [min(merged['box'][0], c['box'][0]), min(merged['box'][1], c['box'][1]), max(merged['box'][2], c['box'][2]), max(merged['box'][3], c['box'][3])]
            clusters.append(merged)
        out += [c['items'] for c in clusters]
    return out
def box_of(points): return [min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)]
def country_label(shares, locator, limit=3):
    """Names of the countries a feature touches, largest share first."""
    ranked = [locator.info[k][0] for k, _ in shares.most_common() if k in locator.info]
    return ' · '.join(ranked[:limit]) + (f' +{len(ranked) - limit}' if len(ranked) > limit else '') if ranked else 'International'
def pick(clusters, shares_of, world_rank, rank_of, limit, minimum, total_of=lambda c: 1e9, minimum_total=0):
    """World-famous clusters plus each country's top `limit` by size; value = earliest zoom at which the label shows."""
    chosen = {}
    for i, c in enumerate(clusters):
        if rank_of(c) <= world_rank: chosen[i] = zoom(rank_of(c))
    by_country = collections.defaultdict(list)
    for i, c in enumerate(clusters):
        if total_of(c) < minimum_total: continue
        for country, size in shares_of(c).items():
            if size >= minimum: by_country[country].append((size, i))
    for entries in by_country.values():
        for pos, (_, i) in enumerate(sorted(entries, reverse=True)[:limit]): chosen[i] = min(chosen.get(i, 99), 3.2 + 0.45 * pos)
    return chosen

places = []; countries = []; shapes = []
# --- Countries: 242 labelled map units, drawn with the sharper 10m boundaries -------------------------------------------------
c50 = read('countries50'); c10 = read('countries10'); locator = Locator(c10)
labelled = set()
for f in c50:
    p = low(f); id = 'countries-ne-' + str(p['ne_id']); labelled.add(p['ne_id']); name = p['name_en'] or p['name_long']
    places.append(dict(id=id, name=name, category='countries', coordinates=[p['label_x'], p['label_y']], aliases=list(filter(None, [p['name_long'], p['admin'], p['iso_a2'], p['iso_a3'], p['name_de'], p['name_fr'], p['name_es']])), region=p['continent'], rank=p['labelrank'], source='Natural Earth', sourceId=str(p['ne_id']), minZoom=max(0, p['min_label'] - 1.8)))
for f in c10:
    p = low(f); props = {'id': 'countries-ne-' + str(p['ne_id']), 'tone': p['mapcolor7']}
    if p['ne_id'] not in labelled: props['unlabelled'] = True  # tiny/disputed unit drawn but not listed
    countries.append({'type': 'Feature', 'id': props['id'], 'properties': props, 'geometry': {'type': f['geometry']['type'], 'coordinates': rnd(f['geometry']['coordinates'], 3)}})
# --- Capitals (frozen GeoNames PPLC extract) ----------------------------------------------------------------------------------
for p in json.loads((ROOT / 'data/geonames-snapshot.json').read_text()):
    if p['category'] == 'capitals': places.append({**p, 'id': 'capitals-' + p['id']})
curated = json.loads((ROOT / 'data/geonames-curated.json').read_text())
def gn_place(r, rank=None, min_zoom=None):
    return dict(id=r['id'], name=r['name'], category=r['category'], coordinates=[round(v, 4) for v in r['coordinates']], aliases=r['aliases'][:8], region=r['region'] or 'International', rank=rank or r['rank'], source='GeoNames', sourceId=r['sourceId'], featureCode=r['featureCode'], minZoom=min_zoom if min_zoom is not None else zoom(r['rank']))
def near(a, b, limit): return km(a, b) < limit

# --- Rivers ---------------------------------------------------------------------------------------------------------------------
items = []
for key in ['rivers10', 'rivers-europe', 'rivers-north-america']:
    for index, f in enumerate(read(key)):
        p = low(f)
        if not p.get('name') or not f.get('geometry') or p.get('featurecla') not in RIVER_CLASSES: continue
        river = ' '.join(p['name'].split()); river = RIVER_RENAME.get(river, river)
        if river in RIVER_EXCLUDE or any(w in river.lower() for w in RIVER_NOISE): continue
        lines = [l for l in lines_of(f['geometry']) if len(l) > 1]
        if not lines: continue
        pts = [q for l in lines for q in l]; length = sum(km(l[i], l[i + 1]) for l in lines for i in range(len(l) - 1))
        shares = collections.Counter(); picks = samples(pts, 12)
        for q in picks:
            c = locator.find(q[0], q[1])
            if c: shares[c] += length / len(picks)
        items.append(dict(name=river, props=p, lines=lines, length=length, shares=shares, box=box_of(pts), key=key, index=index, rank=p['scalerank'] if key == 'rivers10' else 7))
clusters = cluster(items)
def river_view(members):
    best = max({m['key'] for m in members}, key=lambda k: sum(m['length'] for m in members if m['key'] == k))  # richest single source: no double drawing
    use = [m for m in members if m['key'] == best]
    shares = collections.Counter()
    for m in use: shares.update(m['shares'])
    return dict(members=use, shares=shares, name=use[0]['name'], rank=min(m['rank'] for m in members), length=sum(m['length'] for m in use))
rivers = [river_view(c) for c in clusters]
for i, zoom_at in pick(rivers, lambda c: c['shares'], WORLD_RIVER_RANK, lambda c: c['rank'] if c['length'] >= WORLD_RIVER_KM else 99, PER_COUNTRY, MIN_RIVER_KM, lambda c: c['length'], MIN_RIVER_TOTAL_KM).items():
    r = rivers[i]; main = max(r['members'], key=lambda m: m['length']); line = max(main['lines'], key=len); name = r['name']; aliases = list(dict.fromkeys([a for a in [tidy(m['props']['name']) for m in r['members']] + names(main['props'])[1] if a != name]))[:8]
    id = f"rivers-ne-{main['key']}-{main['index']}"
    places.append(dict(id=id, name=name, category='rivers', coordinates=[round(v, 4) for v in line[len(line) // 2]], aliases=aliases, region=country_label(r['shares'], locator), rank=min(r['rank'], 6), source='Natural Earth', sourceId=str(main['props'].get('ne_id') or main['index']), featureCode=main['props']['featurecla'], minZoom=round(zoom_at, 2)))
    shapes.append({'type': 'Feature', 'properties': {'id': id, 'category': 'rivers'}, 'geometry': {'type': 'MultiLineString', 'coordinates': rnd([l for m in r['members'] for l in m['lines']], 3)}})

# --- Lakes ----------------------------------------------------------------------------------------------------------------------
items = []
for key in ['lakes10', 'lakes-europe', 'lakes-north-america']:
    for index, f in enumerate(read(key)):
        p = low(f)
        if not p.get('name') or not f.get('geometry') or p.get('featurecla') not in LAKE_CLASSES: continue
        polys = [q for q in polys_of(f['geometry']) if len(q[0]) > 3]
        if not polys: continue
        area = sum(poly_area(q) for q in polys); outer = max(polys, key=lambda q: len(q[0]))[0]; pts = [q for poly in polys for q in poly[0]]
        shares = collections.Counter(); picks = samples(outer, 10) + [centroid(outer)]
        for q in picks:
            c = locator.find(q[0], q[1])
            if c: shares[c] += area / len(picks)
        rank = p['scalerank'] if key == 'lakes10' else 7
        if p['featurecla'] == 'Reservoir' and rank > WORLD_LAKE_RANK: continue  # dams only when truly huge
        lake = tidy(p['name'])
        if '?' in lake or lake in LAKE_EXCLUDE: continue
        items.append(dict(name=LAKE_RENAME.get(lake, lake), props=p, polys=polys, length=area, shares=shares, box=box_of(pts), key=key, index=index, rank=rank, outer=outer))
lakes = []
for members in cluster(items):
    best = max({m['key'] for m in members}, key=lambda k: sum(m['length'] for m in members if m['key'] == k)); use = [m for m in members if m['key'] == best]
    shares = collections.Counter()
    for m in use: shares.update(m['shares'])
    lakes.append(dict(members=use, shares=shares, rank=min(m['rank'] for m in members), area=sum(m['length'] for m in use)))
for i, zoom_at in pick(lakes, lambda c: c['shares'], WORLD_LAKE_RANK, lambda c: c['rank'], PER_COUNTRY, 0, lambda c: c['area'], MIN_LAKE_KM2).items():
    l = lakes[i]; main = max(l['members'], key=lambda m: m['length']); name = main['name']; aliases = [a for a in names(main['props'], english=False)[1] + [tidy(main['props']['name'])] if a != name]; id = f"lakes-ne-{main['key']}-{main['index']}"
    places.append(dict(id=id, name=name, category='lakes', coordinates=[round(v, 4) for v in centroid(main['outer'])], aliases=aliases, region=country_label(l['shares'], locator), rank=min(l['rank'], 6), source='Natural Earth', sourceId=str(main['props'].get('ne_id') or main['index']), featureCode=main['props']['featurecla'], minZoom=round(zoom_at, 2)))
    shapes.append({'type': 'Feature', 'properties': {'id': id, 'category': 'lakes'}, 'geometry': {'type': 'MultiPolygon', 'coordinates': rnd([q for m in l['members'] for q in m['polys']], 3)}})

# --- Peaks and volcanoes ----------------------------------------------------------------------------------------------------------
peaks = []
for index, f in enumerate(read('elevations')):
    p = low(f)
    if p.get('featurecla') != 'mountain' or not p.get('name') or not f.get('geometry'): continue
    x, y = f['geometry']['coordinates']; country = locator.find(x, y)
    peaks.append(dict(props=p, index=index, xy=[x, y], country=country, elevation=p.get('elevation') or 0, rank=p['scalerank']))
volcano_peaks = [q for q in peaks if 'volc' in q['props']['name'].lower() or norm(q['props']['name']) in VOLCANO_NAMES]
mountains = [q for q in peaks if q not in volcano_peaks]
chosen = {}
for i, q in enumerate(mountains):
    if q['rank'] <= WORLD_PEAK_RANK: chosen[i] = zoom(q['rank'])
by_country = collections.defaultdict(list)
for i, q in enumerate(mountains):
    if q['country']: by_country[q['country']].append((q['elevation'], i))
for entries in by_country.values():
    for pos, (_, i) in enumerate(sorted(entries, reverse=True)[:PER_COUNTRY]): chosen[i] = min(chosen.get(i, 99), 3.2 + 0.45 * pos)
covered = {mountains[i]['country'] for i in chosen}
def ne_place(q, category, min_zoom):
    name, aliases = names(q['props']); where = locator.info[q['country']][0] if q['country'] else q['props'].get('region') or 'International'
    return dict(id=f"{category}-ne-elevations-{q['index']}", name=name, category=category, coordinates=[round(v, 4) for v in q['xy']], aliases=aliases, region=where, rank=min(q['rank'], 6), source='Natural Earth', sourceId=str(q['props'].get('ne_id') or q['index']), featureCode='mountain', minZoom=round(min_zoom, 2))
for i, z in chosen.items(): places.append(ne_place(mountains[i], 'mountains', z))
for q in volcano_peaks: places.append(ne_place(q, 'volcanoes', zoom(min(q['rank'], 4))))
# Countries without a Natural Earth peak: GeoNames' most widely known mountain (by number of alternate names) if it is well known.
iso_to_key = {iso: key for key, (_, iso) in locator.info.items()}
fill = {}
for r in sorted((r for r in curated if r['category'] == 'mountains'), key=lambda r: (r['rank'], r['name'])):
    key = iso_to_key.get(r['cc'])
    if key and key not in covered and key not in fill: fill[key] = r
for r in fill.values(): places.append(gn_place(r, min_zoom=3.2))
# GeoNames volcanoes: most widely known only; skip any already represented by a Natural Earth peak.
volcano_xy = [q['xy'] for q in volcano_peaks]
for r in curated:
    if r['category'] == 'volcanoes' and r['rank'] <= VOLCANO_GN_RANK and not any(near(r['coordinates'], xy, 20) for xy in volcano_xy): places.append(gn_place(r))

# --- Ranges, deserts, seas (cartographic regions) --------------------------------------------------------------------------------
def region_place(f, index, key, category, rank, nd, draw=True):
    p = low(f); name, aliases = names(p); polys = polys_of(f['geometry']); id = f'{category}-ne-{key}-{index}'
    outer = max(polys, key=lambda q: len(q[0]))[0]; anchor = bbox_center(outer)
    places.append(dict(id=id, name=name, category=category, coordinates=anchor, aliases=aliases, region=p.get('subregion') or p.get('region') or 'International waters', rank=rank, source='Natural Earth', sourceId=str(p.get('ne_id') or index), featureCode=p.get('featurecla'), minZoom=zoom(rank)))
    if draw: shapes.append({'type': 'Feature', 'properties': {'id': id, 'category': category}, 'geometry': {'type': f['geometry']['type'], 'coordinates': rnd(f['geometry']['coordinates'], nd)}})
    return anchor, norm(name)
deserts = []
for index, f in enumerate(read('physical-areas')):
    p = low(f)
    if p['featurecla'] == 'Range/mtn' and p['scalerank'] <= RANGE_RANK: region_place(f, index, 'physical-areas', 'ranges', p['scalerank'], 2)
    if p['featurecla'] == 'Desert' and p['scalerank'] <= DESERT_RANK and norm(p['name']) not in DESERT_EXCLUDE: deserts.append(region_place(f, index, 'physical-areas', 'deserts', p['scalerank'], 2))
for r in curated:
    if r['category'] == 'deserts' and r['rank'] <= 3 and norm(r['name']) not in DESERT_EXCLUDE and not any(near(r['coordinates'], a, 250) or norm(r['name']) == n for a, n in deserts): places.append(gn_place(r))
seas = []
for index, f in enumerate(read('marine10')):
    p = low(f)
    if p.get('name') and p['featurecla'] in {'sea', 'ocean', 'gulf', 'bay', 'strait', 'sound', 'channel'} and (p['scalerank'] <= SEA_RANK or p['featurecla'] == 'ocean'): seas.append(region_place(f, index, 'marine10', 'seas', p['scalerank'], 2))
duplicate = {n for n, c in collections.Counter(n for _, n in seas).items() if c > 1}
for place in places:
    if place['category'] == 'seas' and norm(place['name']) in duplicate:
        place['aliases'] = list(dict.fromkeys([place['name']] + place['aliases'])); place['name'] = ('North ' if place['coordinates'][1] >= 0 else 'South ') + place['name']
for r in curated:
    if r['category'] == 'seas' and r['rank'] <= 3 and not any(norm(r['name']) == n or near(r['coordinates'], a, 300) for a, n in seas): places.append(gn_place(r))
# --- Glaciers -----------------------------------------------------------------------------------------------------------------------
glaciers = []
for index, f in enumerate(read('glaciated')):
    p = low(f)
    if p.get('name') and p['scalerank'] <= GLACIER_RANK and f.get('geometry') and norm(p['name']) not in {n for _, n in glaciers}: glaciers.append(region_place(f, index, 'glaciated', 'glaciers', p['scalerank'] + 1, 2, draw=False))
for r in sorted((r for r in curated if r['category'] == 'glaciers' and (r['rank'] <= 3 or norm(r['name']) in GLACIER_KEEP)), key=lambda r: r['rank']):
    if not any(near(r['coordinates'], a, 120) or norm(r['name']) == n for a, n in glaciers) and not any(q['name'] == r['name'] for q in places if q['category'] == 'glaciers'): places.append(gn_place(r))

for p in places: p['coordinates'] = [round(v, 4) for v in p['coordinates']]
assert len({p['id'] for p in places}) == len(places), 'duplicate place ids'
write('places.json', places); write('countries.geojson', {'type': 'FeatureCollection', 'features': countries}); write('physical.geojson', {'type': 'FeatureCollection', 'features': shapes})
(OUT / 'physical.geojson.gz').write_bytes(gzip.compress((OUT / 'physical.geojson').read_bytes(), mtime=0))
write('manifest.json', {'naturalEarthRevision': REV, 'retrieved': '2026-10-02', 'sources': manifest, 'counts': dict(collections.Counter(p['category'] for p in places)),
                        'selection': {'perCountry': PER_COUNTRY, 'worldRank': {'rivers': WORLD_RIVER_RANK, 'lakes': WORLD_LAKE_RANK, 'peaks': WORLD_PEAK_RANK}, 'minRiverKm': MIN_RIVER_KM, 'minRiverTotalKm': MIN_RIVER_TOTAL_KM, 'worldRiverKm': WORLD_RIVER_KM, 'minLakeKm2': MIN_LAKE_KM2, 'rangeRank': RANGE_RANK, 'desertRank': DESERT_RANK, 'seaRank': SEA_RANK, 'glacierRank': GLACIER_RANK, 'volcanoGeoNamesRank': VOLCANO_GN_RANK}})
(ROOT / 'data/INCLUDED.md').write_text('# Included countries, territories and capitals\n\nGenerated from the exact shipped snapshot. Countries means Natural Earth admin-0 map units (50m list of 242, drawn with 10m boundaries), including dependencies and disputed units; not a list of sovereign states. Capitals means GeoNames cities500 records with code PPLC, including capitals of dependent territories; not every seat of government.\n\n' + '\n'.join('## ' + cat.title() + '\n\n' + '\n'.join('- ' + p['name'] + ' — ' + p['region'] + ' (' + p['source'] + ' ' + p['sourceId'] + ')' for p in sorted(places, key=lambda p: p['name']) if p['category'] == cat) + '\n' for cat in ['countries', 'capitals']))
print(collections.Counter(p['category'] for p in places))
