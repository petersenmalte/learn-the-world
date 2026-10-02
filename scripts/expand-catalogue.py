"""Stream the worldwide GeoNames dump into static, lazy-loadable search/map shards.
Run after prepare-data.py. Python 3 standard library only. Raw inputs are ignored by Git.
"""
import collections, datetime, gzip, hashlib, io, json, math, pathlib, unicodedata, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'public/data'; SRC=ROOT/'data/source'
CODES={'MT':'mountains','PK':'mountains','PKS':'mountains','MTS':'ranges','VLC':'volcanoes','GLCR':'glaciers','CAPG':'glaciers','SEA':'seas','OCN':'seas','STM':'rivers','STMS':'rivers','STMI':'rivers','LK':'lakes','LKS':'lakes','LKI':'lakes','LKSI':'lakes','DSRT':'deserts'}
MINZOOM={'mountains':4,'ranges':3,'volcanoes':2,'glaciers':4,'seas':1,'rivers':4,'lakes':4,'deserts':2}
CATALOGUE=OUT/'catalogue'; WORK=SRC/'catalogue-work'
CATALOGUE.mkdir(exist_ok=True); WORK.mkdir(exist_ok=True)
for sub in ['search','map']:(CATALOGUE/sub).mkdir(exist_ok=True)

def normalize(s):
 s=''.join(c for c in unicodedata.normalize('NFD',s) if not unicodedata.category(c).startswith('M')).lower()
 for a,b in [('ß','ss'),('ø','o'),('ł','l'),('æ','ae'),('œ','oe'),('ð','d'),('þ','th')]:s=s.replace(a,b)
 return ' '.join(''.join(c if c.isalnum() else ' ' for c in s).split())
def bucket(prefix):
 h=2166136261
 for b in prefix.encode():h=((h^b)*16777619)&0xffffffff
 return f'{h&255:02x}'
def compact(obj):return json.dumps(obj,ensure_ascii=False,separators=(',',':'))
# Keep only 48 file descriptors open; spool data without retaining millions of objects in RAM.
handles=collections.OrderedDict(); paths=set()
def append(key,line):
 if key not in handles:
  if len(handles)>=48:handles.popitem(last=False)[1].close()
  file=WORK/(key.replace('/','_')+'.ndjson')
  handles[key]=open(file,'a' if key in paths else 'w',encoding='utf8');paths.add(key)
 else:handles.move_to_end(key)
 handles[key].write(line+'\n')

countries={}
for line in (SRC/'countryInfo.txt').read_text().splitlines():
 if line and not line.startswith('#'):
  r=line.split('\t');countries[r[0]]=r[4]
counts=collections.Counter(); code_counts=collections.Counter(); invalid=0; total=0
places=json.loads((OUT/'places.json').read_text())
# The original glacier selection is subsumed by the worldwide GeoNames extract.
places=[p for p in places if p['category']!='glaciers']
overview_ids={p['id'] for p in places}
with zipfile.ZipFile(SRC/'allCountries.zip') as z, z.open('allCountries.txt') as raw:
 for line in io.TextIOWrapper(raw,encoding='utf8'):
  r=line.rstrip('\n').split('\t')
  code=r[7];cat=CODES.get(code)
  if not cat or not r[1].strip():continue
  try:lat=float(r[4]);lng=float(r[5])
  except ValueError:invalid+=1;continue
  if not math.isfinite(lat+lng) or abs(lat)>90 or abs(lng)>180:invalid+=1;continue
  aliases=list(dict.fromkeys([r[2]]+r[3].split(',')))
  aliases=[a for a in aliases if a and a!=r[1]][:12]
  rank=max(2,8-min(6,len(r[3].split(','))//3))
  # Compact schema: id, name, lon, lat, country, code, priority, aliases.
  row=[int(r[0]),r[1],round(lng,4),round(lat,4),r[8],code,rank,aliases]
  encoded=compact(row)
  prefixes={word[:3] for name in [r[1]]+aliases for word in normalize(name).split() if len(word)>=3}
  # Very short names still have a searchable shard (queries may use that complete short name).
  prefixes.update(normalize(name) for name in [r[1]]+aliases if 0<len(normalize(name))<3)
  for key in {bucket(prefix) for prefix in prefixes}:append('search/'+key,encoded)
  x=min(23,max(0,int((lng+180)//15)));y=min(11,max(0,int((lat+90)//15)))
  append(f'map/{cat}-{x}-{y}',compact(row[:7]+[[]]))
  counts[cat]+=1;code_counts[code]+=1;total+=1
  # Small global categories can be displayed without waiting for a regional detail request.
  if cat in ['volcanoes','glaciers','seas','deserts']:
   id=cat+'-gn-'+r[0]
   if id not in overview_ids:
    places.append(dict(id=id,name=r[1],category=cat,coordinates=[row[2],row[3]],aliases=aliases,region=countries.get(r[8],'International waters / polar regions'),rank=rank,source='GeoNames',sourceId=r[0],featureCode=code,minZoom=MINZOOM[cat]))
  if total%250000==0:print(f'Extracted {total:,} records',flush=True)
for f in handles.values():f.close()
manifest_files={}
for i,key in enumerate(sorted(paths)):
 source=WORK/(key.replace('/','_')+'.ndjson');dest=CATALOGUE/(key+'.ndjson.gz')
 with open(source,'rb') as inp,open(dest,'wb') as out,gzip.GzipFile(filename='',fileobj=out,mode='wb',compresslevel=6,mtime=0) as gz:
  while block:=inp.read(1024*1024):gz.write(block)
 manifest_files[key]=dest.stat().st_size
 if i%500==0:print(f'Compressed {i}/{len(paths)} shards',flush=True)
# Remove obsolete generated shards only, when the source changes on a future rebuild.
for file in CATALOGUE.glob('*/*.ndjson.gz'):
 if str(file.relative_to(CATALOGUE)).removesuffix('.ndjson.gz') not in manifest_files:file.unlink()
(OUT/'places.json').write_text(compact(places)+'\n')
def sha(file):
 h=hashlib.sha256()
 with open(file,'rb') as f:
  while b:=f.read(1024*1024):h.update(b)
 return h.hexdigest()
metadata={'version':1,'retrieved':datetime.date.today().isoformat(),'source':'https://download.geonames.org/export/dump/allCountries.zip','sourceSha256':sha(SRC/'allCountries.zip'),'codes':CODES,'minZoom':MINZOOM,'countries':countries,'counts':dict(counts),'featureCodeCounts':dict(code_counts),'total':total,'invalidCoordinatesSkipped':invalid,'files':manifest_files,'compressedBytes':sum(manifest_files.values()),'aliasLimit':12,'cellDegrees':15}
(OUT/'catalogue.json').write_text(compact(metadata)+'\n')
manifest=json.loads((OUT/'manifest.json').read_text());manifest['worldwideGeoNames']={k:metadata[k] for k in ['retrieved','source','sourceSha256','counts','featureCodeCounts','total','invalidCoordinatesSkipped']};manifest['overviewCounts']=dict(collections.Counter(p['category'] for p in places));manifest['counts']={cat:counts.get(cat,sum(p['category']==cat for p in places)) for cat in ['countries','capitals','mountains','ranges','rivers','seas','lakes','deserts','glaciers','volcanoes']}
(OUT/'manifest.json').write_text(compact(manifest)+'\n')
print(json.dumps({k:metadata[k] for k in ['counts','total','compressedBytes','invalidCoordinatesSkipped']},indent=2),flush=True)
