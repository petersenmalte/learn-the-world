"""Rebuild checked-in web data with Python 3 stdlib; no runtime data services."""
import json, pathlib, urllib.request, hashlib, collections, gzip
ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=ROOT/'data/source'; OUT=ROOT/'public/data'; SRC.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
REV='ca96624a56bd078437bca8184e78163e5039ad19'
FILES={'countries':'ne_50m_admin_0_countries','elevations':'ne_10m_geography_regions_elevation_points','physical-areas':'ne_10m_geography_regions_polys','rivers10':'ne_10m_rivers_lake_centerlines','lakes10':'ne_10m_lakes','marine10':'ne_10m_geography_marine_polys'}
manifest=[]
def read(key):
 p=SRC/(key+'.geojson'); url=f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{REV}/geojson/{FILES[key]}.geojson'
 if not p.exists(): urllib.request.urlretrieve(url,p)
 manifest.append({'file':key,'url':url,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 return json.loads(p.read_text())['features']
def write(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
def rounded(v):
 if isinstance(v,list):return [rounded(x) for x in v]
 return round(v,3) if isinstance(v,float) else v
def geom(f):return {'type':f['geometry']['type'],'coordinates':rounded(f['geometry']['coordinates'])}
def center(g):
 c=g['coordinates']
 if g['type']=='Point':return c
 if g['type']=='MultiPolygon': c=max(c,key=lambda p:len(p[0]))[0]
 elif g['type']=='Polygon':c=c[0]
 elif g['type']=='MultiLineString':c=max(c,key=len)
 if 'LineString' in g['type']:return c[len(c)//2]
 xs=[p[0] for p in c]; ys=[p[1] for p in c]
 if max(xs)-min(xs)>180:xs=[x+360 if x<0 else x for x in xs]
 return [round(((min(xs)+max(xs))/2+180)%360-180,3),round((min(ys)+max(ys))/2,3)]
places=[]; countries=[]; shapes=[]
for f in read('countries'):
 p=f['properties']; id='ne-'+str(p['NE_ID']); name=p['NAME_EN'] or p['NAME_LONG']
 places.append(dict(id=id,name=name,category='countries',coordinates=[p['LABEL_X'],p['LABEL_Y']],aliases=list(filter(None,[p['NAME_LONG'],p['ADMIN'],p['ISO_A2'],p['ISO_A3'],p['NAME_DE'],p['NAME_FR'],p['NAME_ES']])),region=p['CONTINENT'],rank=p['LABELRANK'],source='Natural Earth',sourceId=str(p['NE_ID']),minZoom=max(0,p['MIN_LABEL']-1.8)))
 countries.append({'type':'Feature','id':id,'properties':{'id':id,'tone':p['MAPCOLOR7']},'geometry':geom(f)})
# Frozen GeoNames extract: PPLC cities and eight selected GLCR records, with IDs and codes.
places.extend(json.loads((ROOT/'data/geonames-snapshot.json').read_text()))
volcanoes={'Etna','Vesuvius','Mt. Fuji','Kilimanjaro','Mauna Loa','Mauna Kea','Fuji-san','Fuji'}
for key in ['elevations','physical-areas','rivers10','lakes10','marine10']:
 for record_index,f in enumerate(read(key)):
  p={k.lower():v for k,v in f['properties'].items()}; name=p.get('name'); cls=p.get('featurecla')
  if not name or not f.get('geometry') or not f['geometry'].get('coordinates'):continue
  cat= {'Range/mtn':'ranges','Desert':'deserts','River':'rivers','Lake':'lakes','sea':'seas','ocean':'seas','gulf':'seas','bay':'seas','strait':'seas','sound':'seas','channel':'seas','Lake Centerline':'rivers','Reservoir':'lakes','Alkaline Lake':'lakes','mountain':'mountains'}.get(cls)
  if not cat:continue
  if cat=='mountains' and any(n.lower() in name.lower() for n in volcanoes):cat='volcanoes'
  id='ne-'+str(p.get('ne_id',record_index))+'-'+key+'-'+str(record_index); g=geom(f)
  places.append(dict(id=id,name=name,category=cat,coordinates=center(g),aliases=list(filter(None,[p.get('name_en'),p.get('namealt'),p.get('name_alt'),p.get('name_de')])),region=p.get('region') or 'Physical geography',rank=p.get('scalerank',3),source='Natural Earth',sourceId=str(p.get('ne_id',record_index)),featureCode=cls,minZoom=min(4.5,max(0,(p.get('min_label') or p.get('min_zoom') or 3)-2))))
  if g['type']!='Point':shapes.append({'type':'Feature','properties':{'id':id,'category':cat},'geometry':g})
# IDs identify records, and may recur across NE thematic datasets: retain category in key.
for p in places:p['id']=p['category']+'-'+p['id'];p['coordinates']=[round(v,4) for v in p['coordinates']]
for f in countries:f['id']='countries-'+f['id'];f['properties']['id']=f['id']
for f in shapes:f['properties']['id']=f['properties']['category']+'-'+f['properties']['id']
write('places.json',places);write('countries.geojson',{'type':'FeatureCollection','features':countries});write('physical.geojson',{'type':'FeatureCollection','features':shapes})
(OUT/'physical.geojson.gz').write_bytes(gzip.compress((OUT/'physical.geojson').read_bytes(),mtime=0))
write('manifest.json',{'naturalEarthRevision':REV,'retrieved':'2026-10-02','sources':manifest,'counts':dict(collections.Counter(p['category'] for p in places))})
(ROOT/'data/INCLUDED.md').write_text('# Included countries, territories and capitals\n\nGenerated from the exact shipped snapshot. Countries means Natural Earth 50m admin-0 map units, including dependencies and disputed units; not a list of sovereign states. Capitals means GeoNames cities500 records with code PPLC, including capitals of dependent territories; not every seat of government.\n\n'+ '\n'.join('## '+cat.title()+'\n\n'+ '\n'.join('- '+p['name']+' — '+p['region']+' ('+p['source']+' '+p['sourceId']+')' for p in sorted(places,key=lambda p:p['name']) if p['category']==cat)+'\n' for cat in ['countries','capitals']))
print(collections.Counter(p['category'] for p in places))
